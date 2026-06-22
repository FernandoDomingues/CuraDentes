// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT DA ÁREA /pro — guarda de acesso (Server Component).
//
// Roda no servidor antes de qualquer página /pro:
//   • sem sessão            → manda para /entrar
//   • paciente (sem perfil) → manda para a home (não tem painel)
//   • dentista / superuser  → libera
//
// A proteção REAL dos dados é a RLS no banco; esta guarda evita renderizar o
// painel para quem não deve vê-lo (e dá um redirect limpo, sem flash).
// Ler a sessão aqui torna /pro/* dinâmico — que é o correto para área logada.
// ═══════════════════════════════════════════════════════════════════════════════

import { redirect } from "next/navigation";
import { getUsuario } from "@/lib/auth";

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuario();
  if (!usuario) redirect("/entrar");
  if (usuario.papel === "paciente") redirect("/");
  return <>{children}</>;
}
