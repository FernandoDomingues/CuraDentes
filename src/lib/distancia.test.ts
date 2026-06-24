// TESTE (TDD) — fórmula de distância (Haversine). Distâncias-âncora conhecidas para
// garantir 0% de dúvida no cálculo (inclui o caso real Lucas Plens × Roberto, que
// motivou a auditoria: a coord estava errada, mas a FÓRMULA dá ~4,4 km correto).

import { describe, it, expect } from "vitest";
import { calcularDistanciaKm } from "./distancia";

describe("calcularDistanciaKm", () => {
  it("é 0 para o mesmo ponto", () => {
    expect(calcularDistanciaKm(-23.5, -47.45, -23.5, -47.45)).toBeCloseTo(0, 6);
  });

  it("âncora geográfica: 1° de latitude ≈ 111 km", () => {
    const d = calcularDistanciaKm(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it("Lucas Plens → Roberto (coords corretas) ≈ 4,4 km", () => {
    const d = calcularDistanciaKm(-23.5014488, -47.4602889, -23.4625292, -47.4685974);
    expect(d).toBeGreaterThan(4.2);
    expect(d).toBeLessThan(4.6);
  });

  it("distância curta (~1 km em Sorocaba)", () => {
    const d = calcularDistanciaKm(-23.5014488, -47.4602889, -23.5117738, -47.4646522);
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.6);
  });

  it("distância longa (Sorocaba → Cesário Lange ≈ 59 km)", () => {
    const d = calcularDistanciaKm(-23.5014488, -47.4602889, -23.22412, -47.95414);
    expect(d).toBeGreaterThan(55);
    expect(d).toBeLessThan(63);
  });

  it("é simétrica (A→B = B→A)", () => {
    const ab = calcularDistanciaKm(-23.5, -47.45, -23.46, -47.47);
    const ba = calcularDistanciaKm(-23.46, -47.47, -23.5, -47.45);
    expect(ab).toBeCloseTo(ba, 9);
  });
});
