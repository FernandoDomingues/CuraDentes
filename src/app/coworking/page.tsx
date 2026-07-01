// ═══════════════════════════════════════════════════════════════════════════════
// /coworking — CATÁLOGO por CLÍNICA. A busca mostra clínicas (com fachada + nº de salas
// + preço mínimo); ao entrar numa clínica, o dentista escolhe a sala. Members-only.
// Lê a RPC get_clinicas_publicas (gated por CRO) via cliente autenticado.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import { criarClienteServidor } from "@/lib/supabase/server";
import { getUsuario } from "@/lib/auth";
import type { ClinicaPublica } from "@/lib/salas";
import MuroSalas from "./MuroSalas";
import CatalogoCoworking from "./CatalogoCoworking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Locação de salas | CuraDentes Pro",
  robots: { index: false, follow: false },
};

export default async function SalasPage() {
  const usuario = await getUsuario();
  if (!usuario?.croVerificado) return <MuroSalas modo={usuario ? "sem-cro" : "anonimo"} />;

  // Carrega TODAS as clínicas (a RPC já filtra por CRO). A busca/autocomplete por
  // Cidade/Bairro/nome é feita no cliente (catálogo pequeno → filtro local instantâneo).
  const sb = await criarClienteServidor();
  const { data } = await sb.rpc("get_clinicas_publicas", { p_cidade: null });
  const clinicas = ((data as ClinicaPublica[]) ?? []).map((c) => ({
    ...c,
    qtd_salas: Number(c.qtd_salas) || 0,
    preco_min: c.preco_min == null ? null : Number(c.preco_min),
  }));

  return <CatalogoCoworking clinicas={clinicas} />;
}
