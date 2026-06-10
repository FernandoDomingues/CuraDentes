// ═══════════════════════════════════════════════════════════════════════════════
// DENTIST CACHE — Cache local de busca de dentistas (localStorage)
//
// Responsabilidades:
//   1. Cachear resultados de busca de dentistas no localStorage
//   2. Limitar a 50 entradas para não estourar a quota do localStorage
//   3. Fornecer funções de busca, salvamento e limpeza do cache
// ═══════════════════════════════════════════════════════════════════════════════

export interface CacheableDentist {
  dentista_id: string;
  dentista_cro?: string;
  dentista_nome: string;
  dentista_foto?: string;
  dentista_bio?: string;
  dentista_avaliacao?: number;
  endereco_id?: string;
  nome_clinica?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  atividades?: string[];
  convenios?: string[];
  formas_pagamento?: string[];
}

export interface CachedDentistResult {
  dentista_id: string;
  dentista_cro: string;
  dentista_nome: string;
  dentista_foto: string;
  dentista_bio: string;
  dentista_avaliacao: number;
  endereco_id: string;
  nome_clinica: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  atividades: string[];
  convenios: string[];
  formas_pagamento: string[];
}

/**
 * Salva ou atualiza dentistas no cache local de busca.
 * Isso permite que a página de perfil (DentistProfile.tsx) carregue
 * instantaneamente (0ms) usando os dados em cache enquanto atualiza os detalhes em background.
 */
export function saveToSearchCache(dentists: CacheableDentist[]) {
  try {
    const cachedStr = localStorage.getItem("curadentes_search_cache");
    let currentResults: CachedDentistResult[] = [];
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr) as { resultados?: CachedDentistResult[] };
        if (parsed && Array.isArray(parsed.resultados)) {
          currentResults = parsed.resultados;
        }
      } catch (e) {
        console.error("[dentistCache] Erro ao parsear cache existente:", e);
      }
    }
    
    dentists.forEach((newD) => {
      if (!newD.dentista_id) return;
      
      const idx = currentResults.findIndex((r) => r.dentista_id === newD.dentista_id);
      const mapped: CachedDentistResult = {
        dentista_id: newD.dentista_id,
        dentista_cro: newD.dentista_cro || "",
        dentista_nome: newD.dentista_nome,
        dentista_foto: newD.dentista_foto || "",
        dentista_bio: newD.dentista_bio || "",
        dentista_avaliacao: newD.dentista_avaliacao ?? 0,
        endereco_id: newD.endereco_id || newD.dentista_id,
        nome_clinica: newD.nome_clinica || "",
        logradouro: newD.logradouro || "",
        numero: newD.numero || "",
        bairro: newD.bairro || "",
        cidade: newD.cidade || "",
        estado: newD.estado || "SP",
        atividades: newD.atividades || [],
        convenios: newD.convenios || [],
        formas_pagamento: newD.formas_pagamento || []
      };
      
      if (idx >= 0) {
        // Mescla mantendo dados anteriores se os novos forem vazios
        currentResults[idx] = {
          ...currentResults[idx],
          ...Object.fromEntries(Object.entries(mapped).filter(([_, v]) => v !== "" && (Array.isArray(v) ? v.length > 0 : true)))
        };
      } else {
        currentResults.push(mapped);
      }
    });
    
    // Limita o cache aos 50 dentistas mais recentes para evitar estourar quota do localStorage
    if (currentResults.length > 50) {
      currentResults = currentResults.slice(currentResults.length - 50);
    }
    
    localStorage.setItem("curadentes_search_cache", JSON.stringify({ resultados: currentResults }));
    console.log(`[dentistCache] Cache de busca atualizado. Total de dentistas no cache: ${currentResults.length}`);
  } catch (err) {
    console.error("[dentistCache] Erro ao salvar cache de busca:", err);
  }
}

// ─── Cache por query (para restaurar resultados ao dar F5) ──────────────────
const QUERY_CACHE_KEY = "curadentes_query_cache";
const QUERY_CACHE_MAX_ENTRIES = 10;
const QUERY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface QueryCacheEntry {
  key: string;
  results: CachedDentistResult[];
  savedAt: number;
}

/**
 * Gera uma chave normalizada para identificar uma busca específica.
 */
export function buildQueryCacheKey(
  query: string | null,
  lat: string | null,
  lng: string | null,
  raio: number
): string {
  if (lat && lng) return `lat:${parseFloat(lat).toFixed(3)}lng:${parseFloat(lng).toFixed(3)}r:${raio}`;
  if (query) return `q:${query.trim().toLowerCase()}r:${raio}`;
  return "empty";
}

/**
 * Salva os resultados de uma busca no cache por query.
 */
export function saveQueryCache(key: string, results: CachedDentistResult[]): void {
  try {
    const raw = localStorage.getItem(QUERY_CACHE_KEY);
    let entries: QueryCacheEntry[] = [];
    if (raw) {
      try { entries = JSON.parse(raw) as QueryCacheEntry[]; } catch { entries = []; }
    }
    entries = entries.filter(e => e.key !== key);
    entries.unshift({ key, results, savedAt: Date.now() });
    if (entries.length > QUERY_CACHE_MAX_ENTRIES) {
      entries = entries.slice(0, QUERY_CACHE_MAX_ENTRIES);
    }
    localStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(entries));
    console.log(`[dentistCache] Query cache salvo para "${key}": ${results.length} resultados`);
  } catch (err) {
    console.warn("[dentistCache] Erro ao salvar query cache:", err);
  }
}

/**
 * Carrega resultados salvos para uma query específica.
 * Retorna null se não houver cache ou se tiver expirado (30 min).
 */
// ─── Cache de perfil completo (com agenda) ────────────────────────────────────
const PROFILE_CACHE_KEY = "curadentes_profile_cache";

export function saveProfileCache(id: string, profile: any): void {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    let entries: Record<string, { data: any; savedAt: number }> = {};
    if (raw) {
      try { entries = JSON.parse(raw); } catch { entries = {}; }
    }
    entries[id] = { data: profile, savedAt: Date.now() };
    // Mantém só os 20 perfis mais recentes
    const keys = Object.keys(entries);
    if (keys.length > 20) {
      const sorted = keys.sort((a, b) => (entries[b].savedAt || 0) - (entries[a].savedAt || 0));
      const novos: typeof entries = {};
      for (let i = 0; i < 20; i++) novos[sorted[i]] = entries[sorted[i]];
      entries = novos;
    }
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn("[dentistCache] Erro ao salvar perfil no cache:", err);
  }
}

export function loadProfileCache(id: string): any | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const entries = JSON.parse(raw);
    const entry = entries[id];
    if (!entry) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function loadQueryCache(key: string): CachedDentistResult[] | null {
  try {
    const raw = localStorage.getItem(QUERY_CACHE_KEY);
    if (!raw) return null;
    const entries: QueryCacheEntry[] = JSON.parse(raw) as QueryCacheEntry[];
    const entry = entries.find(e => e.key === key);
    if (!entry) return null;
    if (Date.now() - entry.savedAt > QUERY_CACHE_TTL_MS) {
      console.log("[dentistCache] Query cache expirado para:", key);
      return null;
    }
    console.log(`[dentistCache] Query cache carregado para "${key}": ${entry.results.length} resultados`);
    return entry.results;
  } catch (err) {
    console.warn("[dentistCache] Erro ao carregar query cache:", err);
    return null;
  }
}
