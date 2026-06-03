// ============================================================================
// HOOK: useCepLookup
//
// Auto-completa logradouro/bairro/cidade/estado a partir de um CEP,
// consultando a API publica ViaCEP (https://viacep.com.br).
//
// Estrategia:
//   1. So dispara quando o CEP (so digitos) tem 8 caracteres.
//   2. Debounce de 500ms para nao fazer request a cada tecla.
//   3. Cache em localStorage por 7 dias por CEP (ViaCEP raramente muda).
//      CEPs nao encontrados (404) tambem sao cacheados para evitar re-checagem.
//   4. Estados expostos: data (sucesso), loading, notFound (CEP valido
//      mas sem resultado), error (falha de rede/HTTP).
// ============================================================================

import { useEffect, useState } from "react";

export interface CepData {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const CACHE_KEY = "curadentes_cep_cache";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const DEBOUNCE_MS = 500;

interface CachedCep {
  timestamp: number;
  data: CepData | null;
}

function readCache(): Record<string, CachedCep> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CachedCep>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

export function useCepLookup(cep: string): {
  data: CepData | null;
  loading: boolean;
  notFound: boolean;
  error: boolean;
} {
  const digits = cep.replace(/\D/g, "");
  const [data, setData] = useState<CepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    setError(false);
    setLoading(false);

    if (digits.length !== 8) return;

    const cache = readCache();
    const cached = cache[digits];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (cached.data) setData(cached.data);
      else setNotFound(true);
      return;
    }

    const timer = setTimeout(() => {
      const controller = new AbortController();
      setLoading(true);

      fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<ViaCepResponse>;
        })
        .then((json) => {
          if (json.erro) {
            setNotFound(true);
            cache[digits] = { timestamp: Date.now(), data: null };
            writeCache(cache);
            return;
          }
          const result: CepData = {
            logradouro: json.logradouro || "",
            bairro: json.bairro || "",
            cidade: json.localidade || "",
            estado: json.uf || "",
          };
          setData(result);
          cache[digits] = { timestamp: Date.now(), data: result };
          writeCache(cache);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setError(true);
        })
        .finally(() => setLoading(false));

      return () => controller.abort();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [digits]);

  return { data, loading, notFound, error };
}
