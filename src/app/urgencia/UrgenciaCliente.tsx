"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// URGÊNCIA (parte interativa) — pega a localização (só no clique, LGPD) e lista os
// dentistas que ATENDEM URGÊNCIA mais próximos, com WhatsApp/Ligar em 1 toque.
//
// É um Componente Cliente ("use client") porque depende de geolocalização do
// navegador. A casca/SEO da página fica no Server Component (page.tsx).
// RPC: get_dentistas_urgencia_proximos(lat, lng) — devolve os 10 mais próximos.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/public";
import { nomeExibicao } from "@/lib/dentistas";
import { urlWhatsapp, telLimpo } from "@/lib/contato";
import { logarBusca } from "@/lib/log-busca";

const AVATAR_PADRAO =
  "https://dsnzgxjuqlalysyfiion.supabase.co/storage/v1/object/public/fotos-dentistas/default-avatar.webp";

interface DentistaUrgencia {
  dentista_id: string;
  dentista_nome: string;
  dentista_tratamento: string | null;
  dentista_foto: string | null;
  nome_clinica: string | null;
  bairro: string | null;
  cidade: string | null;
  whatsapp: string | null;
  telefone: string | null;
  distancia_km: number;
}

type Estado = "inicial" | "carregando" | "ok" | "vazio" | "erro";

/** Formata distância em km de forma amigável (ex.: "900 m", "2,3 km"). */
function formatarDistancia(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export default function UrgenciaCliente() {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [lista, setLista] = useState<DentistaUrgencia[]>([]);
  const [erro, setErro] = useState("");

  async function buscar(lat: number, lng: number) {
    setEstado("carregando");
    const { data, error } = await supabase.rpc("get_dentistas_urgencia_proximos", { lat, lng });
    if (error) {
      setErro("Não foi possível buscar agora. Tente novamente.");
      setEstado("erro");
      return;
    }
    const r = (data as DentistaUrgencia[]) ?? [];
    setLista(r);
    setEstado(r.length ? "ok" : "vazio");
    // Registra a busca de urgência (com coordenadas → alimenta o mapa de demanda).
    void logarBusca({ termo: "urgência", resultados: r.length, latitude: lat, longitude: lng });
  }

  function usarLocalizacao() {
    if (!navigator.geolocation) {
      setErro("Seu navegador não suporta localização. Tente por outro dispositivo.");
      setEstado("erro");
      return;
    }
    setEstado("carregando");
    navigator.geolocation.getCurrentPosition(
      (pos) => buscar(pos.coords.latitude, pos.coords.longitude),
      () => {
        setErro("Precisamos da sua localização para achar o dentista mais perto. Permita o acesso e tente de novo.");
        setEstado("erro");
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Botão de localização (some quando há resultados) */}
      {(estado === "inicial" || estado === "erro") && (
        <div className="rounded-2xl border border-brand-magenta/15 bg-brand-magenta/5 p-6 text-center">
          <p className="mb-4 text-ink-soft">
            Para mostrar os dentistas de urgência mais próximos, precisamos da sua localização.
          </p>
          <button
            onClick={usarLocalizacao}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-[14px] bg-brand-magenta px-7 font-semibold text-white transition-colors hover:bg-brand-magenta-700"
          >
            Usar minha localização
          </button>
          {estado === "erro" && <p className="mt-4 text-sm text-danger">{erro}</p>}
        </div>
      )}

      {estado === "carregando" && (
        <p className="py-10 text-center text-ink-muted">Buscando dentistas perto de você…</p>
      )}

      {estado === "vazio" && (
        <div className="rounded-2xl border border-black/8 bg-white p-6 text-center text-ink-soft">
          Não encontramos dentistas de urgência cadastrados perto de você ainda.{" "}
          <Link href="/busca" className="font-semibold text-brand-blue hover:underline">
            Buscar todos os dentistas
          </Link>
        </div>
      )}

      {estado === "ok" && (
        <div className="flex flex-col gap-4">
          {lista.map((d) => {
            const nome = nomeExibicao({ nome: d.dentista_nome, tratamento: d.dentista_tratamento });
            const wpp = urlWhatsapp(d.whatsapp);
            const tel = telLimpo(d.telefone);
            const local = [d.bairro, d.cidade].filter(Boolean).join(", ");
            const dist = formatarDistancia(d.distancia_km);
            return (
              <article key={d.dentista_id} className="rounded-2xl border border-black/8 bg-white p-4">
                <div className="flex gap-4">
                  <Image
                    src={d.dentista_foto || AVATAR_PADRAO}
                    alt={`Foto de ${nome}`}
                    width={72}
                    height={72}
                    className="flex-shrink-0 rounded-xl border border-black/10 object-cover"
                    style={{ height: 72, width: 72 }}
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/dentista/${d.dentista_id}`} className="font-semibold text-brand-navy hover:text-brand-blue">
                      {nome}
                    </Link>
                    {local && <p className="mt-0.5 text-sm text-ink-muted">{local}</p>}
                    {dist && <p className="mt-0.5 text-xs font-medium text-brand-blue">{dist} de você</p>}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {wpp && (
                    <a href={wpp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#25D366] px-4 font-semibold text-white transition-opacity hover:opacity-90">
                      WhatsApp
                    </a>
                  )}
                  {tel && (
                    <a href={tel} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[14px] border border-brand-magenta/30 px-4 font-semibold text-brand-magenta transition-colors hover:bg-brand-magenta/5">
                      Ligar
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
