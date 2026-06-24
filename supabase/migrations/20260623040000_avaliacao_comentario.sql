-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: comentário opcional na avaliação (máx. 300 caracteres)
--
-- Quando o dentista não tem Google Meu Negócio, o paciente pode deixar um
-- comentário junto da nota — guardado no NOSSO banco. Exibido no perfil em um
-- balãozinho ao passar o mouse sobre a nota/foto do avaliador.
--
-- O CHECK garante o limite de 300 no banco (além do maxLength no formulário).
-- RLS/grants: a coluna nova é coberta pelos privilégios de tabela já existentes
-- (o paciente já insere a própria avaliação) — nada a alterar.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS comentario TEXT;

ALTER TABLE public.avaliacoes
  DROP CONSTRAINT IF EXISTS avaliacoes_comentario_len;
ALTER TABLE public.avaliacoes
  ADD CONSTRAINT avaliacoes_comentario_len
  CHECK (comentario IS NULL OR char_length(comentario) <= 300);
