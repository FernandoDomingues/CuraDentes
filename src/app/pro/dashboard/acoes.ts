"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DO DENTISTA (servidor) — mutações autenticadas que antes rodavam no cliente.
//
// Cada ação VALIDA a sessão no servidor (getUser) e usa o id da SESSÃO — NUNCA um id
// vindo do cliente — porque Server Actions são chamáveis por POST direto (ver doc do
// Next: "Always verify authentication and authorization inside every Server Function").
// A RLS do banco continua sendo a proteção final. Parte do refactor do C1 (httpOnly).
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";

/** Salva a bio do dentista logado (id da sessão, não do cliente). */
export async function salvarBio(bio: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  const texto = (bio ?? "").slice(0, 500); // mesma trava de tamanho do editor
  const { error } = await supabase.from("curadentespro").update({ bio: texto }).eq("id", user.id);
  if (error) {
    console.error("[acoes] salvarBio:", error.message);
    return { ok: false, erro: "Não foi possível salvar." };
  }
  return { ok: true };
}
