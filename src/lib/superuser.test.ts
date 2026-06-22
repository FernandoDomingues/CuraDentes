// TESTE (TDD) — identidade do superusuário (SuperDom).
// O admin loga digitando "SuperDom" (qualquer caixa), que mapeamos para o email
// fixo interno. No banco, a verdade é a função public.is_superuser(); aqui é só
// o espelho no front. Os dois precisam apontar para o MESMO email.

import { describe, it, expect } from "vitest";
import { resolveLoginEmail, isSuperuserEmail, SUPERUSER_EMAIL } from "./superuser";

describe("resolveLoginEmail", () => {
  it('converte "SuperDom" (qualquer caixa) no email interno', () => {
    expect(resolveLoginEmail("SuperDom")).toBe(SUPERUSER_EMAIL);
    expect(resolveLoginEmail("superdom")).toBe(SUPERUSER_EMAIL);
    expect(resolveLoginEmail("  SUPERDOM ")).toBe(SUPERUSER_EMAIL);
  });

  it("deixa qualquer outro email como está (apenas trim)", () => {
    expect(resolveLoginEmail("  ana@x.com ")).toBe("ana@x.com");
  });
});

describe("isSuperuserEmail", () => {
  it("reconhece o email do superuser (case-insensitive)", () => {
    expect(isSuperuserEmail(SUPERUSER_EMAIL)).toBe(true);
    expect(isSuperuserEmail("SUPERDOM@curadentes.com.br")).toBe(true);
  });
  it("recusa outros emails e vazios", () => {
    expect(isSuperuserEmail("ana@x.com")).toBe(false);
    expect(isSuperuserEmail(null)).toBe(false);
    expect(isSuperuserEmail(undefined)).toBe(false);
  });
});
