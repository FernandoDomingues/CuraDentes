-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — IDENTIDADE DA CLÍNICA PELO ENDEREÇO FÍSICO (clinica_key).
--
-- Problema: nome_clinica e texto livre -> "Villa Amato" vs "Vila Amato" no mesmo
-- endereco viram clinicas duplicadas no catalogo (que agrupava por slug=nome-CEP).
--
-- Solucao: a clinica passa a ser identificada por uma CHAVE FISICA derivada do
-- endereco: clinica_key = CEP + numero + complemento (a unidade: sala/conjunto).
-- O nome vira so um rotulo; o catalogo agrupa por clinica_key (nome exibido = o
-- mais frequente). Dois dentistas no MESMO endereco/unidade => uma clinica.
-- Predio com clinicas distintas => o COMPLEMENTO (sala/conj) as separa.
--
-- Funcao IMMUTABLE clinica_key_de(cep,numero,complemento) — usada nas RPCs e num
-- indice de expressao. Sem coluna gerada (evita acoplar a funcao a coluna). Sem
-- tabela nova, sem FK, sem mexer em escrita/RLS/auth. Aditivo, idempotente.
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 1. Funcao da chave (normaliza e monta CEP-numero[-complemento]) ──────────────
-- Normalizacao: minusculas + so alfanumerico; no complemento remove tambem palavras
-- de unidade (sala/conjunto/apto/andar/...). NAO usa unaccent (nao e immutable).
create or replace function public.clinica_key_de(p_cep text, p_numero text, p_complemento text)
returns text language sql immutable as $$
  with p as (
    select
      regexp_replace(coalesce(p_cep, ''), '\D', '', 'g') as cep,
      regexp_replace(lower(coalesce(p_numero, '')), '[^a-z0-9]+', '', 'g') as num,
      regexp_replace(
        regexp_replace(lower(coalesce(p_complemento, '')),
          '\y(sala|salas|conjunto|conj|cj|apto|apt|apartamento|andar|bloco|loja|numero|nro|no)\y', '', 'g'),
        '[^a-z0-9]+', '', 'g') as comp
  )
  select cep || '-' || num || case when comp <> '' then '-' || comp else '' end from p
$$;

-- Indice de expressao (acelera o group/where por chave).
create index if not exists enderecos_clinica_key_idx
  on public.curadentespro_enderecos (public.clinica_key_de(cep, numero, complemento));

-- ─── 2. Catalogo: agrupa por clinica_key (era por slug) ───────────────────────────
-- Retorna clinica_key (id da rota), nome canonico (mode = mais frequente), e os
-- campos do endereco REPRESENTATIVO (o que tem foto de fachada; senao o mais antigo).
drop function if exists public.get_clinicas_publicas(text);
create or replace function public.get_clinicas_publicas(p_cidade text default null)
returns table (
  clinica_key text, nome_clinica text, cidade text, bairro text, estado text,
  latitude double precision, longitude double precision,
  foto_fachada text, qtd_salas bigint, preco_min numeric
) language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Apenas dentistas com CRO verificado.';
  end if;
  return query
  select k.clinica_key, k.nome_clinica, k.cidade, k.bairro, k.estado,
         k.latitude, k.longitude, k.foto_fachada, k.qtd_salas, k.preco_min
  from (
    select
      public.clinica_key_de(e.cep, e.numero, e.complemento) as clinica_key,
      (mode() within group (order by e.nome_clinica))::text as nome_clinica,
      (array_agg(e.cidade order by e.id))[1]::text as cidade,
      (array_agg(e.bairro order by e.id))[1]::text as bairro,
      (array_agg(e.estado order by e.id))[1]::text as estado,
      (array_agg(e.latitude order by (e.latitude is null), e.id))[1] as latitude,
      (array_agg(e.longitude order by (e.longitude is null), e.id))[1] as longitude,
      (array_agg(e.foto_fachada order by (e.foto_fachada is null or e.foto_fachada = ''), e.id))[1]::text as foto_fachada,
      count(s.id) as qtd_salas,
      min(s.preco_valor) as preco_min
    from public.curadentespro_enderecos e
    join public.curadentespro c on c.id = e.curadentespro_id
    join public.salas s        on s.endereco_id = e.id and s.status = 'ativa'
    where c.cro_verificado is true and c.deleted_at is null
      and (p_cidade is null or btrim(p_cidade) = '' or e.cidade ilike '%' || p_cidade || '%')
    group by public.clinica_key_de(e.cep, e.numero, e.complemento)
  ) k
  where k.clinica_key <> '-' and k.qtd_salas > 0
  order by k.qtd_salas desc, k.nome_clinica asc
  limit 100;
end; $$;
revoke all on function public.get_clinicas_publicas(text) from public;
grant execute on function public.get_clinicas_publicas(text) to authenticated;

-- ─── 3. Pagina da clinica: por clinica_key (agrega os enderecos da mesma chave) ───
create or replace function public.get_clinica_por_chave(p_chave text)
returns table (
  clinica_key text, nome_clinica text,
  logradouro text, numero text, complemento text, bairro text, cidade text, estado text, cep text,
  latitude double precision, longitude double precision,
  telefone text, whatsapp text, foto_fachada text, fotos_recepcao text[],
  estrutura text[], estrutura_extra text
) language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Apenas dentistas com CRO verificado podem ver a clinica.';
  end if;
  return query
  with grp as (
    -- todos os enderecos da mesma chave (donos com CRO + com sala ativa)
    select e.*
    from public.curadentespro_enderecos e
    join public.curadentespro c on c.id = e.curadentespro_id
    where c.cro_verificado is true and c.deleted_at is null
      and public.clinica_key_de(e.cep, e.numero, e.complemento) = p_chave
      and exists (select 1 from public.salas s where s.endereco_id = e.id and s.status = 'ativa')
  ),
  rep as (
    -- endereco REPRESENTATIVO: o que tem foto de fachada; senao o 1o (id estavel).
    -- Retornar os campos dele DIRETO evita array_agg em colunas que sao arrays
    -- (fotos_recepcao/estrutura) — que viram array-de-array e quebram.
    select * from grp order by (foto_fachada is null or foto_fachada = ''), id limit 1
  )
  select
    p_chave,
    (select (mode() within group (order by g.nome_clinica))::text from grp g),
    rep.logradouro::text, rep.numero::text, rep.complemento::text, rep.bairro::text,
    rep.cidade::text, rep.estado::text, rep.cep::text,
    rep.latitude, rep.longitude,
    rep.telefone::text, rep.whatsapp::text, rep.foto_fachada::text, rep.fotos_recepcao,
    rep.estrutura, rep.estrutura_extra::text
  from rep;
end; $$;
revoke all on function public.get_clinica_por_chave(text) from public;
grant execute on function public.get_clinica_por_chave(text) to authenticated;

-- ─── 4. View publica: + clinica_key (p/ filtrar as salas da clinica) ──────────────
drop view if exists public.salas_publicas;
create view public.salas_publicas as
  select s.id, s.titulo, s.descricao, s.equipamentos, s.equipamentos_extra,
         s.preco_valor, s.preco_unidade, s.preco_diaria,
         s.disponibilidade, s.politica_cancelamento, s.fotos, s.numero_na_clinica,
         e.nome_clinica, e.cidade, e.bairro, e.estado, e.latitude, e.longitude,
         e.slug as clinica_slug,
         public.clinica_key_de(e.cep, e.numero, e.complemento) as clinica_key,
         s.created_at
    from public.salas s
    join public.curadentespro c            on c.id = s.anfitriao_id
    join public.curadentespro_enderecos e  on e.id = s.endereco_id
   where s.status = 'ativa'
     and c.cro_verificado is true and c.deleted_at is null;
grant select on public.salas_publicas to anon, authenticated;

-- ─── 5. Detalhe da sala: + clinica_key (p/ o link "ver a clinica") ────────────────
drop function if exists public.get_sala_detalhe(uuid);
create or replace function public.get_sala_detalhe(p_id uuid)
returns table (
  id uuid, titulo text, descricao text, equipamentos text[], equipamentos_extra text,
  preco_valor numeric, preco_unidade text, preco_diaria numeric, disponibilidade jsonb,
  politica_cancelamento text, fotos text[],
  nome_clinica text, cidade text, bairro text, estado text,
  latitude double precision, longitude double precision, created_at timestamptz,
  contato_whatsapp text, contato_email text,
  logradouro text, numero text, complemento text, cep text,
  clinica_slug text, clinica_key text, numero_na_clinica smallint
) language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Apenas dentistas com CRO verificado podem ver os detalhes da sala.';
  end if;
  return query
    select s.id, s.titulo::text, s.descricao::text, s.equipamentos, s.equipamentos_extra::text,
           s.preco_valor, s.preco_unidade::text, s.preco_diaria, s.disponibilidade,
           s.politica_cancelamento::text, s.fotos,
           e.nome_clinica::text, e.cidade::text, e.bairro::text, e.estado::text,
           e.latitude, e.longitude, s.created_at,
           coalesce(e.whatsapp, e.telefone)::text, null::text,
           e.logradouro::text, e.numero::text, e.complemento::text, e.cep::text,
           e.slug::text, public.clinica_key_de(e.cep, e.numero, e.complemento), s.numero_na_clinica
      from public.salas s
      join public.curadentespro c           on c.id = s.anfitriao_id
      join public.curadentespro_enderecos e on e.id = s.endereco_id
     where s.id = p_id and s.status = 'ativa'
       and c.cro_verificado is true and c.deleted_at is null;
end; $$;
revoke all on function public.get_sala_detalhe(uuid) from public;
grant execute on function public.get_sala_detalhe(uuid) to authenticated;
