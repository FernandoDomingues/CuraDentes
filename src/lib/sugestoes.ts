// ═══════════════════════════════════════════════════════════════════════════════
// SUGESTÕES DE BUSCA — Autocomplete fuzzy (endereço, clínica e NOME do dentista).
//
// Fornece sugestões com correção fuzzy enquanto o usuário digita. Este arquivo
// cuida só do que tem efeito colateral (Supabase + cache + estado React); a lógica
// pura (scoring, candidatos, filtro) vive em `sugestoes-core.ts` e é testada lá.
//
// Estratégia:
//   1. Busca uma vez do Supabase (cliente público/anônimo): cidades, bairros e
//      nomes de clínica dos endereços + os NOMES dos dentistas públicos.
//   2. Armazena no localStorage por 24h para não refazer a requisição a cada visita.
//   3. Filtra localmente com um scorer fuzzy que tolera erros de digitação.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/public";
import {
  buildCandidates,
  filtrarSugestoes,
  type AddressSuggestion,
  type RawLocation,
  type SuggestionData,
} from "@/lib/sugestoes-core";

// Re-exporta o tipo público para quem já importa de "@/lib/sugestoes" (Hero, BuscaCliente).
export type { AddressSuggestion, SuggestionType } from "@/lib/sugestoes-core";

// v2: o cache passou a incluir os nomes dos dentistas (chave nova invalida o antigo).
const CACHE_KEY = "curadentes_suggestions_cache_v2";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// ─── Fonte de dados (Supabase + cache) ────────────────────────────────────────

async function fetchSuggestionData(): Promise<SuggestionData> {
  // Tenta ler do cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (
        parsed.timestamp &&
        Date.now() - parsed.timestamp < CACHE_TTL &&
        parsed.data &&
        Array.isArray(parsed.data.locations) &&
        Array.isArray(parsed.data.dentistas)
      ) {
        return parsed.data as SuggestionData;
      }
    }
  } catch (err) {
    console.warn("[sugestoes] Falha ao ler cache:", err);
  }

  // Busca do Supabase (cliente público/anônimo) — endereços e nomes em paralelo.
  // Os nomes só dos perfis PÚBLICOS (lgpd_aceito + não removidos), igual à busca.
  const [endRes, dentRes] = await Promise.all([
    supabase
      .from("curadentespro_enderecos")
      .select("cidade, estado, bairro, nome_clinica"),
    supabase
      .from("curadentespro")
      .select("nome")
      .eq("lgpd_aceito", true)
      .is("deleted_at", null),
  ]);

  const locations: RawLocation[] = ((endRes.data as Array<Partial<RawLocation>> | null) ?? []).map((d) => ({
    cidade: d.cidade || "",
    estado: d.estado || "",
    bairro: d.bairro || "",
    nome_clinica: d.nome_clinica || "",
  }));

  const dentistas: string[] = ((dentRes.data as Array<{ nome: string | null }> | null) ?? [])
    .map((d) => (d.nome || "").trim())
    .filter(Boolean);

  const data: SuggestionData = { locations, dentistas };

  // Salva no cache (não bloqueia em caso de erro/quota)
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (err) {
    console.warn("[sugestoes] Falha ao salvar cache:", err);
  }

  return data;
}

// ─── Hook público ─────────────────────────────────────────────────────────────

export function useAddressSuggestions(query: string, maxResults = 6): {
  suggestions: AddressSuggestion[];
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const candidatesRef = useRef<AddressSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega os candidatos do Supabase uma única vez
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchSuggestionData()
      .then((data) => {
        candidatesRef.current = buildCandidates(data);
      })
      .catch((err) => console.error("[sugestoes] Erro ao carregar dados:", err))
      .finally(() => setLoading(false));
  }, []);

  // Filtra com debounce quando a query muda
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setSuggestions(filtrarSugestoes(candidatesRef.current, query, maxResults));
    }, 180); // 180ms de debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, maxResults]);

  return { suggestions, loading };
}
