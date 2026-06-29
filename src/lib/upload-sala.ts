"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD de fotos da locação (bucket fotos-salas). Server Action: valida a SESSÃO e
// grava sob {uid}/... (a policy do bucket exige o 1º segmento = auth.uid()). Reusada
// por salas (escopo "salas") e por clínicas — fachada/recepção (escopo "clinicas").
// A imagem já chega convertida em WebP pelo cliente (UploadFotos).
// ═══════════════════════════════════════════════════════════════════════════════

import { randomUUID } from "crypto";
import { criarClienteServidor } from "@/lib/supabase/server";

const MAX = 4 * 1024 * 1024; // 4MB (após o resize/WebP do cliente já vem bem menor)
const TIPOS = ["image/webp", "image/jpeg", "image/png"];

export async function uploadFotoSala(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; erro?: string }> {
  const file = formData.get("foto");
  if (!(file instanceof File)) return { ok: false, erro: "Arquivo inválido." };
  if (file.size > MAX) return { ok: false, erro: "Imagem muito grande (máx 4MB)." };
  if (!TIPOS.includes(file.type)) return { ok: false, erro: "Use JPG, PNG ou WEBP." };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  const escopo = formData.get("escopo") === "clinicas" ? "clinicas" : "salas";
  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  const path = `${user.id}/${escopo}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("fotos-salas")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[upload-sala] storage:", error.message);
    return { ok: false, erro: "Falha ao enviar a imagem." };
  }

  const { data } = supabase.storage.from("fotos-salas").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
