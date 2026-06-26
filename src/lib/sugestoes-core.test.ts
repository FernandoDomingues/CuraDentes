import { describe, it, expect } from "vitest";
import {
  normalizar,
  levenshtein,
  fuzzyScore,
  buildCandidates,
  filtrarSugestoes,
  type SuggestionData,
  type AddressSuggestion,
} from "./sugestoes-core";

// ─── normalizar ───────────────────────────────────────────────────────────────
describe("normalizar", () => {
  it("remove acentos, caixa e pontuação e colapsa espaços", () => {
    expect(normalizar("São Paulo")).toBe("sao paulo");
    expect(normalizar("Dr. Fulano-de-Tal")).toBe("dr fulano de tal");
    expect(normalizar("  CENTRO   sul ")).toBe("centro sul");
  });
});

// ─── levenshtein ──────────────────────────────────────────────────────────────
describe("levenshtein", () => {
  it("calcula a distância de edição", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(levenshtein("fulano", "fulnao")).toBe(2); // transposição = 2 edições
    expect(levenshtein("sao", "sai")).toBe(1);
  });
});

// ─── fuzzyScore ───────────────────────────────────────────────────────────────
describe("fuzzyScore", () => {
  it("dá 100 para correspondência exata (ignorando acento/caixa)", () => {
    expect(fuzzyScore("sorocaba", "Sorocaba")).toBe(100);
    expect(fuzzyScore("São Paulo", "sao paulo")).toBe(100);
  });

  it("prioriza 'começa com' acima de 'contém'", () => {
    const comeca = fuzzyScore("soro", "Sorocaba");
    const contem = fuzzyScore("caba", "Sorocaba");
    expect(comeca).toBeGreaterThan(contem);
    expect(comeca).toBeLessThan(100);
  });

  it("encontra dentista pelo primeiro nome dentro do nome completo", () => {
    expect(fuzzyScore("fernando", "Fernando Müller Costa")).toBeGreaterThan(0);
    expect(fuzzyScore("muller", "Fernando Müller Costa")).toBeGreaterThan(0); // sem acento
  });

  it("tolera erro de digitação (Levenshtein)", () => {
    expect(fuzzyScore("sorocba", "Sorocaba")).toBeGreaterThan(0); // faltou 1 letra
    expect(fuzzyScore("fernamdo", "Fernando")).toBeGreaterThan(0); // 1 troca
  });

  it("retorna 0 quando não há relação e para entradas vazias", () => {
    expect(fuzzyScore("xyzwk", "Sorocaba")).toBe(0);
    expect(fuzzyScore("", "Sorocaba")).toBe(0);
    expect(fuzzyScore("soro", "")).toBe(0);
  });
});

// ─── buildCandidates ──────────────────────────────────────────────────────────
const dados: SuggestionData = {
  locations: [
    { cidade: "Sorocaba", estado: "SP", bairro: "Centro", nome_clinica: "Clínica Sorriso" },
    { cidade: "Sorocaba", estado: "SP", bairro: "Centro", nome_clinica: "Clínica Sorriso" }, // duplicado
    { cidade: "", estado: "", bairro: "", nome_clinica: "" }, // vazio → ignorado
  ],
  dentistas: ["Fernando Müller", "fernando müller", "Ana Paula", ""],
};

describe("buildCandidates", () => {
  const candidatos = buildCandidates(dados);
  const tipos = (t: AddressSuggestion["type"]) => candidatos.filter((c) => c.type === t);

  it("cria candidatos de cidade, bairro, clínica e dentista", () => {
    expect(tipos("cidade").map((c) => c.value)).toEqual(["Sorocaba"]);
    expect(tipos("bairro").map((c) => c.value)).toEqual(["Centro"]);
    expect(tipos("clinica").map((c) => c.value)).toEqual(["Clínica Sorriso"]);
    expect(tipos("dentista").map((c) => c.value)).toEqual(["Fernando Müller", "Ana Paula"]);
  });

  it("o rótulo da cidade inclui o estado; o do dentista é o próprio nome", () => {
    expect(tipos("cidade")[0].label).toBe("Sorocaba, SP");
    expect(tipos("dentista")[0]).toMatchObject({ label: "Fernando Müller", value: "Fernando Müller" });
  });

  it("deduplica nomes de dentista por nome normalizado (acento/caixa) e ignora vazios", () => {
    // "Fernando Müller" e "fernando müller" colapsam em 1; o "" é descartado.
    expect(tipos("dentista")).toHaveLength(2);
  });
});

// ─── filtrarSugestoes ─────────────────────────────────────────────────────────
describe("filtrarSugestoes", () => {
  const candidatos = buildCandidates(dados);

  it("não sugere nada com menos de 2 caracteres", () => {
    expect(filtrarSugestoes(candidatos, "")).toEqual([]);
    expect(filtrarSugestoes(candidatos, "f")).toEqual([]);
    expect(filtrarSugestoes(candidatos, "  ")).toEqual([]);
  });

  it("encontra o DENTISTA pelo nome digitado", () => {
    const res = filtrarSugestoes(candidatos, "fernando");
    expect(res.some((s) => s.type === "dentista" && s.value === "Fernando Müller")).toBe(true);
  });

  it("encontra a CIDADE pelo nome digitado", () => {
    const res = filtrarSugestoes(candidatos, "soroca");
    expect(res.some((s) => s.type === "cidade" && s.value === "Sorocaba")).toBe(true);
  });

  it("ordena por relevância (score desc) e respeita o limite de resultados", () => {
    const res = filtrarSugestoes(candidatos, "c", 2); // 'c' tem <2 chars → []
    expect(res).toEqual([]);
    const res2 = filtrarSugestoes(candidatos, "centro", 1);
    expect(res2.length).toBeLessThanOrEqual(1);
    const scores = filtrarSugestoes(candidatos, "soro").map((s) => s.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
