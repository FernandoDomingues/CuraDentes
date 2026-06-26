import { describe, it, expect } from "vitest";
import {
  sanitizarTermoBusca,
  construirFiltrosEndereco,
  termoBuscaNome,
  urlBusca,
} from "./busca-filtro";

// ─── sanitizarTermoBusca ──────────────────────────────────────────────────────
describe("sanitizarTermoBusca", () => {
  it("mantém letras (com acento), números, espaço, hífen e ponto", () => {
    expect(sanitizarTermoBusca("São Paulo - SP 01")).toBe("São Paulo - SP 01");
    expect(sanitizarTermoBusca("Dr. Fernando Müller")).toBe("Dr. Fernando Müller");
  });

  it("remove vírgula, parênteses e curingas do ilike (% e *)", () => {
    expect(sanitizarTermoBusca("a),or(b")).toBe("a or b");
    expect(sanitizarTermoBusca("100%")).toBe("100");
    expect(sanitizarTermoBusca("a*b")).toBe("a b");
  });

  it("remove aspas, chaves e barra invertida", () => {
    expect(sanitizarTermoBusca(`a"b'c{d}e\\f`)).toBe("a b c d e f");
  });

  it("colapsa espaços repetidos e apara as pontas", () => {
    expect(sanitizarTermoBusca("  centro    sul  ")).toBe("centro sul");
  });

  it("trata vazio / null / undefined sem quebrar", () => {
    expect(sanitizarTermoBusca("")).toBe("");
    expect(sanitizarTermoBusca(null)).toBe("");
    expect(sanitizarTermoBusca(undefined)).toBe("");
  });
});

// ─── construirFiltrosEndereco ─────────────────────────────────────────────────
describe("construirFiltrosEndereco", () => {
  it("um termo → 1 filtro com os 5 campos de endereço/clínica", () => {
    expect(construirFiltrosEndereco("Sorocaba")).toEqual([
      "bairro.ilike.%Sorocaba%,cidade.ilike.%Sorocaba%,estado.ilike.%Sorocaba%,logradouro.ilike.%Sorocaba%,nome_clinica.ilike.%Sorocaba%",
    ]);
  });

  it("'bairro, cidade' → 2 filtros encadeados (combinados com AND pelo PostgREST)", () => {
    expect(construirFiltrosEndereco("Centro, Sorocaba")).toEqual([
      "bairro.ilike.%Centro%,cidade.ilike.%Centro%,nome_clinica.ilike.%Centro%,logradouro.ilike.%Centro%",
      "cidade.ilike.%Sorocaba%,estado.ilike.%Sorocaba%",
    ]);
  });

  it("ignora partes vazias e usa só as 2 primeiras de 3+", () => {
    expect(construirFiltrosEndereco("Centro, Sorocaba, SP")).toEqual([
      "bairro.ilike.%Centro%,cidade.ilike.%Centro%,nome_clinica.ilike.%Centro%,logradouro.ilike.%Centro%",
      "cidade.ilike.%Sorocaba%,estado.ilike.%Sorocaba%",
    ]);
  });

  it("vazio / só espaços / só separadores → [] (não devolve tudo)", () => {
    expect(construirFiltrosEndereco("")).toEqual([]);
    expect(construirFiltrosEndereco("   ")).toEqual([]);
    expect(construirFiltrosEndereco(",,,")).toEqual([]);
    // termo que vira vazio depois de sanitizar (só caracteres perigosos)
    expect(construirFiltrosEndereco("()%*")).toEqual([]);
  });

  it("SEGURANÇA: tentativas de injeção no .or() não vazam estrutura do PostgREST", () => {
    // Sem sanitização, um `),or(lgpd_aceito.eq.false` injetaria uma condição que
    // exporia perfis NÃO públicos. Aqui os caracteres estruturais são removidos.
    for (const ataque of [
      "x)or(lgpd_aceito.eq.false",
      "x),or(lgpd_aceito.eq.false",
      "a)or(deleted_at.not.is.null",
      "*)(",
    ]) {
      const tudo = construirFiltrosEndereco(ataque).join("|");
      expect(tudo).not.toContain("(");
      expect(tudo).not.toContain(")");
      expect(tudo).not.toContain("*");
      expect(tudo).not.toMatch(/,or\(/i);
    }
  });

  it("SEGURANÇA: curingas % do usuário não viram wildcard no filtro", () => {
    const filtros = construirFiltrosEndereco("50%");
    expect(filtros[0]).toContain("ilike.%50%"); // o % do usuário foi removido
    expect(filtros[0]).not.toContain("50%%");
  });
});

// ─── termoBuscaNome ───────────────────────────────────────────────────────────
describe("termoBuscaNome", () => {
  it("sanitiza o termo para o ilike do nome do dentista", () => {
    expect(termoBuscaNome("Fernando")).toBe("Fernando");
    expect(termoBuscaNome("a%b")).toBe("a b");
  });

  it("retorna '' quando não sobra conteúdo (busca por nome é pulada)", () => {
    expect(termoBuscaNome("   ")).toBe("");
    expect(termoBuscaNome("()")).toBe("");
  });
});

// ─── urlBusca ─────────────────────────────────────────────────────────────────
describe("urlBusca", () => {
  it("monta /busca?q= com o termo codificado", () => {
    expect(urlBusca("Sorocaba")).toBe("/busca?q=Sorocaba");
    expect(urlBusca("São Paulo")).toBe("/busca?q=S%C3%A3o+Paulo");
  });

  it("inclui o chip de especialidade (atividade) quando presente", () => {
    expect(urlBusca("Centro", "Ortodontia")).toBe("/busca?q=Centro&atividade=Ortodontia");
    expect(urlBusca("", "Ortodontia")).toBe("/busca?atividade=Ortodontia");
    expect(urlBusca("Centro", null)).toBe("/busca?q=Centro");
  });

  it("termo vazio (ou só espaços) e sem chip → /busca", () => {
    expect(urlBusca("")).toBe("/busca");
    expect(urlBusca("   ")).toBe("/busca");
  });

  it("escapa caracteres especiais sem quebrar a URL", () => {
    expect(urlBusca("a&b")).toBe("/busca?q=a%26b");
    expect(urlBusca("Dr. Silva")).toBe("/busca?q=Dr.+Silva");
  });
});
