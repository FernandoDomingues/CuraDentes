// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISE DE URGÊNCIAS — /pro/dashboard-analytics/urgencias (casca).
//
// Superuser-only (mesma proteção das demais telas de analytics). Toda a parte
// interativa (fetch + recharts + Leaflet) vive no Client Component.
// ═══════════════════════════════════════════════════════════════════════════════

import UrgenciasPainel from "./UrgenciasPainel";

export const dynamic = "force-dynamic";

export default function UrgenciasPage() {
  return <UrgenciasPainel />;
}
