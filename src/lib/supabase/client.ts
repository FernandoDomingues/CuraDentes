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

// SINGLETON: UMA única instância do cliente do navegador para toda a aba.
//
// Por que isso importa: o supabase-js usa `navigator.locks` para sincronizar a
// autenticação. Se VÁRIAS instâncias forem criadas (uma por componente), elas
// disputam o mesmo lock e podem TRAVAR — `getSession()`/`getUser()` ficam
// pendurados para sempre, e a sessão nunca aparece (cabeçalho preso em "Entrar").
// Mantendo uma instância só, não há disputa de lock.
// Lock NO-OP: o lock padrão do supabase-js usa navigator.locks e estava
// PENDURANDO getSession()/getUser() (deadlock — operações nunca resolviam, e a
// sessão nunca aparecia). Rodar a função direto, sem lock, elimina o travamento.
// (Trade-off aceitável: sem coordenação multi-aba de refresh; o token ainda
// renova normalmente.)
function lockNoOp<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  return fn();
}

// Wrapper local: ReturnType<typeof novo> reflete o tipo EXATO inferido —
// preservando a inferência precisa nos chamadores.
function novo() {
  return createBrowserClient(url, anonKey, {
    auth: { lock: lockNoOp },
  });
}
let clienteNavegador: ReturnType<typeof novo> | null = null;

/** Retorna o cliente Supabase do navegador (criado uma vez e reutilizado). */
export function criarClienteNavegador() {
  return (clienteNavegador ??= novo());
}
