-- ==============================================================================
-- 1. ADICIONAR COLUNAS LATITUDE E LONGITUDE
-- ==============================================================================
ALTER TABLE public.curadentespro_enderecos
ADD COLUMN IF NOT EXISTS latitude FLOAT8,
ADD COLUMN IF NOT EXISTS longitude FLOAT8;

-- ==============================================================================
-- 2. CRIAR FUNÇÃO DE CÁLCULO DE DISTÂNCIA (Fórmula de Haversine)
-- ==============================================================================
-- Esta função retorna dentistas num raio X da latitude/longitude inserida.
-- Ordenado pela distância.

CREATE OR REPLACE FUNCTION get_dentistas_proximos(
  lat DOUBLE PRECISION, 
  lng DOUBLE PRECISION, 
  raio_km DOUBLE PRECISION
)
RETURNS TABLE (
  dentista_id UUID,
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS dentista_id,
    p.nome AS dentista_nome,
    p.foto_url AS dentista_foto,
    p.bio AS dentista_bio,
    -- Simulando uma nota 5.0 caso você não tenha sistema de avaliação no banco ainda
    5.0::NUMERIC AS dentista_avaliacao, 
    e.id AS endereco_id,
    e.nome_clinica,
    e.logradouro,
    e.numero,
    e.bairro,
    e.cidade,
    e.estado,
    e.atividades,
    e.convenios,
    -- Fórmula de Haversine para calcular a distância em KM
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
    e.latitude IS NOT NULL 
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
