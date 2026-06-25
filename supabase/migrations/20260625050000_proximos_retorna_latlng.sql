-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: get_dentistas_proximos passa a devolver latitude/longitude da clínica
--
-- Motivo: o cliente precisa recalcular a distância a partir da localização REAL do
-- usuário (GPS do login), e não da origem da busca (que na busca textual é o termo
-- geocodificado — medir dali até a clínica dava ~0 km). Com lat/lng no retorno, o
-- front recomputa a distância de cada resultado a partir de onde o usuário está.
--
-- RETURNS TABLE muda (colunas novas) -> CREATE OR REPLACE não troca o retorno;
-- precisa DROP + CREATE. Adição é retrocompatível (colunas extras são ignoradas
-- por quem não as seleciona).
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_dentistas_proximos(double precision, double precision, double precision);

CREATE FUNCTION public.get_dentistas_proximos(lat double precision, lng double precision, raio_km double precision)
RETURNS TABLE(
  dentista_id uuid, dentista_cro character varying, dentista_nome character varying,
  dentista_foto character varying, dentista_bio text, dentista_avaliacao numeric,
  endereco_id uuid, nome_clinica character varying, logradouro character varying,
  numero character varying, bairro character varying, cidade character varying,
  estado character varying, atividades text[], convenios text[], distancia_km double precision,
  latitude double precision, longitude double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS dentista_id,
    p.cro::character varying AS dentista_cro,
    p.nome::character varying AS dentista_nome,
    p.foto_url::character varying AS dentista_foto,
    p.bio::text AS dentista_bio,
    5.0::NUMERIC AS dentista_avaliacao,
    e.id AS endereco_id,
    e.nome_clinica::character varying,
    e.logradouro::character varying,
    e.numero::character varying,
    e.bairro::character varying,
    e.cidade::character varying,
    e.estado::character varying,
    e.atividades,
    e.convenios,
    (6371 * acos(LEAST(1,
      cos(radians(lat)) * cos(radians(e.latitude)) *
      cos(radians(e.longitude) - radians(lng)) +
      sin(radians(lat)) * sin(radians(e.latitude))
    ))) AS distancia_km,
    e.latitude,
    e.longitude
  FROM public.curadentespro_enderecos e
  JOIN public.curadentespro p ON e.curadentespro_id = p.id
  WHERE
    p.lgpd_aceito = true
    AND p.deleted_at IS NULL
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND (6371 * acos(LEAST(1,
      cos(radians(lat)) * cos(radians(e.latitude)) *
      cos(radians(e.longitude) - radians(lng)) +
      sin(radians(lat)) * sin(radians(e.latitude))
    ))) <= raio_km
  ORDER BY distancia_km ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dentistas_proximos(double precision, double precision, double precision)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
