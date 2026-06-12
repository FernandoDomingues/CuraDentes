-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Pronome de tratamento do dentista (Dr. / Dra.)
--
-- Exibido antes do nome no perfil (ex.: "Dr. Luiz"). Escolhido no cadastro e
-- editável depois. Coluna pública (coberta pelo GRANT SELECT da tabela).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.curadentespro
  ADD COLUMN IF NOT EXISTS tratamento text
  CHECK (tratamento IS NULL OR tratamento IN ('Dr.', 'Dra.'));
