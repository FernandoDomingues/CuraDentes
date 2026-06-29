-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — PAINEL: contato do solicitante + pendência de pagamento (aditivo)
-- Rodar no SQL Editor do Supabase. Idempotente. Não toca dados existentes.
-- ════════════════════════════════════════════════════════════════════════════════

-- 1) contato_solicitante: o LOCADOR (anfitrião) de uma solicitação vê o contato do
--    SOLICITANTE (locatário) — inclusive ANTES de decidir, para conversar. Gated:
--    só o anfitrião daquela solicitação, e ambos com CRO verificado (comunidade).
--    PII (telefone/email) lida via SECURITY DEFINER (nunca via REST).
create or replace function public.contato_solicitante(p_id uuid)
returns table (nome text, telefone text, email text)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_anf uuid; v_loc uuid;
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  select anfitriao_id, locatario_id into v_anf, v_loc
    from public.solicitacoes_reserva where id = p_id;
  if v_anf is null then raise exception 'Solicitacao inexistente.'; end if;
  if v_anf <> v_uid then raise exception 'Apenas o anfitriao da sala pode ver o contato.'; end if;
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null)
     or not exists (select 1 from public.curadentespro c
                    where c.id = v_loc and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Contato indisponivel.';
  end if;
  return query select c.nome, c.telefone, c.email from public.curadentespro c where c.id = v_loc;
end; $$;
revoke all on function public.contato_solicitante(uuid) from public;
grant execute on function public.contato_solicitante(uuid) to authenticated;

-- 2) pagamento_resolvido: o DONO DA SALA (anfitrião) confirma que recebeu o pagamento
--    (off-platform). Só faz sentido após aprovação. Vira histórico depois.
--    NOTA: se você já rodou a versão anterior (gate no locatário), rode 08-pagamento-locador.sql.
alter table public.solicitacoes_reserva
  add column if not exists pagamento_resolvido boolean not null default false;

create or replace function public.marcar_pagamento_resolvido(p_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_anf uuid; v_status text;
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  select anfitriao_id, status into v_anf, v_status
    from public.solicitacoes_reserva where id = p_id;
  if v_anf is null then raise exception 'Solicitacao inexistente.'; end if;
  if v_anf <> v_uid then raise exception 'Apenas o dono da sala pode confirmar o pagamento.'; end if;
  if v_status <> 'aprovada' then raise exception 'So apos a aprovacao.'; end if;
  update public.solicitacoes_reserva set pagamento_resolvido = true where id = p_id;
end; $$;
revoke all on function public.marcar_pagamento_resolvido(uuid) from public;
grant execute on function public.marcar_pagamento_resolvido(uuid) to authenticated;
