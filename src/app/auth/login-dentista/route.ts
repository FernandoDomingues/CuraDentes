// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN DO DENTISTA (e-mail/senha) — SERVIDOR — /auth/login-dentista
//
// Por que no servidor: o supabase-js do NAVEGADOR trava em operações de sessão
// (signInWithPassword inclusive). No servidor ele funciona. Aqui fazemos o login,
// reativamos a conta (se soft-deleted) e gravamos os cookies de sessão NA RESPOSTA
// (httpOnly:true — C1: o token não fica legível por JS; o cliente lê o estado de
// login do servidor via /api/me). O cliente então navega para o painel.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveLoginEmail, isSuperuserEmail } from "@/lib/superuser";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "Requisição inválida." }, { status: 400 });
  }
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, erro: "Preencha email e senha." }, { status: 400 });
  }

  const cookiesParaSetar: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const c of toSet) cookiesParaSetar.push(c);
      },
    },
  });

  const emailResolvido = resolveLoginEmail(email);
  const { error } = await supabase.auth.signInWithPassword({ email: emailResolvido, password });
  if (error) {
    return NextResponse.json({ ok: false, erro: "Email ou senha incorretos." }, { status: 401 });
  }

  // Reativa a conta se estava em soft-delete (paridade com o k11).
  if (!isSuperuserEmail(emailResolvido)) {
    await supabase.rpc("restaurar_minha_conta_dentista").then(
      () => {},
      () => {},
    );
  }

  const redirect = isSuperuserEmail(emailResolvido) ? "/pro/dashboard-analytics" : "/pro/dashboard";
  const res = NextResponse.json({ ok: true, redirect });
  for (const { name, value, options } of cookiesParaSetar) {
    res.cookies.set(name, value, { ...(options ?? {}), httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  }
  return res;
}
