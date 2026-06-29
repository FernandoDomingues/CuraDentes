-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — SLOTS OCUPADOS (aditivo). Rode no SQL Editor. Idempotente.
--
-- Devolve os horários JÁ ALOCADOS (reservas aprovadas) de uma sala, para o calendário
-- pintar de outra cor / bloquear. Members-only (só dentista verificado). Devolve só
-- as faixas de horário — NUNCA quem reservou (sem identidade).
-- ════════════════════════════════════════════════════════════════════════════════

create or replace function public.slots_ocupados_sala(p_sala_id uuid)
returns table (data date, hora_inicio time, hora_fim time)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  -- A vitrine é fechada: só dentista com CRO verificado consulta a agenda.
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Apenas dentistas verificados.';
  end if;
  return query
    select sr.data, sr.hora_inicio, sr.hora_fim
      from public.solicitacoes_reserva sr
     where sr.sala_id = p_sala_id
       and sr.status = 'aprovada'
       and sr.data >= current_date;   -- só do presente em diante
end; $$;
revoke all on function public.slots_ocupados_sala(uuid) from public;
grant execute on function public.slots_ocupados_sala(uuid) to authenticated;
