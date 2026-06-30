"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// Ações da tela de ADESÕES — o DONO da clínica aprova/recusa pedidos de outros
// dentistas que se registraram no mesmo endereço. Tudo com a sessão (id do servidor).
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";
import type { AdesaoPendente } from "@/lib/salas";

export async function carregarAdesoesPendentes(): Promise<AdesaoPendente[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("listar_adesoes_pendentes");
  if (error) return [];
  return (data as AdesaoPendente[]) ?? [];
}

export async function decidirAdesao(id: string, aprovar: boolean): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("decidir_adesao", { p_id: id, p_aprovar: aprovar });
  if (error) return { ok: false, erro: error.message || "Não foi possível registrar a decisão." };
  return { ok: !!data };
}

/** Quantos pedidos de adesão estão pendentes para as clínicas deste dono (para o badge). */
export async function contarAdesoesPendentes(): Promise<number> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("contar_adesoes_pendentes");
  if (error) return 0;
  return Number(data) || 0;
}
