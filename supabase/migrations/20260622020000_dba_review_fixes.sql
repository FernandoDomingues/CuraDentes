-- ═══════════════════════════════════════════════════════════════════════════════
-- Correções da revisão adversarial do painel DBA
--
-- 1) is_superuser(): remove o fallback para o email em user_metadata/app_metadata
--    (raw_user_meta_data é EDITÁVEL pelo próprio usuário via auth.updateUser).
--    Passa a confiar apenas no claim top-level `email` (gerenciado pelo GoTrue).
--    Conserta o gate de superuser em TODAS as policies/RPCs que usam o helper.
-- 2) dba_estatisticas(): coloca pg_catalog primeiro no search_path (hardening de
--    função SECURITY DEFINER contra shadowing de builtins).
-- 3) dba_series(): agrega tráfego e novos cadastros por DIA no servidor — evita o
--    teto de 1000 linhas do PostgREST no cliente e a leitura client-side de
--    clientes/curadentespro (clientes não tem policy de superuser). SECURITY
--    DEFINER + is_superuser().
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) Hardening do gate de superuser ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(LOWER(auth.jwt() ->> 'email') = 'superdom@curadentes.com.br', false);
$$;

-- 2) Ordem do search_path da RPC de snapshot ────────────────────────────────────
ALTER FUNCTION public.dba_estatisticas() SET search_path = pg_catalog, public;

-- 3) Série diária agregada no servidor ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dba_series()
RETURNS TABLE(dia date, buscas bigint, logins bigint, views bigint, contatos bigint, dentistas bigint, pacientes bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_superuser() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  WITH d AS (
    SELECT generate_series((now()::date - 366), now()::date, interval '1 day')::date AS dia
  ),
  b AS (SELECT criado_em::date AS dia, count(*) AS n FROM logs_busca WHERE criado_em >= now() - interval '367 days' GROUP BY 1),
  l AS (SELECT criado_em::date AS dia, count(*) AS n FROM logs_login WHERE criado_em >= now() - interval '367 days' GROUP BY 1),
  v AS (SELECT criado_em::date AS dia, count(*) AS n FROM perfil_visualizacoes WHERE criado_em >= now() - interval '367 days' GROUP BY 1),
  c AS (SELECT criado_em::date AS dia, count(*) AS n FROM perfil_contatos WHERE criado_em >= now() - interval '367 days' GROUP BY 1),
  de AS (SELECT criado_em::date AS dia, count(*) AS n FROM curadentespro WHERE deleted_at IS NULL AND criado_em >= now() - interval '367 days' GROUP BY 1),
  pa AS (SELECT criado_em::date AS dia, count(*) AS n FROM clientes WHERE deleted_at IS NULL AND criado_em >= now() - interval '367 days' GROUP BY 1)
  SELECT d.dia,
    COALESCE(b.n, 0), COALESCE(l.n, 0), COALESCE(v.n, 0), COALESCE(c.n, 0), COALESCE(de.n, 0), COALESCE(pa.n, 0)
  FROM d
  LEFT JOIN b  ON b.dia  = d.dia
  LEFT JOIN l  ON l.dia  = d.dia
  LEFT JOIN v  ON v.dia  = d.dia
  LEFT JOIN c  ON c.dia  = d.dia
  LEFT JOIN de ON de.dia = d.dia
  LEFT JOIN pa ON pa.dia = d.dia
  ORDER BY d.dia;
END;
$$;

REVOKE ALL ON FUNCTION public.dba_series() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dba_series() TO authenticated;
