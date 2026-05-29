import { createClient } from '@supabase/supabase-js';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const q = 'Campolim';
  const orQuery = [
    `bairro.ilike.%${q}%`,
    `cidade.ilike.%${q}%`,
    `estado.ilike.%${q}%`,
    `logradouro.ilike.%${q}%`,
    `nome_clinica.ilike.%${q}%`
  ].join(',');

  const { data, error } = await supabase
    .from("curadentespro_enderecos")
    .select(`id, bairro, latitude, longitude`)
    .or(orQuery);
    
  if (data) {
    const finalLat = -23.5325766;
    const finalLng = -47.4687387;
    for (const d of data) {
      if (d.latitude && d.longitude) {
        const dist = calculateDistance(finalLat, finalLng, d.latitude, d.longitude);
        console.log(`Dentista ${d.id} dist: ${dist} km`);
      } else {
        console.log(`Dentista ${d.id} sem coords`);
      }
    }
  }
}

test();
