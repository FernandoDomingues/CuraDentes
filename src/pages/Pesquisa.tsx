import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getCoordenadas } from "@/lib/geocoding";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Loader2, MapPin, Star, Building2, ChevronRight, Filter, SlidersHorizontal, X } from "lucide-react";
import logoProAltUrl from "@/assets/logos/logo-pro-alt.png";
import { useAuth } from "@/hooks/useAuth";
import { saveToSearchCache, saveQueryCache, loadQueryCache, buildQueryCacheKey } from "@/lib/dentistCache";

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
    | { id: string; nome: string; foto_url: string | null; bio: string | null }
    | { id: string; nome: string; foto_url: string | null; bio: string | null }[]
    | null;
}

interface SupabaseError {
  message?: string;
  code?: string;
}

const CONVENIOS_OPCOES = [
  "Amil Dental", "Bradesco Dental", "SulAmérica Odonto", "Hapvida Odonto",
  "Odontoprev", "Unimed Odonto", "Porto Seguro Saúde", "NotreDame Intermédica"
];

const PAGAMENTOS_OPCOES = [
  "Dinheiro", "PIX", "Cartão de débito", "Cartão de crédito (à vista)",
  "Cartão de crédito (parcelado)", "Boleto bancário"
];

export default function Pesquisa() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q");

  const [raio, setRaio] = useState(5); // 5km por padrão

  // Lazy initializers: só leem localStorage 1× na montagem do componente
  const [loading, setLoading] = useState(() => {
    const cached = loadQueryCache(
      buildQueryCacheKey(query, searchParams.get("lat"), searchParams.get("lng"), 5)
    );
    return !cached || cached.length === 0;
  });
  const [resultadosBrutos, setResultadosBrutos] = useState<DentistaResultado[]>(() => {
    const cached = loadQueryCache(
      buildQueryCacheKey(query, searchParams.get("lat"), searchParams.get("lng"), 5)
    );
    return (cached ?? []) as DentistaResultado[];
  });
  const [ordenacao, setOrdenacao] = useState<"distancia" | "avaliacao">("distancia");

  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConvenios, setSelectedConvenios] = useState<string[]>([]);
  const [selectedPagamentos, setSelectedPagamentos] = useState<string[]>([]);

  useEffect(() => {
    // ── (B) Flag de cancelamento: evita atualizar estado de uma busca "velha" ──
    let cancelled = false;
    // Chave de cache para esta combinação de query + raio
    const currentKey = buildQueryCacheKey(
      query,
      searchParams.get("lat"),
      searchParams.get("lng"),
      raio
    );

    // ── (C) Timeout global de 10 s ───────────────────────────────────────────
    const TIMEOUT_MS = 10_000;

    async function buscar() {
      const urlLat = searchParams.get("lat");
      const urlLng = searchParams.get("lng");

      console.log("[Pesquisa] 🔍 Iniciando busca. Params:", { query, urlLat, urlLng, raio });

      if (!query && (!urlLat || !urlLng)) {
        console.log("[Pesquisa] Sem query ou coordenadas na URL. Parando busca.");
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
          const queryBuilder = supabase
            .from("curadentespro_enderecos")
            .select(`
              id, nome_clinica, logradouro, numero, bairro, cidade, estado, atividades, convenios, formas_pagamento, latitude, longitude,
              curadentespro:curadentespro_id ( id, nome, foto_url, bio )
            `)
            .or([
              `bairro.ilike.%${q}%`,
              `cidade.ilike.%${q}%`,
              `estado.ilike.%${q}%`,
              `logradouro.ilike.%${q}%`,
              `nome_clinica.ilike.%${q}%`
            ].join(','));
          textSearchPromise = queryBuilder as unknown as Promise<{ data: EnderecoRow[] | null; error: SupabaseError | null }>;
        }

        // 2. Inicia a busca de Coordenadas (roda em paralelo com o banco de dados)
        let coordPromise: Promise<{ latitude: number; longitude: number } | null> = Promise.resolve(null);
        if (urlLat && urlLng) {
          finalLat = parseFloat(urlLat);
          finalLng = parseFloat(urlLng);
          console.log("[Pesquisa] [Passo 2] Coordenadas vindas diretamente da URL:", { finalLat, finalLng });
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
                const pro = Array.isArray(d.curadentespro) ? d.curadentespro[0] : (d.curadentespro || { id: "", nome: "", foto_url: null, bio: null });

                let dist = 0;
                if (finalLat !== null && finalLng !== null && d.latitude && d.longitude) {
                  dist = calculateDistance(finalLat, finalLng, d.latitude, d.longitude);
                }

                return {
                  dentista_id: pro.id,
                  dentista_nome: pro.nome || "Dentista Parceiro",
                  dentista_foto: pro.foto_url || "",
                  dentista_bio: pro.bio || "",
                  dentista_avaliacao: 5.0,
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

        // 5. Combinação de Resultados sem duplicação
        const mergedMap = new Map<string, DentistaResultado>();
        mapResults.forEach(r => mergedMap.set(r.endereco_id, r));
        textResults.forEach(r => {
          if (!mergedMap.has(r.endereco_id)) {
            mergedMap.set(r.endereco_id, r);
          }
        });

        const finalResults = Array.from(mergedMap.values());
        console.log("[Pesquisa] 🏁 Busca finalizada com sucesso! Total de resultados combinados:", finalResults.length);
        if (!cancelled) setResultadosBrutos(finalResults);

        // 6. Salva no cache por query (restauração no F5) e no cache de perfis
        if (finalResults.length > 0) {
          // Cache por query — restaura resultados instantaneamente no próximo F5
          saveQueryCache(currentKey, finalResults);

          // Cache global de perfis — carregamento rápido da página de detalhe
          saveToSearchCache(finalResults.map(r => ({
            dentista_id: r.dentista_id,
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
  }, [query, searchParams.get("lat"), searchParams.get("lng"), raio]);

  // Aplicação dos filtros locais
  const resultadosFiltrados = resultadosBrutos.filter((dentista) => {
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

  const toggleConvenio = (c: string) => {
    setSelectedConvenios(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const togglePagamento = (p: string) => {
    setSelectedPagamentos(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F2F7]">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-[1200px] flex flex-col lg:flex-row gap-8">
        
        {/* BARRA LATERAL DE FILTROS (Desktop) / MODAL (Mobile) */}
        <aside className={`lg:w-[280px] flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm sticky top-[100px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[18px] text-[#0A2A66] flex items-center gap-2">
                <SlidersHorizontal size={18} /> Filtros
              </h3>
              <button className="lg:hidden p-1 text-gray-400" onClick={() => setShowFilters(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Distância */}
            <div className="mb-6">
              <label className="block text-[13px] font-bold text-[#1C1C1E] mb-3">Distância Máxima: {raio} km</label>
              <input 
                type="range" min="1" max="50" value={raio} 
                onChange={(e) => setRaio(Number(e.target.value))}
                className="w-full accent-[#007AFF]"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-medium">
                <span>1 km</span>
                <span>50 km</span>
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
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-[20px] shadow-sm border border-gray-100">
            <div>
              <h1 className="text-[20px] font-bold text-[#0A2A66]">
                Resultados para "{query || "Sua Localização"}"
              </h1>
              <p className="text-[14px] text-gray-500">
                {loading ? "Buscando..." : `${resultadosFiltrados.length} dentistas encontrados.`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowFilters(true)}
                className="lg:hidden flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl text-[13px] font-semibold text-gray-700 border border-gray-200"
              >
                <SlidersHorizontal size={14} /> Filtros
              </button>

              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                <Filter size={14} className="text-gray-400" />
                <select 
                  value={ordenacao} 
                  onChange={(e) => setOrdenacao(e.target.value as "distancia" | "avaliacao")}
                  className="bg-transparent text-[13px] font-semibold text-[#1C1C1E] outline-none cursor-pointer"
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
              {resultadosOrdenados.map((dentista) => (
                <div 
                  key={dentista.endereco_id} 
                  onClick={() => navigate(`/dentista/${dentista.dentista_id}`)}
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
                        <h3 className="font-bold text-[16px] text-[#1C1C1E] leading-tight group-hover:text-[#007AFF] transition-colors">
                          {dentista.dentista_nome}
                        </h3>
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

                  {dentista.convenios && dentista.convenios.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {dentista.convenios.slice(0, 3).map(conv => (
                        <span key={conv} className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-100 uppercase tracking-wider">
                          {conv}
                        </span>
                      ))}
                      {dentista.convenios.length > 3 && (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                          +{dentista.convenios.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto bg-blue-50/50 rounded-[16px] p-3.5 flex flex-col gap-2">
                    <div className="flex items-start gap-2 text-[12px] text-[#0A2A66]">
                      <Building2 size={14} className="mt-0.5 shrink-0 text-blue-400" />
                      <span className="font-medium leading-snug">
                        {dentista.nome_clinica ? `${dentista.nome_clinica} - ` : ""}
                        {dentista.logradouro}, {dentista.numero} - {dentista.bairro}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100/50">
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-100/80 px-2 py-1 rounded-[8px]">
                        {dentista.distancia_km.toFixed(1)} km daqui
                      </span>
                      <div className="flex items-center gap-1 text-[12px] font-bold text-[#007AFF] group-hover:translate-x-1 transition-transform">
                        Agendar <ChevronRight size={14} />
                      </div>
                    </div>
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
