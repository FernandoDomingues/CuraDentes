-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION (aditiva): RPCs para ler email/telefone de dentista SEM expor as
-- colunas via REST. Acompanha a migration que revoga o SELECT público desses
-- campos em curadentespro (proteger_contato_dentista). Mesma técnica do meu_cpf().
--
-- Ordem segura de deploy: esta migration (aditiva) -> deploy do frontend que passa
-- a usar as RPCs -> migration de REVOKE. Assim nunca há janela de quebra.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Dono lê o PRÓPRIO telefone (nunca o de outros) ──────────────────────────
CREATE OR REPLACE FUNCTION public.meu_telefone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT telefone FROM public.curadentespro WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.meu_telefone() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.meu_telefone() TO authenticated;

-- ─── Superuser lê os emails dos dentistas (fila de verificação de CRO) ────────
CREATE OR REPLACE FUNCTION public.emails_dentistas_cro()
RETURNS TABLE (id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superuser() THEN
    RAISE EXCEPTION 'nao autorizado';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email
    FROM public.curadentespro p
    WHERE p.cro IS NOT NULL AND p.cro <> '';
END;
$$;

REVOKE ALL ON FUNCTION public.emails_dentistas_cro() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emails_dentistas_cro() TO authenticated;
