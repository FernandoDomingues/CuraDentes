-- ═══════════════════════════════════════════════════════════════════════════════
-- Migração de DADOS: unificação de especialidades (2026-06-18)
--
--   • "Facetas de porcelana"  →  "Lentes de contato dental"   (unificadas no site)
--   • "Limpeza e profilaxia"  →  "Limpeza"                     (renomeada no site)
--
-- Acompanha as mudanças de taxonomia no front-end (ESPECIALIDADES / especialidadesSEO
-- / Specialties). Mantém os dados do banco coerentes com os novos rótulos, pra que a
-- busca por especialidade (RPC get_top_dentistas_especialidade, que faz
-- unnest(atividades)) continue encontrando os dentistas certos.
--
-- Os nomes ficam em curadentespro_enderecos.atividades (text[]). Fazemos array_replace
-- e DEDUP preservando a ordem: dentistas que ofereciam "Facetas de porcelana" E
-- "Lentes de contato dental" no mesmo endereço NÃO ficam com "Lentes" duplicado.
--
-- Idempotente: o WHERE só casa os valores ANTIGOS; rodar de novo é no-op.
-- Obs.: avaliacoes.atividade não continha nenhum dos valores antigos (nada a migrar lá).
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.curadentespro_enderecos
SET atividades = (
  SELECT array_agg(elem ORDER BY ord)
  FROM (
    SELECT elem, MIN(ord) AS ord
    FROM unnest(
      array_replace(
        array_replace(atividades, 'Facetas de porcelana', 'Lentes de contato dental'),
        'Limpeza e profilaxia', 'Limpeza'
      )
    ) WITH ORDINALITY AS t(elem, ord)
    GROUP BY elem
  ) d
)
WHERE 'Facetas de porcelana' = ANY(atividades)
   OR 'Limpeza e profilaxia' = ANY(atividades);
