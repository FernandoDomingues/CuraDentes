-- ==============================================================================
-- MIGRATION: Corrigir avaliação dos dentistas nos resultados de busca
-- Data: 2026-06-09
-- Motivo: A função get_dentistas_proximos estava hardcoded com 5.0.
--         Agora calcula a média real das notas da tabela avaliacoes.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_dentistas_proximos(
  lat DOUBLE PRECISION, 
  lng DOUBLE PRECISION, 
  raio_km DOUBLE PRECISION
)
RETURNS TABLE (
  dentista_id UUID,
  dentista_cro VARCHAR,
  dentista_nome VARCHAR,
  dentista_foto VARCHAR,
  dentista_bio TEXT,
  dentista_avaliacao NUMERIC,
  endereco_id UUID,
  nome_clinica VARCHAR,
  logradouro VARCHAR,
  numero VARCHAR,
  bairro VARCHAR,
  cidade VARCHAR,
  estado VARCHAR,
  atividades TEXT[],
  convenios TEXT[],
  distancia_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS dentista_id,
    p.cro AS dentista_cro,
    p.nome AS dentista_nome,
    p.foto_url AS dentista_foto,
    p.bio AS dentista_bio,
    COALESCE((SELECT AVG(nota)::NUMERIC(3,1) FROM public.avaliacoes WHERE dentista_id = p.id), 0) AS dentista_avaliacao,
    e.id AS endereco_id,
    e.nome_clinica,
    e.logradouro,
    e.numero,
    e.bairro,
    e.cidade,
    e.estado,
    e.atividades,
    e.convenios,
    (
      6371 * acos(
        cos(radians(lat)) * cos(radians(e.latitude)) *
        cos(radians(e.longitude) - radians(lng)) +
        sin(radians(lat)) * sin(radians(e.latitude))
      )
    ) AS distancia_km
  FROM public.curadentespro_enderecos e
  JOIN public.curadentespro p ON e.curadentespro_id = p.id
  WHERE 
    p.lgpd_aceito = true
    AND e.latitude IS NOT NULL 
    AND e.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(lat)) * cos(radians(e.latitude)) *
        cos(radians(e.longitude) - radians(lng)) +
        sin(radians(lat)) * sin(radians(e.latitude))
      )
    ) <= raio_km
  ORDER BY distancia_km ASC;
END;
$$;
