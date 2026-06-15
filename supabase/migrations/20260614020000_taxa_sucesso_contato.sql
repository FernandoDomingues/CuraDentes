-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Taxa de sucesso = buscadores que viraram contato (WhatsApp/ligação)
--
-- Redefinição da "Taxa sucesso" do painel analytics: sucesso é quando um usuário
-- que FEZ alguma busca depois CLICA em WhatsApp ou ligação (telefone) — contado
-- por usuário distinto (independe de quantas buscas ele fez). Também devolve o
-- recorte por canal (quantos sucessos via WhatsApp e quantos via telefone).
--
-- Liga logs_busca.user_id × perfil_contatos.viewer_id, na janela de p_dias.
-- SECURITY DEFINER + gate de superuser (só o admin vê analytics). Só retorna
-- contagens agregadas (sem PII).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.taxa_sucesso_contato(p_dias int DEFAULT 30)
RETURNS TABLE(buscaram bigint, sucesso bigint, sucesso_whatsapp bigint, sucesso_telefone bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ini timestamptz := now() - (p_dias || ' days')::interval;
BEGIN
  IF NOT public.is_superuser() THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY
  WITH buscadores AS (
    SELECT DISTINCT user_id AS uid
    FROM public.logs_busca
    WHERE user_id IS NOT NULL AND criado_em >= v_ini
  ),
  contatos AS (
    SELECT DISTINCT pc.viewer_id AS uid, pc.tipo
    FROM public.perfil_contatos pc
    WHERE pc.viewer_id IS NOT NULL
      AND pc.criado_em >= v_ini
      AND pc.tipo IN ('whatsapp', 'telefone')
      AND pc.viewer_id IN (SELECT uid FROM buscadores)
  )
  SELECT
    (SELECT count(*) FROM buscadores),
    (SELECT count(DISTINCT uid) FROM contatos),
    (SELECT count(DISTINCT uid) FROM contatos WHERE tipo = 'whatsapp'),
    (SELECT count(DISTINCT uid) FROM contatos WHERE tipo = 'telefone');
END;
$$;

REVOKE ALL ON FUNCTION public.taxa_sucesso_contato(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.taxa_sucesso_contato(int) TO authenticated;
