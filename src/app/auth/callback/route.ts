// ═══════════════════════════════════════════════════════════════════════════════
// CALLBACK DE AUTENTICAÇÃO — /auth/callback
//
// Troca o `code` (PKCE) por uma sessão e grava os cookies de sessão DIRETAMENTE na
// resposta de redirect. Usa um "jar" de cookies mutável: o getAll reflete o que o
// exchange grava (setAll), para que getUser() já enxergue a sessão recém-criada.
// O destino de volta (?next) vem por cookie (cd_next), gravado no cliente antes do
// OAuth. Em caso de falha, o motivo vai na URL (?erro=callback&m=...) p/ diagnóstico.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSuperuserEmail } from "@/lib/superuser";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const erroOAuth = searchParams.get("error_description") || searchParams.get("error");

  if (erroOAuth) {
    return NextResponse.redirect(`${origin}/entrar?erro=oauth&m=${encodeURIComponent(erroOAuth)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/entrar?erro=callback&m=sem-code`);
  }

  // Destino de volta: cookie cd_next (caminho interno) com fallback p/ ?next=.
  const rawNext = request.cookies.get("cd_next")?.value;
  const nextCookie = rawNext ? decodeURIComponent(rawNext) : null;
  const candidato = nextCookie || searchParams.get("next");
  const destinoNext = candidato && /^\/(?![/\\])/.test(candidato) ? candidato : null;

  // Jar mutável: começa com os cookies da requisição (inclui o code_verifier do PKCE);
  // o exchange grava a sessão aqui (setAll) E também coletamos para a resposta final.
  const jar = new Map<string, string>();
  request.cookies.getAll().forEach((c) => jar.set(c.name, c.value));
  const setList: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return Array.from(jar, ([name, value]) => ({ name, value }));
      },
      setAll(toSet) {
        for (const c of toSet) {
          jar.set(c.name, c.value);
          setList.push(c);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/entrar?erro=exchange&m=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destino = `${origin}/`;
  if (!user) {
    // Não deveria acontecer logo após um exchange bem-sucedido; sinaliza p/ diagnóstico.
    destino = `${origin}/entrar?erro=sessao&m=sem-user-pos-exchange`;
  } else if (isSuperuserEmail(user.email)) {
    destino = destinoNext ? `${origin}${destinoNext}` : `${origin}/pro/dashboard`;
  } else {
    await supabase.rpc("restaurar_minha_conta_dentista").then(
      () => {},
      () => {},
    );
    const { data: dent } = await supabase
      .from("curadentespro")
      .select("id")
      .eq("id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (dent) {
      destino = destinoNext ? `${origin}${destinoNext}` : `${origin}/pro/dashboard`;
    } else {
      const meta = (user.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
      await supabase
        .from("clientes")
        .upsert(
          {
            id: user.id,
            user_id: user.id,
            nome: meta.full_name ?? user.email ?? "",
            email: user.email ?? "",
            foto: meta.avatar_url ?? "",
          },
          { onConflict: "id" },
        )
        .then(({ error: e }) => {
          if (e) console.warn("[callback] upsert clientes falhou:", e.message);
        });
      destino = destinoNext ? `${origin}${destinoNext}` : `${origin}/`;
    }
  }

  // Redirect final COM os cookies de sessão aplicados (crítico) + cd_next limpo.
  // IMPORTANTE: forçamos httpOnly:false — o @supabase/ssr precisa que o CLIENTE
  // (JavaScript) consiga LER os cookies de sessão; se saírem httpOnly, o servidor
  // enxerga a sessão mas o navegador "fica deslogado". sameSite/lax + secure + path
  // garantem que o cookie sobreviva ao redirect e seja enviado de volta.
  const res = NextResponse.redirect(destino);
  for (const { name, value, options } of setList) {
    res.cookies.set(name, value, {
      ...(options ?? {}),
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
  }
  res.cookies.set("cd_next", "", { path: "/", maxAge: 0 });
  return res;
}
