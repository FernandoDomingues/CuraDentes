-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: CPF em tabela propria (corrige regressao do #0)
--
-- A protecao por GRANT de coluna (migration 20260612110000) quebrava TODO upsert
-- na curadentespro: o PostgREST retorna a representacao da linha (SELECT da linha
-- inteira, incluindo cpf), e sem SELECT em cpf isso da 403. Resultado: cadastro
-- de dentista parou de funcionar.
--
-- Solucao robusta: o CPF (unico dado sensivel) sai da curadentespro e vai para
-- uma tabela propria com RLS owner-only. Assim a curadentespro volta a ter SELECT
-- total (upserts/embeds/reads normais) SEM vazar cpf, e o cpf so e acessivel pelo
-- proprio dono (ou via RPC meu_cpf).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Restaura SELECT total na curadentespro (a coluna cpf vai sair daqui) ──
GRANT SELECT ON public.curadentespro TO anon, authenticated;

-- ─── 2. Tabela separada para o CPF (owner-only) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.curadentespro_cpf (
  curadentespro_id uuid PRIMARY KEY REFERENCES public.curadentespro(id) ON DELETE CASCADE,
  cpf text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- CPF continua unico entre dentistas (mesma regra de antes)
CREATE UNIQUE INDEX IF NOT EXISTS uq_curadentespro_cpf_cpf ON public.curadentespro_cpf(cpf);

ALTER TABLE public.curadentespro_cpf ENABLE ROW LEVEL SECURITY;

-- Grants base (RLS restringe as linhas). anon nao toca em cpf.
GRANT SELECT, INSERT, UPDATE ON public.curadentespro_cpf TO authenticated;

DROP POLICY IF EXISTS "owner_select_cpf" ON public.curadentespro_cpf;
CREATE POLICY "owner_select_cpf" ON public.curadentespro_cpf
  FOR SELECT TO authenticated USING (curadentespro_id = auth.uid());

DROP POLICY IF EXISTS "owner_insert_cpf" ON public.curadentespro_cpf;
CREATE POLICY "owner_insert_cpf" ON public.curadentespro_cpf
  FOR INSERT TO authenticated WITH CHECK (curadentespro_id = auth.uid());

DROP POLICY IF EXISTS "owner_update_cpf" ON public.curadentespro_cpf;
CREATE POLICY "owner_update_cpf" ON public.curadentespro_cpf
  FOR UPDATE TO authenticated USING (curadentespro_id = auth.uid()) WITH CHECK (curadentespro_id = auth.uid());

-- ─── 3. Migra os CPFs existentes ─────────────────────────────────────────────
INSERT INTO public.curadentespro_cpf (curadentespro_id, cpf)
  SELECT id, cpf FROM public.curadentespro
  WHERE cpf IS NOT NULL AND cpf <> ''
  ON CONFLICT (curadentespro_id) DO NOTHING;

-- ─── 4. meu_cpf() passa a ler da tabela nova ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.meu_cpf()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cpf FROM public.curadentespro_cpf WHERE curadentespro_id = auth.uid();
$$;

-- ─── 5. Remove a coluna sensivel da tabela principal ─────────────────────────
ALTER TABLE public.curadentespro DROP COLUMN IF EXISTS cpf;
