"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// Sugestão de clínica ("você quis dizer?") — clínicas que JÁ existem no mesmo prédio
// (CEP+número), de OUTROS dentistas, para padronizar o nome na fonte e evitar
// "Villa"/"Vila" (camada preventiva do clinica_key). Server Action porque a sessão
// é httpOnly (C1): o cliente não consegue chamar a RPC autenticada direto.
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";
import type { ClinicaSugestao } from "@/lib/salas";

/** Clínicas no mesmo prédio (CEP+número) de OUTROS dentistas. [] se não houver. */
export async function sugerirClinicas(cep: string, numero: string): Promise<ClinicaSugestao[]> {
  const cepDigits = (cep ?? "").replace(/\D/g, "");
  if (cepDigits.length < 8 || !(numero ?? "").trim()) return [];
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("clinicas_no_predio", { p_cep: cep, p_numero: numero });
  if (error) return [];
  return ((data as ClinicaSugestao[]) ?? []).map((c) => ({ ...c, qtd: Number(c.qtd) || 0 }));
}
