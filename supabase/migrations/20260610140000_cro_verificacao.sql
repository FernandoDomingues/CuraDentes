-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Verificação de CRO (SISCAF/CFO)
--
-- 1. Adiciona coluna cro_verificado em curadentespro
-- 2. Cria tabela cro_verificacoes com dados consultados + status
-- 3. RLS: superuser pode ler/atualizar, dono do perfil pode ler
-- 4. Popula registro inicial para dentistas com CRO preenchido
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Flag cro_verificado na tabela principal ──────────────────────────────

ALTER TABLE public.curadentespro
  ADD COLUMN IF NOT EXISTS cro_verificado BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. Tabela de verificações ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cro_verificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentista_id UUID NOT NULL REFERENCES public.curadentespro(id) ON DELETE CASCADE,
  cro TEXT NOT NULL,
  uf TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'processando', 'verificado', 'falhou')),
  dados_consultados JSONB DEFAULT NULL,
  -- Metadados da consulta SISCAF (captcha, sessão, etc.)
  captcha_sessao TEXT DEFAULT NULL,
  captcha_base64 TEXT DEFAULT NULL,
  erro TEXT DEFAULT NULL,
  verificado_por UUID REFERENCES auth.users(id) DEFAULT NULL,
  observacao TEXT DEFAULT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cro_verificacoes_status ON public.cro_verificacoes(status);
CREATE INDEX IF NOT EXISTS idx_cro_verificacoes_dentista ON public.cro_verificacoes(dentista_id);
CREATE INDEX IF NOT EXISTS idx_cro_verificacoes_criado_em ON public.cro_verificacoes(criado_em);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION public.update_cro_verificacoes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cro_verificacoes_updated_at ON public.cro_verificacoes;
CREATE TRIGGER trg_cro_verificacoes_updated_at
  BEFORE UPDATE ON public.cro_verificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cro_verificacoes_updated_at();

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.cro_verificacoes ENABLE ROW LEVEL SECURITY;

-- Superuser pode ler tudo
DROP POLICY IF EXISTS "superuser_select_cro_verificacoes" ON public.cro_verificacoes;
CREATE POLICY "superuser_select_cro_verificacoes"
  ON public.cro_verificacoes
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' IN ('fernandodomingues@live.com'));

-- Superuser pode inserir/atualizar
DROP POLICY IF EXISTS "superuser_insert_cro_verificacoes" ON public.cro_verificacoes;
CREATE POLICY "superuser_insert_cro_verificacoes"
  ON public.cro_verificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' IN ('fernandodomingues@live.com'));

DROP POLICY IF EXISTS "superuser_update_cro_verificacoes" ON public.cro_verificacoes;
CREATE POLICY "superuser_update_cro_verificacoes"
  ON public.cro_verificacoes
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' IN ('fernandodomingues@live.com'))
  WITH CHECK (auth.jwt() ->> 'email' IN ('fernandodomingues@live.com'));

-- Dono do perfil pode ver a própria verificação
DROP POLICY IF EXISTS "owner_select_cro_verificacoes" ON public.cro_verificacoes;
CREATE POLICY "owner_select_cro_verificacoes"
  ON public.cro_verificacoes
  FOR SELECT
  TO authenticated
  USING (dentista_id = auth.uid());

-- ─── 4. Popula registros iniciais para dentistas com CRO ─────────────────────

INSERT INTO public.cro_verificacoes (dentista_id, cro, uf, status)
  SELECT
    p.id,
    p.cro,
    upper(split_part(p.cro, '-', 2)) AS uf,
    'pendente'
  FROM public.curadentespro p
  WHERE p.cro IS NOT NULL AND p.cro != ''
    AND p.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.cro_verificacoes v WHERE v.dentista_id = p.id
    )
  ON CONFLICT DO NOTHING;

-- Trigger: quando um dentista atualiza o CRO, cria/reabre verificação
CREATE OR REPLACE FUNCTION public.on_cro_update_create_verificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.cro IS NOT NULL AND NEW.cro != '' AND (OLD.cro IS DISTINCT FROM NEW.cro) THEN
    INSERT INTO public.cro_verificacoes (dentista_id, cro, uf, status)
    VALUES (
      NEW.id,
      NEW.cro,
      upper(split_part(NEW.cro, '-', 2)),
      'pendente'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cro_update_verificacao ON public.curadentespro;
CREATE TRIGGER trg_cro_update_verificacao
  AFTER UPDATE OF cro ON public.curadentespro
  FOR EACH ROW
  EXECUTE FUNCTION public.on_cro_update_create_verificacao();
