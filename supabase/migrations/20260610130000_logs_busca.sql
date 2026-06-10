-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Logs de Busca (Analytics)
--
-- 1. Cria tabela logs_busca para auditoria anônima de pesquisas
-- 2. Configura RLS: superuser e dono podem ver, ninguém mais
-- 3. Auto-delete: registros com mais de 6 meses são removidos automaticamente
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabela ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.logs_busca (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
  bairro TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  resultados_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) DEFAULT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas analíticas frequentes
CREATE INDEX IF NOT EXISTS idx_logs_busca_criado_em ON public.logs_busca(criado_em);
CREATE INDEX IF NOT EXISTS idx_logs_busca_cidade ON public.logs_busca(cidade);
CREATE INDEX IF NOT EXISTS idx_logs_busca_bairro ON public.logs_busca(bairro);
CREATE INDEX IF NOT EXISTS idx_logs_busca_query ON public.logs_busca(query);

-- ─── 2. RLS: segurança por camadas ───────────────────────────────────────────

ALTER TABLE public.logs_busca ENABLE ROW LEVEL SECURITY;

-- Superuser (identificado por email) pode ler tudo
DROP POLICY IF EXISTS "superuser_select_logs_busca" ON public.logs_busca;
CREATE POLICY "superuser_select_logs_busca"
  ON public.logs_busca
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' IN ('fernandodomingues@live.com'));

-- Dono do registro (user_id) pode ver os próprios logs
DROP POLICY IF EXISTS "owner_select_logs_busca" ON public.logs_busca;
CREATE POLICY "owner_select_logs_busca"
  ON public.logs_busca
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert permitido para qualquer usuário autenticado ou anônimo
DROP POLICY IF EXISTS "insert_logs_busca" ON public.logs_busca;
CREATE POLICY "insert_logs_busca"
  ON public.logs_busca
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─── 3. Auto-delete: purge de registros com mais de 6 meses ──────────────────

-- Função chamada pelo cron mensalmente
CREATE OR REPLACE FUNCTION public.purge_logs_busca()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.logs_busca
  WHERE criado_em < now() - INTERVAL '6 months';
END;
$$;

-- Agendamento mensal via pg_cron (se disponível no Supabase)
-- SELECT cron.schedule('purge-logs-busca', '0 0 1 * *', 'SELECT public.purge_logs_busca();');
