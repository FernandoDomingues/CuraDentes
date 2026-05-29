import { createClient } from '@supabase/supabase-js';

// Coloque os dados locais para testar (mesmos do env local)
// Usando as vars do projeto:
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const query = 'campolim';
  const { data: textData, error: textError } = await supabase
    .from("curadentespro_enderecos")
    .select(`
      id, nome_clinica, logradouro, numero, bairro, cidade, estado, atividades, convenios, formas_pagamento, latitude, longitude,
      curadentespro:curadentespro_id ( id, nome, foto_url, bio )
    `)
    .or(`bairro.ilike.%${query}%,cidade.ilike.%${query}%,estado.ilike.%${query}%,logradouro.ilike.%${query}%,nome_clinica.ilike.%${query}%`);
    
  console.log("Error:", textError);
  console.log("Data:", textData);
}

test();
