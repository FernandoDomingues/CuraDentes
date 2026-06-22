-- ═══════════════════════════════════════════════════════════════════════════════
-- logs_login — registro da ORIGEM de cada login (analytics do superuser)
--
-- Espelha o padrão de logs_busca: insert anônimo pelo client, leitura só pelo
-- superuser (is_superuser()). Guarda de onde veio o login:
--   origem      → rótulo p/ o gráfico: navegador no desktop (Chrome/Edge/...),
--                 ou "Android"/"iOS" no celular, ou "App Android"/"App iOS" no app.
--   plataforma  → 'desktop' | 'android' | 'ios' | 'outro'
--   navegador   → nome do navegador (ou "App")
--   is_app      → true quando veio do app nativo (Capacitor)
--   user_agent  → UA bruto (diagnóstico)
--   user_id     → quem logou (nullable)
--
-- LGPD: sem IP; user_agent é técnico e não identifica a pessoa isoladamente.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.logs_login (
  id          bigserial PRIMARY KEY,
  origem      text,
  plataforma  text,
  navegador   text,
  is_app      boolean DEFAULT false,
  user_agent  text,
  user_id     uuid,
  criado_em   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_login_criado_em ON public.logs_login (criado_em DESC);

ALTER TABLE public.logs_login ENABLE ROW LEVEL SECURITY;

-- Insert público (igual logs_busca): o próprio cliente registra seu login.
DROP POLICY IF EXISTS insert_logs_login ON public.logs_login;
CREATE POLICY insert_logs_login ON public.logs_login
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Leitura apenas pelo superuser (painel de analytics).
DROP POLICY IF EXISTS superuser_select_logs_login ON public.logs_login;
CREATE POLICY superuser_select_logs_login ON public.logs_login
  FOR SELECT TO authenticated USING (is_superuser());
