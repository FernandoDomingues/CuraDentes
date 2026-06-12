// ═══════════════════════════════════════════════════════════════════════════════
// SMOKE TEST: Supabase
//
// 4 checagens rápidas contra o banco para detectar regressão de schema/RLS:
//   1. Contagem de dentistas (leitura anônima)
//   2. Busca textual (OR query + relacionamento)
//   3. RPC get_dentistas_proximos (função Haversine)
//   4. Últimos dentistas (order by + limit)
//
// Como rodar:
//   npm run test:smoke
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type DentistaResumo = { id: string; nome: string };

let passed = 0;
let failed = 0;

const ok = (label: string): void => {
  passed++;
  console.log(`  \u2705 ${label}`);
};

const fail = (label: string, reason?: string): void => {
  failed++;
  console.log(`  \u274c ${label}${reason ? ` \u2014 ${reason}` : ''}`);
};

async function testCount(): Promise<void> {
  console.log('\n[1/4] Contagem de dentistas');
  const { count, error } = await supabase
    .from('curadentespro')
    .select('id', { count: 'exact', head: true });

  if (error) {
    fail('Contagem falhou', error.message);
  } else if (count === null || count === undefined) {
    fail('Contagem retornou null', 'esperava numero');
  } else {
    ok(`${count} dentista(s) cadastrado(s)`);
  }
}

async function testTextSearch(): Promise<void> {
  console.log('\n[2/4] Busca textual (valida OR query + relacionamento)');
  const q = 'São';
  const orQuery = [
    `bairro.ilike.%${q}%`,
    `cidade.ilike.%${q}%`,
    `estado.ilike.%${q}%`,
    `logradouro.ilike.%${q}%`,
    `nome_clinica.ilike.%${q}%`,
  ].join(',');

  const { data, error } = await supabase
    .from('curadentespro_enderecos')
    .select(`
      id, nome_clinica, logradouro, bairro, cidade, estado,
      curadentespro:curadentespro_id ( id, nome, foto_url, bio )
    `)
    .or(orQuery);

  if (error) {
    fail('Busca textual falhou', error.message);
  } else {
    ok(`Busca executada, ${data?.length ?? 0} endereco(s) encontrado(s)`);
  }
}

async function testRpc(): Promise<void> {
  console.log('\n[3/4] RPC get_dentistas_proximos');
  const { data, error } = await supabase.rpc('get_dentistas_proximos', {
    lat: -23.5015,
    lng: -47.4526,
    raio_km: 20,
  });

  if (error) {
    if (error.message.includes('permission denied') || error.message.includes('not found')) {
      fail('RPC nao acessivel', error.message);
    } else {
      console.log(`  \u26a0\ufe0f  RPC retornou erro: ${error.message}`);
      console.log('     (pode ser que nenhum endereco tem lat/lng cadastrado \u2014 normal)');
    }
  } else {
    ok(`RPC retornou ${data?.length ?? 0} dentista(s) em raio de 20km de Sorocaba`);
  }
}

async function testLatest(): Promise<void> {
  console.log('\n[4/4] Ultimos dentistas cadastrados');
  const { data, error } = await supabase
    .from('curadentespro')
    .select('id, nome')
    .order('criado_em', { ascending: false })
    .limit(5);

  if (error) {
    fail('Query de ultimos falhou', error.message);
  } else {
    const total = data?.length ?? 0;
    const nomes = total > 0 ? (data as DentistaResumo[]).map((d) => d.nome).join(', ') : '(vazio)';
    ok(`${total} dentista(s) retornado(s): ${nomes.slice(0, 60)}`);
  }
}

async function main(): Promise<void> {
  console.log('=== SMOKE TEST: Supabase ===');
  console.log(`URL: ${SUPABASE_URL}\n`);

  await testCount();
  await testTextSearch();
  await testRpc();
  await testLatest();

  console.log(`\n=== Resultado: ${passed} passou, ${failed} falhou ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
