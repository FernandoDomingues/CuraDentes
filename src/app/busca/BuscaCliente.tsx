"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// BUSCA (parte interativa) — sidebar de filtros + resultados de dentistas.
//
// Port fiel da página Pesquisa.tsx do site-k11 (React+Vite) para o R0 (Next.js).
// Mantém TODA a lógica de dados: busca textual em curadentespro_enderecos,
// geocodificação + RPC get_dentistas_proximos, busca por nome, merge sem duplicar,
// enriquecimento de atividades/convênios, avaliações reais e tratamento (Dr./Dra.).
// A casca/SEO fica no Server Component (page.tsx), que passa `queryInicial` do ?q=.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { getCoordenadas, reverseGeocodeCidadeBairro } from "@/lib/geocoding";
import { calcularDistanciaKm, formatarDistancia } from "@/lib/distancia";
import { supabase } from "@/lib/supabase/public";
import { Loader2, MapPin, Star, Building2, ChevronRight, Filter, SlidersHorizontal, X, Search } from "lucide-react";
import CroVerificationBadge from "@/components/CroVerificationBadge";
import { ESPECIALIDADES, nomeAmigavel } from "@/lib/especialidades";
import { logarBusca } from "@/lib/log-busca";
import { saveToSearchCache, saveQueryCache, loadQueryCache, buildQueryCacheKey } from "@/lib/dentistCache";
import { construirFiltrosEndereco, termoBuscaNome, urlBusca } from "@/lib/busca-filtro";
import { nomeExibicao } from "@/lib/dentistas";
import { useAddressSuggestions } from "@/lib/sugestoes";
import type { AddressSuggestion } from "@/lib/sugestoes";
import { SuggestionItem } from "@/components/busca/SugestaoEndereco";
import { useSessao } from "@/components/SessaoProvider";

// Haversine extraído para lib/distancia (calcularDistanciaKm) — função pura e testada.

interface DentistaResultado {
  dentista_id: string;
  dentista_cro: string;
  dentista_cro_verificado: boolean;
  dentista_especialidade?: string;
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
  latitude?: number | null;
  longitude?: number | null;
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

const logoProAltUrl = "/logos/logo-pro-alt.png";

export default function BuscaCliente({ queryInicial }: { queryInicial: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Lê o estado da busca: termo vem de `queryInicial` (do ?q= no server wrapper);
  // lat/lng vêm dos parâmetros da URL (?lat/?lng).
  const paramQ = queryInicial || undefined;
  const paramLat = searchParams.get("lat") || undefined;
  const paramLng = searchParams.get("lng") || undefined;
  const paramAtividade = searchParams.get("atividade") || undefined;

  const [query, setQuery] = useState<string | null>(paramQ || null);
  const [latPesquisa, setLatPesquisa] = useState<string | null>(paramLat || null);
  const [lngPesquisa, setLngPesquisa] = useState<string | null>(paramLng || null);
  const atividadeInicial = paramAtividade || null;

  const [searchInput, setSearchInput] = useState(paramQ || "");
  const [usandoLocalizacao, setUsandoLocalizacao] = useState(false);
  const [geoErro, setGeoErro] = useState<string | null>(null);

  // Raio da busca geográfica (RPC get_dentistas_proximos). 30 km cobre a cidade e
  // o entorno — antes eram 5 km, restrito demais (deixava o paciente sem resultados
  // mesmo havendo dentistas a poucos quilômetros). A RPC ordena por distância ASC.
  const [raio] = useState(30);

  // Filtro de especialidade — declarado aqui (antes do efeito de sincronização)
  // porque o efeito de URL pré-seleciona a partir de ?atividade=.
  const [selectedAtividades, setSelectedAtividades] = useState<string[]>(
    () => atividadeInicial ? [atividadeInicial] : []
  );

  // Sincroniza o estado sempre que a URL (?q=/?lat=/?lng=/?atividade=) mudar.
  useEffect(() => {
    const pQ = queryInicial || undefined;
    const pLat = searchParams.get("lat") || undefined;
    const pLng = searchParams.get("lng") || undefined;
    const pAtividade = searchParams.get("atividade") || undefined;
    const newQ = pQ || null;
    const newLat = pLat || null;
    const newLng = pLng || null;
    // Sincroniza o estado a partir dos parâmetros da URL (?q/lat/lng) no mount e
    // ao navegar — uso legítimo de setState em efeito (não dá para derivar no
    // render por causa do SSR/hidratação).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(newQ);
    setLatPesquisa(newLat);
    setLngPesquisa(newLng);
    if (newQ) {
      setSearchInput(newQ);
    }
    // Pré-seleciona o filtro de especialidade quando a URL traz ?atividade=
    // (o herói/CTA de especialidade manda esse parâmetro). Cobre também o caso de
    // navegar só com ?atividade= (sem ?q=), em que a key={termo} não remontaria.
    if (pAtividade) {
      setSelectedAtividades([pAtividade]);
    }
  }, [queryInicial, searchParams]);

  const [loading, setLoading] = useState(true);
  const [resultadosBrutos, setResultadosBrutos] = useState<DentistaResultado[]>([]);
  // Ordenação padrão: por DISTÂNCIA quando a busca tem localização (lat/lng) — quem
  // pesquisa "perto de mim" quer o mais próximo primeiro. Sem localização (busca
  // textual pura) cai para "melhor avaliados", pois a distância seria 0 para todos.
  // O componente remonta a cada nova busca (key={termo} na page), então este
  // inicializador já reflete o tipo de busca corrente.
  const [ordenacao, setOrdenacao] = useState<"distancia" | "avaliacao">(
    paramLat && paramLng ? "distancia" : "avaliacao",
  );

  // A distância exibida é SEMPRE a partir da localização REAL do usuário: GPS da
  // URL ("usar localização") ou, na falta, as coords capturadas no login
  // (sessionStorage). Calculado no cliente (sessionStorage não existe no SSR) p/
  // evitar mismatch de hidratação. Sem origem, o badge de distância não aparece.
  const [temOrigemUsuario, setTemOrigemUsuario] = useState(false);
  useEffect(() => {
    // Marca "tem origem" a partir da URL/sessionStorage no mount (sync externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (paramLat && paramLng) { setTemOrigemUsuario(true); return; }
    // Origem só a partir das coords do login (se o usuário JÁ compartilhou antes).
    // NÃO pedimos a localização automaticamente — LGPD: a geolocalização só é
    // solicitada no clique em "Usar minha localização" (usarLocalizacao). Sem
    // origem, a busca segue SEM distância (em vez de mostrar "0 km" falso).
    try {
      const raw = sessionStorage.getItem("curadentes_login_coords");
      const o = raw ? (JSON.parse(raw) as { latitude?: number; longitude?: number }) : null;
      if (typeof o?.latitude === "number" && typeof o?.longitude === "number") {
        setTemOrigemUsuario(true);
      }
    } catch { /* ignore */ }
  }, [paramLat, paramLng]);

  // Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { user, pedirLoginPaciente } = useSessao();
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

  const handleSuggestionSelect = useCallback((suggestion: AddressSuggestion) => {
    setSearchInput(suggestion.value);
    setShowSuggestions(false);
    setHighlightedIdx(-1);
    router.push(`/busca?q=${encodeURIComponent(suggestion.value)}`);
  }, [router]);

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

  // Filtros (selectedAtividades já declarado acima, junto do efeito de URL)
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConvenios, setSelectedConvenios] = useState<string[]>([]);
  const [selectedPagamentos, setSelectedPagamentos] = useState<string[]>([]);

  useEffect(() => {
    // ── (B) Flag de cancelamento: evita atualizar estado de uma busca "velha" ──
    let cancelled = false;
    // Chave de cache para esta combinação de query + raio
    const currentKey = buildQueryCacheKey(query, latPesquisa, lngPesquisa, raio);

    // ── (C) Timeout global de 10 s ───────────────────────────────────────────
    const TIMEOUT_MS = 10_000;

    async function buscar() {
      if (!query && (!latPesquisa || !lngPesquisa)) {
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

        // Origem do USUÁRIO para a distância (≠ origem da BUSCA): GPS da URL ou, na
        // falta, as coords do login. A distância exibida é sempre a partir daqui —
        // nunca do termo geocodificado (que daria ~0 km na busca por nome).
        let origemLat: number | null = null;
        let origemLng: number | null = null;
        if (latPesquisa && lngPesquisa) {
          origemLat = parseFloat(latPesquisa);
          origemLng = parseFloat(lngPesquisa);
        } else {
          try {
            const raw = sessionStorage.getItem("curadentes_login_coords");
            const o = raw ? (JSON.parse(raw) as { latitude?: number; longitude?: number }) : null;
            if (typeof o?.latitude === "number" && typeof o?.longitude === "number") {
              origemLat = o.latitude; origemLng = o.longitude;
            }
          } catch { /* ignore */ }
        }

        // 1. Inicia a Busca Textual no banco (roda em paralelo com a API de mapas)
        let textSearchPromise: Promise<{ data: EnderecoRow[] | null; error: SupabaseError | null }> = Promise.resolve({ data: null, error: null });
        // Busca textual por LOCAL/clínica. Filtros .or() SANITIZADOS (lib/busca-filtro):
        // fecha a brecha de injeção no filtro do PostgREST — antes o termo CRU ia direto
        // ao .or(), permitindo burlar o lgpd_aceito e expor perfis não públicos. Mesmo
        // comportamento de antes: "bairro, cidade" vira 2 filtros encadeados (AND).
        const filtrosEndereco = construirFiltrosEndereco(query);
        if (filtrosEndereco.length > 0) {
          let queryBuilder = supabase
            .from("curadentespro_enderecos")
            .select(`
              id, nome_clinica, logradouro, numero, bairro, cidade, estado, atividades, convenios, formas_pagamento, latitude, longitude,
              curadentespro!inner ( id, nome, foto_url, bio, cro, cro_verificado, lgpd_aceito )
            `);
          for (const filtro of filtrosEndereco) {
            queryBuilder = queryBuilder.or(filtro);
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
        } else if (query) {
          // Sem dica de localização do usuário (anônimo): passa só o termo.
          coordPromise = getCoordenadas(query);
        }

        // ── (C) Promise.race: se demorar mais de 10 s, lança TIMEOUT ─────────
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS)
        );

        const [textResult, coordResult] = await Promise.race([
          Promise.all([textSearchPromise, coordPromise]),
          timeoutPromise,
        ]);

        // Descarta resultado se a busca foi cancelada enquanto aguardávamos
        if (cancelled) return;

        if (coordResult) {
          finalLat = coordResult.latitude;
          finalLng = coordResult.longitude;
        }

        // 3. Busca Geográfica pelo mapa (get_dentistas_proximos)
        let mapResults: DentistaResultado[] = [];
        if (finalLat !== null && finalLng !== null) {
          const { data, error } = await supabase.rpc("get_dentistas_proximos", {
            lat: finalLat,
            lng: finalLng,
            raio_km: raio
          });

          if (cancelled) return;

          if (!error && data) {
            // A RPC mede a distância a partir da origem da BUSCA. Recomputamos a
            // partir da origem do USUÁRIO (lat/lng vêm no retorno da RPC). Se faltar
            // lat/lng (cache antigo), mantém o valor da RPC.
            mapResults = (data as DentistaResultado[]).map((r) =>
              origemLat !== null && origemLng !== null && typeof r.latitude === "number" && typeof r.longitude === "number"
                ? { ...r, distancia_km: calcularDistanciaKm(origemLat, origemLng, r.latitude, r.longitude) }
                : r
            );
          } else {
            console.error("[Busca] Erro na busca por raio RPC:", error);
          }
        }

        // 4. Processa a Busca Textual que rodou lá no passo 1
        let textResults: DentistaResultado[] = [];
        if (query) {
          const { data: textData, error: textError } = textResult;

          if (textData) {
            textResults = textData
              .filter((d) => {
                const pro = Array.isArray(d.curadentespro) ? d.curadentespro[0] : d.curadentespro;
                const temPro = !!(pro && pro.id);
                if (!temPro) {
                  console.warn("[Busca] Endereço sem profissional vinculado descartado:", d.id);
                }
                return temPro;
              })
              .map((d) => {
                const pro = Array.isArray(d.curadentespro) ? d.curadentespro[0] : (d.curadentespro || { id: "", nome: "", foto_url: null, bio: null, cro: "", cro_verificado: false }) as { id: string; nome: string; foto_url: string | null; bio: string | null; cro: string; cro_verificado: boolean; };

                let dist = 0;
                if (origemLat !== null && origemLng !== null && d.latitude && d.longitude) {
                  dist = calcularDistanciaKm(origemLat, origemLng, d.latitude, d.longitude);
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

            // NÃO aplica filtro de raio nos resultados textuais: eles já casaram
            // com o termo buscado (ex.: cidade/bairro "Sorocaba"), então devem
            // aparecer mesmo que estejam a >5km da localização exata do usuário.
            // (A proximidade por raio é responsabilidade da busca geográfica/RPC;
            // a distância aqui serve apenas para ordenação.)
          } else if (textError) {
            console.error("[Busca] Erro na busca por texto:", textError);
          }
        }

        if (cancelled) return;

        // ─── Busca por nome do dentista (query separada: or() não suporta coluna embedded) ────
        // Busca por NOME do dentista (termo sanitizado; o ilike é parametrizado).
        const qNome = termoBuscaNome(query);
        if (qNome) {
          try {
            const { data: dentistasPorNome } = await supabase
              .from("curadentespro")
              .select("id")
              .ilike("nome", `%${qNome}%`)
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
                const nomeResults = (enderecosPorNome as unknown as EnderecoRow[])
                  .filter((d) => {
                    const pro = Array.isArray(d.curadentespro) ? d.curadentespro[0] : d.curadentespro;
                    return !!(pro && pro.id);
                  })
                  .map((d) => {
                    const pro = Array.isArray(d.curadentespro) ? d.curadentespro[0] : (d.curadentespro || { id: "", nome: "", foto_url: null, bio: null, cro: "", cro_verificado: false }) as { id: string; nome: string; foto_url: string | null; bio: string | null; cro: string; cro_verificado: boolean; };
                    let dist = 0;
                    if (origemLat !== null && origemLng !== null && d.latitude && d.longitude) {
                      dist = calcularDistanciaKm(origemLat, origemLng, d.latitude, d.longitude);
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
              }
            }
          } catch (err) {
            console.error("[Busca] Erro na busca por nome do dentista:", err);
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

        // ─── Enriquece TODOS os resultados com atividades/convênios/pagamentos ──
        // A busca geográfica (RPC get_dentistas_proximos) pode não trazer esses
        // campos, o que zerava os filtros (ex.: ao entrar pela página de uma
        // especialidade, o filtro de atividade removia todos os resultados geo).
        const enderecoIds = [...new Set(finalResults.map(r => r.endereco_id))].filter(Boolean);
        if (enderecoIds.length > 0) {
          try {
            const { data: endsExtra } = await supabase
              .from("curadentespro_enderecos")
              .select("id, atividades, convenios, formas_pagamento")
              .in("id", enderecoIds);
            if (endsExtra && endsExtra.length > 0) {
              const extraMap: Record<string, { atividades: string[]; convenios: string[]; formas_pagamento: string[] }> = {};
              endsExtra.forEach((e: { id: string; atividades: string[] | null; convenios: string[] | null; formas_pagamento: string[] | null }) => {
                extraMap[e.id] = { atividades: e.atividades || [], convenios: e.convenios || [], formas_pagamento: e.formas_pagamento || [] };
              });
              finalResults.forEach(r => {
                const ext = extraMap[r.endereco_id];
                if (ext) {
                  if (!r.atividades || r.atividades.length === 0) r.atividades = ext.atividades;
                  if (!r.convenios || r.convenios.length === 0) r.convenios = ext.convenios;
                  if (!r.formas_pagamento || r.formas_pagamento.length === 0) r.formas_pagamento = ext.formas_pagamento;
                }
              });
            }
          } catch (err) {
            console.error("[Busca] Erro ao enriquecer atividades/convênios:", err);
          }
        }

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
            console.error("[Busca] Erro ao buscar avaliações:", err);
          }

          // ─── Enriquece nome (Dr./Dra.) + verificação do CRO ────────────────
          // A RPC geográfica (get_dentistas_proximos) NÃO retorna cro_verificado,
          // e no merge ela tem precedência sobre a busca textual — por isso o card
          // mostrava "CRO não verificada" mesmo já verificada. Buscamos tratamento
          // E cro_verificado de curadentespro e aplicamos em TODOS os resultados
          // (corrige qualquer caminho de busca: geo, textual ou por nome).
          try {
            const { data: trats } = await supabase
              .from('curadentespro')
              .select('id, tratamento, cro_verificado, especialidade')
              .in('id', dentistaIds);
            if (trats && trats.length > 0) {
              const tratMap: Record<string, string> = {};
              const verifMap: Record<string, boolean> = {};
              const espMap: Record<string, string> = {};
              trats.forEach((t: { id: string; tratamento: string | null; cro_verificado: boolean | null; especialidade: string | null }) => {
                if (t.tratamento) tratMap[t.id] = t.tratamento;
                verifMap[t.id] = !!t.cro_verificado;
                if (t.especialidade) espMap[t.id] = t.especialidade;
              });
              finalResults.forEach(r => {
                const t = tratMap[r.dentista_id];
                if (t) {
                  r.dentista_nome = nomeExibicao({ nome: r.dentista_nome, tratamento: t });
                }
                if (r.dentista_id in verifMap) {
                  r.dentista_cro_verificado = verifMap[r.dentista_id];
                }
                if (espMap[r.dentista_id]) {
                  r.dentista_especialidade = espMap[r.dentista_id];
                }
              });
            }
          } catch (err) {
            console.error("[Busca] Erro ao buscar tratamento:", err);
          }
        }

        if (query) {
          const primeiro = finalResults[0];
          void logarBusca({
            termo: query,
            cidade: primeiro?.cidade ?? null,
            estado: primeiro?.estado ?? null,
            bairro: primeiro?.bairro ?? null,
            latitude: finalLat,
            longitude: finalLng,
            resultados: finalResults.length,
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
          console.error("[Busca] ⏱️ Timeout: busca ultrapassou 10 segundos.");
          toast.error("A busca demorou mais do que o esperado. Verifique sua conexão e tente novamente.");
        } else {
          console.error("[Busca] 💥 Erro inesperado durante a busca:", err);
        }
      } finally {
        // Só atualiza o loading se esta execução ainda for a "atual"
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    buscar();

    // ── (B) Cleanup: cancela esta execução quando o efeito re-rodar ──────────
    return () => { cancelled = true; };
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
    dentista_especialidade?: string;
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
        dentista_especialidade: item.dentista_especialidade,
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
    if (!pedirLoginPaciente()) return; // busca exige login (igual k11)
    setShowSuggestions(false);
    if (highlightedIdx >= 0 && suggestions[highlightedIdx]) {
      handleSuggestionSelect(suggestions[highlightedIdx]);
      return;
    }
    const termo = searchInput.trim();
    if (!termo) return;
    router.push(urlBusca(termo));
  }

  // "Usar minha localização": geolocalização opt-in (só dispara no clique),
  // reverse-geocode para bairro/cidade e navega para /busca?q={bairro, cidade}.
  function usarLocalizacao() {
    if (!pedirLoginPaciente()) return; // localização/busca exige login (igual k11)
    setGeoErro(null);
    if (!navigator.geolocation) {
      setGeoErro("Geolocalização não é suportada pelo seu navegador.");
      toast.error("Geolocalização não é suportada pelo seu navegador.");
      return;
    }
    setUsandoLocalizacao(true);
    const toastId = toast.loading("Buscando sua localização...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        toast.loading("Identificando seu bairro...", { id: toastId });
        try {
          const { cidade, bairro } = await reverseGeocodeCidadeBairro(lat, lng);
          const enderecoTexto = [bairro, cidade].filter(Boolean).join(", ");
          const latStr = lat.toFixed(4);
          const lngStr = lng.toFixed(4);
          toast.dismiss(toastId);
          if (enderecoTexto) {
            router.push(`/busca?q=${encodeURIComponent(enderecoTexto)}&lat=${latStr}&lng=${lngStr}`);
          } else {
            router.push(`/busca?lat=${latStr}&lng=${lngStr}`);
          }
        } catch (err) {
          toast.dismiss(toastId);
          console.error("[Busca] Erro ao identificar localização:", err);
          router.push(`/busca?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`);
        } finally {
          setUsandoLocalizacao(false);
        }
      },
      () => {
        toast.dismiss(toastId);
        setGeoErro("Não foi possível obter sua localização. Verifique as permissões do navegador.");
        toast.error("Não foi possível obter sua localização. Verifique as permissões do navegador.");
        setUsandoLocalizacao(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const temCoordenadas = !!latPesquisa && !!lngPesquisa;

  return (
    // <div> (não <main>) porque o layout do R0 já fornece o <main> da página;
    // o restante das classes copia o <main> do k11 (Pesquisa.tsx) verbatim.
    <div className="flex-1 flex flex-col lg:flex-row gap-8">

      {/* BARRA LATERAL DE FILTROS (Desktop) / MODAL (Mobile) */}
      <aside className={`lg:w-[280px] flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm sticky top-[100px] overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 120px)' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-[18px] text-[#0A2A66] flex items-center gap-2">
              <SlidersHorizontal size={18} /> Filtros
            </h3>
            <button className="lg:hidden p-1 text-gray-400" onClick={() => setShowFilters(false)}>
              <X size={20} />
            </button>
          </div>

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
                    {nomeAmigavel(esp)}
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

        {/* Barra de busca com autocomplete */}
        <div ref={searchContainerRef} className="relative z-30">
          {/* Deslogado: clicar na barra pede login (Google), igual k11 */}
          {!user && (
            <div onClick={() => pedirLoginPaciente()} role="button" aria-label="Entrar com Google para buscar" className="absolute inset-0 z-40 cursor-pointer rounded-[20px]" />
          )}
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
                onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); setHighlightedIdx(-1); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Nome do dentista, cidade, bairro, especialidade..."
                className="w-full bg-transparent text-[16px] text-[#1C1C1E] outline-none placeholder:text-gray-400 py-2.5"
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

        {geoErro && (
          <p className="text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-[12px] px-3 py-2">
            {geoErro}
          </p>
        )}

        {/* Info bar: termo + contagem + controles */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white p-4 rounded-[20px] shadow-sm border border-gray-100">
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-bold text-[#0A2A66] flex items-center gap-2 flex-wrap">
              {query && (
                <span>
                  Resultados para &quot;<span style={{ color: "#007AFF" }}>{query}</span>&quot;
                </span>
              )}
              {!query && !temCoordenadas && "Buscar dentistas"}
              {!query && temCoordenadas && "Dentistas próximos a você"}
            </h1>
            <p className="text-[14px] text-gray-500 mt-0.5">
              {loading ? "Buscando..." : `${resultadosFiltrados.length} ${resultadosFiltrados.length === 1 ? "dentista encontrado" : "dentistas encontrados"}`}
              {temCoordenadas && raio > 0 && !loading && ` em até ${raio} km`}.
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
                className="bg-transparent text-[16px] font-semibold text-[#1C1C1E] outline-none cursor-pointer w-full"
              >
                <option value="avaliacao">Melhor avaliados</option>
                <option value="distancia">Mais próximos</option>
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
                onClick={() => router.push(`/dentista/${dentista.dentista_cro || dentista.dentista_id}`)}
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
                        {dentista.dentista_especialidade && (
                          <p className="text-[12px] font-semibold mt-0.5" style={{ color: "#E6004C" }}>
                            {nomeAmigavel(dentista.dentista_especialidade)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono text-gray-400">{dentista.dentista_cro}</span>
                          <CroVerificationBadge verificado={dentista.dentista_cro_verificado} size="sm" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full shrink-0" role="img" aria-label={`Avaliação ${dentista.dentista_avaliacao} de 5`}>
                        <Star size={12} className="text-yellow-500 fill-yellow-500" aria-hidden="true" />
                        <span className="text-[12px] font-bold text-yellow-700">{dentista.dentista_avaliacao}</span>
                      </div>
                    </div>
                    {dentista.dentista_bio && (
                      <p className="text-[13px] text-gray-500 mt-1 line-clamp-2">
                        {dentista.dentista_bio}
                      </p>
                    )}
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
                                {nomeAmigavel(at)}
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
                        {/* Distância só faz sentido com a localização REAL do usuário
                            (GPS via "usar localização"). Na busca textual a "origem" é
                            o termo geocodificado — medir dele até a clínica dá ~0 km
                            (ex.: buscar "Instituto Lucas Plens" mostrava 0 km). */}
                        {temOrigemUsuario && end.distancia_km > 0 ? (
                          <span className="text-[11px] font-bold text-blue-600 bg-blue-100/80 px-2 py-1 rounded-[8px]">
                            {formatarDistancia(end.distancia_km)} daqui
                          </span>
                        ) : (
                          <span />
                        )}
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
    </div>
  );
}
