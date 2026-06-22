// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTE SUPABASE — NAVEGADOR (com sessão em COOKIES).
//
// Usado por Componentes Cliente ("use client") que precisam de autenticação:
// login (signInWithPassword / signInWithOAuth), logout, e chamadas autenticadas.
//
// Por que @supabase/ssr (e não o createClient comum): ele guarda a sessão em
// COOKIES (não em localStorage). Assim o SERVIDOR (middleware, Server Components,
// Route Handlers) também enxerga quem está logado — essencial no Next.js.
// ═══════════════════════════════════════════════════════════════════════════════

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cria (ou reaproveita) o cliente Supabase do navegador. O `createBrowserClient`
 * já faz a deduplicação interna, então pode ser chamado à vontade.
 */
export function criarClienteNavegador() {
  return createBrowserClient(url, anonKey);
}
