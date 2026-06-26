"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// HERO — seção principal da home (porte fiel do site antigo / k11).
//
// Mantém o visual idêntico ao antigo: fundo com glows, badge "Busca por
// proximidade", headline com destaque azul, barra de busca em vidro (glass),
// botão "Usar minha localização", botão URGÊNCIA (magenta), chips de
// especialidade e contador de dentistas. Layouts separados para mobile e desktop.
//
// Diferença proposital vs. k11: a busca é ABERTA (sem muro de login com Google),
// porque o R0 existe para ser indexável (SEO). Buscar leva a /busca?q=…
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";
import { ESPECIALIDADES, nomeAmigavel } from "@/lib/especialidades";
import { reverseGeocodeCidadeBairro } from "@/lib/geocoding";
import { useSessao } from "@/components/SessaoProvider";
import { useAddressSuggestions, type AddressSuggestion } from "@/lib/sugestoes";
import { SuggestionItem } from "@/components/busca/SugestaoEndereco";

// Número de dentistas + asterisco azul + tooltip ao passar o mouse (no número e no
// asterisco) avisando que o dado é atualizado a cada 5 min. `title` é o fallback
// (toque/leitores de tela); o balão estilizado aparece no hover do mouse.
function NumeroDentistas({ valor, classe }: { valor: number; classe: string }) {
  return (
    <span
      className="group relative inline-flex cursor-help items-start justify-center"
      title="Esta informação é atualizada a cada 5 minutos."
    >
      <span className={classe} style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>{valor}</span>
      <span className="ml-0.5 text-[60%] font-bold leading-none" style={{ color: "#007AFF" }} aria-hidden="true">*</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 w-max max-w-[230px] -translate-x-1/2 rounded-lg px-3 py-2 text-center text-[12px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: "rgba(10,42,102,0.96)" }}
      >
        Esta informação é atualizada a cada 5 minutos.
      </span>
    </span>
  );
}

// `contagemInicial` vem do SERVIDOR (page.tsx, com revalidação de 5 min) — assim a
// contagem é buscada no banco no MÁXIMO 1× a cada 5 min e compartilhada por todos
// os visitantes (não há query por visita; imune a saturação por tráfego/ataque).
export default function Hero({ contagemInicial = 0 }: { contagemInicial?: number }) {
  const [searchValue, setSearchValue] = useState("");
  const totalDentists = contagemInicial;
  const [locationLoading, setLocationLoading] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const router = useRouter();
  const { user, pedirLoginPaciente } = useSessao();

  // ── Autocomplete de endereço (cidade/bairro/clínica já cadastrados) ──────────
  // Mesma ferramenta do k11: sugere enquanto digita, com base nos endereços e
  // clínicas do banco. Só funciona logado — deslogado, o "muro" cobre o campo.
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const buscaMobileRef = useRef<HTMLDivElement>(null);
  const buscaDesktopRef = useRef<HTMLDivElement>(null);
  const { suggestions } = useAddressSuggestions(showSuggestions ? searchValue : "");

  // Fecha o dropdown ao clicar fora (checa os dois layouts: mobile e desktop).
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      const alvo = e.target as Node;
      const dentro =
        !!buscaMobileRef.current?.contains(alvo) || !!buscaDesktopRef.current?.contains(alvo);
      if (!dentro) {
        setShowSuggestions(false);
        setHighlightedIdx(-1);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  // Reseta o item destacado quando a lista de sugestões muda (sync com prop externa).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIdx(-1);
  }, [suggestions]);

  // Navega para /busca (EXIGE login com Google, igual k11) com o termo + chip ativo.
  // Reutilizado pelo submit e pelo Enter sobre uma sugestão destacada.
  const irParaBusca = useCallback(
    (valor: string) => {
      if (!pedirLoginPaciente()) return; // abre o modal de login se não estiver logado
      const v = valor.trim();
      if (!v && !activeChip) return;
      const params = new URLSearchParams();
      if (v) params.set("q", v);
      if (activeChip) params.set("atividade", activeChip);
      router.push(`/busca?${params.toString()}`);
    },
    [pedirLoginPaciente, activeChip, router],
  );

  // Buscar (submit): usa a sugestão destacada, se houver; senão o texto digitado.
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const valor =
      highlightedIdx >= 0 && suggestions[highlightedIdx]
        ? suggestions[highlightedIdx].value
        : searchValue;
    setHighlightedIdx(-1);
    irParaBusca(valor);
  };

  // Selecionar uma sugestão apenas PREENCHE o campo (não navega) — igual k11.
  const handleSuggestionSelect = useCallback((s: AddressSuggestion) => {
    setSearchValue(s.value);
    setShowSuggestions(false);
    setHighlightedIdx(-1);
  }, []);

  // Teclado no campo: ↑/↓ percorrem a lista, Enter na destacada busca, Esc fecha.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      e.preventDefault();
      const val = suggestions[highlightedIdx].value;
      setSearchValue(val);
      setShowSuggestions(false);
      setHighlightedIdx(-1);
      irParaBusca(val);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIdx(-1);
    }
  };

  // Usar minha localização — também EXIGE login (igual k11). Captura coordenadas,
  // descobre bairro/cidade e busca por essa região (passa lat/lng também).
  const handleUseMyLocation = () => {
    if (!pedirLoginPaciente()) return;
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { cidade, bairro } = await reverseGeocodeCidadeBairro(latitude, longitude);
        const q = bairro || cidade || searchValue.trim();
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (activeChip) params.set("atividade", activeChip);
        params.set("lat", latitude.toFixed(4));
        params.set("lng", longitude.toFixed(4));
        router.push(`/busca?${params.toString()}`);
      },
      () => setLocationLoading(false),
      { timeout: 8000 },
    );
  };

  // URGÊNCIA — NÃO exige login (atrito mínimo, igual k11). Tenta pegar coords antes.
  const handleUrgencia = () => {
    if (!navigator.geolocation) {
      router.push("/urgencia");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => router.push(`/urgencia?lat=${pos.coords.latitude.toFixed(5)}&lng=${pos.coords.longitude.toFixed(5)}`),
      () => router.push("/urgencia"),
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  // Chip de especialidade — TOGGLE de filtro (não navega), igual k11.
  const handleChipClick = (label: string) =>
    setActiveChip((cur) => (cur === label ? null : label));

  return (
    <>
      {/* ── MOBILE (< lg) ─────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Barra de busca */}
        <div ref={buscaMobileRef} className="px-4 pt-4 pb-3 relative" style={{ background: "#F2F2F7" }}>
          {/* Deslogado: clicar na barra pede login (Google), igual k11 */}
          {!user && (
            <div onClick={() => pedirLoginPaciente()} role="button" aria-label="Entrar com Google para buscar" className="absolute inset-0 z-20 cursor-pointer" />
          )}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-3 px-4"
            style={{
              background: "#fff",
              borderRadius: showSuggestions && suggestions.length > 0 ? "14px 14px 0 0" : "14px",
              minHeight: "48px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              transition: "border-radius 0.15s",
            }}
          >
            <Search size={18} style={{ color: "#8E8E93", flexShrink: 0 }} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Bairro, Cidade"
              aria-label="O que você procura?"
              className="flex-1 outline-none bg-transparent text-[16px]"
              style={{ color: "#1C1C1E", minHeight: "48px", border: "none" }}
              autoComplete="off"
            />
          </form>

          {/* Dropdown de sugestões — mobile */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% - 12px)",
                left: "16px",
                right: "16px",
                background: "#fff",
                borderRadius: "0 0 14px 14px",
                boxShadow: "0 8px 24px rgba(10,42,102,0.12)",
                border: "0.5px solid rgba(60,60,67,0.10)",
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
                  query={searchValue}
                  onSelect={handleSuggestionSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Botões + chips */}
        <div style={{ background: "#F2F2F7", paddingBottom: "12px" }}>
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locationLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold min-h-[44px] transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
              style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF", border: "0.5px solid rgba(0,122,255,0.18)" }}
            >
              <MapPin size={16} />
              {locationLoading ? "Buscando..." : "Usar minha Localização"}
            </button>
          </div>

          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={handleUrgencia}
              aria-label="Buscar dentistas de urgência perto de você"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-[15px] font-extrabold min-h-[48px] transition-all duration-200 active:scale-[0.98]"
              style={{ background: "#E6004C", boxShadow: "0 6px 16px rgba(230,0,76,0.32)", letterSpacing: "0.02em" }}
            >
              <img src="/icons/emergencia.svg" width={20} height={20} alt="" aria-hidden="true" />
              URGÊNCIA!
            </button>
          </div>

          <p className="px-4 pb-2 text-[12px] font-semibold uppercase tracking-widest" style={{ color: "#8E8E93" }}>
            O que você precisa?
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ paddingLeft: "16px", paddingRight: "16px", scrollbarWidth: "none" }}>
            {ESPECIALIDADES.map((label) => {
              const ativo = activeChip === label;
              return (
                <button
                  key={label}
                  onClick={() => handleChipClick(label)}
                  aria-pressed={ativo}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap min-h-[40px] flex-shrink-0 transition-all duration-150"
                  style={ativo ? { background: "#007AFF", color: "#fff", border: "1px solid transparent" } : { background: "#fff", color: "#1C1C1E", border: "1px solid rgba(60,60,67,0.18)" }}
                >
                  {nomeAmigavel(label)}
                </button>
              );
            })}
          </div>

          {totalDentists > 0 && (
            <div className="flex justify-center pt-1 pb-2">
              <div className="text-center">
                <NumeroDentistas valor={totalDentists} classe="text-[15px] font-bold" />
                <span className="text-[12px] ml-1" style={{ color: "#8E8E93" }}>
                  dentistas cadastrados
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP (≥ lg) ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden hidden lg:block" style={{ padding: "clamp(20px, 3.5vw, 56px) 0" }}>
        {/* Glows de fundo */}
        <div style={{ position: "absolute", top: "-200px", right: "-100px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,122,255,0.18) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", bottom: "-150px", left: "-80px", width: "450px", height: "450px", borderRadius: "50%", background: "radial-gradient(circle, rgba(230,0,76,0.09) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

        <div className="container mx-auto px-5 md:px-8 lg:px-16 relative z-10">
          <div className="max-w-[900px] mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: "rgba(0,122,255,0.08)", border: "0.5px solid rgba(0,122,255,0.2)" }}>
              <MapPin size={13} style={{ color: "var(--primary-blue)" }} />
              <span className="text-[12px]" style={{ color: "var(--primary-blue)", fontWeight: 600 }}>
                Busca por proximidade
              </span>
            </div>

            {/* Headline */}
            <h1 className="mb-3" style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: "clamp(28px, 5vw, 50px)", lineHeight: 1.1, letterSpacing: "-0.02em", color: "#0A2A66" }}>
              Encontre seu dentista <span style={{ color: "#007AFF" }}>perto de você</span>
            </h1>

            <p className="mb-5 mx-auto" style={{ fontSize: "clamp(14px, 1.8vw, 17px)", lineHeight: 1.5, color: "#3A3A3C", maxWidth: "580px" }}>
              Busque por especialidade, veja avaliações reais, compare preços e agende sua consulta em minutos — sem complicação.
            </p>

            {/* Barra de busca + botão URGÊNCIA */}
            <div className="max-w-[860px] mx-auto mb-4 flex items-stretch gap-2.5">
              <div ref={buscaDesktopRef} className="flex-1 relative">
                {/* Deslogado: clicar na barra pede login (Google), igual k11 */}
                {!user && (
                  <div onClick={() => pedirLoginPaciente()} role="button" aria-label="Entrar com Google para buscar" className="absolute inset-0 z-20 cursor-pointer rounded-[16px]" />
                )}
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center gap-2"
                  style={{
                    background: "rgba(255,255,255,0.72)",
                    backdropFilter: "blur(20px) saturate(120%)",
                    WebkitBackdropFilter: "blur(20px) saturate(120%)",
                    border: "0.5px solid rgba(255,255,255,0.5)",
                    borderRadius: showSuggestions && suggestions.length > 0 ? "16px 16px 0 0" : "16px",
                    padding: "6px 6px 6px 16px",
                    minHeight: "56px",
                    boxShadow: "0 8px 20px rgba(16,24,64,0.08)",
                    transition: "border-radius 0.15s",
                  }}
                >
                  <Search size={20} style={{ color: "#8E8E93", flexShrink: 0 }} />
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => { setSearchValue(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Bairro, Cidade"
                    aria-label="O que você procura?"
                    className="flex-1 min-w-0 outline-none bg-transparent"
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", color: "#1C1C1E", minHeight: "44px", border: "none" }}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locationLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold min-h-[40px] flex-shrink-0 transition-all duration-200 hover:bg-blue-50 disabled:opacity-60"
                    style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF", border: "0.5px solid rgba(0,122,255,0.18)" }}
                  >
                    <MapPin size={14} />
                    {locationLoading ? "Buscando..." : "Usar minha Localização"}
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-3 rounded-[12px] text-white font-semibold text-[15px] min-h-[44px] flex-shrink-0 transition-all duration-200"
                    style={{ background: "#007AFF", boxShadow: "0 8px 20px rgba(0,122,255,0.25)" }}
                  >
                    Buscar
                  </button>
                </form>

                {/* Dropdown de sugestões — desktop */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "rgba(255,255,255,0.96)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      borderRadius: "0 0 16px 16px",
                      boxShadow: "0 16px 40px rgba(10,42,102,0.14)",
                      border: "0.5px solid rgba(255,255,255,0.5)",
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
                        query={searchValue}
                        onSelect={handleSuggestionSelect}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleUrgencia}
                aria-label="Buscar dentistas de urgência perto de você"
                className="flex flex-col items-center justify-center gap-1.5 px-4 rounded-[16px] text-white font-extrabold flex-shrink-0 transition-all duration-200 hover:brightness-110"
                style={{ background: "#E6004C", minHeight: "56px", boxShadow: "0 8px 20px rgba(230,0,76,0.35)", letterSpacing: "0.02em" }}
              >
                <img src="/icons/emergencia.svg" width={22} height={22} alt="" aria-hidden="true" />
                <span className="text-[12px] leading-none">URGÊNCIA!</span>
              </button>
            </div>

            {/* Chips de especialidade */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {ESPECIALIDADES.map((label) => {
                const ativo = activeChip === label;
                return (
                  <button
                    key={label}
                    onClick={() => handleChipClick(label)}
                    aria-pressed={ativo}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium min-h-[36px] transition-all duration-200"
                    style={ativo ? { background: "#007AFF", color: "#fff", border: "0.5px solid transparent", boxShadow: "0 0 12px rgba(0,122,255,0.4)" } : { background: "rgba(255,255,255,0.60)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "0.5px solid rgba(255,255,255,0.45)", color: "#3A3A3C", boxShadow: "0 2px 6px rgba(16,24,64,0.05)" }}
                  >
                    {nomeAmigavel(label)}
                  </button>
                );
              })}

            </div>

            {/* Contador */}
            <div className="flex flex-wrap items-center justify-center gap-5 mt-5">
              <div className="text-center">
                <NumeroDentistas valor={totalDentists} classe="text-[20px] font-bold" />
                <div className="text-[12px]" style={{ color: "#8E8E93" }}>
                  dentistas cadastrados
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
