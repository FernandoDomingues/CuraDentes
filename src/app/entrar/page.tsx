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

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; erro?: string; m?: string }>;
}) {
  const usuario = await getUsuario();
  if (usuario) redirect(rotaInicialPorPapel(usuario.papel));
  // ?modo=dentista abre direto no login do dentista (vindo do botão "Acesso do
  // Dentista" do cabeçalho); o padrão é o login do paciente (Google).
  const { modo, erro, m } = await searchParams;
  const modoInicial = modo === "dentista" ? "dentista" : "paciente";
  // Mensagem de erro vinda do /auth/callback (diagnóstico do login).
  const erroInicial = erro
    ? `Falha no login (${erro})${m ? `: ${m}` : ""}. Tente novamente.`
    : "";
  return <EntrarForm modoInicial={modoInicial} erroInicial={erroInicial} />;
}
