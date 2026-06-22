// ═══════════════════════════════════════════════════════════════════════════════
// TESTE (escrito ANTES da implementação — é assim que fazemos TDD neste projeto):
// 1) escrevemos o teste descrevendo o comportamento esperado;
// 2) rodamos e vemos falhar (vermelho);
// 3) implementamos o mínimo pra passar (verde);
// 4) refatoramos com segurança, sabendo que o teste protege o comportamento.
//
// Aqui testamos `slugificar`, que transforma o nome de uma especialidade no
// trecho de URL (ex.: "Clínico Geral" -> "clinico-geral", usado em /especialidade/<slug>).
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { slugificar } from "./slug";

describe("slugificar", () => {
  it("deixa minúsculo e mantém palavra simples", () => {
    expect(slugificar("Ortodontia")).toBe("ortodontia");
  });

  it("troca espaços por hífen", () => {
    expect(slugificar("Clínico Geral")).toBe("clinico-geral");
  });

  it("remove acentos", () => {
    expect(slugificar("Harmonização Orofacial")).toBe("harmonizacao-orofacial");
  });

  it("remove símbolos e hífens das pontas", () => {
    expect(slugificar("  Implante!  ")).toBe("implante");
  });

  it("colapsa múltiplos separadores num hífen só", () => {
    expect(slugificar("Lentes  de / contato")).toBe("lentes-de-contato");
  });
});
