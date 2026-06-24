-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: corrige coordenadas imprecisas de clínicas
--
-- O geocoder gratuito (Nominatim/OSM) não tinha algumas ruas e caiu no fallback,
-- gravando o centroide do bairro/cidade — o que gerava distâncias ERRADAS na busca
-- (ex.: a clínica do Dr. Roberto aparecia a ~0,3km da do Dr. Lucas, quando na
-- verdade está a ~4,4km — a coord dele havia ficado no Centro).
--
-- Coordenadas corretas obtidas pelo CEP (AwesomeAPI, nível de quadra, confiável no
-- Brasil) e conferidas uma a uma. Só as 2 clínicas realmente erradas (>0,3km) são
-- ajustadas; as demais já estavam corretas. O cálculo de distância está OK — o
-- problema era a coordenada de origem.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Odonto Lima (Dr. Roberto Rivelino Lima) — estava no Centro; real: Jardim São Lourenzo (~4,3km de erro)
UPDATE public.curadentespro_enderecos
  SET latitude = -23.4625292, longitude = -47.4685974
  WHERE id = '44f57385-0a57-4dcb-a476-c1301c362f79';

-- Altus Odontologia (Dra. Evelin Martins) — ~0,9km de erro na Av. Washington Luiz
UPDATE public.curadentespro_enderecos
  SET latitude = -23.5152343, longitude = -47.4646522
  WHERE id = '85559d3b-b829-4706-bf66-7dc217ec90d5';
