// ═══════════════════════════════════════════════════════════════════════════════
// DISTÂNCIA — Haversine (km) entre duas coordenadas. Função PURA e testada.
//
// É a mesma fórmula (raio 6371 km) usada server-side na RPC get_dentistas_proximos.
// No cliente usamos para a distância da busca TEXTUAL (que não vem da RPC). Manter
// isolada + testada garante 0% de dúvida sobre o cálculo de distância.
// ═══════════════════════════════════════════════════════════════════════════════

/** Distância em km entre dois pontos (lat/lng em GRAUS), via Haversine. */
export function calcularDistanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // raio médio da Terra em km
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Formata a distância para exibição em pt-BR: abaixo de 1 km mostra em METROS
 * ("850 m"); de 1 km pra cima usa 1 casa decimal com VÍRGULA ("2,4 km").
 * Retorna "" para valores inválidos/negativos (não exibir badge nesse caso).
 */
export function formatarDistancia(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}
