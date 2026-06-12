-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Visualizações de perfil = 1 por dia por conta logada
--
-- Regra de negócio: cada conta LOGADA conta no máximo 1 visualização por dia por
-- dentista (10 acessos no mesmo dia = 1). Acessos SEM login não são contabilizados.
--
-- Implementação: registramos quem visualizou (viewer_id) e o dia (data_visita,
-- no fuso de São Paulo). Constraint única (dentista_id, viewer_id, data_visita)
-- + ON CONFLICT DO NOTHING garante 1 por dia. RLS de INSERT só para authenticated.
-- (Tabela está vazia — nada a migrar.)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.perfil_visualizacoes
  ADD COLUMN IF NOT EXISTS viewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS data_visita date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date;

-- Registros do modelo antigo (page-views sem visitante identificado) não se
-- encaixam na nova regra — removidos para recontar do zero por conta logada.
DELETE FROM public.perfil_visualizacoes WHERE viewer_id IS NULL;

ALTER TABLE public.perfil_visualizacoes ALTER COLUMN viewer_id SET NOT NULL;

-- 1 registro por (dentista, visitante, dia)
ALTER TABLE public.perfil_visualizacoes
  DROP CONSTRAINT IF EXISTS uq_visualizacao_dentista_viewer_dia;
ALTER TABLE public.perfil_visualizacoes
  ADD CONSTRAINT uq_visualizacao_dentista_viewer_dia UNIQUE (dentista_id, viewer_id, data_visita);

-- ─── Permissões: só conta logada registra; anon não conta ────────────────────
REVOKE INSERT ON public.perfil_visualizacoes FROM anon;
REVOKE USAGE ON SEQUENCE public.perfil_visualizacoes_id_seq FROM anon;

DROP POLICY IF EXISTS "insert_visualizacoes" ON public.perfil_visualizacoes;
CREATE POLICY "insert_visualizacoes" ON public.perfil_visualizacoes
  FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());
