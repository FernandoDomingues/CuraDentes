-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC dba_estatisticas() — snapshot de uso do banco/Storage para o painel DBA.
--
-- SECURITY DEFINER porque lê pg_database_size, pg_total_relation_size,
-- pg_stat_user_tables e storage.objects (não acessíveis via PostgREST/RLS).
-- Guardada por is_superuser() — só o SuperDom executa. EXECUTE revogado do PUBLIC.
--
-- Retorna jsonb: { gerado_em, banco{bytes,limite}, storage{total,limite,buckets[]},
--                  tabelas[]{nome,bytes,linhas}, contagens{...} }
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.dba_estatisticas()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  res jsonb;
BEGIN
  IF NOT public.is_superuser() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  res := jsonb_build_object(
    'gerado_em', now(),
    'banco', jsonb_build_object(
      'bytes', pg_database_size(current_database()),
      'limite_bytes', (500::bigint * 1024 * 1024)
    ),
    'storage', jsonb_build_object(
      'limite_bytes', (1024::bigint * 1024 * 1024),
      'total_bytes', (SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) FROM storage.objects),
      'buckets', (
        SELECT COALESCE(jsonb_agg(b ORDER BY (b->>'bytes')::bigint DESC), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object('bucket', bucket_id, 'bytes', SUM((metadata->>'size')::bigint), 'objetos', COUNT(*)) AS b
          FROM storage.objects GROUP BY bucket_id
        ) s
      )
    ),
    'tabelas', (
      SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'bytes')::bigint DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('nome', relname, 'bytes', pg_total_relation_size(relid), 'linhas', n_live_tup) AS t
        FROM pg_stat_user_tables WHERE schemaname = 'public'
      ) u
    ),
    'contagens', jsonb_build_object(
      'dentistas_ativos', (SELECT COUNT(*) FROM curadentespro WHERE deleted_at IS NULL),
      'pacientes', (SELECT COUNT(*) FROM clientes WHERE deleted_at IS NULL),
      'enderecos', (SELECT COUNT(*) FROM curadentespro_enderecos),
      'avaliacoes', (SELECT COUNT(*) FROM avaliacoes),
      'logs_busca', (SELECT COUNT(*) FROM logs_busca),
      'logs_login', (SELECT COUNT(*) FROM logs_login),
      'perfil_visualizacoes', (SELECT COUNT(*) FROM perfil_visualizacoes),
      'perfil_contatos', (SELECT COUNT(*) FROM perfil_contatos)
    )
  );
  RETURN res;
END;
$$;

REVOKE ALL ON FUNCTION public.dba_estatisticas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dba_estatisticas() TO authenticated;
