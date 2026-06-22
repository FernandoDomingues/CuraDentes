// ═══════════════════════════════════════════════════════════════════════════════
// LOG DE BUSCA — registra cada busca em logs_busca (analytics de demanda).
//
// É o "contador na porta": sem isto, os gráficos de Análise (buscas ao longo do
// tempo, buscas sem resultado, mapa de demanda) não recebem dados novos.
// Totalmente ANÔNIMO (sem IP, sem user_id) e "fire-and-forget" — nunca atrapalha
// nem atrasa a busca. Porta do hook useLogSearch do site-k11.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase/public";

export interface DadosBusca {
  /** Termo pesquisado (vazio em buscas só por localização, ex.: urgência). */
  termo: string;
  /** Quantos dentistas a busca retornou (0 = "busca sem resultado"). */
  resultados: number;
  cidade?: string | null;
  estado?: string | null;
  bairro?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Grava uma linha em logs_busca. Não lança: erros só são logados no console. */
export async function logarBusca(d: DadosBusca): Promise<void> {
  try {
    const { error } = await supabase.from("logs_busca").insert({
      query: d.termo ?? "",
      cidade: d.cidade ?? null,
      estado: d.estado ?? null,
      bairro: d.bairro ?? null,
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
      resultados_count: d.resultados,
      user_id: null, // anônimo (sem IP) — como no site-k11
    });
    if (error) console.warn("[logarBusca] não registrou a busca:", error.message);
  } catch (err) {
    console.warn("[logarBusca] exceção ao registrar a busca:", err);
  }
}
