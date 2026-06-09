-- Remove overload that conflicts with cidade_usuario TEXT version
DROP FUNCTION IF EXISTS public.get_top_dentistas_especialidade(
  especialidade_nome TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  raio_km DOUBLE PRECISION
);
