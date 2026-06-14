-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Preferências de e-mail do dentista + descadastro por token
--
-- O dentista consente (opt-in) categorias de e-mail no cadastro. Guardamos isso em
-- uma TABELA SEPARADA (curadentespro_email), e NÃO em curadentespro, porque esta
-- tem SELECT público (policy "Leitura pública de dentistas" USING true) — o mesmo
-- motivo que tirou o CPF de lá. Assim o `unsub_token` (capacidade de descadastrar
-- sem login) nunca é exposto publicamente.
--
--   prefs       -> {"desempenho":bool, "novidades":bool, "parceiros":bool}
--   unsub_token -> uuid único; vai no link "Cancelar inscrição" dos e-mails
--
-- Acesso:
--   • dono (logado): RLS owner-only (gerencia as próprias preferências)
--   • página pública de descadastro (sem login): só via RPCs SECURITY DEFINER
--     gated por token (email_prefs_por_token / atualizar_email_prefs_por_token)
--   • envio (edge function service_role): bypass de RLS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.curadentespro_email (
  curadentespro_id uuid PRIMARY KEY REFERENCES public.curadentespro(id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{"desempenho": false, "novidades": false, "parceiros": false}'::jsonb,
  unsub_token uuid NOT NULL DEFAULT gen_random_uuid(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_curadentespro_email_token
  ON public.curadentespro_email(unsub_token);

ALTER TABLE public.curadentespro_email ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.curadentespro_email FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.curadentespro_email TO authenticated;
-- anon: nenhum acesso direto (só via RPCs abaixo)

-- ── RLS: o dono gerencia as próprias preferências ────────────────────────────
CREATE POLICY owner_select_cpemail ON public.curadentespro_email
  FOR SELECT TO authenticated USING (curadentespro_id = auth.uid());
CREATE POLICY owner_insert_cpemail ON public.curadentespro_email
  FOR INSERT TO authenticated WITH CHECK (curadentespro_id = auth.uid());
CREATE POLICY owner_update_cpemail ON public.curadentespro_email
  FOR UPDATE TO authenticated USING (curadentespro_id = auth.uid()) WITH CHECK (curadentespro_id = auth.uid());

-- ── Toda conta de dentista passa a ter uma linha (token sempre existe) ────────
CREATE OR REPLACE FUNCTION public.criar_curadentespro_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.curadentespro_email (curadentespro_id) VALUES (NEW.id)
  ON CONFLICT (curadentespro_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_criar_curadentespro_email ON public.curadentespro;
CREATE TRIGGER trg_criar_curadentespro_email
  AFTER INSERT ON public.curadentespro
  FOR EACH ROW EXECUTE FUNCTION public.criar_curadentespro_email();

-- Backfill dos dentistas já existentes
INSERT INTO public.curadentespro_email (curadentespro_id)
SELECT id FROM public.curadentespro
ON CONFLICT (curadentespro_id) DO NOTHING;

-- ── RPC pública (gated por token): ler as preferências ───────────────────────
CREATE OR REPLACE FUNCTION public.email_prefs_por_token(p_token uuid)
RETURNS TABLE(nome text, prefs jsonb)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.nome, e.prefs
  FROM public.curadentespro_email e
  JOIN public.curadentespro c ON c.id = e.curadentespro_id
  WHERE e.unsub_token = p_token AND c.deleted_at IS NULL;
$$;

-- ── RPC pública (gated por token): atualizar as preferências ─────────────────
CREATE OR REPLACE FUNCTION public.atualizar_email_prefs_por_token(p_token uuid, p_prefs jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.curadentespro_email
  SET prefs = jsonb_build_object(
        'desempenho', COALESCE((p_prefs->>'desempenho')::boolean, false),
        'novidades',  COALESCE((p_prefs->>'novidades')::boolean, false),
        'parceiros',  COALESCE((p_prefs->>'parceiros')::boolean, false)
      ),
      atualizado_em = now()
  WHERE unsub_token = p_token;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.email_prefs_por_token(uuid) FROM public;
REVOKE ALL ON FUNCTION public.atualizar_email_prefs_por_token(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.email_prefs_por_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_email_prefs_por_token(uuid, jsonb) TO anon, authenticated;
