/**
 * Testes de Unidade: Validação de Etapas e Regras do Cadastro Pro (TDD)
 *
 * Roda validações de telefone, CPF, CRO, endereços e integridade das etapas.
 *
 * Como rodar:
 *   npm run test:cadastro
 */

import assert from "assert";
import {
  validarTelefone,
  validarCpf,
  validarCro,
  validarEnderecos,
  isEtapaConcluida,
  EtapaValidationParams,
} from "../../src/utils/cadastroValidation";

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
  } catch (err: any) {
    fail("Erro em validarTelefone", err.message);
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
  } catch (err: any) {
    fail("Erro em validarCpf", err.message);
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
  } catch (err: any) {
    fail("Erro em validarCro", err.message);
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
  } catch (err: any) {
    fail("Erro em validarEnderecos", err.message);
  }
}

// 5. Testar Validação de Conclusão de Etapas
function testEtapasCompleteness() {
  console.log("\n[5/5] Validação de Etapas");
  try {
    const baseParams: EtapaValidationParams = {
      nome: "Dr. Fernando Domingues",
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

    // Etapa 5
    assert.strictEqual(isEtapaConcluida(5, baseParams), true, "Etapa 5 sempre concluída (Bio opcional)");

    // Etapa 6
    assert.strictEqual(isEtapaConcluida(6, baseParams), true, "Etapa 6 concluída");
    assert.strictEqual(isEtapaConcluida(6, { ...baseParams, lgpdAceito: false }), false, "Etapa 6 pendente: LGPD não aceita");

    ok("Todas as regras de etapas testadas com sucesso");
  } catch (err: any) {
    fail("Erro em isEtapaConcluida", err.message);
  }
}

async function main() {
  console.log("=== TDD TESTE: VALIDAÇÃO DO CADASTRO PRO ===");
  testTelefone();
  testCpf();
  testCro();
  testEnderecos();
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
