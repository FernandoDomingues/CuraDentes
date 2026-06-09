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

/**
 * Obtém o bairro e cidade aproximados a partir de coordenadas lat/lng
 * usando a API do OpenStreetMap (Nominatim) para reverse geocoding.
 */
export async function getEnderecoFromCoordenadas(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const controller = new AbortController();
    const fetchTimeoutId = setTimeout(() => controller.abort(), 5000);

    const resposta = await fetch(url, {
      signal: controller.signal,
      headers: { 
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'CuraDentes-App/1.0'
      }
    });

    clearTimeout(fetchTimeoutId);

    if (!resposta.ok) {
      console.error("Erro no reverse geocoding:", resposta.statusText);
      return null;
    }

    const dados = await resposta.json();
    if (dados && dados.address) {
      const addr = dados.address;
      const bairro = addr.suburb || addr.neighbourhood || addr.quarter || addr.hamlet;
      const cidade = addr.city || addr.town || addr.municipality || addr.village;

      if (bairro && cidade) {
        return `${bairro}, ${cidade}`;
      } else if (cidade) {
        return cidade;
      } else if (bairro) {
        return bairro;
      }
    }
    return null;
  } catch (erro) {
    console.error("Falha no reverse geocoding:", erro);
    return null;
  }
}

