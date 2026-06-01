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
  const coord = await getCoordenadas("Sorocbaa");
  console.log("Coordenadas para Sorocbaa (typo of Sorocaba):", coord);
  
  const coord2 = await getCoordenadas("Campolin");
  console.log("Coordenadas para Campolin (typo of Campolim):", coord2);
  
  const coord3 = await getCoordenadas("Parque Campolin");
  console.log("Coordenadas para Parque Campolin:", coord3);

  // Let's do a request to Nominatim search with format=json & limit=5
  const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=Campolin&countrycodes=br&limit=5", {
    headers: { "User-Agent": "CuraDentes/1.0" }
  });
  if (res.ok) {
    const data = await res.json();
    console.log("Nominatim results for 'Campolin':", data.map((d: any) => ({ display_name: d.display_name, lat: d.lat, lon: d.lon })));
  }
}

test();
