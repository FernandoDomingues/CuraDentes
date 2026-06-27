// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICAÇÃO DO OTP DO CADASTRO — SERVIDOR — /auth/cadastro-otp
//
// O verifyOtp ESTABELECE a sessão (grava os cookies). Com httpOnly:true o cliente
// não consegue gravar o cookie de sessão, então a verificação acontece no servidor
// (igual ao login-dentista): verifica o código de 8 dígitos e grava os cookies de
// sessão NA RESPOSTA. Devolve o userId para o wizard seguir. Refactor do C1.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  let body: { email?: string; codigo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "Requisição inválida." }, { status: 400 });
  }
  const email = (body.email ?? "").trim();
  const codigo = (body.codigo ?? "").trim();
  if (!email || codigo.length !== 8) {
    return NextResponse.json({ ok: false, erro: "Código inválido." }, { status: 400 });
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

  const { data, error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
  if (error || !data.user) {
    return NextResponse.json({ ok: false, erro: "Código inválido ou expirado." }, { status: 401 });
  }

  // httpOnly:true (C1): o token não fica legível por JS. O wizard segue com o userId
  // retornado; o estado de login vem do servidor (/api/me), não do cookie no cliente.
  const res = NextResponse.json({ ok: true, userId: data.user.id });
  for (const { name, value, options } of cookiesParaSetar) {
    res.cookies.set(name, value, { ...(options ?? {}), httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  }
  return res;
}
