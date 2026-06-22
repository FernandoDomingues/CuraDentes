// ═══════════════════════════════════════════════════════════════════════════════
// ÁREA ADMINISTRATIVA — /pro/dashboard-analytics (Análise do negócio).
//
// Superuser-only (guard no layout). A página é a Análise do site (gráficos +
// mapa de calor), com atalhos para o painel DBA e a Conferência de CRO. Toda a
// parte interativa (fetch + recharts + Leaflet) vive no Client Component.
// ═══════════════════════════════════════════════════════════════════════════════

import AnalisePainel from "./AnalisePainel";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return <AnalisePainel />;
}
