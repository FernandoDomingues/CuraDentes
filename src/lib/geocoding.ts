// ═══════════════════════════════════════════════════════════════════════════════
// GEOCODING — coordenadas (lat/lng) a partir de um endereço (Nominatim/OSM).
//
// Usado ao SALVAR um endereço do dentista, para que ele apareça no mapa e na busca
// por proximidade. Tem fallback progressivo (rua→bairro→cidade) porque cidades
// pequenas nem sempre têm a rua no OSM. API pública e gratuita do OpenStreetMap.
// Portado do site-k11 (parte de escrita; o reverse-geocode da busca fica para depois).
// ═══════════════════════════════════════════════════════════════════════════════

/** Timeout (ms) das chamadas HTTP de geocodificação/CEP (Nominatim/AwesomeAPI). */
export const GEOCODE_TIMEOUT_MS = 5000;

/** Timeout (ms) do navigator.geolocation.getCurrentPosition (pedido de localização). */
export const GEOLOC_TIMEOUT_MS = 8000;

/** Busca coordenadas de um endereço textual. Retorna null se não achar/timeout. */
export async function getCoordenadas(
  enderecoTexto: string,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!enderecoTexto) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoTexto)}&countrycodes=br&limit=1`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
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
    const t = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
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
 * Coordenadas a partir do CEP (AwesomeAPI). No Brasil isso é MUITO mais confiável
 * que geocodificar a rua no OSM (que muitas vezes não tem a rua e cai num centroide
 * de cidade — origem de distâncias erradas na busca). Precisão ~nível de quadra.
 * Retorna null se o CEP for inválido ou não tiver coordenada.
 */
export async function getCoordenadasPorCep(
  cep: string | null | undefined,
): Promise<{ latitude: number; longitude: number } | null> {
  const c = (cep || "").replace(/\D/g, "");
  if (c.length !== 8) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
    const resp = await fetch(`https://cep.awesomeapi.com.br/json/${c}`, { signal: controller.signal });
    clearTimeout(t);
    if (!resp.ok) return null;
    const d = (await resp.json()) as { lat?: string; lng?: string };
    if (d.lat && d.lng) {
      const latitude = parseFloat(d.lat);
      const longitude = parseFloat(d.lng);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { latitude, longitude };
    }
    return null;
  } catch (err) {
    console.warn("[geocoding] CEP falhou:", err);
    return null;
  }
}

/**
 * Geocodifica um endereço estruturado.
 * 1º tenta pelo CEP (AwesomeAPI — confiável no Brasil; evita o centroide de cidade
 *    do OSM que gerava distâncias erradas). 2º cai no Nominatim com fallback
 *    progressivo (rua→bairro→cidade) para CEPs sem coordenada.
 */
export async function geocodeEnderecoComFallback(end: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}): Promise<{ latitude: number; longitude: number } | null> {
  // 1) CEP primeiro — preciso e sem o risco do fallback de centroide do OSM.
  const porCep = await getCoordenadasPorCep(end.cep);
  if (porCep) return porCep;

  // 2) Nominatim (OSM), do mais específico ao mais geral.
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
