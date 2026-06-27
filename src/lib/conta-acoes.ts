"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DE CONTA (servidor) — excluir conta + logout. Rodam no servidor (sessão por
// cookies httpOnly): o signOut limpa os cookies do lado do servidor, o que passa a
// funcionar mesmo com httpOnly:true (o cliente não consegue mais apagar o cookie).
// Parte do refactor do C1 (httpOnly).
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";

/** Exclui (soft-delete) a conta do dentista logado e encerra a sessão no servidor. */
export async function excluirContaDentista(): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.rpc("apagar_minha_conta_dentista");
  if (error) {
    console.error("[conta] excluir:", error.message);
    return { ok: false, erro: "Não foi possível excluir a conta agora. Tente novamente." };
  }
  await supabase.auth.signOut(); // limpa os cookies de sessão no servidor
  return { ok: true };
}

/** Logout: encerra a sessão no servidor (limpa os cookies httpOnly). */
export async function sairConta(): Promise<void> {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
}
