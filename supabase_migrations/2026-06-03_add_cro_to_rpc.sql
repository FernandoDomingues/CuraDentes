-- ==============================================================================
-- MIGRATION: Adicionar CRO ao retorno da função get_dentistas_proximos
-- Data: 2026-06-03
-- Motivo: A rota publica /dentista/:cro exige o CRO na URL.
--         Sem ele, os resultados da busca por raio (RPC) usariam UUID como
--         fallback, mas o CRO e obrigatorio para todos os dentistas cadastrados.
-- ==============================================================================

DROP FUNCTION IF EXISTS get_dentistas_proximos(double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION get_dentistas_proximos(
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
