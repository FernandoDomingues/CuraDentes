// ═══════════════════════════════════════════════════════════════════════════════
// TESTE (TDD — escrito antes da implementação).
//
// A camada de "especialidades" é o coração do conteúdo orgânico: cada especialidade
// vira uma página (/especialidade/<slug>) e precisa de:
//   • uma lista CANÔNICA (o nome exato que o dentista cadastra e o banco guarda);
//   • um "apelido" amigável que o PACIENTE vê (ex.: Periodontia -> Tratamento de gengiva);
//   • conteúdo de SEO (título, descrição, FAQ…) por especialidade;
//   • funções para ir de slug -> especialidade e de nome -> slug.
//
// Aqui descrevemos o comportamento esperado dessas peças.
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  ESPECIALIDADES,
  APELIDOS_ESPECIALIDADE,
  nomeAmigavel,
  slugDaEspecialidade,
  especialidadePorSlug,
  ESPECIALIDADES_SEO,
} from "./especialidades";

describe("ESPECIALIDADES (lista canônica)", () => {
  it("contém as especialidades principais do CuraDentes", () => {
    expect(ESPECIALIDADES).toContain("Clínico Geral");
    expect(ESPECIALIDADES).toContain("Implante dentário");
    expect(ESPECIALIDADES).toContain("Harmonização orofacial");
  });

  it("não tem nomes duplicados", () => {
    expect(new Set(ESPECIALIDADES).size).toBe(ESPECIALIDADES.length);
  });
});

describe("nomeAmigavel", () => {
  it("troca o nome canônico pelo apelido quando existe", () => {
    expect(nomeAmigavel("Periodontia")).toBe("Tratamento de gengiva");
    expect(nomeAmigavel("Odontopediatria")).toBe("Dentista infantil");
  });

  it("devolve o próprio nome quando não há apelido", () => {
    expect(nomeAmigavel("Clínico Geral")).toBe("Clínico Geral");
  });

  it("os apelidos só apontam para especialidades que existem", () => {
    for (const canonico of Object.keys(APELIDOS_ESPECIALIDADE)) {
      expect(ESPECIALIDADES).toContain(canonico);
    }
  });
});

describe("slugDaEspecialidade", () => {
  it("gera um slug estável a partir do nome canônico", () => {
    expect(slugDaEspecialidade("Clínico Geral")).toBe("clinico-geral");
    expect(slugDaEspecialidade("Harmonização orofacial")).toBe("harmonizacao-orofacial");
  });
});

describe("especialidadePorSlug", () => {
  it("encontra a especialidade pelo slug da URL", () => {
    const esp = especialidadePorSlug("implante-dentario");
    expect(esp?.nome).toBe("Implante dentário");
  });

  it("devolve undefined para um slug inexistente", () => {
    expect(especialidadePorSlug("nao-existe-isso")).toBeUndefined();
  });
});

describe("ESPECIALIDADES_SEO (conteúdo de cada página)", () => {
  it("tem uma entrada de SEO para toda especialidade da lista canônica", () => {
    for (const nome of ESPECIALIDADES) {
      expect(ESPECIALIDADES_SEO[nome], `faltou SEO para "${nome}"`).toBeDefined();
    }
  });

  it("cada entrada tem slug, título, descrição e ao menos uma FAQ", () => {
    for (const esp of Object.values(ESPECIALIDADES_SEO)) {
      expect(esp.slug).toBeTruthy();
      expect(esp.title).toBeTruthy();
      expect(esp.description).toBeTruthy();
      expect(esp.faq.length).toBeGreaterThan(0);
    }
  });

  it("o slug do SEO bate com o slug gerado a partir do nome", () => {
    for (const esp of Object.values(ESPECIALIDADES_SEO)) {
      expect(esp.slug).toBe(slugDaEspecialidade(esp.nome));
    }
  });
});
