-- ==============================================================================
-- MIGRATION: Tornar CRO nullable para permitir pré-cadastro + Filtro de Privacidade
-- Data: 2026-06-08
-- Motivo: Permitir que o dentista salve seu cadastro progressivamente a partir
--         do Passo 1 (antes de preencher o CRO). O perfil só é exposto publicamente
--         quando o cadastro estiver completo (lgpd_aceito = true).
-- ==============================================================================

-- 1. Alterar a coluna cro da tabela curadentespro para aceitar NULL
ALTER TABLE public.curadentespro ALTER COLUMN cro DROP NOT NULL;

-- 2. Atualizar a função get_dentistas_proximos para exibir APENAS perfis com cadastro completo (lgpd_aceito = true)
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
SECURITY DEFINER -- Garante execução segura pelo cliente anônimo
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS dentista_id,
    p.cro AS dentista_cro,
    p.nome AS dentista_nome,
    p.foto_url AS dentista_foto,
    p.bio AS dentista_bio,
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
    p.lgpd_aceito = true -- APENAS DENTISTAS QUE CONCLUÍRAM O CADASTRO
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
