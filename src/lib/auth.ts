// ═══════════════════════════════════════════════════════════════════════════════
// AUTH (servidor) — quem está logado e qual é o seu PAPEL.
//
// `getUsuario()` lê a sessão dos cookies (validando o token com getUser) e deriva
// o papel na MESMA ordem do site-k11:
//   1. superuser  → email fixo (isSuperuserEmail / função SQL is_superuser)
//   2. dentista   → existe linha em curadentespro (id == auth.uid, não excluído)
//   3. paciente   → qualquer outro usuário autenticado
//
// Usado pelos Server Components / layouts para mostrar estado de login e proteger
// rotas. A proteção REAL dos dados continua sendo a RLS no banco.
// ═══════════════════════════════════════════════════════════════════════════════

import { redirect } from "next/navigation";
import { criarClienteServidor } from "./supabase/server";
import { isSuperuserEmail } from "./superuser";

export type Papel = "paciente" | "dentista" | "superuser";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  foto: string;
  papel: Papel;
}

/**
 * Retorna o usuário logado (com papel) ou `null` se não houver sessão válida.
 * Faz `getUser()` (valida o JWT no Supabase) — seguro para decisões de acesso.
 */
export async function getUsuario(): Promise<Usuario | null> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1) Superuser (SuperDom): não tem registro de dentista nem de paciente.
  if (isSuperuserEmail(user.email)) {
    return { id: user.id, nome: "SuperDom", email: user.email ?? "", foto: "", papel: "superuser" };
  }

  // 2) Dentista: existe em curadentespro (mesmo UUID do Auth) e não excluído.
  const { data: dent } = await supabase
    .from("curadentespro")
    .select("id, nome, foto_url, email")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle<{ id: string; nome: string | null; foto_url: string | null; email: string | null }>();

  if (dent) {
    return {
      id: dent.id,
      nome: dent.nome ?? "",
      email: dent.email ?? user.email ?? "",
      foto: dent.foto_url ?? "",
      papel: "dentista",
    };
  }

  // 3) Paciente: usa o que o provedor (Google) trouxe nos metadados.
  const meta = (user.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
  return {
    id: user.id,
    nome: meta.full_name ?? user.email ?? "",
    email: user.email ?? "",
    foto: meta.avatar_url ?? "",
    papel: "paciente",
  };
}

/** Caminho para onde mandar o usuário logado conforme o papel. */
export function rotaInicialPorPapel(papel: Papel): string {
  if (papel === "superuser") return "/pro/dashboard-analytics";
  if (papel === "dentista") return "/pro/dashboard";
  return "/";
}

/**
 * Guarda de rota EXCLUSIVA do superuser (área administrativa: analytics, DBA,
 * verificação de CRO). Sem sessão → /entrar; dentista/paciente → painel/início.
 * A proteção REAL dos dados é a função is_superuser() no banco (RLS).
 */
export async function requireSuperuser(): Promise<Usuario> {
  const usuario = await getUsuario();
  if (!usuario) redirect("/entrar");
  if (usuario.papel !== "superuser") redirect(rotaInicialPorPapel(usuario.papel));
  return usuario;
}
