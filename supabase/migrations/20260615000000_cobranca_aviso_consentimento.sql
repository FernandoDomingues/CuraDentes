-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Consentimento de ciência da cobrança futura (CuraDentes Pro)
--
-- O CuraDentes Pro é gratuito durante o Beta e passa a ser pago (R$ 48/mês por
-- dentista) a partir de 01/07/2027 — conforme a seção 5 dos Termos de Uso.
-- No cadastro, o dentista marca uma checkbox OBRIGATÓRIA dando ciência disso.
-- Guardamos esse aceite (e a data) como prova, separado do aceite da LGPD.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.curadentespro
  ADD COLUMN IF NOT EXISTS cobranca_aviso_aceita boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cobranca_aviso_aceita_em timestamptz;

COMMENT ON COLUMN public.curadentespro.cobranca_aviso_aceita IS
  'Dentista deu ciência, no cadastro, de que o CuraDentes Pro passa a ser pago (R$ 48/mês) a partir de 01/07/2027.';
COMMENT ON COLUMN public.curadentespro.cobranca_aviso_aceita_em IS
  'Data/hora em que o dentista deu a ciência da cobrança futura (prova de consentimento).';
