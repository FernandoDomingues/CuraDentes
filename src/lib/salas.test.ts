import { describe, it, expect } from "vitest";
import {
  normalizarBlocos,
  horasDoDia,
  agruparHorasEmFaixas,
  blocosDoDia,
  diaTemDisponibilidade,
  parseDataLocal,
  dataLocalISO,
  type BlocoDisponibilidade,
} from "./salas";

describe("normalizarBlocos", () => {
  it("converte o formato ANTIGO (dia/ativo) em blocos semanais e ignora inativos", () => {
    const antigo = [
      { dia: "Sexta-feira", inicio: "14:00", fim: "19:00", ativo: true },
      { dia: "Domingo", inicio: "08:00", fim: "12:00", ativo: false },
    ];
    expect(normalizarBlocos(antigo)).toEqual([
      { tipo: "semanal", diaSemana: 5, inicio: "14:00", fim: "19:00" },
    ]);
  });

  it("passa blocos do modelo NOVO adiante", () => {
    const novo: BlocoDisponibilidade[] = [
      { tipo: "data", data: "2026-07-15", inicio: "09:00", fim: "12:00" },
      { tipo: "semanal", diaSemana: 1, inicio: "08:00", fim: "18:00" },
    ];
    expect(normalizarBlocos(novo)).toEqual(novo);
  });

  it("ignora entradas inválidas", () => {
    expect(normalizarBlocos(null)).toEqual([]);
    expect(normalizarBlocos([{}, 3, "x", { dia: "Foo", ativo: true }])).toEqual([]);
  });
});

describe("horasDoDia", () => {
  const iso = "2026-07-03";
  it("expande a faixa hora a hora com FIM exclusivo", () => {
    const blocos: BlocoDisponibilidade[] = [{ tipo: "data", data: iso, inicio: "14:00", fim: "18:00" }];
    expect(horasDoDia(blocos, iso)).toEqual([14, 15, 16, 17]);
  });
  it("une blocos do mesmo dia e remove sobreposição", () => {
    const blocos: BlocoDisponibilidade[] = [
      { tipo: "data", data: iso, inicio: "08:00", fim: "10:00" },
      { tipo: "data", data: iso, inicio: "09:00", fim: "11:00" },
    ];
    expect(horasDoDia(blocos, iso)).toEqual([8, 9, 10]);
  });
});

describe("blocosDoDia / diaTemDisponibilidade", () => {
  const iso = "2026-07-03";
  it("bloco semanal casa pelo dia da semana", () => {
    const dow = parseDataLocal(iso).getDay();
    const blocos: BlocoDisponibilidade[] = [
      { tipo: "semanal", diaSemana: dow, inicio: "08:00", fim: "12:00" },
      { tipo: "semanal", diaSemana: (dow + 1) % 7, inicio: "08:00", fim: "12:00" },
    ];
    expect(blocosDoDia(blocos, iso)).toHaveLength(1);
    expect(diaTemDisponibilidade(blocos, iso)).toBe(true);
  });
  it("bloco por data casa só na data exata", () => {
    const blocos: BlocoDisponibilidade[] = [{ tipo: "data", data: "2026-07-15", inicio: "09:00", fim: "12:00" }];
    expect(blocosDoDia(blocos, "2026-07-15")).toHaveLength(1);
    expect(blocosDoDia(blocos, "2026-07-16")).toHaveLength(0);
  });
});

describe("agruparHorasEmFaixas (regra 2-cliques-faixa / pontual)", () => {
  it("agrupa contíguas e separa lacunas", () => {
    expect(agruparHorasEmFaixas([14, 15, 16, 19])).toEqual([
      { inicio: "14:00", fim: "17:00" },
      { inicio: "19:00", fim: "20:00" },
    ]);
  });
  it("uma hora só vira faixa de 1h", () => {
    expect(agruparHorasEmFaixas([10])).toEqual([{ inicio: "10:00", fim: "11:00" }]);
  });
  it("aceita desordenadas e duplicadas", () => {
    expect(agruparHorasEmFaixas([16, 14, 15, 14])).toEqual([{ inicio: "14:00", fim: "17:00" }]);
  });
});

describe("parseDataLocal/dataLocalISO", () => {
  it("faz round-trip sem deslocamento de fuso", () => {
    expect(dataLocalISO(parseDataLocal("2026-07-09"))).toBe("2026-07-09");
  });
});
