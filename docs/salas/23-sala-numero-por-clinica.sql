-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — numero_na_clinica POR CLÍNICA INTEIRA (clinica_key), não por endereco_id.
--
-- Motivo: dois dentistas na MESMA clínica (mesmo clinica_key = CEP+número+complemento)
-- têm endereco_id DIFERENTES. O trigger antigo numerava por endereco_id → a 1ª sala de
-- cada dentista nascia "Sala 01" (colisão). Agora numera pela CLÍNICA toda: se A já tem
-- a Sala 01, a sala de B nasce Sala 02.
--
-- Idempotente. Requer clinica_key_de() (docs/salas/17-clinica-key.sql). Não perde dados.
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 1) Trigger: próximo número = max(numero_na_clinica) da CLÍNICA + 1 ────────────
create or replace function public.sala_numero() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_chave text;
begin
  if new.numero_na_clinica is null then
    select public.clinica_key_de(e.cep, e.numero, e.complemento) into v_chave
      from public.curadentespro_enderecos e where e.id = new.endereco_id;
    select coalesce(max(s.numero_na_clinica), 0) + 1 into new.numero_na_clinica
      from public.salas s
      join public.curadentespro_enderecos e on e.id = s.endereco_id
     where public.clinica_key_de(e.cep, e.numero, e.complemento) = v_chave;
  end if;
  return new;
end; $$;

-- ─── 2) RPC: qual número uma NOVA sala teria naquela clínica (para o formulário) ───
create or replace function public.proximo_numero_sala(p_endereco_id uuid)
returns integer
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_chave text;
begin
  select public.clinica_key_de(e.cep, e.numero, e.complemento) into v_chave
    from public.curadentespro_enderecos e where e.id = p_endereco_id;
  if v_chave is null then return 1; end if;
  return coalesce((
    select max(s.numero_na_clinica)
      from public.salas s
      join public.curadentespro_enderecos e on e.id = s.endereco_id
     where public.clinica_key_de(e.cep, e.numero, e.complemento) = v_chave
  ), 0) + 1;
end; $$;
revoke all on function public.proximo_numero_sala(uuid) from public;
grant execute on function public.proximo_numero_sala(uuid) to authenticated;

-- ─── 3) Backfill: renumera as salas por CLÍNICA, na ordem de criação (a mais antiga
--         = 01), corrigindo colisões de dentistas que compartilham a clínica. ───────
-- Solta o índice único (endereco_id, numero) durante a renumeração para não violar
-- estados intermediários; recria no fim (após o backfill os números são únicos por
-- clínica → também únicos dentro de cada endereco_id).
drop index if exists public.salas_endereco_numero_uidx;

with numeradas as (
  select s.id,
         row_number() over (
           partition by public.clinica_key_de(e.cep, e.numero, e.complemento)
           order by s.created_at, s.id
         )::smallint as rn
    from public.salas s
    join public.curadentespro_enderecos e on e.id = s.endereco_id
)
update public.salas s
   set numero_na_clinica = n.rn
  from numeradas n
 where n.id = s.id
   and s.numero_na_clinica is distinct from n.rn;

create unique index if not exists salas_endereco_numero_uidx
  on public.salas(endereco_id, numero_na_clinica);

-- ─── Conferência (opcional): números por clínica ──────────────────────────────────
-- select public.clinica_key_de(e.cep, e.numero, e.complemento) as clinica,
--        s.numero_na_clinica, s.titulo, c.nome as dentista
--   from public.salas s
--   join public.curadentespro_enderecos e on e.id = s.endereco_id
--   join public.curadentespro c on c.id = s.anfitriao_id
--  order by clinica, s.numero_na_clinica;
