-- ═══════════════════════════════════════════════════════════════════════════════
-- HOTFIX: o grant de proteger_contato_dentista listou só as colunas ANTIGAS (base
-- proteger_cpf_lgpd) e ESQUECEU as adicionadas depois (tratamento, especialidade,
-- google_review_url, cobranca_*, lembrete_*). Como aquele REVOKE tirou o acesso a
-- elas, perfis/busca/home passaram a dar 401/404.
--
-- Aqui concedemos TODAS as colunas públicas (tudo menos email e telefone, que
-- continuam ocultos) e recarregamos o schema do PostgREST.
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT (
  id, nome, telefone_verificado, cro, ano_formacao, foto_url, bio, lgpd_aceito,
  criado_em, user_id, instagram, deleted_at, deleted_by, cro_verificado,
  nome_completo, tratamento, lembrete_cadastro_enviado_em, lembrete_etapa,
  cobranca_aviso_aceita, cobranca_aviso_aceita_em, especialidade, google_review_url
) ON public.curadentespro TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
