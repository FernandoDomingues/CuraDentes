// ═══════════════════════════════════════════════════════════════════════════════
// HOOK DE GEOLOCALIZAÇÃO DO USUÁRIO (OPT-IN)
//
// Solicita permissão de geolocalização APENAS quando o usuário clica
// explicitamente em um botão (ex: "Usar minha localização"). Não dispara
// prompt automaticamente no mount da página.
//
// Antes de pedir permissão:
//   1. Tenta ler do cache local (localStorage) — se tiver coordenada recente
//      (menos de 30 minutos), usa direto sem prompt.
//   2. Só então chama navigator.geolocation.getCurrentPosition.
//
// O cache pode ser invalidado a qualquer momento chamando `clearCache()`.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from "react";

/** Estrutura retornada pelo hook */
export interface UserLocationState {
  /** Latitude do usuário (nula enquanto não autorizado ou em loading) */
  latitude: number | null;
  /** Longitude do usuário */
  longitude: number | null;
  /** true enquanto aguardando resposta do prompt de permissão */
  carregando: boolean;
  /** Mensagem de erro caso a permissão seja negada ou ocorra falha */
  erro: string | null;
  /** Status da permissão: idle | autorizado | negado | indisponivel */
  statusPermissao: "idle" | "autorizado" | "negado" | "indisponivel";
  /** true se os dados atuais vieram do cache (sem prompt) */
  doCache: boolean;
}

const CACHE_KEY = "curadentes_user_location_cache";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface CachedLocation {
  latitude: number;
  longitude: number;
  savedAt: number;
}

function readCache(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (typeof parsed.latitude !== "number" || typeof parsed.longitude !== "number") return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch (err) {
    console.warn("[useUserLocation] Falha ao ler cache de localização:", err);
    return null;
  }
}

function writeCache(latitude: number, longitude: number): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ latitude, longitude, savedAt: Date.now() } satisfies CachedLocation)
    );
  } catch (err) {
    console.warn("[useUserLocation] Falha ao salvar cache de localização:", err);
  }
}

function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.warn("[useUserLocation] Falha ao limpar cache de localização:", err);
  }
}

/**
 * useUserLocation
 *
 * Retorna um objeto com o estado da localização e uma função `requestLocation`
 * que deve ser chamada explicitamente (ex: no onClick de um botão "Usar minha
 * localização"). Não dispara o prompt do navegador automaticamente.
 *
 * Uso:
 *   const { latitude, longitude, statusPermissao, requestLocation } = useUserLocation();
 *   <button onClick={requestLocation}>Usar minha localização</button>
 */
export function useUserLocation(): UserLocationState & { requestLocation: () => void; clearCache: () => void } {
  const [state, setState] = useState<UserLocationState>({
    latitude: null,
    longitude: null,
    carregando: false,
    erro: null,
    statusPermissao: "idle",
    doCache: false,
  });

  const requestLocation = useCallback(() => {
    // 1) Verifica suporte do navegador
    if (!navigator.geolocation) {
      setState({
        latitude: null,
        longitude: null,
        carregando: false,
        erro: "Geolocalização não suportada por este navegador.",
        statusPermissao: "indisponivel",
        doCache: false,
      });
      return;
    }

    // 2) Tenta o cache primeiro — evita prompt desnecessário
    const cached = readCache();
    if (cached) {
      setState({
        latitude: cached.latitude,
        longitude: cached.longitude,
        carregando: false,
        erro: null,
        statusPermissao: "autorizado",
        doCache: true,
      });
      return;
    }

    // 3) Sem cache válido: pede permissão e captura
    setState((s) => ({ ...s, carregando: true, erro: null }));

    const opcoes: PositionOptions = {
      enableHighAccuracy: false, // WiFi/rede, consome menos bateria
      timeout: 10000,
      maximumAge: 0, // sem cache do navegador, já controlamos via localStorage
    };

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const { latitude, longitude } = posicao.coords;
        writeCache(latitude, longitude);
        setState({
          latitude,
          longitude,
          carregando: false,
          erro: null,
          statusPermissao: "autorizado",
          doCache: false,
        });
      },
      (erro) => {
        const mensagens: Record<number, string> = {
          1: "Permissão de localização negada pelo usuário.",
          2: "Localização indisponível no momento.",
          3: "Tempo de espera esgotado ao obter localização.",
        };
        setState({
          latitude: null,
          longitude: null,
          carregando: false,
          erro: mensagens[erro.code] ?? "Erro desconhecido ao obter localização.",
          statusPermissao: erro.code === 1 ? "negado" : "indisponivel",
          doCache: false,
        });
      },
      opcoes
    );
  }, []);

  return { ...state, requestLocation, clearCache };
}
