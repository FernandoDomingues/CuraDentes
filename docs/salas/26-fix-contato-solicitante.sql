-- ════════════════════════════════════════════════════════════════════════════════
-- Fix 42804 — "structure of query does not match function result type"
-- na RPC contato_solicitante (anfitrião vê o contato do solicitante em /pro/negocios).
--
-- Causa: RETURNS TABLE (... text ...) NÃO coage varchar→text. As colunas nome/telefone/
-- email de curadentespro são varchar → precisam de ::text (mesmo padrão do 14-fix-tipos-text).
-- Só muda o SELECT final (adiciona ::text). Idempotente. Não toca dados.
-- ════════════════════════════════════════════════════════════════════════════════

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
  return query select c.nome::text, c.telefone::text, c.email::text
    from public.curadentespro c where c.id = v_loc;
end; $$;
revoke all on function public.contato_solicitante(uuid) from public;
grant execute on function public.contato_solicitante(uuid) to authenticated;
