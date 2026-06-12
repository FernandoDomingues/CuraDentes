-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Cliques de contato (WhatsApp / ligação) no perfil
--
-- O contato no perfil publico exige login (anon e mandado para o modal de login),
-- entao todo clique real e de uma conta logada. Mesma regra das visualizacoes:
-- 1 por dia por conta por tipo por dentista (constraint unica + ON CONFLICT).
-- O resumo do dashboard passa a expor os totais de WhatsApp e de ligacoes.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.perfil_contatos (
  id bigserial PRIMARY KEY,
  dentista_id uuid NOT NULL REFERENCES public.curadentespro(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('whatsapp', 'telefone')),
  data_visita date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_perfil_contatos_dia
  ON public.perfil_contatos(dentista_id, viewer_id, tipo, data_visita);
CREATE INDEX IF NOT EXISTS idx_perfil_contatos_dentista
  ON public.perfil_contatos(dentista_id, tipo, criado_em);

ALTER TABLE public.perfil_contatos ENABLE ROW LEVEL SECURITY;

GRANT INSERT, SELECT ON public.perfil_contatos TO authenticated;
GRANT USAGE ON SEQUENCE public.perfil_contatos_id_seq TO authenticated;

DROP POLICY IF EXISTS "insert_contatos" ON public.perfil_contatos;
CREATE POLICY "insert_contatos" ON public.perfil_contatos
  FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());

DROP POLICY IF EXISTS "select_contatos" ON public.perfil_contatos;
CREATE POLICY "select_contatos" ON public.perfil_contatos
  FOR SELECT TO authenticated
  USING (dentista_id = auth.uid() OR viewer_id = auth.uid() OR public.is_superuser());

-- ─── Resumo do dashboard com visualizacoes + contatos ────────────────────────
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
    'visualizacoes_30d',   COALESCE((SELECT count(*) FROM public.perfil_visualizacoes WHERE dentista_id = v_uid AND criado_em >= now() - interval '30 days'), 0),
    'total_whatsapp',      COALESCE((SELECT count(*) FROM public.perfil_contatos WHERE dentista_id = v_uid AND tipo = 'whatsapp'), 0),
    'whatsapp_30d',        COALESCE((SELECT count(*) FROM public.perfil_contatos WHERE dentista_id = v_uid AND tipo = 'whatsapp' AND criado_em >= now() - interval '30 days'), 0),
    'total_telefone',      COALESCE((SELECT count(*) FROM public.perfil_contatos WHERE dentista_id = v_uid AND tipo = 'telefone'), 0),
    'telefone_30d',        COALESCE((SELECT count(*) FROM public.perfil_contatos WHERE dentista_id = v_uid AND tipo = 'telefone' AND criado_em >= now() - interval '30 days'), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
