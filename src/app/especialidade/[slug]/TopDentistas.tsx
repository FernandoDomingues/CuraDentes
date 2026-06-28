"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// TopDentistas — lista dinâmica dos melhores dentistas de uma especialidade.
//
// Componente cliente embutido na página (estática) de especialidade. Recebe o
// NOME CANÔNICO da especialidade por prop e chama a RPC pública
// `get_top_dentistas_especialidade(especialidade_nome, cidade_usuario)`, que
// devolve até 5 profissionais ordenados por avaliação. Enriquece cada card com
// tratamento (Dr./Dra.), CRO e selo de verificação via uma leitura em
// `curadentespro`. Geolocalização é OPT-IN: o botão "ver perto de mim" pede a
// localização do navegador, faz reverse-geocode (cidade) e refaz a RPC filtrando
// pela cidade do paciente.
//
// Visual portado do site-k11 (Especialidade.tsx → bloco "Top 5 dentistas"):
// cards escuros translúcidos sobre o gradiente azul-marinho, foto redonda, nome,
// CRO + CroVerificationBadge, avaliação (estrela) e cidade/estado. Link para
// /dentista/{id}.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/public";
import { reverseGeocodeCidadeBairro, GEOLOC_TIMEOUT_MS } from "@/lib/geocoding";
import { nomeAmigavel } from "@/lib/especialidades";
import CroVerificationBadge from "@/components/CroVerificationBadge";
import CtaEspecialidade from "./CtaEspecialidade";
import { MapPin, Star, ChevronRight, Navigation, Loader2 } from "lucide-react";
import { AVATAR_PADRAO } from "@/lib/site";
import { aoFalharAvatar } from "@/lib/avatar";
import { nomeExibicao as nomeExibicaoDentista } from "@/lib/dentistas";

// Linha bruta devolvida pela RPC.
interface TopDentistaRpc {
  dentista_id: string;
  dentista_nome: string;
  dentista_foto: string | null;
  dentista_avaliacao: number;
  endereco_cidade: string | null;
  endereco_estado: string | null;
}

// Linha já enriquecida (tratamento + CRO + selo) para o card.
interface TopDentista extends TopDentistaRpc {
  cro: string | null;
  cro_verificado: boolean | null;
  especialidade: string | null;
}

export default function TopDentistas({ especialidade }: { especialidade: string }) {
  const nomeExibicao = nomeAmigavel(especialidade);

  const [dentistas, setDentistas] = useState<TopDentista[]>([]);
  const [loading, setLoading] = useState(true);
  const [cidadeUsuario, setCidadeUsuario] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("curadentes_user_city");
    } catch {
      return null;
    }
  });
  const [localizando, setLocalizando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setLoading(true);

      const { data, error } = await supabase.rpc("get_top_dentistas_especialidade", {
        especialidade_nome: especialidade,
        cidade_usuario: cidadeUsuario,
      });

      if (cancelado) return;

      if (error || !data) {
        setDentistas([]);
        setLoading(false);
        return;
      }

      const top = data as TopDentistaRpc[];

      // Enriquece com tratamento (Dr./Dra.), CRO e status de verificação.
      const ids = top.map((d) => d.dentista_id).filter(Boolean);
      let enriquecidos: TopDentista[] = top.map((d) => ({
        ...d,
        cro: null,
        cro_verificado: null,
        especialidade: null,
      }));

      if (ids.length > 0) {
        const { data: pros } = await supabase
          .from("curadentespro")
          .select("id, tratamento, cro, cro_verificado, especialidade")
          .in("id", ids);

        if (!cancelado && pros && pros.length > 0) {
          const mapa = new Map(pros.map((p) => [p.id, p]));
          enriquecidos = top.map((d) => {
            const p = mapa.get(d.dentista_id);
            const nome = nomeExibicaoDentista({ nome: d.dentista_nome, tratamento: p?.tratamento ?? null });
            return {
              ...d,
              dentista_nome: nome,
              cro: p?.cro ?? null,
              cro_verificado: p?.cro_verificado ?? null,
              especialidade: p?.especialidade ?? null,
            };
          });
        }
      }

      if (!cancelado) {
        setDentistas(enriquecidos);
        setLoading(false);
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [especialidade, cidadeUsuario]);

  // Opt-in de geolocalização: pede a posição do navegador, descobre a cidade e
  // refaz a RPC filtrando por ela (o useEffect reage à mudança de cidadeUsuario).
  const verPertoDeMim = () => {
    setErroLocal(null);
    if (!navigator.geolocation) {
      setErroLocal("Geolocalização indisponível neste dispositivo.");
      return;
    }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { cidade } = await reverseGeocodeCidadeBairro(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          if (cidade) {
            setCidadeUsuario(cidade);
            try {
              sessionStorage.setItem("curadentes_user_city", cidade);
            } catch {
              /* sessionStorage indisponível */
            }
          } else {
            setErroLocal("Não foi possível identificar sua cidade.");
          }
        } finally {
          setLocalizando(false);
        }
      },
      () => {
        setLocalizando(false);
        setErroLocal("Permissão de localização negada.");
      },
      { timeout: GEOLOC_TIMEOUT_MS },
    );
  };

  return (
    <div className="rounded-2xl p-6 text-left" style={{ background: "linear-gradient(135deg, #0A2A66 0%, #1a4b99 100%)" }}>
      <MapPin size={22} className="mx-auto mb-2" style={{ color: "rgba(255,255,255,0.5)" }} />
      <h3 className="text-[16px] font-bold text-center mb-3" style={{ color: "#fff" }}>
        Encontre perto de você
      </h3>

      {/* CTA gated (igual k11 → handleSearchNearby): exige login e vai para /busca. */}
      <CtaEspecialidade nome={especialidade} nomeExibicao={nomeExibicao} variant="sidebar" />

      {/* Opt-in de geolocalização: refina a lista Top desta sidebar pela sua cidade. */}
      <button
        type="button"
        onClick={verPertoDeMim}
        disabled={localizando}
        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-semibold text-[13px] min-h-[40px] transition-all mb-4 disabled:opacity-70"
        style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "0.5px solid rgba(255,255,255,0.25)" }}
      >
        {localizando ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
        {cidadeUsuario ? `Perto de ${cidadeUsuario}` : "Ver perto de mim"}
      </button>

      {erroLocal && (
        <p className="text-[11px] text-center mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>
          {erroLocal}
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="animate-spin" style={{ color: "rgba(255,255,255,0.85)" }} />
        </div>
      )}

      {!loading && dentistas.length === 0 && (
        <p className="text-[12px] text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
          Nenhum profissional encontrado{cidadeUsuario ? ` em ${cidadeUsuario}` : ""}.
        </p>
      )}

      {!loading && dentistas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
            Top {dentistas.length} em {nomeExibicao.toLowerCase()}
          </p>
          {dentistas.map((d) => (
            <Link
              key={d.dentista_id}
              href={`/dentista/${d.dentista_id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all min-h-[52px]"
              style={{ background: "rgba(255,255,255,0.10)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.dentista_foto || AVATAR_PADRAO}
                alt={d.dentista_nome}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                loading="lazy"
                onError={aoFalharAvatar}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: "#fff" }}>
                  {d.dentista_nome}
                </div>
                {d.especialidade && (
                  <div className="text-[11px] font-semibold truncate" style={{ color: "#FF8FB3" }}>
                    {nomeAmigavel(d.especialidade)}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {d.cro && (
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {d.cro}
                    </span>
                  )}
                  {d.cro_verificado !== null && (
                    <CroVerificationBadge verificado={d.cro_verificado} size="sm" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                  <Star size={11} fill="#FFCC00" stroke="#FFCC00" />
                  {d.dentista_avaliacao}
                  {(d.endereco_cidade || d.endereco_estado) && (
                    <>
                      <span className="mx-1">·</span>
                      {[d.endereco_cidade, d.endereco_estado].filter(Boolean).join(", ")}
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
