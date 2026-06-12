-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Corrige get_dentistas_proximos (busca geografica)
--
-- A RPC retornava 400: "Returned type text does not match expected type character
-- varying in column 4" — a coluna 4 do RETURNS TABLE e `dentista_foto character
-- varying`, mas `curadentespro.foto_url` e do tipo `text`. Resultado: a busca
-- geografica SEMPRE falhava (so a busca textual funcionava).
--
-- Correcao: cast de foto_url (e bio) para o tipo declarado. Tambem adiciona o
-- filtro deleted_at IS NULL (a RPC nao excluia perfis soft-deletados).
-- Assinatura mantida -> CREATE OR REPLACE (sem DROP).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_dentistas_proximos(lat double precision, lng double precision, raio_km double precision)
RETURNS TABLE(
  dentista_id uuid, dentista_cro character varying, dentista_nome character varying,
  dentista_foto character varying, dentista_bio text, dentista_avaliacao numeric,
  endereco_id uuid, nome_clinica character varying, logradouro character varying,
  numero character varying, bairro character varying, cidade character varying,
  estado character varying, atividades text[], convenios text[], distancia_km double precision
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
    AND p.deleted_at IS NULL
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
$function$;
