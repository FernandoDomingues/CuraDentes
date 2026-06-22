// ═══════════════════════════════════════════════════════════════════════════════
// ENTRAR — /entrar (Server Component que protege contra acesso já logado).
//
// Se já houver sessão, redireciona pelo papel (não mostra o login de novo).
// Caso contrário, renderiza o formulário interativo (Client Component).
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUsuario, rotaInicialPorPapel } from "@/lib/auth";
import EntrarForm from "./EntrarForm";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta CuraDentes. Pacientes entram com Google; dentistas, com e-mail e senha.",
  robots: { index: false },
};

export default async function EntrarPage() {
  const usuario = await getUsuario();
  if (usuario) redirect(rotaInicialPorPapel(usuario.papel));
  return <EntrarForm />;
}
