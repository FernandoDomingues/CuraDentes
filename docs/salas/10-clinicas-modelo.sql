-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — FASE 1: a CLÍNICA (endereço) vira a fonte única. Aditivo e SEGURO:
--   • adiciona slug + fotos na clínica e numero_na_clinica na sala;
--   • faz as leituras (view + RPCs) usarem o endereço via JOIN (corrige o "drift");
--   • NÃO remove ainda as 6 colunas duplicadas nem o trigger de cópia — isso fica
--     para a limpeza final (12-cleanup), depois do QA do código. Nada quebra agora.
-- Rodar no SQL Editor do Supabase. Idempotente.
-- ════════════════════════════════════════════════════════════════════════════════

create extension if not exists unaccent;

-- ─── 1. CLÍNICA (endereço): slug congelado + fotos de fachada/recepção ────────────
alter table public.curadentespro_enderecos
  add column if not exists slug           text,
  add column if not exists foto_fachada   text,
  add column if not exists fotos_recepcao text[] not null default '{}';

-- slug = nome-CEP (sem acento, único). SEGUE O NOME (ver 15-slug-segue-nome.sql):
-- regenera no insert e quando o nome/CEP mudam. Mantém só quando nada que o compõe muda.
create or replace function public.endereco_slug() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_base text; v_cand text; v_n int := 1;
begin
  if tg_op = 'UPDATE'
     and new.nome_clinica is not distinct from old.nome_clinica
     and new.cep          is not distinct from old.cep
     and new.slug is not null and btrim(new.slug) <> '' then
    return new;  -- nome e CEP iguais → mantém o slug
  end if;
  v_base := lower(unaccent(coalesce(nullif(btrim(new.nome_clinica), ''), 'clinica')));
  v_base := btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-');
  v_base := v_base || '-' || regexp_replace(coalesce(new.cep, ''), '\D', '', 'g');
  v_base := btrim(v_base, '-');
  v_cand := v_base;
  while exists (select 1 from public.curadentespro_enderecos where slug = v_cand and id <> new.id) loop
    v_n := v_n + 1;
    v_cand := v_base || '-' || v_n;
  end loop;
  new.slug := v_cand;
  return new;
end; $$;

drop trigger if exists endereco_slug_trg on public.curadentespro_enderecos;
create trigger endereco_slug_trg
  before insert or update on public.curadentespro_enderecos
  for each row execute function public.endereco_slug();

-- Backfill dos slugs existentes (1 a 1 → cada um vê os anteriores e fica único).
do $$
declare r record;
begin
  for r in select id from public.curadentespro_enderecos where slug is null or btrim(slug) = '' loop
    update public.curadentespro_enderecos set nome_clinica = nome_clinica where id = r.id;
  end loop;
end $$;

create unique index if not exists enderecos_slug_uidx
  on public.curadentespro_enderecos(slug) where slug is not null;

-- ─── 2. SALA: numero_na_clinica (2 dígitos, estável, nunca reusado) ───────────────
alter table public.salas add column if not exists numero_na_clinica smallint;

-- Atribui o próximo número da clínica no insert. Como sala é soft-delete (status
-- 'removida' mantém a linha), max()+1 é monotônico → nunca reusa.
create or replace function public.sala_numero() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.numero_na_clinica is null then
    select coalesce(max(numero_na_clinica), 0) + 1 into new.numero_na_clinica
      from public.salas where endereco_id = new.endereco_id;
  end if;
  return new;
end; $$;

drop trigger if exists sala_numero_trg on public.salas;
create trigger sala_numero_trg before insert on public.salas
  for each row execute function public.sala_numero();

-- Backfill: numera as salas existentes por clínica, na ordem de criação.
do $$
declare r record;
begin
  for r in
    select id, row_number() over (partition by endereco_id order by created_at) as rn
      from public.salas where numero_na_clinica is null
  loop
    update public.salas set numero_na_clinica = r.rn where id = r.id;
  end loop;
end $$;

create unique index if not exists salas_endereco_numero_uidx
  on public.salas(endereco_id, numero_na_clinica);

-- ─── 3. VIEW pública: clínica vem do ENDEREÇO (live, sem drift) ───────────────────
-- Mesmas colunas de antes (o código não muda) + clinica_slug e numero_na_clinica.
drop view if exists public.salas_publicas;
create view public.salas_publicas as
  select s.id, s.titulo, s.descricao, s.equipamentos, s.preco_valor, s.preco_unidade,
         s.disponibilidade, s.politica_cancelamento, s.fotos, s.numero_na_clinica,
         e.nome_clinica, e.cidade, e.bairro, e.estado, e.latitude, e.longitude,
         e.slug as clinica_slug, s.created_at
    from public.salas s
    join public.curadentespro c            on c.id = s.anfitriao_id
    join public.curadentespro_enderecos e  on e.id = s.endereco_id
   where s.status = 'ativa'
     and c.cro_verificado is true and c.deleted_at is null;
grant select on public.salas_publicas to anon, authenticated;

-- ─── 4. get_salas_proximas: geo vem do ENDEREÇO ──────────────────────────────────
-- DROP antes: o RETURNS TABLE mudou (ganhou clinica_slug/numero) e o Postgres não
-- deixa o create-or-replace alterar o tipo de retorno.
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

-- ─── 5. get_sala_detalhe: clínica + contato vêm do ENDEREÇO ───────────────────────
-- Contato de locação = telefone/WhatsApp do endereço (reuso). Mesmas colunas de saída
-- (contato_whatsapp/contato_email) + clinica_slug e numero_na_clinica.
-- DROP antes: o RETURNS TABLE mudou (ganhou clinica_slug/numero).
drop function if exists public.get_sala_detalhe(uuid);
create or replace function public.get_sala_detalhe(p_id uuid)
returns table (
  id uuid, titulo text, descricao text, equipamentos text[],
  preco_valor numeric, preco_unidade text, disponibilidade jsonb,
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
           s.preco_valor, s.preco_unidade::text, s.disponibilidade,
           s.politica_cancelamento::text, s.fotos,
           e.nome_clinica::text, e.cidade::text, e.bairro::text, e.estado::text,
           e.latitude, e.longitude, s.created_at,
           coalesce(e.whatsapp, e.telefone)::text, null::text,
           e.logradouro::text, e.numero::text, e.complemento::text, e.cep::text,
           e.slug, s.numero_na_clinica
      from public.salas s
      join public.curadentespro c           on c.id = s.anfitriao_id
      join public.curadentespro_enderecos e on e.id = s.endereco_id
     where s.id = p_id
       and s.status = 'ativa'
       and c.cro_verificado is true
       and c.deleted_at is null;
end; $$;
revoke all on function public.get_sala_detalhe(uuid) from public;
grant execute on function public.get_sala_detalhe(uuid) to authenticated;

-- ─── 6. get_clinica_por_slug: dados da clínica para a página /coworking/[slug] ─────
-- Members-only. Devolve a clínica (com fachada/recepção + contato) se ela tiver ao
-- menos uma sala ativa. As salas em si vêm de salas_publicas (filtrando clinica_slug).
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
