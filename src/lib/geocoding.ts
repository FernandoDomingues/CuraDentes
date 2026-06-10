// ═══════════════════════════════════════════════════════════════════════════════
// GEOCODING — Nominatim (OpenStreetMap)
//
// Responsabilidades:
//   1. Buscar coordenadas (lat/lng) a partir de endereço textual via Nominatim
//   2. Buscar endereço a partir de coordenadas (reverse geocoding)
//   3. Servir como fallback quando não há consultórios próximos no banco
//
// API pública gratuita do OpenStreetMap (Nominatim):
//   https://nominatim.openstreetmap.org/
// ═══════════════════════════════════════════════════════════════════════════════

/** Busca coordenadas (latitude, longitude) a partir de um endereço */
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

import { supabase } from "./supabase";

/**
 * Obtém o bairro e cidade aproximados a partir de coordenadas lat/lng.
 * 
 * ESTRATÉGIA:
 * 1. Busca no banco de dados de consultórios cadastrados (`curadentespro_enderecos`) 
 *    o endereço que tem a menor distância física da localização do usuário.
 * 2. Se a distância for menor que 50km, assume o bairro/cidade cadastrado no banco.
 *    Vantagens: latência baixíssima, garante correspondência perfeita com termos do banco, livre de limites de requisição.
 * 3. Se não houver consultório próximo, usa reverse geocoding via Nominatim como fallback.
 */
export async function getEnderecoFromCoordenadas(
  lat: number,
  lng: number
): Promise<string | null> {
  // 1. Tenta buscar o bairro mais próximo no banco de dados
  try {
    const { data, error } = await supabase
      .from("curadentespro_enderecos")
      .select("bairro, cidade, latitude, longitude")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .not("bairro", "is", null)
      .not("cidade", "is", null);

    if (!error && data && data.length > 0) {
      let maisProximo: typeof data[0] | null = null;
      let menorDistancia = Infinity;

      // Haversine
      const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      for (const item of data) {
        if (item.latitude === null || item.longitude === null) continue;
        const dist = calcularDistancia(lat, lng, item.latitude, item.longitude);
        if (dist < menorDistancia) {
          menorDistancia = dist;
          maisProximo = item;
        }
      }

      // Se o consultório mais próximo estiver em um raio de 50km, usamos as informações dele
      if (maisProximo && menorDistancia <= 50) {
        console.log(`[Geocoding] Bairro mais próximo no banco (${menorDistancia.toFixed(2)}km): ${maisProximo.bairro}, ${maisProximo.cidade}`);
        return `${maisProximo.bairro}, ${maisProximo.cidade}`;
      }
    }
  } catch (err) {
    console.error("[Geocoding] Erro ao buscar bairro mais próximo no banco:", err);
  }

  // 2. Fallback Nominatim (OpenStreetMap)
  try {
    console.log("[Geocoding] Sem consultório próximo no banco. Usando fallback Nominatim...");
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

