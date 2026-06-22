// TESTE (TDD) — força de senha (indicador visual + regra mínima).
// Mesma lógica do site-k11: +1 ponto por tamanho>=8, maiúscula, dígito, símbolo.
// O nível vai de 0 (vazia) a 4. A regra que BLOQUEIA é só o mínimo de 8.

import { describe, it, expect } from "vitest";
import { forcaSenha, senhaValida } from "./senha";

describe("forcaSenha", () => {
  it("vazia = nível 0", () => {
    expect(forcaSenha("").nivel).toBe(0);
  });
  it("só 8+ caracteres simples = nível 1", () => {
    expect(forcaSenha("abcdefgh").nivel).toBe(1);
  });
  it("8+ com maiúscula e dígito = nível 3", () => {
    expect(forcaSenha("Abcdefg1").nivel).toBe(3);
  });
  it("8+ com maiúscula, dígito e símbolo = nível 4 (forte)", () => {
    const r = forcaSenha("Abcdef1!");
    expect(r.nivel).toBe(4);
    expect(r.rotulo).toBe("Forte");
  });
});

describe("senhaValida", () => {
  it("exige no mínimo 8 caracteres", () => {
    expect(senhaValida("1234567")).toBe(false);
    expect(senhaValida("12345678")).toBe(true);
  });
});
