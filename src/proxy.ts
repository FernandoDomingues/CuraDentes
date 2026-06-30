// ═══════════════════════════════════════════════════════════════════════════════
// PROXY (antigo "middleware") — renova a sessão do Supabase em TODA requisição.
//
// Por que existe: com @supabase/ssr a sessão vive em cookies. O token expira e
// precisa ser renovado; quem faz isso de forma confiável (e regrava os cookies
// na resposta) é este proxy, chamando supabase.auth.getUser(). Sem ele, o
// usuário "cairia" da sessão em Server Components.
//
// A PROTEÇÃO de rotas /pro (redirect para /entrar) é feita no layout do /pro
// (Server Component), que já precisa do usuário para derivar o papel.
//
// OBS: no Next.js 16 a convenção "middleware" virou "proxy" (arquivo proxy.ts +
// função `proxy`); o comportamento é o mesmo.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          // httpOnly:true (C1): ao RENOVAR o token, regravamos os cookies de sessão
          // SEM permitir leitura por JS. Sem este override, o supabase regravaria os
          // cookies sem httpOnly e "desfaria" o flip a cada request a /pro|/entrar|etc.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, httpOnly: true }),
          );
        },
      },
    },
  );

  // NÃO remover: é esta chamada que renova o token e regrava os cookies.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Renova a sessão SÓ onde o servidor lê o login: a área restrita, a vitrine de
  // locação (/coworking — members-only, lê a sessão no servidor p/ as RPCs gated)
  // e as telas de autenticação. As páginas PÚBLICAS (home, /dentista, /especialidade,
  // /busca, /urgencia, /sobre, /termos, /privacidade) não usam sessão no servidor —
  // então não acionam o middleware, economizando invocations/banda (custo) e latência.
  // O login no cabeçalho dessas páginas é uma ilha cliente que se renova sozinha.
  // IMPORTANTE: /coworking PRECISA estar aqui — sem o refresh do proxy, o getUsuario
  // renova o token em memória (passa o muro) mas rotaciona o refresh-token sem
  // regravar o cookie; o 2º cliente (sb.rpc) então cai da sessão e auth.uid() vira
  // null dentro da RPC → catálogo vazio. Estar no matcher regrava os cookies antes.
  // OBS: /auth/callback NÃO entra aqui de propósito — quem estabelece a sessão é
  // o próprio route handler do callback (que grava os cookies na resposta de
  // redirect). Rodar o proxy lá só criaria corrida de cookies.
  matcher: ["/pro/:path*", "/coworking", "/coworking/:path*", "/entrar", "/cadastro", "/redefinir-senha"],
};
