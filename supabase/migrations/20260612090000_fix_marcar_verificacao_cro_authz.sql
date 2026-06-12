-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Corrige escalada de privilégio em marcar_verificacao_cro + helper is_superuser()
--
-- PROBLEMA (falha #1 da auditoria 2026-06-11):
--   marcar_verificacao_cro é SECURITY DEFINER (bypassa RLS) e está concedida a
--   TODOS os 'authenticated', mas NÃO validava o superuser dentro do corpo — o
--   comentário antigo dizia que validava, mas não validava. Como a função faz
--   deleted_at = now() quando p_verificado=false, qualquer dentista logado podia
--   soft-deletar/desverificar o perfil de qualquer concorrente.
--
-- CORREÇÃO:
--   1. Cria helper public.is_superuser() (fonte única da verdade do email admin).
--   2. Adiciona o gate de autorização DENTRO de marcar_verificacao_cro.
--   3. Reescreve as policies de cro_verificacoes para usar is_superuser()
--      (elimina o email hardcoded duplicado em várias policies — falha #6).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Helper: is_superuser() ───────────────────────────────────────────────
-- Fonte única da verdade. Para trocar o admin no futuro, altere SÓ esta função.
-- COALESCE(..., false) garante retorno NÃO-NULL (evita que `IF NOT is_superuser()`
-- caia em NULL e libere indevidamente).

CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    LOWER(COALESCE(
      auth.jwt() ->> 'email',
      auth.jwt() -> 'user_metadata' ->> 'email',
      auth.jwt() -> 'app_metadata' ->> 'email'
    )) = 'fernandodomingues@live.com',
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_superuser() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superuser() TO authenticated, anon;

-- ─── 2. Função marcar_verificacao_cro com gate de autorização ────────────────

CREATE OR REPLACE FUNCTION public.marcar_verificacao_cro(
  p_dentista_id UUID,
  p_verificado BOOLEAN,
  p_observacao TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verificacao_id UUID;
  v_status TEXT;
  v_result JSONB;
BEGIN
  -- ── AUTORIZAÇÃO: somente o superuser pode executar ──────────────────────────
  IF NOT public.is_superuser() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Não autorizado: apenas o administrador pode verificar CRO.'
    );
  END IF;

  -- ── Lógica original (inalterada) ────────────────────────────────────────────
  v_status := CASE WHEN p_verificado THEN 'verificado' ELSE 'falhou' END;

  INSERT INTO public.cro_verificacoes (dentista_id, cro, uf, status, verificado_em, observacao, verificado_por, erro)
  SELECT
    p_dentista_id,
    p.cro,
    upper(split_part(p.cro, '-', 2)),
    v_status,
    CASE WHEN p_verificado THEN now() ELSE NULL END,
    p_observacao,
    auth.uid(),
    CASE WHEN NOT p_verificado THEN 'Falha na verificação manual' ELSE NULL END
  FROM public.curadentespro p
  WHERE p.id = p_dentista_id
  ON CONFLICT (dentista_id) DO UPDATE SET
    status = v_status,
    verificado_em = CASE WHEN p_verificado THEN now() ELSE NULL END,
    verificado_por = auth.uid(),
    observacao = COALESCE(p_observacao, EXCLUDED.observacao),
    erro = CASE WHEN NOT p_verificado THEN 'Falha na verificação manual' ELSE NULL END,
    atualizado_em = now()
  RETURNING id INTO v_verificacao_id;

  UPDATE public.curadentespro
  SET
    cro_verificado = p_verificado,
    deleted_at = CASE WHEN NOT p_verificado THEN now() ELSE NULL END,
    deleted_by = CASE WHEN NOT p_verificado THEN auth.uid() ELSE NULL END
  WHERE id = p_dentista_id;

  v_result := jsonb_build_object(
    'success', true,
    'verificacao_id', v_verificacao_id,
    'status', v_status
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_verificacao_cro(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_verificacao_cro(UUID, BOOLEAN, TEXT) TO authenticated;

-- ─── 3. Reescreve policies de cro_verificacoes usando is_superuser() ─────────

DROP POLICY IF EXISTS "superuser_select_cro_verificacoes" ON public.cro_verificacoes;
CREATE POLICY "superuser_select_cro_verificacoes"
  ON public.cro_verificacoes
  FOR SELECT
  TO authenticated
  USING (public.is_superuser());

DROP POLICY IF EXISTS "superuser_insert_cro_verificacoes" ON public.cro_verificacoes;
CREATE POLICY "superuser_insert_cro_verificacoes"
  ON public.cro_verificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_superuser());

DROP POLICY IF EXISTS "superuser_update_cro_verificacoes" ON public.cro_verificacoes;
CREATE POLICY "superuser_update_cro_verificacoes"
  ON public.cro_verificacoes
  FOR UPDATE
  TO authenticated
  USING (public.is_superuser())
  WITH CHECK (public.is_superuser());

-- ─── 4. Centraliza também a policy de superuser em logs_busca ─────────────────

DROP POLICY IF EXISTS "superuser_select_logs_busca" ON public.logs_busca;
CREATE POLICY "superuser_select_logs_busca"
  ON public.logs_busca
  FOR SELECT
  TO authenticated
  USING (public.is_superuser());
