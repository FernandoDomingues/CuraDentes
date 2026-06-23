-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Especialidade principal do dentista (campo próprio)
--
-- Hoje a "especialidade principal" é DERIVADA (1ª atividade do 1º endereço). Aqui
-- ela vira um CAMPO EXPLÍCITO em curadentespro, escolhido pelo dentista no cadastro
-- e editável no perfil — e que acompanha o nome dele em todo o site.
-- As atividades por endereço (curadentespro_enderecos.atividades) continuam iguais.
--
-- 1. Nova coluna curadentespro.especialidade (texto, nullable — fallback cobre nulos).
-- 2. Backfill: copia a 1ª atividade do endereço mais antigo (preserva o comportamento).
-- 3. get_top_dentistas_especialidade passa a casar por ATIVIDADE do endereço OU pela
--    especialidade principal do dentista (mesma assinatura — CREATE OR REPLACE).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Coluna ───────────────────────────────────────────────────────────────
ALTER TABLE public.curadentespro
  ADD COLUMN IF NOT EXISTS especialidade TEXT;

-- ─── 2. Backfill (1ª atividade do endereço mais antigo de cada dentista) ──────
UPDATE public.curadentespro p
SET especialidade = sub.atv
FROM (
  SELECT DISTINCT ON (e.curadentespro_id)
    e.curadentespro_id,
    e.atividades[1] AS atv
  FROM public.curadentespro_enderecos e
  WHERE e.atividades IS NOT NULL AND array_length(e.atividades, 1) >= 1
  ORDER BY e.curadentespro_id, e.criado_em ASC
) sub
WHERE p.id = sub.curadentespro_id
  AND p.especialidade IS NULL;

-- ─── 3. RPC: top dentistas por especialidade (atividade OU especialidade principal) ─
-- Mesma assinatura/RETURNS TABLE da versão atual (20260609191700); muda só o filtro.
CREATE OR REPLACE FUNCTION public.get_top_dentistas_especialidade(
  especialidade_nome TEXT,
  cidade_usuario TEXT DEFAULT NULL
)
RETURNS TABLE (
  dentista_id UUID,
  dentista_nome VARCHAR,
  dentista_foto VARCHAR,
  dentista_avaliacao NUMERIC,
  endereco_cidade VARCHAR,
  endereco_estado VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.nome,
      p.foto_url,
      COALESCE((SELECT AVG(a.nota)::NUMERIC(3,1) FROM public.avaliacoes a WHERE a.dentista_id = p.id), 0) AS avaliacao,
      e.cidade,
      e.estado
    FROM public.curadentespro_enderecos e
    JOIN public.curadentespro p ON e.curadentespro_id = p.id
    WHERE
      p.lgpd_aceito = true
      AND p.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM unnest(e.atividades) AS atv
          WHERE LOWER(atv) = LOWER(especialidade_nome)
        )
        OR LOWER(p.especialidade) = LOWER(especialidade_nome)
      )
      AND (cidade_usuario IS NULL OR e.cidade ILIKE '%' || cidade_usuario || '%')
    ORDER BY p.id, avaliacao DESC
  )
  SELECT
    ranked.id::UUID,
    ranked.nome::VARCHAR,
    ranked.foto_url::VARCHAR,
    ranked.avaliacao::NUMERIC(3,1),
    ranked.cidade::VARCHAR,
    ranked.estado::VARCHAR
  FROM ranked
  ORDER BY ranked.avaliacao DESC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_dentistas_especialidade(TEXT, TEXT)
  TO anon, authenticated;
