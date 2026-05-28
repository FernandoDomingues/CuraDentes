/**
 * Função para buscar as coordenadas geográficas (latitude, longitude)
 * a partir de um endereço em texto usando a API gratuita do OpenStreetMap (Nominatim).
 */
export async function getCoordenadas(enderecoTexto: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!enderecoTexto) return null;

  try {
    // A API Nominatim requer um header User-Agent válido
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoTexto)}&limit=1`;
    
    const resposta = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'CuraDentes/1.0 (contato@curadentes.com.br)'
      }
    });

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
