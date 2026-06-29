// ═══════════════════════════════════════════════════════════════════════════════
// /api/me — estado de login para a ilha cliente (SessaoProvider).
//
// Lê a sessão NO SERVIDOR (cookies httpOnly via getUsuario→criarClienteServidor) e
// devolve só o necessário para a UI: { nome, foto, ehPro, ehSuper } — NUNCA o token.
// Assim o cliente sabe quem está logado sem ler o cookie (permite httpOnly:true) e
// as páginas públicas continuam estáticas (quem chama isto é a ilha cliente, não o
// layout). Sempre dinâmico/no-store para refletir login/logout na hora.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { getUsuario } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getUsuario();
  const headers = { "Cache-Control": "no-store" };

  if (!u) return NextResponse.json({ user: null }, { headers });

  return NextResponse.json(
    {
      user: {
        id: u.id,
        email: u.email,
        nome: u.papel === "superuser" ? "SuperDom" : u.nome,
        foto: u.foto,
        ehPro: u.papel === "dentista",
        ehSuper: u.papel === "superuser",
        croVerificado: u.croVerificado,
      },
    },
    { headers },
  );
}
