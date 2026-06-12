// ═══════════════════════════════════════════════════════════════════════════════
// TESTE: Identidade do Superuser (TDD)
//
// Valida o mapeamento "SuperDom" → email interno e a detecção de superuser,
// usado no login (Header/Dashboard) e nas guardas de rota (RequireSuperuser).
//
// Como rodar:
//   npm run test:superuser
// ═══════════════════════════════════════════════════════════════════════════════

import assert from "assert";
import {
  SUPERUSER_EMAIL,
  resolveLoginEmail,
  isSuperuserEmail,
} from "../../src/utils/superuser";

let passed = 0;
let failed = 0;

function ok(label: string): void {
  passed++;
  console.log(`  ✅ ${label}`);
}

function fail(label: string, reason?: string): void {
  failed++;
  console.log(`  ❌ ${label}${reason ? ` — ${reason}` : ""}`);
}

function testResolveLoginEmail() {
  console.log("\n[1/2] resolveLoginEmail (usuário → email)");
  try {
    assert.strictEqual(resolveLoginEmail("SuperDom"), SUPERUSER_EMAIL, "SuperDom mapeia para o email interno");
    assert.strictEqual(resolveLoginEmail("superdom"), SUPERUSER_EMAIL, "minúsculo também mapeia");
    assert.strictEqual(resolveLoginEmail("  SuPeRdOm  "), SUPERUSER_EMAIL, "com espaços e caixa mista mapeia");
    assert.strictEqual(resolveLoginEmail("dentista@x.com"), "dentista@x.com", "email normal passa direto");
    assert.strictEqual(resolveLoginEmail("  joao@y.com "), "joao@y.com", "email normal com espaços é trimado");
    assert.strictEqual(resolveLoginEmail("superdominio@x.com"), "superdominio@x.com", "não confunde prefixo parecido");
    ok("Mapeamento de usuário/email correto");
  } catch (err) {
    fail("Erro em resolveLoginEmail", err instanceof Error ? err.message : String(err));
  }
}

function testIsSuperuserEmail() {
  console.log("\n[2/2] isSuperuserEmail (detecção)");
  try {
    assert.strictEqual(isSuperuserEmail(SUPERUSER_EMAIL), true, "email do superuser é detectado");
    assert.strictEqual(isSuperuserEmail("SUPERDOM@CURADENTES.COM.BR"), true, "case-insensitive");
    assert.strictEqual(isSuperuserEmail("dentista@x.com"), false, "dentista comum não é superuser");
    assert.strictEqual(isSuperuserEmail(null), false, "null não é superuser");
    assert.strictEqual(isSuperuserEmail(undefined), false, "undefined não é superuser");
    assert.strictEqual(isSuperuserEmail(""), false, "vazio não é superuser");
    ok("Detecção de superuser correta");
  } catch (err) {
    fail("Erro em isSuperuserEmail", err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  console.log("=== TDD TESTE: IDENTIDADE DO SUPERUSER ===");
  testResolveLoginEmail();
  testIsSuperuserEmail();

  console.log(`\n=== Resultado: ${passed} passou, ${failed} falhou ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
