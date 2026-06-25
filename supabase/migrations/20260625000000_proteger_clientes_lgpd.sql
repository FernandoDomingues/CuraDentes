-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Protege a tabela clientes (pacientes) — vazamento de PII via REST
--
-- PROBLEMA (achado por teste empírico com a anon key): qualquer um lia a tabela
-- `clientes` inteira via REST (`?select=*`) — nome, email, foto e latitude/longitude
-- (a localização precisa do paciente). 21 registros expostos. Furo grave de LGPD.
--
-- CAUSA: ao contrário de curadentespro (que tem grant por coluna, ver
-- proteger_cpf_lgpd), clientes liberava a linha inteira para anon/authenticated.
--
-- CORREÇÃO (mesma técnica do CPF): o GRANT de SELECT de tabela cobre todas as
-- colunas. Removemos o SELECT de tabela e concedemos SELECT apenas nas colunas
-- que o app realmente lê publicamente:
--   • id, nome, foto  -> perfil exibe quem avaliou
--   • criado_em, deleted_at -> métricas do dashboard + filtros .is(deleted_at,null)
-- Passam a ficar OCULTOS via REST: email, latitude, longitude, user_id, deleted_by.
--
-- INSERT/UPDATE seguem funcionando (login faz upsert; AuthListener grava lat/lng):
-- revogamos apenas o SELECT. O dono não precisa LER email/geo no front (verificado).
-- ═══════════════════════════════════════════════════════════════════════════════

REVOKE SELECT ON public.clientes FROM anon, authenticated;

GRANT SELECT (id, nome, foto, criado_em, deleted_at)
  ON public.clientes TO anon, authenticated;
