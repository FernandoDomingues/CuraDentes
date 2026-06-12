-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Régua de reativação escalonada do cadastro incompleto
--
-- Substitui o booleano lembrete_cadastro_enviado por um controle de ETAPA, para
-- enviar lembretes escalonados e, por fim, excluir o pré-cadastro abandonado:
--
--   etapa 0  -> nenhum lembrete enviado ainda
--   etapa 1  -> 20 minutos   (lembrete de pendências)
--   etapa 2  -> 1 dia        (lembrete)
--   etapa 3  -> 1 semana     (lembrete)
--   etapa 4  -> 1 mês        (último lembrete)
--   etapa 5  -> 1 mês + 1 dia (email de exclusão; perfil e login são apagados)
--
-- A edge function lembrete-cadastro (cron) lê a etapa atual e a idade do cadastro
-- (criado_em) para decidir a próxima etapa devida, evitando reenviar a mesma.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.curadentespro
  ADD COLUMN IF NOT EXISTS lembrete_etapa smallint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.curadentespro.lembrete_etapa IS
  'Maior etapa de lembrete já enviada: 0=nenhuma, 1=20min, 2=1dia, 3=1semana, 4=1mês, 5=excluído';

-- Migra o estado atual: quem já recebeu o lembrete de 20 min está na etapa 1.
UPDATE public.curadentespro
  SET lembrete_etapa = 1
  WHERE lembrete_cadastro_enviado = true AND lembrete_etapa = 0;

-- O booleano antigo fica obsoleto; lembrete_etapa passa a ser a fonte da verdade.
-- A coluna lembrete_cadastro_enviado_em continua guardando "quando a última etapa
-- foi enviada".
ALTER TABLE public.curadentespro DROP COLUMN IF EXISTS lembrete_cadastro_enviado;
