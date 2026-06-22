// ═══════════════════════════════════════════════════════════════════════════════
// CroVerificationBadge — indica se o CRO do dentista foi verificado (selo CFO).
// Verde "Verificado*" / laranja "Não verificado*". Presentacional (portado do k11).
// ═══════════════════════════════════════════════════════════════════════════════

import { ShieldCheck, ShieldAlert } from "lucide-react";

export default function CroVerificationBadge({
  verificado,
  size = "sm",
}: {
  verificado: boolean;
  size?: "sm" | "md";
}) {
  const px = size === "sm" ? 12 : 16;
  const fs = size === "sm" ? 11 : 13;

  if (verificado) {
    return (
      <span
        className="inline-flex items-center gap-1 font-medium text-success"
        style={{ fontSize: fs }}
        title="CRO verificada pelo time CuraDentes"
      >
        <ShieldCheck size={px} /> Verificado*
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 font-medium text-warning"
      style={{ fontSize: fs }}
      title="Esta CRO está em processo de verificação do time CuraDentes"
    >
      <ShieldAlert size={px} /> Não verificado*
    </span>
  );
}
