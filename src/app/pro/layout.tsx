// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT DA ÁREA /pro — guarda de acesso (Server Component).
//
// Roda no servidor antes de qualquer página /pro:
//   • sem sessão            → /login-necessario (parede fora de /pro, com header
//                             mínimo; não expõe "Sair"/"Voltar ao meu Perfil" a anônimo)
//   • paciente (sem perfil) → manda para a home (não tem painel)
//   • dentista / superuser  → libera
//
// A proteção REAL dos dados é a RLS no banco; esta guarda evita renderizar o
// painel para quem não deve vê-lo (e dá um destino limpo, sem flash).
// Ler a sessão aqui torna /pro/* dinâmico — que é o correto para área logada.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUsuario } from "@/lib/auth";

// Área logada nunca deve ser indexada. O robots.ts já bloqueia o *crawl* de /pro,
// mas isto impede a INDEXAÇÃO de URLs descobertas por links externos (o robots
// sozinho não impede). Herda para todas as subrotas /pro/*.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuario();
  if (!usuario) redirect("/login-necessario");
  if (usuario.papel === "paciente") redirect("/");
  return <>{children}</>;
}
