-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Métricas do dashboard do dentista
--
-- 1. Tabela perfil_visualizacoes — registra cada visualização de perfil público
--    (insert liberado para todos; leitura só do dono/superuser).
-- 2. RPC meu_dashboard_resumo() — resumo do dentista logado: média geral, ranking
--    geral, avaliações por atividade (com posição no ranking) e visualizações.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Visualizações de perfil ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.perfil_visualizacoes (
  id bigserial PRIMARY KEY,
  dentista_id uuid NOT NULL REFERENCES public.curadentespro(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perfil_visualizacoes_dentista
  ON public.perfil_visualizacoes(dentista_id, criado_em);

ALTER TABLE public.perfil_visualizacoes ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.perfil_visualizacoes TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.perfil_visualizacoes_id_seq TO anon, authenticated;
GRANT SELECT ON public.perfil_visualizacoes TO authenticated;

-- Qualquer um pode registrar uma visualização (perfil é público)
DROP POLICY IF EXISTS "insert_visualizacoes" ON public.perfil_visualizacoes;
CREATE POLICY "insert_visualizacoes" ON public.perfil_visualizacoes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Só o dono (ou superuser) lê as próprias visualizações
DROP POLICY IF EXISTS "owner_select_visualizacoes" ON public.perfil_visualizacoes;
CREATE POLICY "owner_select_visualizacoes" ON public.perfil_visualizacoes
  FOR SELECT TO authenticated USING (dentista_id = auth.uid() OR public.is_superuser());

-- ─── 2. Resumo do dashboard ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.meu_dashboard_resumo()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  WITH por_atividade_rank AS (
    SELECT dentista_id, atividade,
           avg(nota)::numeric(3,2) AS media,
           count(*) AS total,
           rank() OVER (PARTITION BY atividade ORDER BY avg(nota) DESC, count(*) DESC) AS posicao
    FROM public.avaliacoes
    WHERE atividade IS NOT NULL AND atividade <> ''
    GROUP BY dentista_id, atividade
  ),
  geral_rank AS (
    SELECT dentista_id,
           avg(nota)::numeric(3,2) AS media,
           count(*) AS total,
           rank() OVER (ORDER BY avg(nota) DESC, count(*) DESC) AS posicao
    FROM public.avaliacoes
    GROUP BY dentista_id
  )
  SELECT jsonb_build_object(
    'media_geral',      COALESCE((SELECT media   FROM geral_rank WHERE dentista_id = v_uid), 0),
    'total_avaliacoes', COALESCE((SELECT total   FROM geral_rank WHERE dentista_id = v_uid), 0),
    'posicao_geral',    COALESCE((SELECT posicao FROM geral_rank WHERE dentista_id = v_uid), 0),
    'por_atividade', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'nome_atividade',   atividade,
        'media_nota',       media,
        'total_avaliacoes', total,
        'posicao',          posicao
      ) ORDER BY total DESC)
      FROM por_atividade_rank WHERE dentista_id = v_uid
    ), '[]'::jsonb),
    'total_visualizacoes', COALESCE((SELECT count(*) FROM public.perfil_visualizacoes WHERE dentista_id = v_uid), 0),
    'visualizacoes_30d',   COALESCE((SELECT count(*) FROM public.perfil_visualizacoes WHERE dentista_id = v_uid AND criado_em >= now() - interval '30 days'), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.meu_dashboard_resumo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_dashboard_resumo() TO authenticated;
