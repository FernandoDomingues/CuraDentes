-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: get_dentistas_urgencia_proximos(lat, lng)
--
-- Para o botao "URGENCIA!" / pagina /urgencia. Retorna os 10 dentistas que
-- ATENDEM URGENCIA (curadentespro_enderecos.atende_urgencias = true) mais proximos,
-- ordenados por distancia e SEM limite de raio (sempre os 10 mais perto, por mais
-- longe que estejam). Traz whatsapp/telefone para contato 1-toque na urgencia.
--
-- SECURITY DEFINER (le ignorando RLS, igual get_dentistas_proximos) e GRANT a anon
-- para funcionar sem login (urgencia = atrito minimo).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_dentistas_urgencia_proximos(lat double precision, lng double precision)
RETURNS TABLE(
  dentista_id uuid, dentista_nome character varying, dentista_tratamento character varying,
  dentista_foto character varying, endereco_id uuid, nome_clinica character varying,
  bairro character varying, cidade character varying, estado character varying,
  whatsapp character varying, telefone character varying, distancia_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS dentista_id,
    p.nome::character varying AS dentista_nome,
    p.tratamento::character varying AS dentista_tratamento,
    p.foto_url::character varying AS dentista_foto,
    e.id AS endereco_id,
    e.nome_clinica::character varying,
    e.bairro::character varying,
    e.cidade::character varying,
    e.estado::character varying,
    e.whatsapp::character varying,
    e.telefone::character varying,
    (
      6371 * acos(LEAST(1,
        cos(radians(lat)) * cos(radians(e.latitude)) *
        cos(radians(e.longitude) - radians(lng)) +
        sin(radians(lat)) * sin(radians(e.latitude))
      ))
    ) AS distancia_km
  FROM public.curadentespro_enderecos e
  JOIN public.curadentespro p ON e.curadentespro_id = p.id
  WHERE
    p.lgpd_aceito = true
    AND p.deleted_at IS NULL
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND e.atende_urgencias = true
  ORDER BY distancia_km ASC
  LIMIT 10;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dentistas_urgencia_proximos(double precision, double precision)
  TO anon, authenticated;
