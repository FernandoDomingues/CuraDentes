// ═══════════════════════════════════════════════════════════════════════════════
// /pro (índice) — a área não tem página própria: bate aqui só quem passou pelo
// guard do /pro/layout (dentista ou superuser), então mandamos para o painel certo.
// Anônimo e paciente já foram desviados para /login-necessario no layout.
// (Sem esta página, /pro exato caía em 404 para quem estava logado.)
// ═══════════════════════════════════════════════════════════════════════════════

import { redirect } from "next/navigation";
import { getUsuario, rotaInicialPorPapel } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProIndexPage() {
  const usuario = await getUsuario();
  if (!usuario) redirect("/login-necessario"); // defensivo (o layout já barra antes)
  redirect(rotaInicialPorPapel(usuario.papel));
}
