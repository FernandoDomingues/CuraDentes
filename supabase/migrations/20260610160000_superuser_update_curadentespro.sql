-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Superuser CRO verification operations
--
-- 1. Adiciona coluna verificado_em em cro_verificacoes
-- 2. Unique constraint em dentista_id (1 verificação por dentista)
-- 3. RLS policies corrigidas (email em qualquer campo do JWT, case-insensitive)
-- 4. Função SECURITY DEFINER marcar_verificacao_cro (bypass RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Coluna verificado_em ─────────────────────────────────────────────────

ALTER TABLE public.cro_verificacoes
  ADD COLUMN IF NOT EXISTS verificado_em TIMESTAMPTZ DEFAULT NULL;

-- ─── 2. Unique constraint: 1 verificação por dentista ────────────────────────

ALTER TABLE public.cro_verificacoes
  DROP CONSTRAINT IF EXISTS uq_cro_verificacoes_dentista;

ALTER TABLE public.cro_verificacoes
  ADD CONSTRAINT uq_cro_verificacoes_dentista UNIQUE (dentista_id);

-- ─── 2. Corrige RLS policies para aceitar email em qualquer campo do JWT ────

DROP POLICY IF EXISTS "superuser_select_cro_verificacoes" ON public.cro_verificacoes;
CREATE POLICY "superuser_select_cro_verificacoes"
  ON public.cro_verificacoes
  FOR SELECT
  TO authenticated
  USING (
    LOWER(COALESCE(
      auth.jwt() ->> 'email',
      auth.jwt() -> 'user_metadata' ->> 'email',
      auth.jwt() -> 'app_metadata' ->> 'email'
    )) IN ('fernandodomingues@live.com')
  );

DROP POLICY IF EXISTS "superuser_insert_cro_verificacoes" ON public.cro_verificacoes;
CREATE POLICY "superuser_insert_cro_verificacoes"
  ON public.cro_verificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    LOWER(COALESCE(
      auth.jwt() ->> 'email',
      auth.jwt() -> 'user_metadata' ->> 'email',
      auth.jwt() -> 'app_metadata' ->> 'email'
    )) IN ('fernandodomingues@live.com')
  );

DROP POLICY IF EXISTS "superuser_update_cro_verificacoes" ON public.cro_verificacoes;
CREATE POLICY "superuser_update_cro_verificacoes"
  ON public.cro_verificacoes
  FOR UPDATE
  TO authenticated
  USING (
    LOWER(COALESCE(
      auth.jwt() ->> 'email',
      auth.jwt() -> 'user_metadata' ->> 'email',
      auth.jwt() -> 'app_metadata' ->> 'email'
    )) IN ('fernandodomingues@live.com')
  )
  WITH CHECK (
    LOWER(COALESCE(
      auth.jwt() ->> 'email',
      auth.jwt() -> 'user_metadata' ->> 'email',
      auth.jwt() -> 'app_metadata' ->> 'email'
    )) IN ('fernandodomingues@live.com')
  );

-- ─── 2. Função para marcar verificação (bypass RLS via SECURITY DEFINER) ────
--
-- Uso: SELECT marcar_verificacao_cro('dentista-uuid', true, 'observacao');
-- Retorna: JSON com { success: true } ou erro

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
  v_status := CASE WHEN p_verificado THEN 'verificado' ELSE 'falhou' END;

  -- Upsert: insere ou atualiza a verificação (unique constraint em dentista_id)
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

  -- Atualiza flag na tabela principal
  UPDATE public.curadentespro
  SET cro_verificado = p_verificado
  WHERE id = p_dentista_id;

  v_result := jsonb_build_object(
    'success', true,
    'verificacao_id', v_verificacao_id,
    'status', v_status
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Permissão: qualquer usuário autenticado pode chamar (a função verifica o email internamente)
REVOKE ALL ON FUNCTION public.marcar_verificacao_cro(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_verificacao_cro(UUID, BOOLEAN, TEXT) TO authenticated;
