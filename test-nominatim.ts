import { createClient } from '@supabase/supabase-js';

async function getCoordenadas(
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
    
    const resposta = await fetch(url, {
      headers: {
        "User-Agent": "CuraDentes/1.0",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!resposta.ok) return null;

    const dados = await resposta.json();
    if (dados && dados.length > 0) {
      return {
        latitude: parseFloat(dados[0].lat),
        longitude: parseFloat(dados[0].lon),
      };
    }
    return null;
  } catch (erro) {
    return null;
  }
}

async function test() {
  const coord = await getCoordenadas("Campolim");
  console.log("Coordenadas para Campolim:", coord);
  
  const coord2 = await getCoordenadas("Parque Campolim");
  console.log("Coordenadas para Parque Campolim:", coord2);
}

test();
