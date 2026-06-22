// TESTE (TDD) — validações e máscaras do cadastro/perfil do dentista.
// Regras portadas do site-k11 (src/utils/cadastroValidation.ts), preservadas
// exatamente. As máscaras formatam o que o usuário digita para exibição.

import { describe, it, expect } from "vitest";
import {
  validarTelefone,
  validarCpf,
  validarCro,
  validarAnoFormacao,
  validarEnderecos,
  formatarCpf,
  formatarTelefone,
  formatarCro,
  formatarCep,
} from "./validacao";

describe("validarTelefone", () => {
  it("aceita 11 dígitos com 9 no 3º (celular BR)", () => {
    expect(validarTelefone("(15) 99999-8888")).toBe(true);
    expect(validarTelefone("15999998888")).toBe(true);
  });
  it("rejeita fixo (3º dígito != 9) e tamanhos errados", () => {
    expect(validarTelefone("(15) 3333-3333")).toBe(false);
    expect(validarTelefone("1599998888")).toBe(false);
  });
});

describe("validarCpf", () => {
  it("aceita um CPF válido (dígitos verificadores corretos)", () => {
    expect(validarCpf("529.982.247-25")).toBe(true);
  });
  it("rejeita repetidos, tamanho errado e dígito inválido", () => {
    expect(validarCpf("111.111.111-11")).toBe(false);
    expect(validarCpf("123.456.789-00")).toBe(false);
    expect(validarCpf("123")).toBe(false);
  });
});

describe("validarCro", () => {
  it("aceita CRO-UF + 3 a 6 dígitos com UF válida", () => {
    expect(validarCro("CRO-SP12345")).toBe(true);
    expect(validarCro("cro-rj123")).toBe(true);
  });
  it("rejeita UF inválida ou formato errado", () => {
    expect(validarCro("CRO-XX12345")).toBe(false);
    expect(validarCro("SP12345")).toBe(false);
    expect(validarCro("CRO-SP12")).toBe(false);
  });
});

describe("validarAnoFormacao", () => {
  it("vazio é válido (opcional)", () => {
    expect(validarAnoFormacao("")).toBe(true);
  });
  it("aceita ano entre 1950 e o ano atual", () => {
    expect(validarAnoFormacao("2010")).toBe(true);
  });
  it("rejeita anos fora da faixa ou não-numéricos", () => {
    expect(validarAnoFormacao("1900")).toBe(false);
    expect(validarAnoFormacao("3000")).toBe(false);
    expect(validarAnoFormacao("abc")).toBe(false);
  });
});

describe("validarEnderecos", () => {
  it("acusa campos obrigatórios faltando", () => {
    const r = validarEnderecos([{ nome_clinica: "", logradouro: "Rua A", bairro: "", cidade: "Sorocaba", estado: "SP", cep: "18000-000" }]);
    expect(r.valido).toBe(false);
    expect(r.erros.some((e) => e.includes("Nome da clínica"))).toBe(true);
    expect(r.erros.some((e) => e.includes("Bairro"))).toBe(true);
  });
  it("válido quando todos os obrigatórios estão preenchidos", () => {
    const r = validarEnderecos([{ nome_clinica: "C", logradouro: "Rua A", bairro: "Centro", cidade: "Sorocaba", estado: "SP", cep: "18000-000" }]);
    expect(r.valido).toBe(true);
    expect(r.erros).toEqual([]);
  });
});

describe("máscaras", () => {
  it("formatarCpf → ###.###.###-##", () => {
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
    expect(formatarCpf("529982247")).toBe("529.982.247");
  });
  it("formatarTelefone → (##) #####-####", () => {
    expect(formatarTelefone("15999998888")).toBe("(15) 99999-8888");
  });
  it("formatarCep → #####-###", () => {
    expect(formatarCep("18000000")).toBe("18000-000");
  });
  it("formatarCro → CRO-UF + dígitos, maiúsculo", () => {
    expect(formatarCro("sp12345")).toBe("CRO-SP12345");
    expect(formatarCro("CRO-SP12345")).toBe("CRO-SP12345");
  });
});
