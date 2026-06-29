// ═══════════════════════════════════════════════════════════════════════════════
// Layout da área /pro/salas — GATE DE CRO. Além do guard de papel (ProLayout),
// a Locação de Salas só é visível para dentista com CRO aprovado (regra de produto).
// Superuser passa (croVerificado=true em getUsuario). Cobre /pro/salas e subrotas
// (/nova, /[id]/editar, /solicitacoes). /pro/minhas-solicitacoes gateia na própria página.
// ═══════════════════════════════════════════════════════════════════════════════

import { getUsuario } from "@/lib/auth";
import MuroCro from "./MuroCro";

export default async function SalasLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuario();
  if (!usuario?.croVerificado) return <MuroCro />;
  return <>{children}</>;
}
