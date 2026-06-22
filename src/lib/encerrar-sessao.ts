// Encerra a sessão do navegador de forma robusta: tenta o signOut normal
// (revoga o token no servidor) e, se falhar (rede/endpoint), garante ao menos a
// limpeza LOCAL dos cookies com scope:'local'. Assim o usuário nunca fica com a
// falsa sensação de ter saído. (Pego no review de segurança.)

import type { SupabaseClient } from "@supabase/supabase-js";

export async function encerrarSessao(supabase: SupabaseClient): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: "local" });
  } catch {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* nada mais a fazer — a sessão será descartada na navegação */
    }
  }
}
