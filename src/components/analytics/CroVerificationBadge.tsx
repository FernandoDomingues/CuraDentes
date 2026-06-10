// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: CroVerificationBadge
//
// Indica se o CRO do dentista foi verificado no sistema CFO.
// - "Não verificado": estado pendente (laranja)
// - "Verificado": badge padrão (verde) ou medalha decorativa no canto do CRO
// ═══════════════════════════════════════════════════════════════════════════════

import { ShieldCheck, ShieldAlert, Award } from "lucide-react";

interface CroVerificationBadgeProps {
  verificado: boolean;
  size?: "sm" | "md";
  /** Exibe como medalha decorativa (cantos do CRO) */
  medal?: boolean;
}

export default function CroVerificationBadge({
  verificado,
  size = "sm",
  medal = false,
}: CroVerificationBadgeProps) {
  if (verificado && medal) {
    return (
      <div className="absolute -top-2 -right-1">
        <div
          className="relative flex items-center justify-center"
          style={{ width: size === "sm" ? 28 : 36, height: size === "sm" ? 28 : 36 }}
        >
          {/* Círculo externo */}
          <svg
            viewBox="0 0 36 36"
            className="absolute inset-0"
            style={{ width: "100%", height: "100%" }}
          >
            <defs>
              <linearGradient id="medal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="#FFA500" />
                <stop offset="100%" stopColor="#FF8C00" />
              </linearGradient>
              <linearGradient id="medal-grad-inner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFEC8B" />
                <stop offset="100%" stopColor="#FFD700" />
              </linearGradient>
            </defs>
            {/* Círculo externo dourado */}
            <circle cx="18" cy="18" r="17" fill="url(#medal-grad)" />
            {/* Círculo interno */}
            <circle cx="18" cy="18" r="13" fill="url(#medal-grad-inner)" />
            {/* Fita */}
            <path
              d="M18 0 L14 6 L18 4 L22 6 Z"
              fill="#FFD700"
              stroke="#DAA520"
              strokeWidth="0.5"
            />
          </svg>
          <Award
            size={size === "sm" ? 14 : 18}
            style={{ color: "#8B4513", position: "relative", zIndex: 1 }}
          />
        </div>
      </div>
    );
  }

  if (verificado) {
    return (
      <span
        className="inline-flex items-center gap-1 font-medium"
        style={{
          fontSize: size === "sm" ? 11 : 13,
          color: "#34C759",
        }}
        title="CRO verificada pelo time CURADENTES"
      >
        <ShieldCheck size={size === "sm" ? 12 : 16} />
        Verificado*
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 font-medium"
      style={{
        fontSize: size === "sm" ? 11 : 13,
        color: "#FF9500",
      }}
      title="Esta CRO está em processo de verificação do time CURADENTES"
    >
      <ShieldAlert size={size === "sm" ? 12 : 16} />
      Não verificado*
    </span>
  );
}
