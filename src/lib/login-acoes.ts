"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// LOG DE LOGIN (servidor) — registra a origem do login e salva a localização do
// paciente. Antes rodavam no AuthListener via cliente do navegador (onAuthStateChange
// + writes autenticados); agora são Server Actions com o id da SESSÃO. Best-effort
// (nunca lançam). Refactor do C1 (httpOnly).
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";

/** Insere a origem do login (dados de navegador detectados no cliente) em logs_login. */
export async function registrarOrigemLogin(o: {
  origem: string;
  plataforma: string;
  navegador: string;
  is_app: boolean;
  user_agent: string;
}): Promise<void> {
  try {
    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("logs_login").insert({
      origem: o.origem,
      plataforma: o.plataforma,
      navegador: o.navegador,
      is_app: o.is_app,
      user_agent: o.user_agent,
      user_id: user.id,
    });
  } catch {
    /* best-effort */
  }
}

/** Salva as coordenadas do login no perfil do paciente logado (id da sessão). */
export async function salvarLocalizacaoLogin(latitude: number, longitude: number): Promise<void> {
  try {
    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("clientes").update({ latitude, longitude }).eq("id", user.id);
  } catch {
    /* best-effort */
  }
}
