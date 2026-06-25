-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Esconde email e telefone do dentista (estavam scrapáveis via REST)
--
-- O grant por coluna de curadentespro (proteger_cpf_lgpd) liberava email e telefone
-- para anon/authenticated — qualquer um raspava o contato pessoal de todos os
-- dentistas via `?select=email,telefone`. A pedido, passam a ficar OCULTOS.
--
-- Mesma técnica do CPF: REVOKE do SELECT de tabela + GRANT só nas colunas não
-- sensíveis (agora também SEM email e telefone). O acesso legítimo continua:
--   • dono lê o próprio telefone via RPC meu_telefone()
--   • dono usa o email da sessão (Auth), não da coluna
--   • superuser lê os emails (fila CRO) via RPC emails_dentistas_cro()
-- (frontend já atualizado e deployado antes desta migration — ordem segura.)
--
-- Mantém telefone_verificado (apenas um booleano, não o número).
-- ═══════════════════════════════════════════════════════════════════════════════

REVOKE SELECT ON public.curadentespro FROM anon, authenticated;

GRANT SELECT (
  id, nome, telefone_verificado, cro, ano_formacao, foto_url, bio, lgpd_aceito,
  criado_em, user_id, instagram, deleted_at, deleted_by, cro_verificado, nome_completo
) ON public.curadentespro TO anon, authenticated;
