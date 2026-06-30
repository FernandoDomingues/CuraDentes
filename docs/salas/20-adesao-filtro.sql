-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — Parte 3 passo 2: FILTRO de adesão no catálogo.
--
-- As 4 leituras do catálogo passam a esconder endereços PENDENTES de adesão
-- (só mostram quem é DONO da clínica ou tem adesão APROVADA) via
-- clinica_endereco_ativo(e.id) (definida em 19-clinica-adesao.sql).
--
-- Recria as funções/view IDÊNTICAS ao 17-clinica-key.sql + a linha do filtro.
-- Idempotente. Rode DEPOIS do 19. (Os donos atuais já são "ativos" pelo backfill,
-- então a Villa Amato e as demais continuam aparecendo.)
-- ════════════════════════════════════════════════════════════════════════════════

grant execute on function public.clinica_endereco_ativo(uuid) to anon, authenticated;

-- ─── 1. Catálogo ──────────────────────────────────────────────────────────────────
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
      and public.clinica_endereco_ativo(e.id)
      and (p_cidade is null or btrim(p_cidade) = '' or e.cidade ilike '%' || p_cidade || '%')
    group by public.clinica_key_de(e.cep, e.numero, e.complemento)
  ) k
  where k.clinica_key <> '-' and k.qtd_salas > 0
  order by k.qtd_salas desc, k.nome_clinica asc
  limit 100;
end; $$;
revoke all on function public.get_clinicas_publicas(text) from public;
grant execute on function public.get_clinicas_publicas(text) to authenticated;

-- ─── 2. Página da clínica ─────────────────────────────────────────────────────────
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
    select e.*
    from public.curadentespro_enderecos e
    join public.curadentespro c on c.id = e.curadentespro_id
    where c.cro_verificado is true and c.deleted_at is null
      and public.clinica_endereco_ativo(e.id)
      and public.clinica_key_de(e.cep, e.numero, e.complemento) = p_chave
      and exists (select 1 from public.salas s where s.endereco_id = e.id and s.status = 'ativa')
  ),
  rep as (
    select * from grp order by (grp.foto_fachada is null or grp.foto_fachada = ''), grp.id limit 1
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

-- ─── 3. View pública (salas da clínica) ──────────────────────────────────────────
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
     and c.cro_verificado is true and c.deleted_at is null
     and public.clinica_endereco_ativo(e.id);
grant select on public.salas_publicas to anon, authenticated;

-- ─── 4. Detalhe da sala ───────────────────────────────────────────────────────────
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
       and c.cro_verificado is true and c.deleted_at is null
       and public.clinica_endereco_ativo(e.id);
end; $$;
revoke all on function public.get_sala_detalhe(uuid) from public;
grant execute on function public.get_sala_detalhe(uuid) to authenticated;
