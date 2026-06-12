-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: FK em avaliacoes (#11) + limites do bucket de fotos (#5)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── #11: avaliacoes.paciente_id -> auth.users ───────────────────────────────
-- Verificado: 0 registros orfaos antes de criar a constraint.
-- ON DELETE CASCADE: apagar o usuario remove as avaliacoes dele.

ALTER TABLE public.avaliacoes
  DROP CONSTRAINT IF EXISTS avaliacoes_paciente_id_fkey;

ALTER TABLE public.avaliacoes
  ADD CONSTRAINT avaliacoes_paciente_id_fkey
  FOREIGN KEY (paciente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─── #5: limites do bucket fotos-dentistas (validacao no servidor) ────────────
-- Garante no versionamento o que ja esta configurado: tamanho maximo (2MB) e
-- tipos permitidos. Assim a validacao nao depende so do frontend.

UPDATE storage.buckets
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'fotos-dentistas';
