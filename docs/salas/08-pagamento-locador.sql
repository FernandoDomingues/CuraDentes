-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — CORREÇÃO: quem confirma o pagamento é o DONO DA SALA (anfitrião), não o
-- locatário. Rode no SQL Editor (substitui a versão do 06-painel.sql). Idempotente.
-- ════════════════════════════════════════════════════════════════════════════════

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
