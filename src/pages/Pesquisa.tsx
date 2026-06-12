// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: Pesquisa (/pesquisa)
//
// Página de resultados de busca de dentistas com:
//   - Filtros por localização, raio, convênios e formas de pagamento
//   - Busca textual por bairro, cidade, estado, clínica e logradouro
//   - RPC de proximidade Haversine (get_dentistas_proximos)
//   - Cache de resultados no localStorage e sessionStorage
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getCoordenadas, getEnderecoFromCoordenadas } from "@/lib/geocoding";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Loader2, MapPin, Star, Building2, ChevronRight, Filter, SlidersHorizontal, X, Search } from "lucide-react";
import logoProAltUrl from "@/assets/logos/logo-pro-alt.png";
import CroVerificationBadge from "@/components/analytics/CroVerificationBadge";
import { useAuth } from "@/hooks/useAuth";
import { saveToSearchCache, saveQueryCache, loadQueryCache, buildQueryCacheKey } from "@/lib/dentistCache";
import { ESPECIALIDADES } from "@/constants/data";
import { useAddressSuggestions } from "@/hooks/useAddressSuggestions";
import { useLogSearch } from "@/hooks/useLogSearch";
import type { AddressSuggestion } from "@/hooks/useAddressSuggestions";

// ─── Subcomponentes para o Autocomplete ──────────────────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: "#007AFF", fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

const TYPE_LABELS: Record<string, string> = {
  cidade: "Cidade",
  bairro: "Bairro",
  clinica: "Clínica",
};

function SuggestionItem({
  suggestion,
  highlighted,
  query,
  onSelect,
}: {
  suggestion: AddressSuggestion;
  highlighted: boolean;
  query: string;
  onSelect: (s: AddressSuggestion) => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onSelect(suggestion); }}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{
        background: highlighted ? "rgba(0,122,255,0.07)" : "transparent",
        borderBottom: "0.5px solid rgba(60,60,67,0.06)",
        cursor: "pointer",
      }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "10px",
          background: suggestion.type === "cidade"
            ? "rgba(0,122,255,0.10)"
            : suggestion.type === "bairro"
            ? "rgba(52,199,89,0.10)"
            : "rgba(255,149,0,0.10)",
        }}
      >
        {suggestion.type === "clinica" ? (
          <Building2 size={15} style={{ color: "#FF9500" }} />
        ) : (
          <MapPin size={15} style={{ color: suggestion.type === "cidade" ? "#007AFF" : "#34C759" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium truncate" style={{ color: "#1C1C1E" }}>
          <HighlightMatch text={suggestion.label} query={query} />
        </p>
      </div>
      <span
        className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{
          background: suggestion.type === "cidade"
            ? "rgba(0,122,255,0.08)"
            : suggestion.type === "bairro"
            ? "rgba(52,199,89,0.08)"
            : "rgba(255,149,0,0.08)",
          color: suggestion.type === "cidade" ? "#007AFF" : suggestion.type === "bairro" ? "#34C759" : "#FF9500",
        }}
      >
        {TYPE_LABELS[suggestion.type]}
      </span>
    </button>
  );
}

// Função utilitária para cálculo de distância Haversine em JS
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

interface DentistaResultado {
  dentista_id: string;
  dentista_cro: string;
  dentista_cro_verificado: boolean;
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
  distancia_km: number;
}

interface EnderecoRow {
  id: string;
  nome_clinica: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  atividades: string[] | null;
  convenios: string[] | null;
  formas_pagamento: string[] | null;
  latitude: number | null;
  longitude: number | null;
  curadentespro:
    | { id: string; nome: string; foto_url: string | null; bio: string | null; cro: string | null; lgpd_aceito: boolean }
    | { id: string; nome: string; foto_url: string | null; bio: string | null; cro: string | null; lgpd_aceito: boolean }[]
    | null;
}

interface SupabaseError {
  message?: string;
  code?: string;
}

const CONVENIOS_OPCOES = [
  "Amil Dental", "Bradesco Dental", "SulAmérica Odonto", "Hapvida Odonto",
  "Odontoprev", "Unimed Odonto", "Porto Seguro Saúde", "NotreDame Intermédica", "Uniodonto"
];

const PAGAMENTOS_OPCOES = [
  "Dinheiro", "PIX", "Cartão de débito", "Cartão de crédito (à vista)",
  "Cartão de crédito (parcelado)", "Boleto bancário", "Transferência bancária"
];

export default function Pesquisa() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const logSearch = useLogSearch();

  // Lê o estado da navegação com fallback para os parâmetros da URL (?q=...) e
  // depois para o sessionStorage (F5). A URL permite entrar já com a busca pronta.
  const estadoNavegacao = (location.state as { q?: string; lat?: string; lng?: string; atividade?: string }) || {};
  const paramQ = searchParams.get("q") || undefined;
  const paramLat = searchParams.get("lat") || undefined;
  const paramLng = searchParams.get("lng") || undefined;
  const paramAtividade = searchParams.get("atividade") || undefined;
  const estadoSalvo = (() => {
    try {
      const raw = sessionStorage.getItem("curadentes_search_state");
      return raw ? JSON.parse(raw) as { q?: string; lat?: string; lng?: string } : {};
    } catch { return {}; }
  })();

  const [query, setQuery] = useState<string | null>(estadoNavegacao.q || paramQ || estadoSalvo.q || null);
  const [latPesquisa, setLatPesquisa] = useState<string | null>(estadoNavegacao.lat || paramLat || estadoSalvo.lat || null);
  const [lngPesquisa, setLngPesquisa] = useState<string | null>(estadoNavegacao.lng || paramLng || estadoSalvo.lng || null);
  const atividadeInicial = estadoNavegacao.atividade || paramAtividade || null;

  const [searchInput, setSearchInput] = useState(estadoNavegacao.q || paramQ || estadoSalvo.q || "");
  const [usandoLocalizacao, setUsandoLocalizacao] = useState(false);

  const [raio] = useState(5);

  // Sincroniza o estado sempre que a navegação (state) ou a URL (?q=...) mudar
  useEffect(() => {
    const nav = (location.state as { q?: string; lat?: string; lng?: string; atividade?: string }) || {};
    const saved = (() => {
      try {
        const raw = sessionStorage.getItem("curadentes_search_state");
        return raw ? JSON.parse(raw) as { q?: string; lat?: string; lng?: string } : {};
      } catch { return {}; }
    })();
    const pQ = searchParams.get("q") || undefined;
    const pLat = searchParams.get("lat") || undefined;
    const pLng = searchParams.get("lng") || undefined;
    const newQ = nav.q || pQ || saved.q || null;
    const newLat = nav.lat || pLat || saved.lat || null;
    const newLng = nav.lng || pLng || saved.lng || null;
    setQuery(newQ);
    setLatPesquisa(newLat);
    setLngPesquisa(newLng);
    if (newQ) {
      setSearchInput(newQ);
      sessionStorage.setItem("curadentes_search_state", JSON.stringify({ q: newQ, lat: newLat ?? undefined, lng: newLng ?? undefined }));
    }
  }, [location.state, searchParams]);

  // Lazy initializers
  const [loading, setLoading] = useState(() => {
    const cached = loadQueryCache(
      buildQueryCacheKey(estadoNavegacao.q || paramQ || estadoSalvo.q || null, estadoNavegacao.lat || paramLat || estadoSalvo.lat || null, estadoNavegacao.lng || paramLng || estadoSalvo.lng || null, 5)
    );
    return !cached || cached.length === 0;
  });
  const [resultadosBrutos, setResultadosBrutos] = useState<DentistaResultado[]>(() => {
    const cached = loadQueryCache(
      buildQueryCacheKey(estadoNavegacao.q || paramQ || estadoSalvo.q || null, estadoNavegacao.lat || paramLat || estadoSalvo.lat || null, estadoNavegacao.lng || paramLng || estadoSalvo.lng || null, 5)
    );
    return (cached ?? []) as DentistaResultado[];
  });
  const [ordenacao, setOrdenacao] = useState<"distancia" | "avaliacao">("distancia");

  // Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { suggestions } = useAddressSuggestions(showSuggestions ? searchInput : "");

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIdx(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reseta o índice destacado quando as sugestões mudam
  useEffect(() => { setHighlightedIdx(-1); }, [suggestions]);

  const handleSuggestionSelect = useCallback((suggestion: AddressSuggestion) => {
    setSearchInput(suggestion.value);
    setShowSuggestions(false);
    setHighlightedIdx(-1);
    sessionStorage.setItem("curadentes_search_state", JSON.stringify({ q: suggestion.value }));
    navigate("/pesquisa", { state: { q: suggestion.value } });
  }, [navigate]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[highlightedIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIdx(-1);
    }
  };

  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAtividades, setSelectedAtividades] = useState<string[]>(
    () => atividadeInicial ? [atividadeInicial] : []
  );
  const [selectedConvenios, setSelectedConvenios] = useState<string[]>([]);
  const [selectedPagamentos, setSelectedPagamentos] = useState<string[]>([]);

  useEffect(() => {
    // ── (B) Flag de cancelamento: evita atualizar estado de uma busca "velha" ──
    let cancelled = false;
    // Chave de cache para esta combinação de query + raio
    const currentKey = buildQueryCacheKey(
      query,
      latPesquisa,
      lngPesquisa,
      raio
    );

    // ── (C) Timeout global de 10 s ───────────────────────────────────────────
    const TIMEOUT_MS = 10_000;

    async function buscar() {
      console.log("[Pesquisa] 🔍 Iniciando busca. Params:", { query, latPesquisa, lngPesquisa, raio });

      if (!query && (!latPesquisa || !lngPesquisa)) {
        console.log("[Pesquisa] Sem query ou coordenadas. Parando busca.");
        if (!cancelled) setLoading(false);
        return;
      }

      // Aplica estado inicial correto para ESTA query:
      // - Se há cache: mostra imediatamente sem spinner, busca atualiza em background
      // - Se não há cache: limpa resultados antigos e mostra spinner
      const cached = loadQueryCache(currentKey);
      if (!cancelled) {
        if (cached && cached.length > 0) {
          setResultadosBrutos(cached as DentistaResultado[]);
          setLoading(false);
        } else {
          setResultadosBrutos([]);
          setLoading(true);
        }
      }

      try {
        let finalLat: number | null = null;
        let finalLng: number | null = null;

        // ── (A) Lê o user por snapshot — sem adicioná-lo às dependências ───────
        // Isso evita que a busca reexecute quando a autenticação inicializar
        // depois do F5 (que era a causa do spinner infinito).
        const currentUser = useAuth.getState().user;

        // 1. Inicia a Busca Textual no banco (roda em paralelo com a API de mapas)
        let textSearchPromise: Promise<{ data: EnderecoRow[] | null; error: SupabaseError | null }> = Promise.resolve({ data: null, error: null });
        if (query) {
          const q = query.trim();
          console.log("[Pesquisa] [Passo 1] Disparando busca textual por:", q);
          
          let queryBuilder = supabase
            .from("curadentespro_enderecos")
            .select(`
              id, nome_clinica, logradouro, numero, bairro, cidade, estado, atividades, convenios, formas_pagamento, latitude, longitude,
              curadentespro!inner ( id, nome, foto_url, bio, cro, cro_verificado, lgpd_aceito )
            `);

          const partes = q.split(",").map(p => p.trim()).filter(Boolean);
          if (partes.length > 1) {
            const p1 = partes[0];
            const p2 = partes[1];
            queryBuilder = queryBuilder
              .or(`bairro.ilike.%${p1}%,cidade.ilike.%${p1}%,nome_clinica.ilike.%${p1}%,logradouro.ilike.%${p1}%`)
              .or(`cidade.ilike.%${p2}%,estado.ilike.%${p2}%`);
          } else {
            queryBuilder = queryBuilder.or([
              `bairro.ilike.%${q}%`,
              `cidade.ilike.%${q}%`,
              `estado.ilike.%${q}%`,
              `logradouro.ilike.%${q}%`,
              `nome_clinica.ilike.%${q}%`
            ].join(','));
          }

          queryBuilder = queryBuilder
            .eq('curadentespro.lgpd_aceito', true)
            .is('curadentespro.deleted_at', null);
          textSearchPromise = queryBuilder as unknown as Promise<{ data: EnderecoRow[] | null; error: SupabaseError | null }>;
        }

        // 2. Inicia a busca de Coordenadas (roda em paralelo com o banco de dados)
        let coordPromise: Promise<{ latitude: number; longitude: number } | null> = Promise.resolve(null);
        if (latPesquisa && lngPesquisa) {
          finalLat = parseFloat(latPesquisa);
          finalLng = parseFloat(lngPesquisa);
          console.log("[Pesquisa] [Passo 2] Coordenadas vindas do estado de navegação:", { finalLat, finalLng });
        } else if (query) {
          console.log("[Pesquisa] [Passo 2] Disparando geocodificação para obter lat/lng...");
          // Usa coordenadas do usuário apenas como dica de proximidade (viewbox),
          // lidas por snapshot para não virar dependência do efeito.
          coordPromise = getCoordenadas(query, currentUser?.latitude, currentUser?.longitude);
        }

        // ── (C) Promise.race: se demorar mais de 10 s, lança TIMEOUT ─────────
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS)
        );

        console.log("[Pesquisa] Aguardando Promise.all (busca textual + geocodificação)...");
        const [textResult, coordResult] = await Promise.race([
          Promise.all([textSearchPromise, coordPromise]),
          timeoutPromise,
        ]);

        // Descarta resultado se a busca foi cancelada enquanto aguardávamos
        if (cancelled) return;

        console.log("[Pesquisa] Promise.all resolvida!", {
          temTextResult: !!textResult.data,
          textError: textResult.error,
          coordResult
        });

        if (coordResult) {
          finalLat = coordResult.latitude;
          finalLng = coordResult.longitude;
        }

        // 3. Busca Geográfica pelo mapa (get_dentistas_proximos)
        let mapResults: DentistaResultado[] = [];
        if (finalLat !== null && finalLng !== null) {
          console.log("[Pesquisa] [Passo 3] Disparando RPC get_dentistas_proximos com coordenadas:", { finalLat, finalLng, raio });
          const { data, error } = await supabase.rpc("get_dentistas_proximos", {
            lat: finalLat,
            lng: finalLng,
            raio_km: raio
          });

          if (cancelled) return;

          if (!error && data) {
            console.log("[Pesquisa] RPC get_dentistas_proximos retornou:", data.length, "dentistas");
            mapResults = data;
          } else {
            console.error("[Pesquisa] Erro na busca por raio RPC:", error);
          }
        } else {
          console.log("[Pesquisa] [Passo 3] Pulando RPC geográfica porque lat/lng são nulos.");
        }

        // 4. Processa a Busca Textual que rodou lá no passo 1
        let textResults: DentistaResultado[] = [];
        if (query) {
          const { data: textData, error: textError } = textResult;

          if (textData) {
            console.log("[Pesquisa] [Passo 4] Processando", textData.length, "registros textuais...");
            textResults = textData
              .filter((d) => {
                const pro = Array.isArray(d.curadentespro) ? d.curadentespro[0] : d.curadentespro;
                const temPro = !!(pro && pro.id);
                if (!temPro) {
                  console.warn("[Pesquisa] Endereço sem profissional vinculado descartado:", d.id);
                }
                return temPro;
              })
              .map((d) => {
                const pro = Array.isArray(d.curadentespro) ? d.curadentespro[0] : (d.curadentespro || { id: "", nome: "", foto_url: null, bio: null, cro: "", cro_verificado: false }) as { id: string; nome: string; foto_url: string | null; bio: string | null; cro: string; cro_verificado: boolean; };

                let dist = 0;
                if (finalLat !== null && finalLng !== null && d.latitude && d.longitude) {
                  dist = calculateDistance(finalLat, finalLng, d.latitude, d.longitude);
                }

                return {
                  dentista_id: pro.id,
                  dentista_cro: (pro.cro || "").replace(/\s/g, ""),
                  dentista_cro_verificado: !!(pro as { cro_verificado?: boolean }).cro_verificado,
                  dentista_nome: pro.nome || "Dentista Parceiro",
                  dentista_foto: pro.foto_url || "",
                  dentista_bio: pro.bio || "",
                  dentista_avaliacao: 0,
                  endereco_id: d.id,
                  nome_clinica: d.nome_clinica || "",
                  logradouro: d.logradouro || "",
                  numero: d.numero || "",
                  bairro: d.bairro || "",
                  cidade: d.cidade || "",
                  estado: d.estado || "",
                  atividades: d.atividades || [],
                  convenios: d.convenios || [],
                  formas_pagamento: d.formas_pagamento || [],
                  distancia_km: dist
                };
              });

            // Aplica filtro de raio APENAS em dentistas com coordenadas cadastradas
            if (finalLat !== null) {
              const antesFiltro = textResults.length;
              textResults = textResults.filter((r) => {
                const temCoordenadas = r.distancia_km > 0;
                return !temCoordenadas || r.distancia_km <= raio;
              });
              console.log("[Pesquisa] Aplicado filtro de raio. Antes:", antesFiltro, "Depois:", textResults.length);
            }
          } else if (textError) {
            console.error("[Pesquisa] Erro na busca por texto:", textError);
          }
        }

        if (cancelled) return;

        // ─── Busca por nome do dentista (query separada: or() não suporta coluna embedded) ────
        if (query) {
          try {
            const q = query.trim();
            const { data: dentistasPorNome } = await supabase
              .from("curadentespro")
              .select("id")
              .ilike("nome", `%${q}%`)
              .eq("lgpd_aceito", true)
              .is("deleted_at", null);

            if (dentistasPorNome && dentistasPorNome.length > 0) {
              const ids = dentistasPorNome.map(d => d.id);
              const { data: enderecosPorNome } = await supabase
                .from("curadentespro_enderecos")
                .select(`
                  id, nome_clinica, logradouro, numero, bairro, cidade, estado, atividades, convenios, formas_pagamento, latitude, longitude,
                  curadentespro!inner ( id, nome, foto_url, bio, cro, cro_verificado, lgpd_aceito )
                `)
                .in("curadentespro.id", ids);

              if (enderecosPorNome && enderecosPorNome.length > 0) {
                const nomeResults = enderecosPorNome
                  .filter((d) => {
                    const pro = Array.isArray(d.curadentespro) ? d.curadentespro[0] : d.curadentespro;
                    return !!(pro && pro.id);
                  })
                  .map((d) => {
                const pro = Array.isArray(d.curadentespro) ? d.curadentespro[0] : (d.curadentespro || { id: "", nome: "", foto_url: null, bio: null, cro: "", cro_verificado: false }) as { id: string; nome: string; foto_url: string | null; bio: string | null; cro: string; cro_verificado: boolean; };
                    let dist = 0;
                    if (finalLat !== null && finalLng !== null && d.latitude && d.longitude) {
                      dist = calculateDistance(finalLat, finalLng, d.latitude, d.longitude);
                    }
                    return {
                      dentista_id: pro.id,
                      dentista_cro: (pro.cro || "").replace(/\s/g, ""),
                  dentista_cro_verificado: !!(pro as { cro_verificado?: boolean }).cro_verificado,
                      dentista_nome: pro.nome || "Dentista Parceiro",
                      dentista_foto: pro.foto_url || "",
                      dentista_bio: pro.bio || "",
                      dentista_avaliacao: 0,
                      endereco_id: d.id,
                      nome_clinica: d.nome_clinica || "",
                      logradouro: d.logradouro || "",
                      numero: d.numero || "",
                      bairro: d.bairro || "",
                      cidade: d.cidade || "",
                      estado: d.estado || "",
                      atividades: d.atividades || [],
                      convenios: d.convenios || [],
                      formas_pagamento: d.formas_pagamento || [],
                      distancia_km: dist,
                    };
                  });
                textResults.push(...nomeResults);
                console.log("[Pesquisa] Adicionados", nomeResults.length, "resultado(s) da busca por nome.");
              }
            }
          } catch (err) {
            console.error("[Pesquisa] Erro na busca por nome do dentista:", err);
          }
        }

        // 5. Combinação de Resultados sem duplicação
        const mergedMap = new Map<string, DentistaResultado>();
        mapResults.forEach(r => mergedMap.set(r.endereco_id, r));
        textResults.forEach(r => {
          if (!mergedMap.has(r.endereco_id)) {
            mergedMap.set(r.endereco_id, r);
          }
        });

        const finalResults = Array.from(mergedMap.values());

        // ─── Busca avaliações reais da tabela avaliacoes ─────────────────────
        const dentistaIds = [...new Set(finalResults.map(r => r.dentista_id))].filter(Boolean);
        if (dentistaIds.length > 0) {
          try {
            const { data: ratings } = await supabase
              .from('avaliacoes')
              .select('dentista_id, nota')
              .in('dentista_id', dentistaIds);

            if (ratings && ratings.length > 0) {
              const sums: Record<string, { sum: number; count: number }> = {};
              ratings.forEach((r: { dentista_id: string; nota: number }) => {
                if (!sums[r.dentista_id]) sums[r.dentista_id] = { sum: 0, count: 0 };
                sums[r.dentista_id].sum += r.nota;
                sums[r.dentista_id].count++;
              });
              const ratingMap: Record<string, number> = {};
              Object.entries(sums).forEach(([id, { sum, count }]) => {
                ratingMap[id] = parseFloat((sum / count).toFixed(1));
              });
              finalResults.forEach(r => {
                r.dentista_avaliacao = ratingMap[r.dentista_id] ?? 0;
              });
            }
          } catch (err) {
            console.error("[Pesquisa] Erro ao buscar avaliações:", err);
          }

          // ─── Enriquece o nome com o tratamento (Dr./Dra.) ──────────────────
          try {
            const { data: trats } = await supabase
              .from('curadentespro')
              .select('id, tratamento')
              .in('id', dentistaIds);
            if (trats && trats.length > 0) {
              const tratMap: Record<string, string> = {};
              trats.forEach((t: { id: string; tratamento: string | null }) => {
                if (t.tratamento) tratMap[t.id] = t.tratamento;
              });
              finalResults.forEach(r => {
                const t = tratMap[r.dentista_id];
                if (t && !r.dentista_nome.startsWith(t)) {
                  r.dentista_nome = `${t} ${r.dentista_nome}`;
                }
              });
            }
          } catch (err) {
            console.error("[Pesquisa] Erro ao buscar tratamento:", err);
          }
        }

        console.log("[Pesquisa] 🏁 Busca finalizada com sucesso! Total de resultados combinados:", finalResults.length);

        if (query) {
          const primeiro = finalResults[0];
          logSearch({
            query,
            cidade: primeiro?.cidade ?? null,
            estado: primeiro?.estado ?? null,
            bairro: primeiro?.bairro ?? null,
            latitude: finalLat,
            longitude: finalLng,
            resultados_count: finalResults.length,
          });
        }

        if (!cancelled) setResultadosBrutos(finalResults);

        // 6. Salva no cache por query (restauração no F5) e no cache de perfis
        if (finalResults.length > 0) {
          // Cache por query — restaura resultados instantaneamente no próximo F5
          saveQueryCache(currentKey, finalResults);

          // Cache global de perfis — carregamento rápido da página de detalhe
          saveToSearchCache(finalResults.map(r => ({
            dentista_id: r.dentista_id,
            dentista_cro: r.dentista_cro,
            dentista_nome: r.dentista_nome,
            dentista_foto: r.dentista_foto,
            dentista_bio: r.dentista_bio,
            dentista_avaliacao: r.dentista_avaliacao,
            endereco_id: r.endereco_id,
            nome_clinica: r.nome_clinica,
            logradouro: r.logradouro,
            numero: r.numero,
            bairro: r.bairro,
            cidade: r.cidade,
            estado: r.estado,
            atividades: r.atividades,
            convenios: r.convenios,
            formas_pagamento: r.formas_pagamento,
          })));
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        if (message === "TIMEOUT") {
          // ── (C) Timeout disparado ──────────────────────────────────────────
          console.error("[Pesquisa] ⏱️ Timeout: busca ultrapassou 10 segundos.");
          toast.error("A busca demorou mais do que o esperado. Verifique sua conexão e tente novamente.");
        } else {
          console.error("[Pesquisa] 💥 Erro inesperado durante a busca:", err);
        }
      } finally {
        // Só atualiza o loading se esta execução ainda for a "atual"
        if (!cancelled) {
          console.log("[Pesquisa] Definindo loading para false.");
          setLoading(false);
        }
      }
    }

    buscar();

    // ── (B) Cleanup: cancela esta execução quando o efeito re-rodar ──────────
    return () => { cancelled = true; };
  // ⚠️ user REMOVIDO intencionalmente das dependências (Opção A):
  // O user é lido por snapshot (useAuth.getState()) dentro de buscar().
  // Isso evita que a inicialização do auth após F5 dispare uma segunda busca
  // e cause o spinner infinito.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, latPesquisa, lngPesquisa, raio]);

  // Aplicação dos filtros locais
  const resultadosFiltrados = resultadosBrutos.filter((dentista) => {
    // Verifica Especialidades/Atividades
    if (selectedAtividades.length > 0) {
      const temAtividade = selectedAtividades.some(at =>
        dentista.atividades?.some(a => a.toLowerCase().includes(at.toLowerCase()))
      );
      if (!temAtividade) return false;
    }

    // Verifica Convênios (se selecionou algum, o dentista precisa ter PELO MENOS UM dos selecionados)
    if (selectedConvenios.length > 0) {
      const temConvenio = selectedConvenios.some(c => dentista.convenios?.includes(c));
      if (!temConvenio) return false;
    }

    // Verifica Pagamentos (se selecionou algum, o dentista precisa ter PELO MENOS UM)
    if (selectedPagamentos.length > 0) {
      // O banco pode ter "Cartão de crédito (parcelado 3x)", mas o filtro é "Cartão de crédito (parcelado)"
      // Vamos fazer uma checagem flexível baseada em substring
      const temPagamento = selectedPagamentos.some(pagFiltro => {
        return dentista.formas_pagamento?.some(pagBanco => pagBanco.includes(pagFiltro));
      });
      if (!temPagamento) return false;
    }

    return true;
  });

  // Ordenação
  const resultadosOrdenados = [...resultadosFiltrados].sort((a, b) => {
    if (ordenacao === "avaliacao") {
      return b.dentista_avaliacao - a.dentista_avaliacao;
    }
    return a.distancia_km - b.distancia_km; // Por distância
  });

  // Agrupa resultados por dentista mantendo a ordenação original do primeiro endereço correspondente
  interface DentistaAgrupado {
    dentista_id: string;
    dentista_cro: string;
    dentista_cro_verificado: boolean;
    dentista_nome: string;
    dentista_foto: string;
    dentista_bio: string;
    dentista_avaliacao: number;
    enderecos: {
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
      distancia_km: number;
    }[];
  }

  const dentistasAgrupados: DentistaAgrupado[] = [];
  resultadosOrdenados.forEach((item) => {
    let grupo = dentistasAgrupados.find(g => g.dentista_id === item.dentista_id);
    if (!grupo) {
      grupo = {
        dentista_id: item.dentista_id,
        dentista_cro: item.dentista_cro,
        dentista_cro_verificado: item.dentista_cro_verificado,
        dentista_nome: item.dentista_nome,
        dentista_foto: item.dentista_foto,
        dentista_bio: item.dentista_bio,
        dentista_avaliacao: item.dentista_avaliacao,
        enderecos: []
      };
      dentistasAgrupados.push(grupo);
    }
    grupo.enderecos.push({
      endereco_id: item.endereco_id,
      nome_clinica: item.nome_clinica,
      logradouro: item.logradouro,
      numero: item.numero,
      bairro: item.bairro,
      cidade: item.cidade,
      estado: item.estado,
      atividades: item.atividades,
      convenios: item.convenios,
      formas_pagamento: item.formas_pagamento,
      distancia_km: item.distancia_km
    });
  });

  const toggleAtividade = (a: string) => {
    setSelectedAtividades(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const toggleConvenio = (c: string) => {
    setSelectedConvenios(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const togglePagamento = (p: string) => {
    setSelectedPagamentos(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    if (highlightedIdx >= 0 && suggestions[highlightedIdx]) {
      handleSuggestionSelect(suggestions[highlightedIdx]);
      return;
    }
    const termo = searchInput.trim();
    if (!termo) return;
    sessionStorage.setItem("curadentes_search_state", JSON.stringify({ q: termo }));
    navigate("/pesquisa", { state: { q: termo } });
  }

  function usarLocalizacao() {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não é suportada pelo seu navegador.");
      return;
    }
    setUsandoLocalizacao(true);
    const toastId = toast.loading("Buscando sua localização...");
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        toast.message("Identificando seu bairro...");
        
        try {
          const enderecoTexto = await getEnderecoFromCoordenadas(lat, lng);
          toast.dismiss(toastId);
          
          const latStr = lat.toFixed(4);
          const lngStr = lng.toFixed(4);
          const payload = enderecoTexto
            ? { q: enderecoTexto, lat: latStr, lng: lngStr }
            : { lat: latStr, lng: lngStr };
            
          sessionStorage.setItem("curadentes_search_state", JSON.stringify(payload));
          navigate("/pesquisa", { state: payload });
        } catch (err) {
          toast.dismiss(toastId);
          console.error(err);
          const payload = { lat: lat.toFixed(4), lng: lng.toFixed(4) };
          sessionStorage.setItem("curadentes_search_state", JSON.stringify(payload));
          navigate("/pesquisa", { state: payload });
        } finally {
          setUsandoLocalizacao(false);
        }
      },
      () => {
        toast.dismiss(toastId);
        toast.error("Não foi possível obter sua localização. Verifique as permissões do navegador.");
        setUsandoLocalizacao(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const temCoordenadas = !!latPesquisa && !!lngPesquisa;

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F2F7]">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-[1200px] flex flex-col lg:flex-row gap-8">
        
        {/* BARRA LATERAL DE FILTROS (Desktop) / MODAL (Mobile) */}
        <aside className={`lg:w-[280px] flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm sticky top-[100px] overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[18px] text-[#0A2A66] flex items-center gap-2">
                <SlidersHorizontal size={18} /> Filtros
              </h3>
              <button className="lg:hidden p-1 text-gray-400" onClick={() => setShowFilters(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Distância (Comentado e invisível na interface)
            <div className="mb-6">
              <label className="block text-[13px] font-bold text-[#1C1C1E] mb-2">Distância Máxima: {raio} km</label>
              
                PENDÊNCIA: Ajustar futuramente a edição do raio de busca na lista de pendências.
                Desativado temporariamente conforme solicitação do usuário.
                <input 
                  type="range" min="1" max="50" value={raio} 
                  onChange={(e) => setRaio(Number(e.target.value))}
                  className="w-full accent-[#007AFF]"
                />
              
              <div className="text-[12px] text-gray-500 bg-gray-50 p-2.5 rounded-[12px] border border-gray-100 font-medium">
                Raio de busca fixado em {raio} km. Edição desativada temporariamente.
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-medium">
                <span>1 km</span>
                <span>50 km</span>
              </div>
              {!temCoordenadas && (
                <button
                  type="button"
                  onClick={usarLocalizacao}
                  disabled={usandoLocalizacao}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold border transition-all"
                  style={{
                    background: "rgba(0,122,255,0.06)",
                    borderColor: "rgba(0,122,255,0.20)",
                    color: "#007AFF",
                  }}
                >
                  <MapPin size={14} />
                  {usandoLocalizacao ? "Obtendo localização..." : "Ativar filtro por distância"}
                </button>
              )}
            </div>

            <hr className="border-gray-100 my-6" />
            */}

            {/* Especialidades */}
            <div className="mb-6">
              <label className="block text-[13px] font-bold text-[#1C1C1E] mb-3">Especialidade</label>
              <div className="flex flex-col gap-2">
                {ESPECIALIDADES.map(esp => (
                  <label key={esp} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedAtividades.includes(esp)}
                      onChange={() => toggleAtividade(esp)}
                      className="w-4 h-4 accent-[#007AFF] rounded"
                    />
                    <span className="text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors">
                      {esp}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-gray-100 my-6" />

            {/* Convênios */}
            <div className="mb-6">
              <label className="block text-[13px] font-bold text-[#1C1C1E] mb-3">Convênios Aceitos</label>
              <div className="flex flex-col gap-2">
                {CONVENIOS_OPCOES.map(conv => (
                  <label key={conv} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={selectedConvenios.includes(conv)}
                      onChange={() => toggleConvenio(conv)}
                      className="w-4 h-4 accent-[#34C759] rounded"
                    />
                    <span className="text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors">{conv}</span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-gray-100 my-6" />

            {/* Formas de Pagamento */}
            <div>
              <label className="block text-[13px] font-bold text-[#1C1C1E] mb-3">Formas de Pagamento</label>
              <div className="flex flex-col gap-2">
                {PAGAMENTOS_OPCOES.map(pag => (
                  <label key={pag} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={selectedPagamentos.includes(pag)}
                      onChange={() => togglePagamento(pag)}
                      className="w-4 h-4 accent-[#FF9500] rounded"
                    />
                    <span className="text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors">{pag}</span>
                  </label>
                ))}
              </div>
            </div>
            
          </div>
        </aside>

        {/* ÁREA DE RESULTADOS */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Barra de busca */}
          <div ref={searchContainerRef} className="relative z-30">
            <form 
              onSubmit={handleSearchSubmit} 
              className="bg-white shadow-sm border border-gray-100 p-1 flex items-center gap-2"
              style={{
                borderRadius: showSuggestions && suggestions.length > 0 ? "20px 20px 0 0" : "20px",
                transition: "border-radius 0.15s",
              }}
            >
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Buscar por cidade, bairro, especialidade..."
                  className="w-full bg-transparent text-[15px] text-[#1C1C1E] outline-none placeholder:text-gray-400 py-2.5"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-[12px] text-white text-[14px] font-semibold transition-all"
                style={{
                  background: "#007AFF",
                  boxShadow: "0 4px 12px rgba(0,122,255,0.25)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#1a8aff" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#007AFF" }}
              >
                Buscar
              </button>
            </form>

            {/* Dropdown de Sugestões */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "rgba(255,255,255,0.98)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderRadius: "0 0 20px 20px",
                  boxShadow: "0 12px 30px rgba(10,42,102,0.12)",
                  border: "1px solid rgba(0,0,0,0.05)",
                  borderTop: "none",
                  zIndex: 30,
                  overflow: "hidden",
                }}
              >
                {suggestions.map((s, i) => (
                  <SuggestionItem
                    key={`${s.type}-${s.label}`}
                    suggestion={s}
                    highlighted={i === highlightedIdx}
                    query={searchInput}
                    onSelect={handleSuggestionSelect}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Botão de localização — apenas Mobile, abaixo da barra de busca */}
          {!temCoordenadas && (
            <button
              type="button"
              onClick={usarLocalizacao}
              disabled={usandoLocalizacao}
              className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[16px] text-[13px] font-semibold border transition-all"
              style={{
                background: usandoLocalizacao ? "rgba(0,122,255,0.08)" : "rgba(0,122,255,0.06)",
                borderColor: "rgba(0,122,255,0.20)",
                color: "#007AFF",
              }}
            >
              <MapPin size={14} />
              {usandoLocalizacao ? "Obtendo localização..." : "Usar minha localização"}
            </button>
          )}

          {/* Info bar: termo + contagem + controles */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white p-4 rounded-[20px] shadow-sm border border-gray-100">
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-bold text-[#0A2A66] flex items-center gap-2 flex-wrap">
                {query && (
                  <span>
                    Resultados para "<span style={{ color: "#007AFF" }}>{query}</span>"
                  </span>
                )}
                {!query && !temCoordenadas && "Buscar dentistas"}
                {!query && temCoordenadas && "Dentistas próximos a você"}
              </h1>
              <p className="text-[14px] text-gray-500 mt-0.5">
                {loading ? "Buscando..." : `${resultadosFiltrados.length} dentistas encontrados`}
                {raio > 0 && !loading && ` em até ${raio} km`}.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              {/* Botão localização — apenas Desktop */}
              {!temCoordenadas && (
                <button
                  type="button"
                  onClick={usarLocalizacao}
                  disabled={usandoLocalizacao}
                  className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-[12px] text-[13px] font-semibold border transition-all"
                  style={{
                    background: usandoLocalizacao ? "rgba(0,122,255,0.08)" : "rgba(0,122,255,0.06)",
                    borderColor: "rgba(0,122,255,0.20)",
                    color: "#007AFF",
                  }}
                >
                  <MapPin size={14} />
                  {usandoLocalizacao ? "Obtendo..." : "Usar localização"}
                </button>
              )}

              <button 
                onClick={() => setShowFilters(true)}
                className="lg:hidden flex items-center justify-center gap-2 flex-1 bg-gray-50 px-3 py-2 rounded-xl text-[13px] font-semibold text-gray-700 border border-gray-200"
              >
                <SlidersHorizontal size={14} /> Filtros
              </button>

              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 flex-1 md:flex-none">
                <Filter size={14} className="text-gray-400" />
                <select 
                  value={ordenacao} 
                  onChange={(e) => setOrdenacao(e.target.value as "distancia" | "avaliacao")}
                  className="bg-transparent text-[13px] font-semibold text-[#1C1C1E] outline-none cursor-pointer w-full"
                >
                  <option value="distancia">Mais próximos</option>
                  <option value="avaliacao">Melhor avaliados</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-[#007AFF]" size={40} />
              <p className="text-gray-500 font-medium">Buscando na sua região...</p>
            </div>
          ) : resultadosFiltrados.length === 0 ? (
            <div className="bg-white rounded-[24px] p-12 text-center border border-gray-100 flex flex-col items-center gap-4">
              <MapPin size={48} className="text-gray-300" />
              <h3 className="text-[18px] font-bold text-[#1C1C1E]">Nenhum dentista encontrado</h3>
              <p className="text-[14px] text-gray-500 max-w-md">
                Tente aumentar o raio de distância nos filtros ou remover algumas exigências de convênio e pagamento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
              {dentistasAgrupados.map((dentista) => (
                <div 
                  key={dentista.dentista_id} 
                  onClick={() => navigate(`/dentista/${dentista.dentista_cro || dentista.dentista_id}`)}
                  className="bg-white rounded-[24px] p-5 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    <img 
                      src={dentista.dentista_foto || logoProAltUrl} 
                      alt={dentista.dentista_nome} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-50 bg-gray-50"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-[16px] text-[#1C1C1E] leading-tight group-hover:text-[#007AFF] transition-colors">
                            {dentista.dentista_nome}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-mono text-gray-400">{dentista.dentista_cro}</span>
                            <CroVerificationBadge verificado={dentista.dentista_cro_verificado} size="sm" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full shrink-0">
                          <Star size={12} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-[12px] font-bold text-yellow-700">{dentista.dentista_avaliacao}</span>
                        </div>
                      </div>
                      <p className="text-[13px] text-gray-500 mt-1 line-clamp-2 min-h-[38px]">
                        {dentista.dentista_bio || "Dentista focado em oferecer o melhor atendimento para o seu sorriso."}
                      </p>
                    </div>
                  </div>

                  {/* Endereços que batem com a busca, junto com atividades e convênios daquele endereço */}
                  <div className="mt-auto flex flex-col gap-3">
                    {dentista.enderecos.map((end) => (
                      <div key={end.endereco_id} className="bg-blue-50/50 rounded-[16px] p-3.5 flex flex-col gap-2">
                        <div className="flex items-start gap-2 text-[12px] text-[#0A2A66]">
                          <Building2 size={14} className="mt-0.5 shrink-0 text-blue-400" />
                          <span className="font-semibold leading-snug">
                            {end.nome_clinica ? `${end.nome_clinica} - ` : ""}
                            {end.logradouro}, {end.numero} - {end.bairro}, {end.cidade}
                          </span>
                        </div>

                        {/* Atividades e Convênios lado a lado */}
                        <div className="flex flex-wrap gap-2 items-center mt-1">
                          {/* Especialidades (Atividades) deste endereço */}
                          {end.atividades && end.atividades.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {end.atividades.map((at, idx) => (
                                <span key={idx} className="bg-blue-100/50 text-[#007AFF] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                  {at}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Convênios deste endereço */}
                          {end.convenios && end.convenios.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {end.convenios.map((conv, idx) => (
                                <span key={idx} className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100/50 uppercase tracking-wider">
                                  {conv}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100/50">
                          <span className="text-[11px] font-bold text-blue-600 bg-blue-100/80 px-2 py-1 rounded-[8px]">
                            {end.distancia_km.toFixed(1)} km daqui
                          </span>
                          <div className="flex items-center gap-1 text-[12px] font-bold text-[#007AFF] group-hover:translate-x-1 transition-transform">
                            Agendar <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
