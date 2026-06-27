"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// REDEFINIR SENHA (servidor) — usa a SESSÃO DE RECUPERAÇÃO dos cookies (criada pelo
// /auth/callback do link do e-mail). updateUser precisa da sessão; com httpOnly:true
// o cliente não consegue lê-la, então a troca acontece no servidor. Refactor do C1.
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";

export async function redefinirSenhaDentista(novaSenha: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada ou link inválido." };
  if (!novaSenha || novaSenha.length < 8) {
    return { ok: false, erro: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { ok: false, erro: "Não foi possível salvar a nova senha. O link pode ter expirado." };

  // Reativa a conta se estava em soft-delete (paridade com o login por senha).
  await supabase.rpc("restaurar_minha_conta_dentista").then(
    () => {},
    () => {},
  );
  // Encerra a sessão de recuperação no servidor.
  await supabase.auth.signOut();
  return { ok: true };
}
