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
  SELECT * FROM (
    SELECT DISTINCT ON (p.id)
      p.id AS dentista_id,
      p.nome AS dentista_nome,
      p.foto_url AS dentista_foto,
      COALESCE((SELECT AVG(nota)::NUMERIC(3,1) FROM public.avaliacoes WHERE dentista_id = p.id), 0) AS dentista_avaliacao,
      e.cidade AS endereco_cidade,
      e.estado AS endereco_estado
    FROM public.curadentespro_enderecos e
    JOIN public.curadentespro p ON e.curadentespro_id = p.id
    WHERE 
      p.lgpd_aceito = true
      AND EXISTS (
        SELECT 1 FROM unnest(e.atividades) AS atv
        WHERE LOWER(atv) = LOWER(especialidade_nome)
      )
      AND (cidade_usuario IS NULL OR e.cidade ILIKE '%' || cidade_usuario || '%')
    ORDER BY p.id, dentista_avaliacao DESC
  ) sub
  ORDER BY dentista_avaliacao DESC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_dentistas_especialidade(TEXT, TEXT)
  TO anon, authenticated;
