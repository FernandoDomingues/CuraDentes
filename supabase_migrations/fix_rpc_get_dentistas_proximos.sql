-- ==============================================================================
-- MIGRATION: CORRIGIR FUNÇÃO get_dentistas_proximos (v2)
-- Problema: incompatibilidade de tipos entre assinatura e colunas do banco.
--   - nome, foto_url: TEXT no banco → declarado como VARCHAR na função → cast ::VARCHAR
--   - bio: VARCHAR(500) no banco → declarado como TEXT na função → cast ::TEXT
-- Solução: cast explícito em cada coluna para corresponder à assinatura.
-- ==============================================================================

DROP FUNCTION IF EXISTS get_dentistas_proximos(double precision, double precision, double precision);

CREATE FUNCTION get_dentistas_proximos(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  raio_km DOUBLE PRECISION
)
RETURNS TABLE (
  dentista_id UUID,
  dentista_nome TEXT,
  dentista_foto TEXT,
  dentista_bio TEXT,
  dentista_avaliacao NUMERIC,
  endereco_id UUID,
  nome_clinica TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  atividades TEXT[],
  convenios TEXT[],
  formas_pagamento TEXT[],
  distancia_km DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS dentista_id,
    p.nome::TEXT AS dentista_nome,
    p.foto_url::TEXT AS dentista_foto,
    p.bio::TEXT AS dentista_bio,
    COALESCE((SELECT AVG(nota)::NUMERIC(3,1) FROM public.avaliacoes WHERE dentista_id = p.id), 0) AS dentista_avaliacao,
    e.id AS endereco_id,
    e.nome_clinica::TEXT,
    e.logradouro::TEXT,
    e.numero::TEXT,
    e.bairro::TEXT,
    e.cidade::TEXT,
    e.estado::TEXT,
    e.atividades,
    e.convenios,
    e.formas_pagamento,
    (
      6371 * acos(
        LEAST(1.0,
          cos(radians(lat)) * cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(lng)) +
          sin(radians(lat)) * sin(radians(e.latitude))
        )
      )
    ) AS distancia_km
  FROM public.curadentespro_enderecos e
  JOIN public.curadentespro p ON e.curadentespro_id = p.id
  WHERE
    e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND (
      6371 * acos(
        LEAST(1.0,
          cos(radians(lat)) * cos(radians(e.latitude)) *
          cos(radians(e.longitude) - radians(lng)) +
          sin(radians(lat)) * sin(radians(e.latitude))
        )
      )
    ) <= raio_km
  ORDER BY distancia_km ASC;
END;
$$;
