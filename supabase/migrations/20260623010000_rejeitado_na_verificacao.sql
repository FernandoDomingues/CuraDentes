-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: mensagem da rejeição de CRO → "Rejeitado na Verificação"
--
-- Troca o texto do campo `erro` gravado por marcar_verificacao_cro quando o CRO é
-- reprovado: de "Falha na verificação manual" para "Rejeitado na Verificação".
-- Mantém TODO o resto da função igual à versão atual (authz via is_superuser,
-- soft-delete do perfil em deleted_at/deleted_by). Atualiza também as linhas já
-- gravadas com o texto antigo.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.marcar_verificacao_cro(
  p_dentista_id UUID,
  p_verificado BOOLEAN,
  p_observacao TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verificacao_id UUID;
  v_status TEXT;
  v_result JSONB;
BEGIN
  -- AUTORIZAÇÃO: somente o superuser pode executar.
  IF NOT public.is_superuser() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Não autorizado: apenas o administrador pode verificar CRO.'
    );
  END IF;

  v_status := CASE WHEN p_verificado THEN 'verificado' ELSE 'falhou' END;

  INSERT INTO public.cro_verificacoes (dentista_id, cro, uf, status, verificado_em, observacao, verificado_por, erro)
  SELECT
    p_dentista_id,
    p.cro,
    upper(split_part(p.cro, '-', 2)),
    v_status,
    CASE WHEN p_verificado THEN now() ELSE NULL END,
    p_observacao,
    auth.uid(),
    CASE WHEN NOT p_verificado THEN 'Rejeitado na Verificação' ELSE NULL END
  FROM public.curadentespro p
  WHERE p.id = p_dentista_id
  ON CONFLICT (dentista_id) DO UPDATE SET
    status = v_status,
    verificado_em = CASE WHEN p_verificado THEN now() ELSE NULL END,
    verificado_por = auth.uid(),
    observacao = COALESCE(p_observacao, EXCLUDED.observacao),
    erro = CASE WHEN NOT p_verificado THEN 'Rejeitado na Verificação' ELSE NULL END,
    atualizado_em = now()
  RETURNING id INTO v_verificacao_id;

  UPDATE public.curadentespro
  SET
    cro_verificado = p_verificado,
    deleted_at = CASE WHEN NOT p_verificado THEN now() ELSE NULL END,
    deleted_by = CASE WHEN NOT p_verificado THEN auth.uid() ELSE NULL END
  WHERE id = p_dentista_id;

  v_result := jsonb_build_object(
    'success', true,
    'verificacao_id', v_verificacao_id,
    'status', v_status
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_verificacao_cro(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_verificacao_cro(UUID, BOOLEAN, TEXT) TO authenticated;

-- Atualiza as verificações já gravadas com o texto antigo.
UPDATE public.cro_verificacoes
  SET erro = 'Rejeitado na Verificação'
  WHERE erro = 'Falha na verificação manual';
