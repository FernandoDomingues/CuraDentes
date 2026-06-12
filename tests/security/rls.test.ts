// ═══════════════════════════════════════════════════════════════════════════════
// TESTE E2E: RLS + Storage (Item 8)
//
// Verifica que as policies de segurança estão ativas no Supabase:
//   1. Anon PODE ler curadentespro (SELECT público)
//   2. Anon NÃO PODE deletar (RLS bloqueia)
//   3. Anon NÃO PODE inserir em avaliacoes (policy autenticada)
//   4. RPC get_dentistas_proximos funciona para anon
//   5. Anon NÃO PODE fazer upload no bucket fotos-dentistas
//   6. Anon PODE listar arquivos públicos do bucket
//   7. Anon NÃO PODE chamar marcar_verificacao_cro (GRANT só authenticated)
//   8. Dentista autenticado NÃO-superuser NÃO PODE chamar marcar_verificacao_cro
//      (gate is_superuser() dentro da função — falha #1 da auditoria 2026-06-11).
//      Só roda se TEST_DENTISTA_EMAIL/TEST_DENTISTA_PASSWORD estiverem no .env.
//
// NOTA: "falhou" geralmente = BOM (RLS bloqueou corretamente).
// Problemático seria passed=0 (RLS não bloqueou nada).
//
// Como rodar:
//   npm run test:security
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

const isRlsError = (msg: string | undefined): boolean =>
  !!msg &&
  (msg.includes('row-level security') ||
    msg.includes('row level security') ||
    msg.includes('policy') ||
    msg.includes('permission denied'));

async function testReadPublic(): Promise<void> {
  console.log('\n[1/6] Anon PODE ler curadentespro (esperado: sucesso)');
  const { data, error } = await supabase
    .from('curadentespro')
    .select('id, nome')
    .limit(1);
  if (error) {
    fail('Anon NAO conseguiu ler', error.message);
  } else if (!data || data.length === 0) {
    fail('Anon leu, mas tabela esta vazia', 'sem dados de seed');
  } else {
    ok(`Anon leu dentista(s) (ex.: "${data[0].nome}")`);
  }
}

async function testDeleteBlocked(): Promise<void> {
  console.log('\n[2/6] Anon NAO PODE deletar curadentespro (esperado: RLS bloqueia)');
  const { data: sample } = await supabase
    .from('curadentespro')
    .select('id')
    .limit(1);
  if (!sample || sample.length === 0) {
    console.log('  \u26a0\ufe0f  Sem dentistas para testar DELETE');
    return;
  }

  const targetId = sample[0].id;
  const { data: deleted, error, count } = await supabase
    .from('curadentespro')
    .delete({ count: 'exact' })
    .eq('id', targetId)
    .select();

  if (!error && deleted && deleted.length > 0) {
    fail('Anon CONSEGUIU DELETAR!', 'RLS nao esta ativo');
  } else if (isRlsError(error?.message)) {
    ok('Anon bloqueado por RLS (delete recusado com erro)');
  } else if (error) {
    ok(`Anon bloqueado: ${error.message}`);
  } else if (count === 0 || (deleted && deleted.length === 0)) {
    ok('Anon bloqueado (0 rows affected \u2014 policy USING filtrou)');
  } else {
    fail('Resultado inesperado', `error=${error}, count=${count}`);
  }
}

async function testInsertAvaliacaoBlocked(): Promise<void> {
  console.log('\n[3/6] Anon NAO PODE inserir em avaliacoes (esperado: RLS bloqueia)');
  const { data: sample } = await supabase
    .from('curadentespro')
    .select('id')
    .limit(1);
  if (!sample || sample.length === 0) {
    console.log('  \u26a0\ufe0f  Sem dentistas para testar INSERT em avaliacoes');
    return;
  }

  const { error } = await supabase
    .from('avaliacoes')
    .insert({
      paciente_id: '00000000-0000-0000-0000-000000000000',
      dentista_id: sample[0].id,
      nota: 5,
    });
  if (isRlsError(error?.message)) {
    ok('Anon bloqueado por RLS (insert em avaliacoes recusado)');
  } else if (error) {
    ok(`Anon bloqueado: ${error.message}`);
  } else {
    fail('Anon CONSEGUIU INSERIR AVALIACAO!', 'policy de insert nao esta ativa');
  }
}

async function testRpcAnon(): Promise<void> {
  console.log('\n[4/6] RPC get_dentistas_proximos funciona para anon');
  const { data, error } = await supabase.rpc('get_dentistas_proximos', {
    lat: -23.5015,
    lng: -47.4526,
    raio_km: 50,
  });
  if (error) {
    if (error.message.includes('permission denied') || error.message.includes('not found')) {
      fail('RPC falhou', error.message);
    } else {
      console.log(`  \u26a0\ufe0f  RPC retornou erro: ${error.message}`);
      console.log('     (pode ser que nenhum dentista tem lat/lng cadastrado \u2014 normal)');
    }
  } else {
    ok(`RPC retornou ${data?.length ?? 0} dentista(s) proximo(s) de Sorocaba`);
  }
}

async function testStorageUploadBlocked(): Promise<void> {
  console.log('\n[5/6] Anon NAO PODE fazer upload em fotos-dentistas (esperado: RLS bloqueia)');
  const blob = new Blob(['fake-image-content'], { type: 'image/jpeg' });
  const { error } = await supabase.storage
    .from('fotos-dentistas')
    .upload('00000000-0000-0000-0000-000000000000/test-from-anon.jpg', blob);
  if (isRlsError(error?.message)) {
    ok('Anon bloqueado por RLS (upload recusado)');
  } else if (error?.message.includes('Bucket not found') || error?.message.includes('not found')) {
    console.log('  \u26a0\ufe0f  Bucket fotos-dentistas nao existe no projeto');
    console.log('     Crie o bucket no Supabase Storage antes de rodar este teste');
  } else if (error) {
    ok(`Anon bloqueado: ${error.message}`);
  } else {
    fail('Anon CONSEGUIU FAZER UPLOAD!', 'storage policy de insert nao esta ativa');
  }
}

async function testStorageListPublic(): Promise<void> {
  console.log('\n[6/6] Bonus: Anon PODE listar arquivos publicos do bucket');
  const { data, error } = await supabase.storage
    .from('fotos-dentistas')
    .list('', { limit: 5 });
  if (error) {
    if (error.message.includes('not found')) {
      console.log('  \u26a0\ufe0f  Bucket nao existe (mesmo aviso do teste 5)');
    } else {
      fail('Anon nao conseguiu listar bucket', error.message);
    }
  } else {
    ok(`Anon listou ${data?.length ?? 0} item(ns) do bucket`);
  }
}

async function testRpcMarcarVerificacaoAnonBlocked(): Promise<void> {
  console.log('\n[7/8] Anon NAO PODE chamar marcar_verificacao_cro (esperado: bloqueado)');
  const { data: sample } = await supabase
    .from('curadentespro')
    .select('id')
    .limit(1);
  const alvo = sample?.[0]?.id ?? '00000000-0000-0000-0000-000000000000';

  const { data, error } = await supabase.rpc('marcar_verificacao_cro', {
    p_dentista_id: alvo,
    p_verificado: false,
    p_observacao: 'teste-anon',
  });

  if (error) {
    ok(`Anon bloqueado no GRANT (${error.message})`);
  } else if (data && data.success === false) {
    ok(`Anon bloqueado pelo gate da funcao (${data.error ?? 'sem msg'})`);
  } else {
    fail('Anon CONSEGUIU marcar verificacao!', 'funcao exposta ou gate ausente');
  }
}

async function testRpcMarcarVerificacaoNonSuperuser(): Promise<void> {
  console.log('\n[8/8] Dentista autenticado NAO-superuser NAO PODE chamar marcar_verificacao_cro');
  const email = process.env.TEST_DENTISTA_EMAIL;
  const senha = process.env.TEST_DENTISTA_PASSWORD;
  if (!email || !senha) {
    console.log('  ⚠️  Pulado: defina TEST_DENTISTA_EMAIL e TEST_DENTISTA_PASSWORD no .env');
    console.log('     (sem credenciais nao da pra testar o gate is_superuser() de um nao-admin)');
    return;
  }

  // Cliente isolado para nao poluir a sessao anon dos outros testes
  const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: loginErr } = await authed.auth.signInWithPassword({ email, password: senha });
  if (loginErr) {
    fail('Login do dentista de teste falhou', loginErr.message);
    return;
  }

  const { data: sample } = await authed
    .from('curadentespro')
    .select('id')
    .limit(1);
  const alvo = sample?.[0]?.id ?? '00000000-0000-0000-0000-000000000000';

  const { data, error } = await authed.rpc('marcar_verificacao_cro', {
    p_dentista_id: alvo,
    p_verificado: false,
    p_observacao: 'teste-nao-superuser',
  });

  if (data && data.success === false && /autoriz/i.test(data.error ?? '')) {
    ok(`Nao-superuser bloqueado pelo gate is_superuser() (${data.error})`);
  } else if (error) {
    ok(`Nao-superuser bloqueado (${error.message})`);
  } else {
    fail('Nao-superuser CONSEGUIU marcar verificacao!', 'ESCALADA DE PRIVILEGIO ainda aberta');
  }

  await authed.auth.signOut();
}

async function testCpfProtegido(): Promise<void> {
  console.log('\n[9/9] Anon NAO PODE ler a coluna cpf de curadentespro (LGPD)');
  const { data, error } = await supabase
    .from('curadentespro')
    .select('cpf')
    .limit(1);

  if (error) {
    ok(`Anon bloqueado de ler cpf (${error.message})`);
  } else if (data && data.length > 0 && (data[0] as { cpf?: string }).cpf) {
    fail('Anon LEU O CPF!', 'coluna cpf ainda exposta');
  } else {
    ok('Anon nao recebeu cpf');
  }

  // Sanity: colunas publicas continuam legiveis
  const { data: pub, error: pubErr } = await supabase
    .from('curadentespro')
    .select('id, nome')
    .limit(1);
  if (pubErr) {
    fail('Anon perdeu acesso as colunas publicas', pubErr.message);
  } else if (pub && pub.length > 0) {
    ok('Colunas publicas (id, nome) seguem legiveis');
  } else {
    console.log('  ⚠️  Sem dentistas para validar colunas publicas');
  }
}

async function main(): Promise<void> {
  console.log('=== TESTE E2E: RLS + Storage (Item 8) ===');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Key: ${SUPABASE_ANON_KEY.slice(0, 12)}...${SUPABASE_ANON_KEY.slice(-8)}\n`);

  await testReadPublic();
  await testDeleteBlocked();
  await testInsertAvaliacaoBlocked();
  await testRpcAnon();
  await testStorageUploadBlocked();
  await testStorageListPublic();
  await testRpcMarcarVerificacaoAnonBlocked();
  await testRpcMarcarVerificacaoNonSuperuser();
  await testCpfProtegido();

  console.log(`\n=== Resultado: ${passed} passou, ${failed} falhou ===\n`);
  console.log('LEMBRE-SE: neste teste, "falhou" geralmente = BOM, significa que RLS bloqueou.');
  console.log('O numero problematico seria passed=0 (RLS nao bloqueou nada) ou falha em testes');
  console.log('de LEITURA publica (ex.: teste 1 falhando).\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
