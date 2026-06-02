// ============================================================================
// HOOK: useAddressSuggestions
//
// Fornece sugestões de endereço com correção fuzzy enquanto o usuário digita.
//
// Estratégia:
//   1. Busca uma vez do Supabase todas as cidades, bairros e nomes de clínica
//      dos endereços cadastrados (campos leves, sem dados pesados).
//   2. Armazena no localStorage por 24h para não fazer requisição a cada visita.
//   3. Filtra localmente com um scorer fuzzy que tolera até 2 erros de digitação.
//      Prioridade: correspondência exata > começa com > contém > subsequência > distância.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AddressSuggestion {
  label: string;       // Texto exibido ao usuário: "Sorocaba, SP"
  value: string;       // Valor a preencher no input: "Sorocaba"
  type: "cidade" | "bairro" | "clinica";
  score: number;       // Score de relevância (maior = mais relevante)
}

const CACHE_KEY = "curadentes_address_suggestions_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// ─── Normalização de string ───────────────────────────────────────────────────
// Remove acentos, caixa e pontuação para comparação robusta

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Remove diacríticos
    .replace(/[^a-z0-9 ]/g, " ")      // Remove pontuação
    .replace(/\s+/g, " ")             // Normaliza espaços
    .trim();
}

// ─── Distância de Levenshtein (custo mínimo de edição) ───────────────────────

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[a.length][b.length];
}

// ─── Scorer fuzzy principal ───────────────────────────────────────────────────
// Retorna um score de 0-100 (0 = irrelevante, 100 = correspondência exata)

function fuzzyScore(query: string, candidate: string): number {
  const q = normalizar(query);
  const c = normalizar(candidate);

  if (!q || !c) return 0;

  // Exato
  if (c === q) return 100;

  // Começa com a query
  if (c.startsWith(q)) return 90 - Math.max(0, c.length - q.length) * 0.5;

  // Contém a query como substring
  const idx = c.indexOf(q);
  if (idx !== -1) return 80 - idx * 0.5 - Math.max(0, c.length - q.length) * 0.3;

  // Verifica por palavras individuais da query (ex: "bela vis" → "Bela Vista")
  const palavrasQuery = q.split(" ").filter(Boolean);
  const palavrasCandidate = c.split(" ").filter(Boolean);
  const palavrasMatch = palavrasQuery.filter(pq =>
    palavrasCandidate.some(pc => pc.startsWith(pq) || pc.includes(pq))
  );
  if (palavrasMatch.length === palavrasQuery.length) return 70;
  if (palavrasMatch.length > 0) return 50 + (palavrasMatch.length / palavrasQuery.length) * 15;

  // Tolerância por Levenshtein (máx 2 erros para strings curtas, 3 para longas)
  const maxErros = q.length <= 5 ? 2 : 3;
  // Compara a query contra cada palavra do candidato individualmente
  for (const palavra of palavrasCandidate) {
    const dist = levenshtein(q, palavra.slice(0, Math.min(palavra.length, q.length + 2)));
    if (dist <= maxErros) return 40 - dist * 10;
  }

  return 0;
}

// ─── Fontes de dados ──────────────────────────────────────────────────────────

interface RawLocation {
  cidade: string;
  estado: string;
  bairro: string;
  nome_clinica: string;
}

async function fetchLocations(): Promise<RawLocation[]> {
  // Tenta ler do cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL && Array.isArray(parsed.data)) {
        return parsed.data;
      }
    }
  } catch (err) {
    console.warn("[useAddressSuggestions] Falha ao ler cache de endereços:", err);
  }

  // Busca do Supabase
  const { data, error } = await supabase
    .from("curadentespro_enderecos")
    .select("cidade, estado, bairro, nome_clinica");

  if (error || !data) return [];

  const locations: RawLocation[] = (data as Array<Partial<RawLocation>>).map((d) => ({
    cidade: d.cidade || "",
    estado: d.estado || "",
    bairro: d.bairro || "",
    nome_clinica: d.nome_clinica || "",
  }));

  // Salva no cache
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: locations, timestamp: Date.now() }));
  } catch (err) {
    console.warn("[useAddressSuggestions] Falha ao salvar cache de endereços:", err);
  }

  return locations;
}

// ─── Constrói a lista de sugestões únicas ─────────────────────────────────────

function buildCandidates(locations: RawLocation[]): AddressSuggestion[] {
  const seen = new Set<string>();
  const candidates: AddressSuggestion[] = [];

  for (const loc of locations) {
    // Cidade + Estado
    if (loc.cidade) {
      const key = `cidade:${loc.cidade}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          label: loc.estado ? `${loc.cidade}, ${loc.estado}` : loc.cidade,
          value: loc.cidade,
          type: "cidade",
          score: 0,
        });
      }
    }

    // Bairro
    if (loc.bairro) {
      const key = `bairro:${loc.bairro}:${loc.cidade}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          label: loc.cidade ? `${loc.bairro}, ${loc.cidade}` : loc.bairro,
          value: loc.bairro,
          type: "bairro",
          score: 0,
        });
      }
    }

    // Nome da Clínica
    if (loc.nome_clinica) {
      const key = `clinica:${loc.nome_clinica}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          label: loc.nome_clinica,
          value: loc.nome_clinica,
          type: "clinica",
          score: 0,
        });
      }
    }
  }

  return candidates;
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
    setLoading(true);
    fetchLocations()
      .then((locs) => {
        candidatesRef.current = buildCandidates(locs);
      })
      .catch((err) => console.error("[useAddressSuggestions] Erro ao carregar locais:", err))
      .finally(() => setLoading(false));
  }, []);

  // Filtra com debounce quando a query muda
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const scored = candidatesRef.current
        .map((c) => ({ ...c, score: fuzzyScore(query, c.label) }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      setSuggestions(scored);
    }, 180); // 180ms de debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, maxResults]);

  return { suggestions, loading };
}
