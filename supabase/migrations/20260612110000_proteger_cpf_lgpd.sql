-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Protege a coluna cpf de curadentespro (LGPD) — falha #0 da auditoria
--
-- PROBLEMA: o RLS é row-level, não column-level. A policy de SELECT público
-- liberava TODAS as colunas (incluindo cpf), então qualquer um com a anon key
-- lia o CPF de todos os dentistas via REST (`?select=cpf`).
--
-- CORREÇÃO: no Postgres, um GRANT SELECT de tabela cobre todas as colunas e
-- ignora REVOKE por coluna. Então removemos o SELECT de tabela de anon/authenticated
-- e concedemos SELECT apenas nas colunas NÃO sensíveis (tudo menos cpf). O RLS
-- continua filtrando linhas; agora o grant filtra colunas.
--
-- O próprio dono lê o seu CPF (e só o dele) via a RPC meu_cpf(). INSERT/UPDATE
-- de cpf no cadastro continuam funcionando (revogamos só o SELECT).
-- ═══════════════════════════════════════════════════════════════════════════════

REVOKE SELECT ON public.curadentespro FROM anon, authenticated;

GRANT SELECT (
  id, nome, email, telefone, telefone_verificado, cro, ano_formacao,
  foto_url, bio, lgpd_aceito, criado_em, user_id, instagram,
  deleted_at, deleted_by, cro_verificado, nome_completo
) ON public.curadentespro TO anon, authenticated;

-- ─── Dono lê o próprio CPF (nunca o de outros) ───────────────────────────────

CREATE OR REPLACE FUNCTION public.meu_cpf()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cpf FROM public.curadentespro WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.meu_cpf() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.meu_cpf() TO authenticated;
