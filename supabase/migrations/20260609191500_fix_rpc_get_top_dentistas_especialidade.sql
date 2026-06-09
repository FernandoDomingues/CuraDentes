-- Fix: column reference "dentista_id" was ambiguous between RETURN TABLE param and subquery column
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
      AND EXISTS (
        SELECT 1 FROM unnest(e.atividades) AS atv
        WHERE LOWER(atv) = LOWER(especialidade_nome)
      )
      AND (cidade_usuario IS NULL OR e.cidade ILIKE '%' || cidade_usuario || '%')
    ORDER BY p.id, avaliacao DESC
  )
  SELECT
    ranked.id,
    ranked.nome,
    ranked.foto_url,
    ranked.avaliacao,
    ranked.cidade,
    ranked.estado
  FROM ranked
  ORDER BY ranked.avaliacao DESC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_dentistas_especialidade(TEXT, TEXT)
  TO anon, authenticated;
