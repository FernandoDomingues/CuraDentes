// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD DA FOTO DO DENTISTA — Storage do Supabase (bucket fotos-dentistas).
//
// Roda no NAVEGADOR (editor de fotos), usando o cliente autenticado por cookies
// para a RLS reconhecer o dono. Caminho FIXO {id}/foto.webp (sobrescreve, sem
// acúmulo) e cache-busting via ?v= na URL salva. Portado do site-k11.
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteNavegador } from "./supabase/client";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Envia a foto de perfil ao Storage e atualiza curadentespro.foto_url.
 * @param file imagem (de preferência já em WebP, exportada pelo editor)
 * @param dentistaId UUID do dentista (== auth.uid)
 * @returns a URL pública (com ?v=) salva no perfil
 */
export async function uploadFotoDentista(file: File | Blob, dentistaId: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A foto é muito grande! Escolha uma imagem de até 2MB.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Formato inválido. Use JPG, PNG ou WEBP.");
  }

  const supabase = criarClienteNavegador();
  const filePath = `${dentistaId}/foto.webp`;

  const { error: uploadError } = await supabase.storage
    .from("fotos-dentistas")
    .upload(filePath, file, { cacheControl: "3600", upsert: true, contentType: file.type });
  if (uploadError) {
    console.error("[upload-foto] storage:", uploadError);
    throw new Error("Falha ao enviar a imagem para o servidor.");
  }

  const { data } = supabase.storage.from("fotos-dentistas").getPublicUrl(filePath);
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("curadentespro")
    .update({ foto_url: publicUrl })
    .eq("id", dentistaId);
  if (updateError) {
    console.error("[upload-foto] update perfil:", updateError);
    throw new Error("A foto foi enviada, mas falhamos ao vinculá-la ao seu perfil.");
  }

  return publicUrl;
}
