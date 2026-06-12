-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: RPC para o dentista excluir a propria conta (LGPD)
--
-- Soft-delete do perfil (some do publico imediatamente via RLS deleted_at) e
-- remocao definitiva do CPF (dado sensivel). SECURITY DEFINER + auth.uid()
-- garantem que o usuario so apaga a PROPRIA conta.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.apagar_minha_conta_dentista()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Soft-delete do perfil: some do publico na hora (RLS filtra deleted_at)
  UPDATE public.curadentespro
    SET deleted_at = now(), deleted_by = v_uid
    WHERE id = v_uid AND deleted_at IS NULL;

  -- Remove o CPF de forma definitiva (LGPD — dado sensivel)
  DELETE FROM public.curadentespro_cpf WHERE curadentespro_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.apagar_minha_conta_dentista() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apagar_minha_conta_dentista() TO authenticated;
