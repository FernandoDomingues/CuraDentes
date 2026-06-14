-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Lista de envio de campanha (destinatários opt-in por categoria)
--
-- RPC privilegiada (SECURITY DEFINER, só service_role) que monta a lista de envio
-- de uma campanha: dentistas ATIVOS (lgpd_aceito, sem soft-delete, com e-mail) que
-- deram opt-in na categoria pedida, já com o token de descadastro de cada um.
--
-- Devolve e-mail + token — dado sensível — por isso NÃO é acessível por anon/
-- authenticated; só o service_role (via edge function lista-envio-campanha).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.lista_envio_campanha(p_categoria text)
RETURNS TABLE(email text, token uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.email, e.unsub_token
  FROM public.curadentespro_email e
  JOIN public.curadentespro c ON c.id = e.curadentespro_id
  WHERE c.deleted_at IS NULL
    AND c.lgpd_aceito = true
    AND c.email IS NOT NULL
    AND p_categoria IN ('desempenho', 'novidades', 'parceiros')
    AND (e.prefs ->> p_categoria)::boolean IS TRUE;
$$;

-- Apenas o service_role executa (a edge function usa a service_role key).
REVOKE ALL ON FUNCTION public.lista_envio_campanha(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lista_envio_campanha(text) TO service_role;
