-- ═══════════════════════════════════════════════════════════════════════════════
-- Migração de DADOS: unificação de especialidade (2026-06-18)
--
--   • "Botox odontológico"  →  "Harmonização orofacial"   (unificadas no site)
--
-- Acompanha a REMOÇÃO de "Botox odontológico" da taxonomia do front-end
-- (ESPECIALIDADES / especialidadesSEO / Specialties). O botox passou a ser parte
-- de "Harmonização orofacial". Mantém o banco coerente com o novo rótulo para que
-- a busca por especialidade (RPC get_top_dentistas_especialidade, que faz
-- unnest(atividades)) continue encontrando os dentistas que ofereciam botox.
--
-- 1) curadentespro_enderecos.atividades (text[]): array_replace + DEDUP preservando
--    a ordem — quem oferecia "Botox odontológico" E "Harmonização orofacial" no
--    mesmo endereço NÃO fica com "Harmonização orofacial" duplicado.
-- 2) avaliacoes.atividade (text): avaliações feitas sobre "Botox odontológico"
--    passam a contar para "Harmonização orofacial".
--
-- Idempotente: o WHERE só casa o valor ANTIGO; rodar de novo é no-op.
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.curadentespro_enderecos
SET atividades = (
  SELECT array_agg(elem ORDER BY ord)
  FROM (
    SELECT elem, MIN(ord) AS ord
    FROM unnest(
      array_replace(atividades, 'Botox odontológico', 'Harmonização orofacial')
    ) WITH ORDINALITY AS t(elem, ord)
    GROUP BY elem
  ) d
)
WHERE 'Botox odontológico' = ANY(atividades);

UPDATE public.avaliacoes
SET atividade = 'Harmonização orofacial'
WHERE atividade = 'Botox odontológico';
