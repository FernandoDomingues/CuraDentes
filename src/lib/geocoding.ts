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
    // A API Nominatim requer um header User-Agent válido
    // Restringimos a busca ao Brasil (countrycodes=br)
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoTexto)}&countrycodes=br&limit=1`;
    
    // Se tivermos as coordenadas do usuário, criamos um "viewbox" de ~50km ao redor dele para priorizar cidades mais próximas com o mesmo nome
    if (userLat && userLng) {
      const offset = 0.5; // ~50km
      const left = userLng - offset;
      const right = userLng + offset;
      const top = userLat + offset;
      const bottom = userLat - offset;
      url += `&viewbox=${left},${top},${right},${bottom}`;
      // Não usamos bounded=1 porque queremos apenas priorizar, e não proibir que ache em outro estado se o usuário digitar "Rio de Janeiro" estando em SP.
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const resposta = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9'
      }
    });

    clearTimeout(timeoutId);

    if (!resposta.ok) {
      console.error("Erro na API de geocoding:", resposta.statusText);
      return null;
    }

    const dados = await resposta.json();

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
