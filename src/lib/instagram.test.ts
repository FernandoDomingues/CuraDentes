// TESTE (TDD) — Instagram: extrai o username e monta a URL canônica.
// Armazenamos a URL completa no banco, mas exibimos/editamos só o @usuário.

import { describe, it, expect } from "vitest";
import { extrairUserInstagram, formatarInstagram } from "./instagram";

describe("extrairUserInstagram", () => {
  it("tira o @ e espaços", () => {
    expect(extrairUserInstagram("@ana.dentista")).toBe("ana.dentista");
    expect(extrairUserInstagram("  ana ")).toBe("ana");
  });
  it("extrai de URLs do instagram", () => {
    expect(extrairUserInstagram("https://instagram.com/ana")).toBe("ana");
    expect(extrairUserInstagram("https://www.instagram.com/ana/")).toBe("ana");
  });
  it("recusa URL de outro domínio e entrada inválida", () => {
    expect(extrairUserInstagram("https://twitter.com/ana")).toBe("");
    expect(extrairUserInstagram("a b c")).toBe("");
    expect(extrairUserInstagram("")).toBe("");
  });
});

describe("formatarInstagram", () => {
  it("monta a URL canônica a partir do username", () => {
    expect(formatarInstagram("ana")).toBe("https://www.instagram.com/ana");
    expect(formatarInstagram("@ana")).toBe("https://www.instagram.com/ana");
  });
  it("retorna null quando inválido/vazio", () => {
    expect(formatarInstagram("")).toBeNull();
    expect(formatarInstagram("a b")).toBeNull();
  });
});
