// ═══════════════════════════════════════════════════════════════════════════════
// CroVerificationBadge — indica o status do CRO do dentista (selo CFO).
//   • Verde  "Verificado*"            (ShieldCheck)  → CRO confirmado
//   • Vermelho "CRO Rejeitado/Inativo*" (XCircle)    → reprovado/inativo (perfil oculto)
//   • Laranja "Não verificado*"        (ShieldAlert) → ainda em verificação
// Presentacional (portado do k11 + estado "inativo" da rejeição de CRO).
// ═══════════════════════════════════════════════════════════════════════════════

import { ShieldCheck, ShieldAlert, XCircle } from "lucide-react";

export default function CroVerificationBadge({
  verificado,
  inativo = false,
  size = "sm",
}: {
  verificado: boolean;
  /** CRO rejeitada/inativa — tem prioridade sobre "não verificado". */
  inativo?: boolean;
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

  if (inativo) {
    return (
      <span
        className="inline-flex items-center gap-1 font-medium text-danger"
        style={{ fontSize: fs }}
        title="CRO rejeitada/inativa — perfil oculto até a regularização junto ao Conselho"
      >
        <XCircle size={px} /> CRO Rejeitado/Inativo*
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
