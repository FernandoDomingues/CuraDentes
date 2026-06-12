-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Controle do lembrete de cadastro incompleto
--
-- O cadastro do dentista e progressivo/retomavel. Se ele comecar e nao finalizar
-- em 20 min, um job (edge function lembrete-cadastro, agendada via pg_cron) envia
-- um email lembrando das pendencias que impedem o perfil de aparecer no site.
--
-- Estas colunas evitam reenvio: marcamos quando o lembrete foi enviado.
-- O agendamento (cron.schedule) e o segredo (guardado em app_config, lido pelo
-- service_role) ficam fora do versionamento, pois carregam credenciais.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.curadentespro
  ADD COLUMN IF NOT EXISTS lembrete_cadastro_enviado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lembrete_cadastro_enviado_em timestamptz;
