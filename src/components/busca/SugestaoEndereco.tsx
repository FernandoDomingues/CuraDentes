"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// AUTOCOMPLETE DE ENDEREÇO — item de sugestão (cidade / bairro / clínica).
//
// Componente COMPARTILHADO pela barra de busca da home (Hero) e pela página de
// busca (/busca), para o dropdown de autocomplete ficar idêntico nos dois lugares.
// Os dados vêm do hook useAddressSuggestions (lib/sugestoes), que sugere com base
// nos endereços e clínicas já CADASTRADOS no site (porte fiel do k11).
// ═══════════════════════════════════════════════════════════════════════════════

import { MapPin, Building2 } from "lucide-react";
import type { AddressSuggestion } from "@/lib/sugestoes";

/** Destaca em azul/negrito o trecho do texto que casa com o que foi digitado. */
export function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: "#007AFF", fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

const TYPE_LABELS: Record<string, string> = {
  cidade: "Cidade",
  bairro: "Bairro",
  clinica: "Clínica",
};

/** Uma linha do dropdown: ícone por tipo + texto destacado + selo do tipo. */
export function SuggestionItem({
  suggestion,
  highlighted,
  query,
  onSelect,
}: {
  suggestion: AddressSuggestion;
  highlighted: boolean;
  query: string;
  onSelect: (s: AddressSuggestion) => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onSelect(suggestion); }}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{
        background: highlighted ? "rgba(0,122,255,0.07)" : "transparent",
        borderBottom: "0.5px solid rgba(60,60,67,0.06)",
        cursor: "pointer",
      }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "10px",
          background: suggestion.type === "cidade"
            ? "rgba(0,122,255,0.10)"
            : suggestion.type === "bairro"
            ? "rgba(52,199,89,0.10)"
            : "rgba(255,149,0,0.10)",
        }}
      >
        {suggestion.type === "clinica" ? (
          <Building2 size={15} style={{ color: "#FF9500" }} />
        ) : (
          <MapPin size={15} style={{ color: suggestion.type === "cidade" ? "#007AFF" : "#34C759" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium truncate" style={{ color: "#1C1C1E" }}>
          <HighlightMatch text={suggestion.label} query={query} />
        </p>
      </div>
      <span
        className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{
          background: suggestion.type === "cidade"
            ? "rgba(0,122,255,0.08)"
            : suggestion.type === "bairro"
            ? "rgba(52,199,89,0.08)"
            : "rgba(255,149,0,0.08)",
          color: suggestion.type === "cidade" ? "#007AFF" : suggestion.type === "bairro" ? "#34C759" : "#FF9500",
        }}
      >
        {TYPE_LABELS[suggestion.type]}
      </span>
    </button>
  );
}
