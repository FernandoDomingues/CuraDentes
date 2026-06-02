-- ==============================================================================
-- MIGRATION: Segurança RLS + Storage
-- Data: 2026-06-02
-- Escopo:
--   1a. Adicionar coluna user_id em curadentespro e clientes (FK -> auth.users)
--   1b. Substituir 3 policies permissivas por policies granulares
--   1c. Tornar RPC get_dentistas_proximos SECURITY DEFINER (busca anônima segue)
--   2.  Adicionar policies de Storage no bucket fotos-dentistas
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- FASE 1a: Adicionar coluna user_id
-- ==============================================================================
-- Nullable para preservar os 50 dentistas e clientes existentes.
-- Após rodar esta migration, faça backfill manual dos user_ids no Studio
-- (UPDATE curadentespro SET user_id = '<auth_uid>' WHERE id = '...').

ALTER TABLE public.curadentespro
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_curadentespro_user_id ON public.curadentespro(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);

-- ==============================================================================
-- FASE 1b: Substituir policies permissivas por policies granulares
-- ==============================================================================
-- Padrão: SELECT público, INSERT/UPDATE/DELETE só pelo dono (auth.uid())

-- ---------------- TABELA: clientes ----------------
DROP POLICY IF EXISTS "Permitir acesso público à tabela clientes" ON public.clientes;

CREATE POLICY "Leitura pública de clientes"
  ON public.clientes FOR SELECT USING (true);

CREATE POLICY "Dono insere o próprio perfil"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dono atualiza o próprio perfil"
  ON public.clientes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dono deleta o próprio perfil"
  ON public.clientes FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------- TABELA: curadentespro ----------------
DROP POLICY IF EXISTS "Permitir acesso público à tabela curadentespro" ON public.curadentespro;

CREATE POLICY "Leitura pública de dentistas"
  ON public.curadentespro FOR SELECT USING (true);

CREATE POLICY "Dono cria o próprio perfil"
  ON public.curadentespro FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dono edita o próprio perfil"
  ON public.curadentespro FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dono deleta o próprio perfil"
  ON public.curadentespro FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------- TABELA: curadentespro_enderecos ----------------
DROP POLICY IF EXISTS "Permitir acesso público à tabela curadentespro_enderecos"
  ON public.curadentespro_enderecos;

CREATE POLICY "Leitura pública de endereços"
  ON public.curadentespro_enderecos FOR SELECT USING (true);

CREATE POLICY "Dono do dentista insere endereço"
  ON public.curadentespro_enderecos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.curadentespro p
      WHERE p.id = curadentespro_enderecos.curadentespro_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Dono do dentista atualiza endereço"
  ON public.curadentespro_enderecos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.curadentespro p
      WHERE p.id = curadentespro_enderecos.curadentespro_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Dono do dentista deleta endereço"
  ON public.curadentespro_enderecos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.curadentespro p
      WHERE p.id = curadentespro_enderecos.curadentespro_id
        AND p.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- FASE 1c: Tornar RPC SECURITY DEFINER
-- ==============================================================================
-- Sem isso, a busca anônima quebraria quando as policies de curadentespro /
-- curadentespro_enderecos forem apertadas (RLS bloquearia a leitura).
-- SECURITY DEFINER faz a função rodar com permissões do owner (postgres),
-- permitindo leitura pública controlada. Não exponha a função para escritas.

ALTER FUNCTION public.get_dentistas_proximos(double precision, double precision, double precision)
  SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_dentistas_proximos(double precision, double precision, double precision)
  TO anon, authenticated;

-- ==============================================================================
-- FASE 2: Storage policies para bucket fotos-dentistas
-- ==============================================================================
-- Convenção de path: {user_id}/{timestamp}_foto.{ext}
-- Isso permite (auth.uid()::text = primeiro segmento do path) na policy.

-- Leitura pública (qualquer um pode ver as fotos)
DROP POLICY IF EXISTS "Leitura pública de fotos de dentistas" ON storage.objects;
CREATE POLICY "Leitura pública de fotos de dentistas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-dentistas');

-- Upload: apenas na pasta do próprio user
DROP POLICY IF EXISTS "Upload apenas na pasta do próprio user" ON storage.objects;
CREATE POLICY "Upload apenas na pasta do próprio user"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fotos-dentistas'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Update: apenas dono (não troca path)
DROP POLICY IF EXISTS "Dono atualiza a própria foto" ON storage.objects;
CREATE POLICY "Dono atualiza a própria foto"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'fotos-dentistas'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'fotos-dentistas'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delete: apenas dono
DROP POLICY IF EXISTS "Dono deleta a própria foto" ON storage.objects;
CREATE POLICY "Dono deleta a própria foto"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fotos-dentistas'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

COMMIT;

-- ==============================================================================
-- PÓS-MIGRATION: BACKFILL DE user_id (rodar manualmente, com cuidado)
-- ==============================================================================
-- Para cada dentista que já tinha auth.users, encontre o user_id e preencha:
--
--   UPDATE public.curadentespro
--     SET user_id = u.id
--   FROM auth.users u
--   WHERE lower(u.email) = lower(curadentespro.email)
--     AND curadentespro.user_id IS NULL;
--
-- O mesmo vale para clientes:
--
--   UPDATE public.clientes
--     SET user_id = u.id
--   FROM auth.users u
--   WHERE lower(u.email) = lower(clientes.email)
--     AND clientes.user_id IS NULL;
--
-- Se houver clientes/dentistas com email NULL, vincule pelo auth.uid() da
-- sessão ativa no momento do cadastro (requer ajuste no fluxo de signup).
-- ==============================================================================
