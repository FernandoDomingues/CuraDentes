-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — FASE 1: bucket de Storage para as fotos (clínica + sala). Rode no SQL Editor.
--
-- Bucket PÚBLICO (leitura por URL, igual ao fotos-dentistas) — os caminhos têm UUIDs
-- não-adivinháveis. Escrita só pelo dono (1º segmento do caminho = auth.uid()).
-- Caminhos usados pelo app (fase 2):
--   {uid}/clinicas/{endereco_id}/fachada.webp
--   {uid}/clinicas/{endereco_id}/recepcao-1.webp ... recepcao-3.webp
--   {uid}/salas/{sala_id}/foto-1.webp ... foto-3.webp
-- ════════════════════════════════════════════════════════════════════════════════

-- 1) Cria o bucket (idempotente).
insert into storage.buckets (id, name, public)
values ('fotos-salas', 'fotos-salas', true)
on conflict (id) do update set public = true;

-- 2) Políticas (escrita só do dono; leitura pública).
drop policy if exists "fotos_salas_leitura" on storage.objects;
create policy "fotos_salas_leitura" on storage.objects
  for select to public
  using (bucket_id = 'fotos-salas');

drop policy if exists "fotos_salas_insert_dono" on storage.objects;
create policy "fotos_salas_insert_dono" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-salas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos_salas_update_dono" on storage.objects;
create policy "fotos_salas_update_dono" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos-salas' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fotos-salas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos_salas_delete_dono" on storage.objects;
create policy "fotos_salas_delete_dono" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-salas' and (storage.foldername(name))[1] = auth.uid()::text);
