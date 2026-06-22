// ═══════════════════════════════════════════════════════════════════════════════
// ESTRELAS — exibe uma nota (0 a 5) como estrelas, com preenchimento fracionário.
//
// Técnica: desenha 5 estrelas cinzas e, por cima, uma cópia dourada "cortada" na
// largura proporcional à nota (ex.: nota 4.3 -> 86% de largura dourada). Assim a
// meia-estrela aparece naturalmente, sem cálculo de ícones por estrela.
//
// É só visual (Server Component). A nota e o total vêm já calculados (avaliacoes.ts).
// ═══════════════════════════════════════════════════════════════════════════════

function LinhaEstrelas({ cor }: { cor: string }) {
  return (
    <div className="flex" style={{ color: cor }} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

export default function Estrelas({
  nota,
  total,
  tamanho = "md",
}: {
  /** Nota de 0 a 5. */
  nota: number;
  /** Total de avaliações (mostra "(N)" ao lado, se informado). */
  total?: number;
  tamanho?: "sm" | "md";
}) {
  const limpa = Math.max(0, Math.min(5, Number.isFinite(nota) ? nota : 0));
  const larguraDourada = `${(limpa / 5) * 100}%`;
  const texto = tamanho === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="img"
      aria-label={`Nota ${limpa.toFixed(1)} de 5${total ? `, ${total} avaliações` : ""}`}
    >
      {/* Pilha: cinza embaixo, dourado cortado em cima */}
      <span className="relative inline-block">
        <LinhaEstrelas cor="#E2E5EA" />
        <span className="absolute inset-0 overflow-hidden" style={{ width: larguraDourada }}>
          <LinhaEstrelas cor="#FF9500" />
        </span>
      </span>

      <span className={`font-semibold text-ink ${texto}`}>{limpa.toFixed(1)}</span>
      {typeof total === "number" && total > 0 && (
        <span className={`text-ink-muted ${texto}`}>({total})</span>
      )}
    </span>
  );
}
