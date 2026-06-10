// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useLogSearch
//
// Registra cada busca do usuário na tabela logs_busca para analytics.
// Totalmente anônimo: user_id só é preenchido se o usuário estiver logado.
// IP não é armazenado. Nenhuma query individual é exibida na dashboard.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

type LogSearchParams = {
  query: string;
  cidade?: string | null;
  estado?: string | null;
  bairro?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  resultados_count: number;
};

export function useLogSearch() {
  const user = useAuth((s) => s.user);

  return async (params: LogSearchParams) => {
    try {
      await supabase.from("logs_busca").insert({
        query: params.query,
        cidade: params.cidade ?? null,
        estado: params.estado ?? null,
        bairro: params.bairro ?? null,
        latitude: params.latitude ?? null,
        longitude: params.longitude ?? null,
        resultados_count: params.resultados_count,
        user_id: user?.id ?? null,
      });
    } catch (err) {
      console.warn("[useLogSearch] Erro ao registrar busca:", err);
    }
  };
}
