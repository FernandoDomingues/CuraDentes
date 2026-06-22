"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// BUSCA (parte interativa) — campo de busca + resultados.
//
// Componente Cliente: digita-se um termo (ou chega-se com ?q= da home/especialidade)
// e ele consulta o Supabase (lib/busca.ts) e lista os dentistas encontrados.
// A casca/SEO fica no Server Component (page.tsx).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import CardDentista from "@/components/CardDentista";
import { buscarDentistasPorTexto, type ResultadoBusca } from "@/lib/busca";
import { logarBusca } from "@/lib/log-busca";
import { reverseGeocodeCidadeBairro } from "@/lib/geocoding";

interface Local {
  lat: number;
  lng: number;
  cidade: string | null;
  bairro: string | null;
}

type Estado = "inicial" | "carregando" | "ok" | "vazio" | "erro";

export default function BuscaCliente({ queryInicial }: { queryInicial: string }) {
  const [termo, setTermo] = useState(queryInicial);
  const [estado, setEstado] = useState<Estado>(queryInicial ? "carregando" : "inicial");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [local, setLocal] = useState<Local | null>(null);
  const [localStatus, setLocalStatus] = useState<"idle" | "carregando" | "erro">("idle");

  const rodarBusca = useCallback(
    async (q: string) => {
      const limpo = q.trim();
      if (!limpo) {
        setEstado("inicial");
        setResultados([]);
        return;
      }
      setEstado("carregando");
      try {
        const r = await buscarDentistasPorTexto(limpo);
        setResultados(r);
        setEstado(r.length ? "ok" : "vazio");
        // Registra a busca (analytics). Se a pessoa compartilhou a localização,
        // enriquece com cidade/bairro/lat-long → alimenta o mapa de demanda.
        void logarBusca({
          termo: limpo,
          resultados: r.length,
          cidade: local?.cidade,
          bairro: local?.bairro,
          latitude: local?.lat,
          longitude: local?.lng,
        });
      } catch (err) {
        console.error("[busca] erro:", err);
        setEstado("erro");
      }
    },
    [local],
  );

  // Geolocalização OPT-IN (só no clique — LGPD). Não muda os resultados; serve para
  // mapear onde há demanda (e assim levar mais dentistas para a região do paciente).
  function usarLocalizacao() {
    if (!navigator.geolocation) {
      setLocalStatus("erro");
      return;
    }
    setLocalStatus("carregando");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { cidade, bairro } = await reverseGeocodeCidadeBairro(latitude, longitude);
        setLocal({ lat: latitude, lng: longitude, cidade, bairro });
        setLocalStatus("idle");
      },
      () => setLocalStatus("erro"),
      { timeout: 8000 },
    );
  }

  // Busca automática quando a página abre (ou muda) com ?q= preenchido.
  // O fetch fica dentro de uma função async: os setState acontecem só APÓS o
  // await, então não há setState síncrono no corpo do efeito. O estado inicial
  // já é "carregando" quando há queryInicial, evitando um flash de tela vazia.
  useEffect(() => {
    const q = queryInicial.trim();
    if (!q) return;
    let ativo = true;
    (async () => {
      try {
        const r = await buscarDentistasPorTexto(q);
        if (!ativo) return;
        setResultados(r);
        setEstado(r.length ? "ok" : "vazio");
        void logarBusca({ termo: q, resultados: r.length }); // registra a busca (analytics)
      } catch (err) {
        console.error("[busca] erro:", err);
        if (ativo) setEstado("erro");
      }
    })();
    return () => {
      ativo = false;
    };
  }, [queryInicial]);

  return (
    <div className="flex flex-col gap-6">
      {/* Campo de busca */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          rodarBusca(termo);
        }}
        className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_2px_6px_rgba(16,24,64,0.05)]"
      >
        <input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Especialidade, procedimento, cidade ou nome do dentista"
          aria-label="O que você procura?"
          className="min-h-[44px] flex-1 rounded-xl px-4 text-[15px] text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          type="submit"
          className="min-h-[44px] rounded-xl bg-brand-blue px-6 font-semibold text-white transition-colors hover:bg-brand-blue-600"
        >
          Buscar
        </button>
      </form>

      {/* Localização opt-in (ajuda a mapear a demanda da sua região) */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {!local ? (
          <>
            <button
              type="button"
              onClick={usarLocalizacao}
              disabled={localStatus === "carregando"}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/30 px-3 py-1.5 font-medium text-brand-blue transition-colors hover:bg-brand-blue/5 disabled:opacity-60"
            >
              📍 {localStatus === "carregando" ? "Localizando…" : "Buscar perto de mim"}
            </button>
            <span className="text-ink-muted">
              {localStatus === "erro"
                ? "Não foi possível obter sua localização."
                : "Opcional — ajuda a levar mais dentistas para a sua região."}
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-3 py-1.5 font-medium text-brand-blue">
            📍 Região: {local.cidade || "detectada"}
            <button type="button" onClick={() => setLocal(null)} className="text-ink-muted hover:text-ink" aria-label="Remover localização">
              remover
            </button>
          </span>
        )}
      </div>

      {/* Resultados / estados */}
      {estado === "carregando" && <p className="py-8 text-center text-ink-muted">Buscando…</p>}

      {estado === "erro" && (
        <p className="py-8 text-center text-danger">Algo deu errado na busca. Tente novamente.</p>
      )}

      {estado === "inicial" && (
        <p className="py-8 text-center text-ink-muted">
          Digite uma especialidade, cidade ou nome de dentista para começar.
        </p>
      )}

      {estado === "vazio" && (
        <p className="py-8 text-center text-ink-muted">
          Nenhum dentista encontrado para “{termo}”. Tente outro termo ou cidade.
        </p>
      )}

      {estado === "ok" && (
        <>
          <p className="text-sm text-ink-muted">
            {resultados.length} {resultados.length === 1 ? "dentista encontrado" : "dentistas encontrados"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {resultados.map((r) => (
              <CardDentista
                key={r.dentista_id}
                id={r.dentista_id}
                nome={r.nome}
                foto={r.foto}
                croVerificado={r.cro_verificado}
                cidade={r.cidade}
                bairro={r.bairro}
                clinica={r.nome_clinica}
                atividades={r.atividades}
                avaliacao={r.avaliacao}
                totalAvaliacoes={r.total_avaliacoes}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
