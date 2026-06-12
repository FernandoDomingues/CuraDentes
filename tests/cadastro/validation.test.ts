// ═══════════════════════════════════════════════════════════════════════════════
// TESTE: Validação do Cadastro Pro (TDD)
//
// Testes unitários que validam as regras de negócio do cadastro do dentista:
//   - Telefone (DDD + 9 dígitos)
//   - CPF (Módulo 11)
//   - CRO (UF + número)
//   - Endereços (campos obrigatórios)
//   - Conclusão de etapas (1 a 6)
//
// Como rodar:
//   npm run test:cadastro
// ═══════════════════════════════════════════════════════════════════════════════

import assert from "assert";
import {
  validarTelefone,
  validarCpf,
  validarCro,
  validarEnderecos,
  validarAnoFormacao,
  isEtapaConcluida,
  EtapaValidationParams,
} from "../../src/utils/cadastroValidation";
import { extrairUserInstagram, formatarInstagram } from "../../src/utils/instagram";

let passed = 0;
let failed = 0;

function ok(label: string): void {
  passed++;
  console.log(`  \u2705 ${label}`);
}

function fail(label: string, reason?: string): void {
  failed++;
  console.log(`  \u274c ${label}${reason ? ` \u2014 ${reason}` : ""}`);
}

// 1. Testar Validação de Telefone
function testTelefone() {
  console.log("\n[1/5] Validação de Telefone");
  try {
    assert.strictEqual(validarTelefone("(11) 98765-4321"), true, "Celular válido de SP");
    assert.strictEqual(validarTelefone("11987654321"), true, "Celular sem formatação");
    assert.strictEqual(validarTelefone("1134567890"), false, "Telefone fixo (sem 9)");
    assert.strictEqual(validarTelefone("1187654321"), false, "Celular inválido (sem 9 dígito)");
    assert.strictEqual(validarTelefone(""), false, "Telefone vazio");
    ok("Regras de telefone corretas");
  } catch (err) {
    fail("Erro em validarTelefone", err instanceof Error ? err.message : String(err));
  }
}

// 2. Testar Validação de CPF
function testCpf() {
  console.log("\n[2/5] Validação de CPF (Módulo 11)");
  try {
    assert.strictEqual(validarCpf("111.111.111-11"), false, "CPF com números repetidos");
    assert.strictEqual(validarCpf("123.456.789-00"), false, "CPF com dígitos errados");
    assert.strictEqual(validarCpf(""), false, "CPF vazio");
    // CPF real de teste válido (gerado pelo algoritmo de validação)
    assert.strictEqual(validarCpf("529.982.247-25"), true, "CPF válido real");
    ok("Regras de CPF corretas");
  } catch (err) {
    fail("Erro em validarCpf", err instanceof Error ? err.message : String(err));
  }
}

// 3. Testar Validação de CRO
function testCro() {
  console.log("\n[3/5] Validação de CRO");
  try {
    assert.strictEqual(validarCro("CRO-SP123456"), true, "CRO válido SP com 6 dígitos");
    assert.strictEqual(validarCro("cro-rj999"), true, "CRO válido RJ minúsculo com 3 dígitos");
    assert.strictEqual(validarCro("CRO-SP"), false, "CRO sem número");
    assert.strictEqual(validarCro("CRO-XX123"), false, "CRO com UF inválida");
    assert.strictEqual(validarCro(""), false, "CRO vazio");
    ok("Regras de CRO corretas");
  } catch (err) {
    fail("Erro em validarCro", err instanceof Error ? err.message : String(err));
  }
}

// 4. Testar Validação de Endereços
function testEnderecos() {
  console.log("\n[4/5] Validação de Endereços");
  try {
    const endValido = {
      nome_clinica: "Consultório A",
      logradouro: "Av Paulista",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01311-000",
    };
    const resValido = validarEnderecos([endValido]);
    assert.strictEqual(resValido.valido, true, "Endereço completo é válido");

    const endInvalido = {
      nome_clinica: "",
      logradouro: "Av Paulista",
      bairro: "",
      cidade: "São Paulo",
      estado: "SP",
      cep: "",
    };
    const resInvalido = validarEnderecos([endInvalido]);
    assert.strictEqual(resInvalido.valido, false, "Endereço incompleto é inválido");
    assert.strictEqual(resInvalido.erros.length, 3, "Deve listar 3 erros de campos");
    ok("Regras de endereço corretas");
  } catch (err) {
    fail("Erro em validarEnderecos", err instanceof Error ? err.message : String(err));
  }
}

// 5. Testar Validação de Ano de Formação
function testAnoFormacao() {
  console.log("\n[5/7] Validação de Ano de Formação");
  try {
    assert.strictEqual(validarAnoFormacao(""), true, "Ano vazio é opcional e válido");
    assert.strictEqual(validarAnoFormacao("2010"), true, "Ano válido no passado");
    assert.strictEqual(validarAnoFormacao("2026"), true, "Ano atual é válido");
    assert.strictEqual(validarAnoFormacao("1949"), false, "Ano anterior a 1950 é inválido");
    assert.strictEqual(validarAnoFormacao("2027"), false, "Ano futuro é inválido");
    assert.strictEqual(validarAnoFormacao("abc"), false, "Texto não numérico é inválido");
    assert.strictEqual(validarAnoFormacao("0"), false, "Ano zero é inválido");
    ok("Regras de ano de formação corretas");
  } catch (err) {
    fail("Erro em validarAnoFormacao", err instanceof Error ? err.message : String(err));
  }
}

// 6. Testar Instagram Utils
function testInstagram() {
  console.log("\n[6/7] Utilitários Instagram");
  try {
    assert.strictEqual(extrairUserInstagram(""), "", "Vazio retorna vazio");
    assert.strictEqual(extrairUserInstagram("@meuperfil"), "meuperfil", "Handle com @");
    assert.strictEqual(extrairUserInstagram("https://instagram.com/user"), "user", "URL completa");
    assert.strictEqual(extrairUserInstagram("https://www.instagram.com/user/"), "user", "URL com www e barra");
    assert.strictEqual(extrairUserInstagram("user"), "user", "Apenas username");
    assert.strictEqual(extrairUserInstagram("@USER"), "USER", "Username maiúsculo preservado");

    assert.strictEqual(formatarInstagram(""), null, "Vazio retorna null");
    assert.strictEqual(formatarInstagram("@user"), "https://www.instagram.com/user", "Handle com @ formatado");
    assert.strictEqual(formatarInstagram("user"), "https://www.instagram.com/user", "Username puro formatado");
    assert.strictEqual(formatarInstagram("invalido espaço"), null, "Username inválido retorna null");
    ok("Utilitários Instagram corretos");
  } catch (err) {
    fail("Erro em Instagram", err instanceof Error ? err.message : String(err));
  }
}

// 7. Testar Validação de Conclusão de Etapas
function testEtapasCompleteness() {
  console.log("\n[7/7] Validação de Etapas");
  try {
    const baseParams: EtapaValidationParams = {
      nome: "Fernando Domingues",
      tratamento: "Dr.",
      emailVerificado: true,
      senhaSincronizada: true,
      senha: "",
      confirmaSenha: "",
      telefone: "11987654321",
      cpf: "529.982.247-25",
      cro: "CRO-SP123456",
      enderecos: [{
        nome_clinica: "Consultório A",
        logradouro: "Av Paulista",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01311-000",
      }],
      lgpdAceito: true,
    };

    // Etapa 1
    assert.strictEqual(isEtapaConcluida(1, baseParams), true, "Etapa 1 concluída");
    assert.strictEqual(isEtapaConcluida(1, { ...baseParams, nome: "" }), false, "Etapa 1 pendente: nome vazio");
    assert.strictEqual(isEtapaConcluida(1, { ...baseParams, emailVerificado: false }), false, "Etapa 1 pendente: email não verificado");
    assert.strictEqual(isEtapaConcluida(1, { ...baseParams, tratamento: "" }), false, "Etapa 1 pendente: tratamento (Dr./Dra.) não escolhido");

    // Etapa 2
    assert.strictEqual(isEtapaConcluida(2, baseParams), true, "Etapa 2 concluída");
    assert.strictEqual(isEtapaConcluida(2, { ...baseParams, telefone: "" }), false, "Etapa 2 pendente: telefone vazio");

    // Etapa 3
    assert.strictEqual(isEtapaConcluida(3, baseParams), true, "Etapa 3 concluída");
    assert.strictEqual(isEtapaConcluida(3, { ...baseParams, cpf: "" }), false, "Etapa 3 pendente: CPF vazio");
    assert.strictEqual(isEtapaConcluida(3, { ...baseParams, cro: "CRO-XX123" }), false, "Etapa 3 pendente: CRO inválido");

    // Etapa 4
    assert.strictEqual(isEtapaConcluida(4, baseParams), true, "Etapa 4 concluída");
    assert.strictEqual(isEtapaConcluida(4, { ...baseParams, enderecos: [] }), false, "Etapa 4 pendente: sem endereços");

    // Etapa 3 com anoFormacao
    assert.strictEqual(isEtapaConcluida(3, { ...baseParams, anoFormacao: "2010" }), true, "Etapa 3 concluída com ano válido");
    
    // Etapa 5
    assert.strictEqual(isEtapaConcluida(5, baseParams), true, "Etapa 5 sempre concluída (Bio opcional)");

    // Etapa 6
    assert.strictEqual(isEtapaConcluida(6, baseParams), true, "Etapa 6 concluída");
    assert.strictEqual(isEtapaConcluida(6, { ...baseParams, lgpdAceito: false }), false, "Etapa 6 pendente: LGPD não aceita");

    ok("Todas as regras de etapas testadas com sucesso");
  } catch (err) {
    fail("Erro em isEtapaConcluida", err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  console.log("=== TDD TESTE: VALIDAÇÃO DO CADASTRO PRO ===");
  testTelefone();
  testCpf();
  testCro();
  testEnderecos();
  testAnoFormacao();
  testInstagram();
  testEtapasCompleteness();

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
