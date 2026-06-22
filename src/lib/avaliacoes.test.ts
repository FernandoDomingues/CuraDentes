// ═══════════════════════════════════════════════════════════════════════════════
// TESTE (TDD) — cálculo das avaliações de um dentista.
//
// O banco devolve uma lista de avaliações cruas (cada uma com `nota` 1..5 e,
// opcionalmente, a `atividade` avaliada). A partir disso precisamos calcular:
//   • a média GERAL (média de todas as notas);
//   • o TOTAL de avaliações;
//   • a média e o total POR ATIVIDADE (ex.: quão bem ele faz "Implante").
//
// Esta é uma função PURA (sem rede): fácil de testar e de confiar. Mesma regra do
// site-k11 (DentistProfile.tsx): avaliação sem `atividade` cai no balde "Geral".
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { calcularAvaliacoes } from "./avaliacoes";

describe("calcularAvaliacoes", () => {
  it("sem avaliações: média 0, total 0, sem atividades", () => {
    const r = calcularAvaliacoes([]);
    expect(r.media_geral).toBe(0);
    expect(r.total_avaliacoes).toBe(0);
    expect(r.por_atividade).toEqual([]);
  });

  it("calcula a média geral de várias notas", () => {
    const r = calcularAvaliacoes([{ nota: 5 }, { nota: 4 }, { nota: 3 }]);
    expect(r.media_geral).toBeCloseTo(4); // (5+4+3)/3
    expect(r.total_avaliacoes).toBe(3);
  });

  it("agrupa por atividade, mantendo média e total de cada uma", () => {
    const r = calcularAvaliacoes([
      { nota: 5, atividade: "Implante dentário" },
      { nota: 3, atividade: "Implante dentário" },
      { nota: 4, atividade: "Limpeza" },
    ]);
    const implante = r.por_atividade.find((a) => a.nome_atividade === "Implante dentário");
    const limpeza = r.por_atividade.find((a) => a.nome_atividade === "Limpeza");
    expect(implante).toMatchObject({ media_nota: 4, total_avaliacoes: 2 });
    expect(limpeza).toMatchObject({ media_nota: 4, total_avaliacoes: 1 });
  });

  it('avaliação sem atividade cai no balde "Geral"', () => {
    const r = calcularAvaliacoes([{ nota: 5 }, { nota: 1 }]);
    expect(r.por_atividade).toEqual([
      { nome_atividade: "Geral", media_nota: 3, total_avaliacoes: 2 },
    ]);
  });

  it("ignora notas inválidas (fora de 1..5 ou não numéricas)", () => {
    const r = calcularAvaliacoes([
      { nota: 5 },
      { nota: 0 },
      { nota: 7 },
      // @ts-expect-error — simula dado sujo vindo do banco
      { nota: "abc" },
    ]);
    expect(r.total_avaliacoes).toBe(1);
    expect(r.media_geral).toBe(5);
  });
});
