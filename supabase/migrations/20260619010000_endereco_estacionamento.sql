-- ═══════════════════════════════════════════════════════════════════════════════
-- Endereço: campo "estacionamento" (boolean)
--
-- O dentista informa, por endereço, se o local tem estacionamento (Sim/Não).
-- Exibido no perfil público (antes da agenda), junto das "Informações do endereço"
-- (coluna observacoes, já existente — limitada a 300 caracteres no front-end).
--
-- Idempotente (IF NOT EXISTS); default false.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.curadentespro_enderecos
  ADD COLUMN IF NOT EXISTS estacionamento boolean DEFAULT false;
