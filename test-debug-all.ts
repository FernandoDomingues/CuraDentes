import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAll() {
  console.log("=== 1. Testando contagem de dentistas ===");
  const { count, error: countError } = await supabase
    .from("curadentespro")
    .select("*", { count: "exact", head: true });
  console.log("Count:", count, "Error:", countError);

  console.log("\n=== 2. Testando busca textual ===");
  const q = "Campolim";
  const orQuery = [
    `bairro.ilike.%${q}%`,
    `cidade.ilike.%${q}%`,
    `estado.ilike.%${q}%`,
    `logradouro.ilike.%${q}%`,
    `nome_clinica.ilike.%${q}%`
  ].join(',');

  const { data: textData, error: textError } = await supabase
    .from("curadentespro_enderecos")
    .select(`
      id, nome_clinica, logradouro, numero, bairro, cidade, estado, atividades, convenios, formas_pagamento, latitude, longitude,
      curadentespro:curadentespro_id ( id, nome, foto_url, bio )
    `)
    .or(orQuery);
  console.log("Busca textual error:", textError);
  console.log("Busca textual results:", textData?.length, "registros");
  if (textData && textData.length > 0) {
    console.log("Primeiro resultado:", JSON.stringify(textData[0], null, 2));
  }

  console.log("\n=== 3. Testando RPC get_dentistas_proximos ===");
  // Coordenadas de Sorocaba
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_dentistas_proximos", {
    lat: -23.5015,
    lng: -47.4526,
    raio_km: 20
  });
  console.log("RPC error:", rpcError);
  console.log("RPC results:", rpcData?.length, "registros");

  console.log("\n=== 4. Testando últimos dentistas ===");
  const { data: pros, error: prosError } = await supabase
    .from("curadentespro")
    .select("id, nome, foto_url, bio, cro, criado_em")
    .order("criado_em", { ascending: false })
    .limit(5);
  console.log("Últimos dentistas error:", prosError);
  console.log("Últimos dentistas:", pros?.length, "registros");
  if (pros && pros.length > 0) {
    console.log("Primeiro:", pros[0].nome);
  }
}

testAll();
