-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Soft Delete (deleted_at) — 2026-06-10
--
-- 1. Adiciona coluna deleted_at + deleted_by em curadentespro e clientes
-- 2. Atualiza RLS policies para filtrar registros deletados
-- 3. Cria função apagar_dados_cliente() para LGPD (right to be forgotten)
-- ═══════════════════════════════════════════════════════════════════════════════
-- IDEMPOTENTE: pode rodar quantas vezes quiser sem erro.

-- ─── 1. Colunas (IF NOT EXISTS = seguro reexecutar) ──────────────────────────

ALTER TABLE public.curadentespro
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;

-- ─── 2. Índices para performance nas consultas ────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_curadentespro_deleted_at ON public.curadentespro(deleted_at);
CREATE INDEX IF NOT EXISTS idx_clientes_deleted_at ON public.clientes(deleted_at);

-- ─── 3. Atualiza RLS policies — curadentespro ────────────────────────────────
--
-- DROP IF EXISTS + CREATE = sempre atualiza sem erro.

DROP POLICY IF EXISTS "anon_select_curadentespro" ON public.curadentespro;
CREATE POLICY "anon_select_curadentespro"
  ON public.curadentespro
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL AND lgpd_aceito = true);

DROP POLICY IF EXISTS "owner_select_curadentespro" ON public.curadentespro;
CREATE POLICY "owner_select_curadentespro"
  ON public.curadentespro
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND id = auth.uid());

DROP POLICY IF EXISTS "owner_update_curadentespro" ON public.curadentespro;
CREATE POLICY "owner_update_curadentespro"
  ON public.curadentespro
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "owner_insert_curadentespro" ON public.curadentespro;
CREATE POLICY "owner_insert_curadentespro"
  ON public.curadentespro
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ─── 4. Atualiza RLS policies — clientes ─────────────────────────────────────

DROP POLICY IF EXISTS "owner_select_clientes" ON public.clientes;
CREATE POLICY "owner_select_clientes"
  ON public.clientes
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND id = auth.uid());

DROP POLICY IF EXISTS "owner_insert_clientes" ON public.clientes;
CREATE POLICY "owner_insert_clientes"
  ON public.clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "owner_update_clientes" ON public.clientes;
CREATE POLICY "owner_update_clientes"
  ON public.clientes
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid() AND deleted_at IS NULL);

-- ─── 5. Função apagar_dados_cliente (Right to be forgotten — LGPD) ───────────

CREATE OR REPLACE FUNCTION public.apagar_dados_cliente()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  UPDATE public.clientes
  SET deleted_at = now(), deleted_by = v_user_id
  WHERE id = v_user_id AND deleted_at IS NULL;

  UPDATE public.curadentespro
  SET deleted_at = now(), deleted_by = v_user_id
  WHERE id = v_user_id AND deleted_at IS NULL;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apagar_dados_cliente() FROM anon;
GRANT EXECUTE ON FUNCTION public.apagar_dados_cliente() TO authenticated;
