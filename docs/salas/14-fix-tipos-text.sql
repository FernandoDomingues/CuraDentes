-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — FIX 42804 (structure of query does not match function result type).
--
-- As colunas de string de `curadentespro_enderecos` (nome_clinica, cidade, bairro,
-- estado, …) são varchar(150), mas as RPCs declaram `RETURNS TABLE(... text ...)`.
-- O Postgres é ESTRITO nisso: varchar(150) ≠ text → a função lança erro EM RUNTIME
-- (a criação passa; o erro só aparece ao executar). A página captura o erro, ignora
-- e mostra "Nenhuma clínica" → catálogo /coworking vazio para TODOS.
--
-- Correção: cast `::text` em todas as colunas de string nas RPCs afetadas
-- (get_clinicas_publicas, get_sala_detalhe, get_clinica_por_slug, get_salas_proximas).
-- Só muda o corpo (o RETURNS TABLE continua o mesmo) → create or replace, sem drop.
-- Aditivo, idempotente. Rode no SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 1) Catálogo de clínicas (/coworking) ─────────────────────────────────────────
create or replace function public.get_clinicas_publicas(p_cidade text default null)
returns table (
  slug text, nome_clinica text, cidade text, bairro text, estado text,
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
    select e.slug::text, e.nome_clinica::text, e.cidade::text, e.bairro::text, e.estado::text,
           e.latitude, e.longitude, e.foto_fachada::text,
           count(s.id) as qtd_salas, min(s.preco_valor) as preco_min
      from public.curadentespro_enderecos e
      join public.curadentespro c on c.id = e.curadentespro_id
      join public.salas s        on s.endereco_id = e.id and s.status = 'ativa'
     where c.cro_verificado is true and c.deleted_at is null
       and (p_cidade is null or btrim(p_cidade) = '' or e.cidade ilike '%' || p_cidade || '%')
     group by e.slug, e.nome_clinica, e.cidade, e.bairro, e.estado, e.latitude, e.longitude, e.foto_fachada
     order by count(s.id) desc, e.nome_clinica asc
     limit 100;
end; $$;
revoke all on function public.get_clinicas_publicas(text) from public;
grant execute on function public.get_clinicas_publicas(text) to authenticated;

-- ─── 2) Detalhe da sala (/coworking/[id]) — versão com preco_diaria ────────────────
create or replace function public.get_sala_detalhe(p_id uuid)
returns table (
  id uuid, titulo text, descricao text, equipamentos text[],
  preco_valor numeric, preco_unidade text, preco_diaria numeric, disponibilidade jsonb,
  politica_cancelamento text, fotos text[],
  nome_clinica text, cidade text, bairro text, estado text,
  latitude double precision, longitude double precision, created_at timestamptz,
  contato_whatsapp text, contato_email text,
  logradouro text, numero text, complemento text, cep text,
  clinica_slug text, numero_na_clinica smallint
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
    select s.id, s.titulo::text, s.descricao::text, s.equipamentos,
           s.preco_valor, s.preco_unidade::text, s.preco_diaria, s.disponibilidade,
           s.politica_cancelamento::text, s.fotos,
           e.nome_clinica::text, e.cidade::text, e.bairro::text, e.estado::text,
           e.latitude, e.longitude, s.created_at,
           coalesce(e.whatsapp, e.telefone)::text, null::text,
           e.logradouro::text, e.numero::text, e.complemento::text, e.cep::text,
           e.slug::text, s.numero_na_clinica
      from public.salas s
      join public.curadentespro c           on c.id = s.anfitriao_id
      join public.curadentespro_enderecos e on e.id = s.endereco_id
     where s.id = p_id and s.status = 'ativa'
       and c.cro_verificado is true and c.deleted_at is null;
end; $$;
revoke all on function public.get_sala_detalhe(uuid) from public;
grant execute on function public.get_sala_detalhe(uuid) to authenticated;

-- ─── 3) Página da clínica (/coworking/clinica/[slug]) ─────────────────────────────
create or replace function public.get_clinica_por_slug(p_slug text)
returns table (
  slug text, nome_clinica text,
  logradouro text, numero text, complemento text, bairro text, cidade text, estado text, cep text,
  latitude double precision, longitude double precision,
  telefone text, whatsapp text, foto_fachada text, fotos_recepcao text[]
) language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Apenas dentistas com CRO verificado podem ver a clínica.';
  end if;
  return query
    select e.slug::text, e.nome_clinica::text,
           e.logradouro::text, e.numero::text, e.complemento::text, e.bairro::text, e.cidade::text, e.estado::text, e.cep::text,
           e.latitude, e.longitude, e.telefone::text, e.whatsapp::text, e.foto_fachada::text, e.fotos_recepcao
      from public.curadentespro_enderecos e
      join public.curadentespro c on c.id = e.curadentespro_id
     where e.slug = p_slug
       and c.cro_verificado is true and c.deleted_at is null
       and exists (select 1 from public.salas s where s.endereco_id = e.id and s.status = 'ativa');
end; $$;
revoke all on function public.get_clinica_por_slug(text) from public;
grant execute on function public.get_clinica_por_slug(text) to authenticated;

-- ─── 4) get_salas_proximas (não usada hoje pelo código, mas tinha o mesmo defeito) ─
drop function if exists public.get_salas_proximas(double precision, double precision, double precision);
create or replace function public.get_salas_proximas(
  lat double precision, lng double precision, raio_km double precision default 30
) returns table (
  id uuid, titulo text, preco_valor numeric, preco_unidade text,
  nome_clinica text, cidade text, bairro text, clinica_slug text, numero_na_clinica smallint,
  latitude double precision, longitude double precision,
  equipamentos text[], fotos text[], distancia_km double precision
) language sql stable security definer set search_path = public, pg_temp
as $$
  select s.id, s.titulo::text, s.preco_valor, s.preco_unidade::text,
         e.nome_clinica::text, e.cidade::text, e.bairro::text, e.slug::text, s.numero_na_clinica,
         e.latitude, e.longitude, s.equipamentos, s.fotos,
         (6371 * acos(greatest(-1, least(1,
            cos(radians(lat)) * cos(radians(e.latitude)) * cos(radians(e.longitude) - radians(lng))
          + sin(radians(lat)) * sin(radians(e.latitude)))))) as distancia_km
    from public.salas s
    join public.curadentespro c           on c.id = s.anfitriao_id
    join public.curadentespro_enderecos e on e.id = s.endereco_id
   where s.status = 'ativa' and e.latitude is not null and e.longitude is not null
     and c.cro_verificado is true and c.deleted_at is null
     and (6371 * acos(greatest(-1, least(1,
            cos(radians(lat)) * cos(radians(e.latitude)) * cos(radians(e.longitude) - radians(lng))
          + sin(radians(lat)) * sin(radians(e.latitude)))))) <= raio_km
   order by distancia_km asc
   limit 200;
$$;
revoke all on function public.get_salas_proximas(double precision,double precision,double precision) from public;
grant execute on function public.get_salas_proximas(double precision,double precision,double precision) to anon, authenticated;
