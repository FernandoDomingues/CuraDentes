-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: link de avaliação do Google Meu Negócio do dentista (opcional)
--
-- Usado no CTA "Avaliar também no Google" exibido após o paciente avaliar no
-- CuraDentes. O dentista cola o LINK de avaliação do Google (ou o Place ID);
-- o app normaliza para o deep link de "escrever avaliação". É um link público
-- (feito para ser compartilhado), então pode ser lido no perfil público.
--
-- RLS: o dentista já pode atualizar o próprio registro (owner_update_curadentespro),
-- então nenhuma policy nova é necessária.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.curadentespro
  ADD COLUMN IF NOT EXISTS google_review_url TEXT;
