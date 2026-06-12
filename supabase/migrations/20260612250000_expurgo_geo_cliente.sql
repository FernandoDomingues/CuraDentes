-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Expurgo da geolocalização do paciente na exclusão (LGPD)
--
-- A latitude/longitude do cliente é apenas um cache de conveniência (centraliza a
-- busca na cidade dele no próximo login) — dado pessoal, mas trivialmente
-- readquirido pelo navegador. Política adotada: RETENÇÃO ZERO após a exclusão.
--
-- Antes, apagar_dados_cliente() fazia só o soft-delete (deleted_at), deixando a
-- coordenada precisa guardada indefinidamente. Agora, no momento do "esquecimento",
-- latitude/longitude são zerados junto. (LGPD art. 15/16 — eliminação ao fim da
-- finalidade.) Resolve o item C de docs/PENDENCIAS.md.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.apagar_dados_cliente()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Soft-delete + expurgo da geolocalização (retenção zero da coordenada precisa).
  UPDATE public.clientes
  SET deleted_at = now(),
      deleted_by = v_user_id,
      latitude = NULL,
      longitude = NULL
  WHERE id = v_user_id AND deleted_at IS NULL;

  UPDATE public.curadentespro
  SET deleted_at = now(), deleted_by = v_user_id
  WHERE id = v_user_id AND deleted_at IS NULL;

  RETURN v_user_id;
END;
$function$;

-- Limpeza de segurança: zera a geolocalização de qualquer conta já soft-deletada
-- (à prova de futuro; no momento desta migration são 0 linhas).
UPDATE public.clientes
SET latitude = NULL, longitude = NULL
WHERE deleted_at IS NOT NULL AND (latitude IS NOT NULL OR longitude IS NOT NULL);
