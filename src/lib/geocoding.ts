/**
 * Função para buscar as coordenadas geográficas (latitude, longitude)
 * a partir de um endereço em texto usando a API gratuita do OpenStreetMap (Nominatim).
 */
export async function getCoordenadas(
  enderecoTexto: string,
  userLat?: number | null,
  userLng?: number | null
): Promise<{ latitude: number; longitude: number } | null> {
  if (!enderecoTexto) return null;

  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoTexto)}&countrycodes=br&limit=1`;
    
    if (userLat && userLng) {
      const offset = 0.5;
      const left = userLng - offset;
      const right = userLng + offset;
      const top = userLat + offset;
      const bottom = userLat - offset;
      url += `&viewbox=${left},${top},${right},${bottom}`;
    }
    
    const controller = new AbortController();
    const fetchTimeoutId = setTimeout(() => controller.abort(), 5000);

    const resposta = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
    });

    clearTimeout(fetchTimeoutId);

    if (!resposta.ok) {
      console.error("Erro na API de geocoding:", resposta.statusText);
      return null;
    }

    const text = await Promise.race<string>([
      resposta.text(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout ao ler corpo da resposta")), 5000)
      )
    ]);
    
    const dados = JSON.parse(text);

    if (dados && dados.length > 0) {
      return {
        latitude: parseFloat(dados[0].lat),
        longitude: parseFloat(dados[0].lon)
      };
    }

    return null;
  } catch (erro) {
    console.error("Falha ao geocodificar o endereço:", erro);
    return null;
  }
}
