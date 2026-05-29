import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const q = 'Parque Campolim';
  const orQuery = [
    `bairro.ilike.%${q}%`,
    `cidade.ilike.%${q}%`,
    `estado.ilike.%${q}%`,
    `logradouro.ilike.%${q}%`,
    `nome_clinica.ilike.%${q}%`
  ].join(',');

  console.log("OR Query:", orQuery);

  const { data, error } = await supabase
    .from("curadentespro_enderecos")
    .select(`id, bairro`)
    .or(orQuery);
    
  console.log("Error:", JSON.stringify(error, null, 2));
  console.log("Data length:", data?.length);
}

test();
