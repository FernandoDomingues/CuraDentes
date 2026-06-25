-- ═══════════════════════════════════════════════════════════════════════════════
-- HOTFIX: garante o grant das colunas públicas de curadentespro e força o reload
-- do schema cache do PostgREST. O GRANT da migration anterior (proteger_contato_
-- dentista) não estava sendo refletido pela API (cache não recarregou em mudança
-- de GRANT), retornando 401 até para colunas públicas (id, nome, cro...).
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT (
  id, nome, telefone_verificado, cro, ano_formacao, foto_url, bio, lgpd_aceito,
  criado_em, user_id, instagram, deleted_at, deleted_by, cro_verificado, nome_completo
) ON public.curadentespro TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
