// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTE SUPABASE — SERVIDOR (lê a sessão dos COOKIES do Next).
//
// Usado em Server Components, Route Handlers e Server Actions que precisam saber
// QUEM está logado (ou agir em nome dele). Lê/grava os cookies de sessão via
// next/headers. É assim que o servidor enxerga o login feito no navegador.
//
// Importante: para checagens de segurança, use sempre `auth.getUser()` (valida o
// token no Supabase), nunca apenas `getSession()` (que só lê o cookie).
// ═══════════════════════════════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cria um cliente Supabase ligado aos cookies da requisição atual. */
export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de dentro de um Server Component (onde não se pode escrever
          // cookie). Tudo bem: o middleware é quem renova a sessão a cada request.
        }
      },
    },
  });
}
