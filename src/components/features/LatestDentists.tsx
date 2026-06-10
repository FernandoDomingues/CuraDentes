// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: LatestDentists — Últimos dentistas cadastrados
//
// Exibe na landing page os dentistas mais recentes cadastrados na plataforma,
// com foto, nome e CRO. Cada card leva ao perfil público do dentista.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import logoProAltUrl from "@/assets/logos/logo-pro-alt.png";
import { saveToSearchCache } from "@/lib/dentistCache";
import CroVerificationBadge from "@/components/analytics/CroVerificationBadge";

interface DentistaRecente {
  id: string;
  nome: string;
  foto_url: string;
  bio: string;
  cro: string;
  cro_verificado?: boolean;
  especialidades: string[];
  criado_em: string;
}

export default function LatestDentists() {
  const navigate = useNavigate();
  const [dentistas, setDentistas] = useState<DentistaRecente[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    async function fetchLatest() {
      const CACHE_KEY = "curadentes_latest_dentists_cache";
      const CACHE_VERSION = "v3";
      const EXPIRATION_TIME = 60 * 1000; // 1 minuto

      try {
        setLoading(true);

        // 1. Tenta ler do cache
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            const isValidVersion = parsed.version === CACHE_VERSION;
            const isNotExpired = parsed.timestamp && (Date.now() - parsed.timestamp < EXPIRATION_TIME);
            const hasData = parsed.dentistas && parsed.dentistas.length > 0;
            
            if (isValidVersion && isNotExpired && hasData) {
              setDentistas(parsed.dentistas);
              return; // Usa o cache e sai
            }
          } catch (e) {
            console.error("Erro ao ler cache de últimos dentistas:", e);
          }
        }

        // 2. Busca do Supabase se não houver cache válido
        const { data: pros, error } = await supabase
          .from("curadentespro")
          .select("id, nome, foto_url, bio, cro, cro_verificado, criado_em")
          .eq("lgpd_aceito", true)
          .is("deleted_at", null)
          .order("criado_em", { ascending: false })
          .limit(15);

        if (error) throw error;

        if (pros && pros.length > 0) {
          const comEnderecos = await Promise.all(
            pros.map(async (p) => {
              const { data: ends } = await supabase
                .from("curadentespro_enderecos")
                .select("nome_clinica, logradouro, numero, bairro, cidade, atividades")
                .eq("curadentespro_id", p.id);

              // Coleta todas as atividades de todos os endereços e remove duplicatas
              const todasAtividadesSet = new Set<string>();
              ends?.forEach((e) => {
                if (Array.isArray(e.atividades)) {
                  e.atividades.forEach((at: string) => {
                    if (at) todasAtividadesSet.add(at.trim());
                  });
                }
              });
              const especialidades = Array.from(todasAtividadesSet);

              return { 
                id: p.id,
                nome: p.nome,
                foto_url: p.foto_url,
                bio: p.bio,
                cro: p.cro,
                especialidades,
                criado_em: p.criado_em
              };
            })
          );
          
          setDentistas(comEnderecos as unknown as DentistaRecente[]);
          
          // Salva os dentistas novos no cache de busca para carregamento instantâneo dos perfis
          saveToSearchCache(comEnderecos.map(d => ({
            dentista_id: d.id,
            dentista_cro: (d.cro || "").replace(/\s/g, ""),
            dentista_nome: d.nome,
            dentista_foto: d.foto_url || "",
            dentista_bio: d.bio || "",
            // Para retrocompatibilidade de cache de perfil simples, enviamos strings vazias para campos de endereço
            nome_clinica: "",
            logradouro: "",
            numero: "",
            bairro: "",
            cidade: "",
          })));

          // 3. Salva no cache com versão
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            dentistas: comEnderecos,
            timestamp: Date.now(),
            version: CACHE_VERSION
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar últimos dentistas:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLatest();
  }, []);

  if (loading) {
    return (
      <section className="py-12 bg-[#F2F2F7] flex flex-col items-center">
        <Loader2 className="animate-spin text-[#007AFF] mb-4" size={32} />
        <p className="text-gray-500 font-medium text-[14px]">Carregando novos dentistas...</p>
      </section>
    );
  }

  if (dentistas.length === 0) return null;

  return (
    <section className="py-12 lg:py-16 bg-[#F2F2F7]">
      <div className="container mx-auto px-4 md:px-8 max-w-[1200px]">
        {/* Header Clickable para Expandir/Recolher */}
        <button 
          onClick={() => setExpandido(!expandido)}
          className={`w-full flex flex-col md:flex-row md:items-center justify-between gap-4 text-left cursor-pointer group transition-all duration-300 ${
            expandido 
              ? "mb-4" 
              : "bg-white p-6 md:px-8 rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md"
          }`}
        >
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-[12px] font-bold mb-3">
              <Sparkles size={14} className="text-blue-600" /> Novidades
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-[24px] md:text-[28px] font-bold text-[#0A2A66] leading-tight group-hover:text-[#007AFF] transition-colors">
                Novos Dentistas <br className="md:hidden" /> no CuraDentes
              </h2>
              {expandido ? (
                <ChevronUp size={24} className="text-[#E6004C] md:hidden" />
              ) : (
                <ChevronDown size={24} className="text-[#E6004C] md:hidden" />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
            <p className="text-[13px] text-gray-500 max-w-xs md:max-w-[280px]">
              Conheça os profissionais que acabaram de chegar na plataforma e encontre o seu especialista.
            </p>
            <div className={`hidden md:flex items-center justify-center w-12 h-12 rounded-full border transition-colors ${
              expandido 
                ? "bg-white border-gray-200 group-hover:bg-[#FFF0F5] group-hover:border-[#E6004C]/30" 
                : "bg-[#FFF0F5] border-[#E6004C]/20"
            }`}>
              {expandido ? (
                <ChevronUp size={24} className="text-[#E6004C]" />
              ) : (
                <ChevronDown size={24} className="text-[#E6004C]" />
              )}
            </div>
          </div>
        </button>

        {/* Conteúdo Expansível */}
        {expandido && (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 mt-6 animate-in slide-in-from-top-4 fade-in duration-300">
            {dentistas.map((dentista) => (
            <div
              key={dentista.id}
              onClick={() => navigate(`/dentista/${dentista.cro || dentista.id}`)}
              className="snap-start snap-always shrink-0 w-[280px] md:w-auto bg-white rounded-[24px] p-5 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col group relative"
            >
              <div className="absolute top-4 right-4 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                Novo
              </div>

              <div className="flex items-start gap-4 mb-4">
                <img
                  src={dentista.foto_url || logoProAltUrl}
                  alt={dentista.nome}
                  className="w-14 h-14 rounded-full object-cover border-2 border-gray-50 bg-gray-50"
                />
                <div className="flex-1 mt-1">
                  <h3 className="font-bold text-[16px] text-[#1C1C1E] leading-tight line-clamp-1 group-hover:text-[#007AFF] transition-colors">
                    {dentista.nome}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[12px] text-gray-400 font-medium">
                      {dentista.cro}
                    </p>
                    {dentista.cro_verificado !== undefined && (
                      <CroVerificationBadge verificado={dentista.cro_verificado} size="sm" />
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-gray-500 mb-4 line-clamp-2 min-h-[38px]">
                {dentista.bio || "Dentista clínico geral focado em oferecer o melhor atendimento para o seu sorriso."}
              </p>

              {dentista.especialidades && dentista.especialidades.length > 0 && (
                <div className="mt-auto pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                  {dentista.especialidades.map((esp, index) => (
                    <span
                      key={index}
                      className="bg-blue-50 text-[#007AFF] text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    >
                      {esp}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
