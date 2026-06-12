-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Tabela de configuracao interna (segredos de jobs)
--
-- Guarda valores de configuracao acessiveis apenas pelo service_role (RLS ligado
-- e SEM policies -> anon/authenticated nao acessam; service_role faz bypass).
-- Usado para o segredo do cron (validacao do disparo da edge function), evitando
-- depender de secrets de ambiente. O valor e inserido fora do versionamento.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_config (
  chave text PRIMARY KEY,
  valor text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- Sem policies: nenhuma role publica acessa. Apenas service_role (bypass de RLS).
REVOKE ALL ON public.app_config FROM anon, authenticated;
