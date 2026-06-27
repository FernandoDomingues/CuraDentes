"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD DA FOTO DO DENTISTA — Server Action (Storage bucket fotos-dentistas).
//
// Roda no SERVIDOR: valida a sessão (getUser) e usa o id da SESSÃO — nunca um id do
// cliente (Server Actions são chamáveis por POST direto). Caminho FIXO {id}/foto.webp
// (sobrescreve, sem acúmulo) e cache-busting via ?v=. RLS owner-only como proteção
// final. Parte do refactor do C1 (httpOnly).
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "./supabase/server";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Recebe a imagem (campo "foto" do FormData), envia ao Storage e atualiza
 * curadentespro.foto_url do dentista logado. Retorna a URL pública (com ?v=).
 */
export async function uploadFotoDentista(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; erro?: string }> {
  const file = formData.get("foto");
  if (!(file instanceof File)) return { ok: false, erro: "Arquivo inválido." };
  if (file.size > MAX_FILE_SIZE) return { ok: false, erro: "A foto é muito grande! Escolha uma imagem de até 2MB." };
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, erro: "Formato inválido. Use JPG, PNG ou WEBP." };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  const filePath = `${user.id}/foto.webp`;
  const { error: uploadError } = await supabase.storage
    .from("fotos-dentistas")
    .upload(filePath, file, { cacheControl: "3600", upsert: true, contentType: file.type });
  if (uploadError) {
    console.error("[upload-foto] storage:", uploadError.message);
    return { ok: false, erro: "Falha ao enviar a imagem para o servidor." };
  }

  const { data } = supabase.storage.from("fotos-dentistas").getPublicUrl(filePath);
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("curadentespro")
    .update({ foto_url: publicUrl })
    .eq("id", user.id);
  if (updateError) {
    console.error("[upload-foto] update perfil:", updateError.message);
    return { ok: false, erro: "A foto foi enviada, mas falhamos ao vinculá-la ao seu perfil." };
  }

  return { ok: true, url: publicUrl };
}
