// ═══════════════════════════════════════════════════════════════════════════════
// GEOCODING — coordenadas (lat/lng) a partir de um endereço (Nominatim/OSM).
//
// Usado ao SALVAR um endereço do dentista, para que ele apareça no mapa e na busca
// por proximidade. Tem fallback progressivo (rua→bairro→cidade) porque cidades
// pequenas nem sempre têm a rua no OSM. API pública e gratuita do OpenStreetMap.
// Portado do site-k11 (parte de escrita; o reverse-geocode da busca fica para depois).
// ═══════════════════════════════════════════════════════════════════════════════

/** Busca coordenadas de um endereço textual. Retorna null se não achar/timeout. */
export async function getCoordenadas(
  enderecoTexto: string,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!enderecoTexto) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoTexto)}&countrycodes=br&limit=1`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept-Language": "pt-BR,pt;q=0.9" },
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    const dados = (await resp.json()) as { lat: string; lon: string }[];
    if (dados && dados.length > 0) {
      return { latitude: parseFloat(dados[0].lat), longitude: parseFloat(dados[0].lon) };
    }
    return null;
  } catch (err) {
    console.warn("[geocoding] falha:", err);
    return null;
  }
}

/**
 * Reverse geocoding leve: de coordenadas → { cidade, bairro } (Nominatim).
 * Usado para enriquecer o log de busca (mapa de demanda) quando o paciente
 * compartilha a localização. Best-effort: devolve nulos em falha/timeout.
 */
export async function reverseGeocodeCidadeBairro(
  lat: number,
  lng: number,
): Promise<{ cidade: string | null; bairro: string | null }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { signal: controller.signal, headers: { "Accept-Language": "pt-BR,pt;q=0.9" } });
    clearTimeout(t);
    if (!resp.ok) return { cidade: null, bairro: null };
    const d = (await resp.json()) as { address?: Record<string, string> };
    const a = d.address ?? {};
    return {
      cidade: a.city || a.town || a.municipality || a.village || null,
      bairro: a.suburb || a.neighbourhood || a.quarter || a.hamlet || null,
    };
  } catch {
    return { cidade: null, bairro: null };
  }
}

/**
 * Geocodifica um endereço estruturado com fallback progressivo.
 * Tenta do mais específico ao mais geral até conseguir coordenadas.
 */
export async function geocodeEnderecoComFallback(end: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}): Promise<{ latitude: number; longitude: number } | null> {
  const tentativas: (string | null | undefined)[][] = [
    [end.logradouro, end.numero, end.bairro, end.cidade, end.estado],
    [end.logradouro, end.bairro, end.cidade, end.estado],
    [end.bairro, end.cidade, end.estado],
    [end.cidade, end.estado],
  ];
  for (const partes of tentativas) {
    const q = partes.filter(Boolean).join(", ");
    if (!q) continue;
    const coord = await getCoordenadas(q);
    if (coord) return coord;
  }
  return null;
}
