-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — SEPARA "estrutura da CLÍNICA" de "equipamentos da SALA".
--
-- Estrutura (vale p/ todas as salas da clínica) fica no ENDEREÇO; equipamentos
-- (de cada anúncio) ficam na SALA. Cada um ganha um campo livre (≤150 chars) p/ itens
-- extra. Esta versão das funções get_sala_detalhe/get_clinica_por_slug SUPERSEDE as
-- de 10/13 (mantém os casts ::text do fix 42804 + as novas colunas).
-- Aditivo, idempotente. Rode no SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 1. Colunas novas ─────────────────────────────────────────────────────────────
alter table public.curadentespro_enderecos
  add column if not exists estrutura       text[] not null default '{}',
  add column if not exists estrutura_extra text check (estrutura_extra is null or length(estrutura_extra) <= 150);

alter table public.salas
  add column if not exists equipamentos_extra text check (equipamentos_extra is null or length(equipamentos_extra) <= 150);

-- ─── 2. View pública: + equipamentos_extra ───────────────────────────────────────
drop view if exists public.salas_publicas;
create view public.salas_publicas as
  select s.id, s.titulo, s.descricao, s.equipamentos, s.equipamentos_extra,
         s.preco_valor, s.preco_unidade, s.preco_diaria,
         s.disponibilidade, s.politica_cancelamento, s.fotos, s.numero_na_clinica,
         e.nome_clinica, e.cidade, e.bairro, e.estado, e.latitude, e.longitude,
         e.slug as clinica_slug, s.created_at
    from public.salas s
    join public.curadentespro c            on c.id = s.anfitriao_id
    join public.curadentespro_enderecos e  on e.id = s.endereco_id
   where s.status = 'ativa'
     and c.cro_verificado is true and c.deleted_at is null;
grant select on public.salas_publicas to anon, authenticated;

-- ─── 3. get_sala_detalhe: + equipamentos_extra (DROP — muda o RETURNS TABLE) ──────
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
    select s.id, s.titulo::text, s.descricao::text, s.equipamentos, s.equipamentos_extra::text,
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

-- ─── 4. get_clinica_por_slug: + estrutura/estrutura_extra (DROP — muda o RETURNS) ──
drop function if exists public.get_clinica_por_slug(text);
create or replace function public.get_clinica_por_slug(p_slug text)
returns table (
  slug text, nome_clinica text,
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
    raise exception 'Apenas dentistas com CRO verificado podem ver a clínica.';
  end if;
  return query
    select e.slug::text, e.nome_clinica::text,
           e.logradouro::text, e.numero::text, e.complemento::text, e.bairro::text, e.cidade::text, e.estado::text, e.cep::text,
           e.latitude, e.longitude, e.telefone::text, e.whatsapp::text, e.foto_fachada::text, e.fotos_recepcao,
           e.estrutura, e.estrutura_extra::text
      from public.curadentespro_enderecos e
      join public.curadentespro c on c.id = e.curadentespro_id
     where e.slug = p_slug
       and c.cro_verificado is true and c.deleted_at is null
       and exists (select 1 from public.salas s where s.endereco_id = e.id and s.status = 'ativa');
end; $$;
revoke all on function public.get_clinica_por_slug(text) from public;
grant execute on function public.get_clinica_por_slug(text) to authenticated;
