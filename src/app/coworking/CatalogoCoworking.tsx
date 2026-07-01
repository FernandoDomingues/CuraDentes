"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// CatalogoCoworking — busca + grade de clínicas (client). Recebe TODAS as clínicas do
// catálogo (o servidor já filtrou por CRO) e faz autocomplete + filtro AO VIVO por
// Cidade / Bairro / nome da clínica (sem round-trip). Catálogo é pequeno → filtro local.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Building2, MapPin, ArrowLeft, X } from "lucide-react";
import Container from "@/components/Container";
import type { ClinicaPublica } from "@/lib/salas";
import ClinicaCard from "./ClinicaCard";

type Sugestao = { value: string; tipo: "clinica" | "local" };

export default function CatalogoCoworking({ clinicas }: { clinicas: ClinicaPublica[] }) {
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState(false);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const termo = q.trim().toLowerCase();

  // Clínicas que batem com o termo (cidade OU bairro OU nome).
  const filtradas = useMemo(() => {
    if (!termo) return clinicas;
    return clinicas.filter((c) =>
      [c.nome_clinica, c.cidade, c.bairro].some((v) => (v ?? "").toLowerCase().includes(termo)),
    );
  }, [clinicas, termo]);

  // Sugestões distintas (nome de clínica, cidade, bairro) que contêm o termo.
  const sugestoes = useMemo<Sugestao[]>(() => {
    if (!termo) return [];
    const mapa = new Map<string, Sugestao>();
    for (const c of clinicas) {
      const add = (v: string | null | undefined, tipo: Sugestao["tipo"]) => {
        const s = (v ?? "").trim();
        if (s && s.toLowerCase().includes(termo) && !mapa.has(s.toLowerCase())) {
          mapa.set(s.toLowerCase(), { value: s, tipo });
        }
      };
      add(c.nome_clinica, "clinica");
      add(c.cidade, "local");
      add(c.bairro, "local");
    }
    return Array.from(mapa.values())
      .sort((a, b) => a.value.localeCompare(b.value, "pt-BR"))
      .slice(0, 8);
  }, [clinicas, termo]);

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    function fora(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  function escolher(v: string) {
    setQ(v);
    setAberto(false);
    setHi(-1);
  }
  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!aberto || sugestoes.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => (i + 1) % sugestoes.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => (i <= 0 ? sugestoes.length - 1 : i - 1)); }
    else if (e.key === "Enter" && hi >= 0) { e.preventDefault(); escolher(sugestoes[hi].value); }
    else if (e.key === "Escape") { setAberto(false); setHi(-1); }
  }

  return (
    <>
      {/* Hero com busca */}
      <section style={{ background: "linear-gradient(135deg, #0A2A66 0%, #1a4b99 100%)", boxShadow: "0 12px 40px rgba(10,42,102,0.18)" }}>
        <Container className="py-12 md:py-16">
          <Link href="/pro/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/80 transition-colors hover:text-white">
            <ArrowLeft size={15} /> Voltar ao painel
          </Link>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-[30px] font-bold leading-tight text-white md:text-[36px]">Alugue uma sala odontológica</h1>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/75 md:text-[16px]">
              Encontre clínicas perto de você e escolha a sala para o seu atendimento. Exclusivo para dentistas verificados.
            </p>

            <div ref={boxRef} className="relative mx-auto mt-7 max-w-xl text-left">
              <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
                <Search size={18} className="flex-shrink-0 text-ink-muted" />
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setAberto(true); setHi(-1); }}
                  onFocus={() => setAberto(true)}
                  onKeyDown={aoTeclar}
                  placeholder="Busque por Cidade, Bairro ou nome da clínica"
                  className="w-full border-0 bg-transparent py-2.5 pr-2 text-[15px] text-ink outline-none placeholder:text-ink-muted"
                  aria-label="Buscar por cidade, bairro ou nome da clínica"
                  autoComplete="off"
                />
                {q && (
                  <button type="button" onClick={() => escolher("")} aria-label="Limpar" className="mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/5">
                    <X size={16} />
                  </button>
                )}
              </div>

              {aberto && sugestoes.length > 0 && (
                <ul className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white py-1.5 shadow-[0_12px_40px_rgba(10,42,102,0.18)]">
                  {sugestoes.map((s, i) => (
                    <li key={s.tipo + s.value}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); escolher(s.value); }}
                        onMouseEnter={() => setHi(i)}
                        className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] transition-colors ${i === hi ? "bg-brand-blue/8" : "hover:bg-black/[0.03]"}`}
                      >
                        {s.tipo === "clinica"
                          ? <Building2 size={15} className="flex-shrink-0 text-brand-blue" />
                          : <MapPin size={15} className="flex-shrink-0 text-ink-muted" />}
                        <span className="truncate text-ink">{s.value}</span>
                        <span className="ml-auto flex-shrink-0 text-[11px] text-ink-muted">{s.tipo === "clinica" ? "clínica" : "local"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Resultados */}
      <Container className="py-10 md:py-12">
        <div className="mb-6 flex items-baseline justify-between gap-3">
          <h2 className="text-[18px] font-bold text-brand-navy">
            {termo ? `Resultados para “${q.trim()}”` : "Clínicas com salas"}
          </h2>
          {filtradas.length > 0 && (
            <span className="text-[13px] font-medium text-ink-muted">
              {filtradas.length} {filtradas.length === 1 ? "clínica" : "clínicas"}
            </span>
          )}
        </div>

        {filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[20px] py-16 text-center" style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}>
            <Building2 size={36} style={{ color: "rgba(0,122,255,0.30)" }} />
            <p className="text-[16px] font-semibold text-brand-navy">Nenhuma clínica encontrada</p>
            <p className="text-[14px] text-ink-muted">
              {termo ? `Sem clínicas para “${q.trim()}” por enquanto.` : "Ainda não há clínicas com salas anunciadas."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtradas.map((c) => (
              <ClinicaCard key={c.clinica_key} clinica={c} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
