-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Adiciona nome_completo para verificação de CRO
--
-- 1. Adiciona coluna nome_completo em curadentespro
-- 2. Popula com o nome existente para registros atuais
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.curadentespro
  ADD COLUMN IF NOT EXISTS nome_completo TEXT;

-- Popula nome_completo com o nome existente (backfill)
UPDATE public.curadentespro
SET nome_completo = COALESCE(nome_completo, nome)
WHERE nome IS NOT NULL AND nome_completo IS NULL;
