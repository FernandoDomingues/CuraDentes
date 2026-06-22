// TESTE (TDD) — helpers de CRO usados na verificação (superuser).
// Derivam a UF e o número a partir do CRO digitado, para preencher a busca do CFO.

import { describe, it, expect } from "vitest";
import { numeroDoCro, ufDoCro, nomeUf } from "./cro";

describe("numeroDoCro", () => {
  it("mantém só os dígitos", () => {
    expect(numeroDoCro("CRO-SP12345")).toBe("12345");
    expect(numeroDoCro("CRO SP 12.345")).toBe("12345");
  });
});

describe("ufDoCro", () => {
  it("extrai a UF (2 letras maiúsculas) após o hífen", () => {
    expect(ufDoCro("CRO-SP12345")).toBe("SP");
    expect(ufDoCro("cro-rj123")).toBe("RJ");
  });
  it("sem hífen, tenta as 2 primeiras letras", () => {
    expect(ufDoCro("SP12345")).toBe("SP");
  });
  it("vazio quando não há letras", () => {
    expect(ufDoCro("12345")).toBe("");
  });
});

describe("nomeUf", () => {
  it("traduz a sigla para o nome do estado", () => {
    expect(nomeUf("SP")).toBe("São Paulo");
    expect(nomeUf("RJ")).toBe("Rio de Janeiro");
  });
  it("devolve a própria sigla se desconhecida", () => {
    expect(nomeUf("ZZ")).toBe("ZZ");
  });
});
