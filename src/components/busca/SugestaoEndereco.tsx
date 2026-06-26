"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// AUTOCOMPLETE DA BUSCA — item de sugestão (dentista / cidade / bairro / clínica).
//
// Componente COMPARTILHADO pela barra de busca da home (Hero) e pela página de
// busca (/busca), para o dropdown de autocomplete ficar idêntico nos dois lugares.
// Os dados vêm do hook useAddressSuggestions (lib/sugestoes), que sugere com base
// nos dentistas, endereços e clínicas já CADASTRADOS no site.
// ═══════════════════════════════════════════════════════════════════════════════

import { MapPin, Building2, User, type LucideIcon } from "lucide-react";
import type { AddressSuggestion, SuggestionType } from "@/lib/sugestoes";

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

// Config por tipo: rótulo do selo, cor da marca e ícone. As cores de fundo são a
// própria cor com transparência (sufixo hex de alpha: 1A ≈ 10%, 14 ≈ 8%).
const TYPE_CONFIG: Record<SuggestionType, { label: string; color: string; Icon: LucideIcon }> = {
  dentista: { label: "Dentista", color: "#5856D6", Icon: User },
  cidade: { label: "Cidade", color: "#007AFF", Icon: MapPin },
  bairro: { label: "Bairro", color: "#34C759", Icon: MapPin },
  clinica: { label: "Clínica", color: "#FF9500", Icon: Building2 },
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
  const { label, color, Icon } = TYPE_CONFIG[suggestion.type] ?? TYPE_CONFIG.cidade;

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
          background: `${color}1A`,
        }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium truncate" style={{ color: "#1C1C1E" }}>
          <HighlightMatch text={suggestion.label} query={query} />
        </p>
      </div>
      <span
        className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: `${color}14`, color }}
      >
        {label}
      </span>
    </button>
  );
}
