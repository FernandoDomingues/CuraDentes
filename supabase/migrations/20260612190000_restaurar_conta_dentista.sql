-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Restauração de conta no período de soft-delete
--
-- Como a exclusão é SOFT (a conta de auth continua existindo), ao logar de novo
-- o dentista deve poder RESTAURAR o perfil — basta zerar deleted_at/deleted_by —
-- em vez de ser mandado criar uma conta nova.
--
-- 1. apagar_minha_conta_dentista() passa a NÃO apagar o CPF (mantém durante o
--    soft-delete, para a restauração ser completa). Um expurgo futuro removeria
--    de vez após o período de retenção.
-- 2. restaurar_minha_conta_dentista() zera os flags do próprio perfil.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Exclusão sem apagar o CPF (mantém para restauração) ──────────────────
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

  -- Soft-delete do perfil: some do público na hora (RLS filtra deleted_at).
  -- O CPF e os endereços ficam retidos durante o período de soft-delete para que
  -- a restauração (re-login) traga a conta de volta inteira.
  UPDATE public.curadentespro
    SET deleted_at = now(), deleted_by = v_uid
    WHERE id = v_uid AND deleted_at IS NULL;
END;
$$;

-- ─── 2. Restauração da própria conta ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.restaurar_minha_conta_dentista()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.curadentespro
    SET deleted_at = NULL, deleted_by = NULL
    WHERE id = v_uid AND deleted_at IS NOT NULL;

  RETURN FOUND; -- true se havia uma conta soft-deletada e foi restaurada
END;
$$;

REVOKE ALL ON FUNCTION public.restaurar_minha_conta_dentista() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restaurar_minha_conta_dentista() TO authenticated;
