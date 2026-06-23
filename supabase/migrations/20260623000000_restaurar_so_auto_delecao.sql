-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: restaurar_minha_conta_dentista só restaura AUTO-exclusões
--
-- Contexto: a verificação de CRO marca o perfil como "rejeitado/inativo" ocultando-o
-- via soft-delete (marcar_verificacao_cro grava deleted_at = now() e
-- deleted_by = <superuser>). Mas restaurar_minha_conta_dentista() — chamada no login
-- do dentista — zerava deleted_at de QUALQUER soft-delete, fazendo o perfil rejeitado
-- voltar a aparecer assim que o dentista logasse de novo.
--
-- Correção: só restaurar quando a exclusão foi do PRÓPRIO dentista
-- (deleted_by = auth.uid()). Perfis ocultados pelo admin por CRO rejeitada/inativa
-- permanecem ocultos até o admin marcar como "Verificado" (que zera deleted_at).
-- ═══════════════════════════════════════════════════════════════════════════════

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
    WHERE id = v_uid
      AND deleted_at IS NOT NULL
      AND deleted_by = v_uid;  -- só a auto-exclusão; rejeição de CRO (admin) permanece

  RETURN FOUND; -- true se havia uma conta auto-excluída e foi restaurada
END;
$$;

REVOKE ALL ON FUNCTION public.restaurar_minha_conta_dentista() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restaurar_minha_conta_dentista() TO authenticated;
