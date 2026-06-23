"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// CtaEspecialidade — botão "Encontrar/Encontre [especialidade] perto de você".
//
// Porte fiel do `handleSearchNearby` do site-k11 (Especialidade.tsx):
//   • EXIGE login. Deslogado → `pedirLoginPaciente()` captura a geolocalização e
//     abre o login Google (retorna false → a ação para).
//   • Logado → resolve a cidade do paciente (cache em sessionStorage
//     `curadentes_user_city` ou reverse-geocode das coords do login) e navega para
//     /busca já com o contexto completo: ?q={cidade ou nome}&atividade={nome}
//     (+ lat/lng quando disponíveis), igual ao k11 que entrava direto nos
//     resultados (e o refresh continua funcionando porque tudo vai na URL).
//
// `variant`:
//   • "hero"    → botão branco grande do hero (ícone Search).
//   • "sidebar" → botão branco compacto do bloco azul da sidebar (ícone Navigation).
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Navigation } from "lucide-react";
import { useSessao } from "@/components/SessaoProvider";
import { reverseGeocodeCidadeBairro } from "@/lib/geocoding";

type Variant = "hero" | "sidebar";

export default function CtaEspecialidade({
  nome,
  nomeExibicao,
  variant = "hero",
}: {
  /** Nome canônico (vai em ?atividade= e no match da busca). */
  nome: string;
  /** Nome amigável exibido no rótulo do botão. */
  nomeExibicao: string;
  variant?: Variant;
}) {
  const router = useRouter();
  const { pedirLoginPaciente } = useSessao();
  const [ocupado, setOcupado] = useState(false);

  // Resolve a cidade + coords do paciente: usa o cache (sessionStorage) gravado no
  // login/na busca; se houver só coords (curadentes_login_coords), faz o
  // reverse-geocode sob demanda para preencher a cidade. Best-effort.
  async function resolverCidadeCoords(): Promise<{
    cidade: string;
    lat?: string;
    lng?: string;
  }> {
    let cidade = "";
    let lat: string | undefined;
    let lng: string | undefined;

    try {
      cidade = sessionStorage.getItem("curadentes_user_city") || "";
    } catch {
      /* sessionStorage indisponível */
    }

    try {
      const raw = sessionStorage.getItem("curadentes_login_coords");
      if (raw) {
        const c = JSON.parse(raw) as { latitude?: number; longitude?: number };
        if (typeof c.latitude === "number" && typeof c.longitude === "number") {
          lat = c.latitude.toFixed(4);
          lng = c.longitude.toFixed(4);
          if (!cidade) {
            const { cidade: rev } = await reverseGeocodeCidadeBairro(c.latitude, c.longitude);
            if (rev) {
              cidade = rev;
              try {
                sessionStorage.setItem("curadentes_user_city", rev);
              } catch {
                /* sessionStorage indisponível */
              }
            }
          }
        }
      }
    } catch {
      /* coords ausentes/inválidas */
    }

    return { cidade, lat, lng };
  }

  const handleClick = async () => {
    // Muro de login (igual k11): deslogado abre o Google e para a ação.
    if (!pedirLoginPaciente()) return;
    if (ocupado) return;
    setOcupado(true);
    try {
      const { cidade, lat, lng } = await resolverCidadeCoords();
      // q = cidade do paciente (a especialidade vai em "atividade"); cai no nome
      // canônico quando ainda não conhecemos a cidade.
      const params = new URLSearchParams();
      params.set("q", cidade || nome);
      params.set("atividade", nome);
      if (lat) params.set("lat", lat);
      if (lng) params.set("lng", lng);
      router.push(`/busca?${params.toString()}`);
    } finally {
      setOcupado(false);
    }
  };

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={ocupado}
        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-semibold text-[13px] min-h-[40px] transition-all mb-4 disabled:opacity-70"
        style={{ background: "#fff", color: "#0A2A66" }}
      >
        <Navigation size={15} />
        Encontre Dentistas perto de você
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={ocupado}
      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-[15px] min-h-[48px] transition-all border-0 cursor-pointer disabled:opacity-70"
      style={{ background: "#fff", color: "#0A2A66" }}
    >
      <Search size={18} />
      Encontrar {nomeExibicao.toLowerCase()}
    </button>
  );
}
