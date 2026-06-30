-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — DIÁRIA: a sala passa a ter, além do valor por HORA, um valor de DIÁRIA
-- (opcional). Aditivo. Reexpõe a view e o get_sala_detalhe incluindo preco_diaria.
-- Rode no SQL Editor. Idempotente.
-- ════════════════════════════════════════════════════════════════════════════════

alter table public.salas
  add column if not exists preco_diaria numeric(10,2) check (preco_diaria is null or preco_diaria >= 0);

-- View pública: + preco_diaria (mesmas colunas de antes).
drop view if exists public.salas_publicas;
create view public.salas_publicas as
  select s.id, s.titulo, s.descricao, s.equipamentos, s.preco_valor, s.preco_unidade,
         s.preco_diaria, s.disponibilidade, s.politica_cancelamento, s.fotos, s.numero_na_clinica,
         e.nome_clinica, e.cidade, e.bairro, e.estado, e.latitude, e.longitude,
         e.slug as clinica_slug, s.created_at
    from public.salas s
    join public.curadentespro c            on c.id = s.anfitriao_id
    join public.curadentespro_enderecos e  on e.id = s.endereco_id
   where s.status = 'ativa'
     and c.cro_verificado is true and c.deleted_at is null;
grant select on public.salas_publicas to anon, authenticated;

-- Detalhe members-only: + preco_diaria (DROP antes — muda o RETURNS TABLE).
drop function if exists public.get_sala_detalhe(uuid);
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
           e.slug, s.numero_na_clinica
      from public.salas s
      join public.curadentespro c           on c.id = s.anfitriao_id
      join public.curadentespro_enderecos e on e.id = s.endereco_id
     where s.id = p_id and s.status = 'ativa'
       and c.cro_verificado is true and c.deleted_at is null;
end; $$;
revoke all on function public.get_sala_detalhe(uuid) from public;
grant execute on function public.get_sala_detalhe(uuid) to authenticated;
