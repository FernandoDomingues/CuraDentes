"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// GaleriaSala — galeria do detalhe (estilo portal imobiliário). Foto grande +
// mosaico de miniaturas; clique abre o lightbox (prev/next/Esc). Sem fotos ainda,
// mostra um placeholder de marca. As fotos serão enviadas pelo anfitrião (passo 2).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { DoorOpen, X, ChevronLeft, ChevronRight, Images } from "lucide-react";

export default function GaleriaSala({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [aberto, setAberto] = useState(false);
  const [idx, setIdx] = useState(0);

  const temFotos = fotos.length > 0;

  useEffect(() => {
    if (!aberto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % fotos.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + fotos.length) % fotos.length);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aberto, fotos.length]);

  function abrir(i: number) {
    setIdx(i);
    setAberto(true);
  }

  // ── Sem fotos: placeholder de marca ──
  if (!temFotos) {
    return (
      <div
        className="flex h-[300px] w-full flex-col items-center justify-center gap-3 rounded-[20px] md:h-[420px]"
        style={{ background: "linear-gradient(135deg, #e3f2fd 0%, #f5f9ff 100%)", border: "1px solid rgba(0,122,255,0.10)" }}
      >
        <DoorOpen size={44} style={{ color: "rgba(0,122,255,0.30)" }} />
        <p className="text-[14px] font-medium" style={{ color: "rgba(10,42,102,0.45)" }}>
          Fotos em breve
        </p>
      </div>
    );
  }

  const principal = fotos[0];
  const mosaico = fotos.slice(1, 5);

  return (
    <>
      {/* Mosaico */}
      <div className="grid h-[300px] grid-cols-1 gap-2 overflow-hidden rounded-[20px] md:h-[420px] md:grid-cols-4 md:grid-rows-2">
        <button
          onClick={() => abrir(0)}
          className="relative md:col-span-2 md:row-span-2"
          aria-label="Abrir galeria"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={principal} alt={titulo} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        </button>
        {mosaico.map((f, i) => (
          <button
            key={f + i}
            onClick={() => abrir(i + 1)}
            className="relative hidden md:block"
            aria-label={`Foto ${i + 2}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f} alt={`${titulo} — foto ${i + 2}`} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
            {/* Overlay "+N" na última miniatura quando há mais fotos */}
            {i === mosaico.length - 1 && fotos.length > 5 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-[18px] font-bold text-white">
                +{fotos.length - 5}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Botão "ver todas" */}
      <button
        onClick={() => abrir(0)}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-[13px] font-semibold text-brand-navy transition-colors hover:bg-black/[0.04]"
      >
        <Images size={15} /> Ver todas as {fotos.length} fotos
      </button>

      {/* Lightbox */}
      {aberto && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(8,15,35,0.92)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAberto(false);
          }}
        >
          <button
            onClick={() => setAberto(false)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
          <button
            onClick={() => setIdx((i) => (i - 1 + fotos.length) % fotos.length)}
            className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:left-6"
            aria-label="Anterior"
          >
            <ChevronLeft size={26} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotos[idx]}
            alt={`${titulo} — foto ${idx + 1}`}
            referrerPolicy="no-referrer"
            className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain"
          />
          <button
            onClick={() => setIdx((i) => (i + 1) % fotos.length)}
            className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:right-6"
            aria-label="Próxima"
          >
            <ChevronRight size={26} />
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium text-white">
            {idx + 1} / {fotos.length}
          </span>
        </div>
      )}
    </>
  );
}
