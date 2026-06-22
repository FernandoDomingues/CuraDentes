// ═══════════════════════════════════════════════════════════════════════════════
// CALLBACK DE AUTENTICAÇÃO — /auth/callback
//
// Para onde o Supabase redireciona depois do login com Google (OAuth) e do link
// de redefinição de senha. Aqui trocamos o `code` por uma sessão (PKCE), gravando
// os cookies no SERVIDOR. Depois redirecionamos:
//   • se vier ?next= (ex.: recovery → /redefinir-senha), vai para lá;
//   • senão, pelo PAPEL (dentista/superuser → /pro/dashboard; paciente → /).
//
// Para pacientes (login Google), garantimos a linha em `clientes` (upsert), como
// no site-k11. A geolocalização do login fica para depois (era client-side no k11).
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { isSuperuserEmail } from "@/lib/superuser";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Sem code não há o que trocar — volta para o login.
  if (!code) {
    return NextResponse.redirect(`${origin}/entrar?erro=callback`);
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/entrar?erro=callback`);
  }

  // Destino explícito (ex.: fluxo de recuperação de senha).
  // Só aceitamos caminhos internos: começa com "/" e NÃO com "//" ou "/\"
  // (senão seria um open-redirect para outro domínio, ex.: "//evil.com").
  if (next && /^\/(?![/\\])/.test(next)) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Sem destino: decide pelo papel.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(`${origin}/`);

  if (isSuperuserEmail(user.email)) {
    return NextResponse.redirect(`${origin}/pro/dashboard`);
  }

  // Reativa a conta se for um dentista que estava em soft-delete (paridade com o
  // login por senha/recovery). Sem isto, um dentista que voltasse pelo Google
  // ficaria preso como "paciente". Erro é ignorado (pacientes reais não têm conta).
  await supabase.rpc("restaurar_minha_conta_dentista").then(
    () => {},
    () => {},
  );

  // Dentista? (re-consulta após a possível reativação)
  const { data: dent } = await supabase
    .from("curadentespro")
    .select("id")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (dent) {
    return NextResponse.redirect(`${origin}/pro/dashboard`);
  }

  // Paciente: garante a linha em `clientes` (idempotente).
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

  return NextResponse.redirect(`${origin}/`);
}
