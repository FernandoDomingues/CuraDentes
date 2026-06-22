// ═══════════════════════════════════════════════════════════════════════════════
// TESTE (TDD) — geradores de JSON-LD (dados estruturados).
//
// JSON-LD é o "rótulo legível por máquina" que colamos em cada página. É o que faz
// o Google mostrar estrelas e o que ajuda IAs (ChatGPT, Gemini, Perplexity) a
// entender e CITAR o conteúdo. É o coração do AEO desta fase.
//
// Testamos a FORMA do objeto gerado (tipos do schema.org, campos obrigatórios),
// não o HTML — assim garantimos que o dado estruturado está correto.
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { jsonLdDentista, jsonLdFaq, jsonLdBreadcrumb } from "./jsonld";
import type { DentistaPerfil } from "@/types/dentista";

function perfil(over: Partial<DentistaPerfil> = {}): DentistaPerfil {
  return {
    id: "abc-123",
    nome: "Ana Silva",
    tratamento: "Dra.",
    cro: "CROSP12345",
    cro_verificado: true,
    foto_url: "https://exemplo/foto.webp",
    bio: "Atendo com carinho.",
    instagram: "ana.dentista",
    especialidade_principal: "Implante dentário",
    enderecos: [
      {
        id: "end-1",
        nome_clinica: "Clínica Sorriso",
        logradouro: "Rua A",
        numero: "100",
        complemento: null,
        bairro: "Centro",
        cidade: "Sorocaba",
        estado: "SP",
        cep: "18000-000",
        telefone: "(15) 3333-3333",
        whatsapp: "5515999998888",
        atividades: ["Implante dentário"],
        convenios: ["Amil"],
        formas_pagamento: ["Pix"],
        agenda: [],
        atende_urgencias: false,
        estacionamento: true,
        observacoes: null,
      },
    ],
    avaliacoes: { media_geral: 0, total_avaliacoes: 0, por_atividade: [] },
    ...over,
  };
}

describe("jsonLdDentista", () => {
  it("usa o tipo Dentist do schema.org", () => {
    const ld = jsonLdDentista(perfil());
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Dentist");
  });

  it("nome inclui o tratamento (Dra.)", () => {
    expect(jsonLdDentista(perfil()).name).toBe("Dra. Ana Silva");
  });

  it("aponta a URL canônica do perfil", () => {
    expect(jsonLdDentista(perfil()).url).toContain("/dentista/abc-123");
  });

  it("inclui o endereço (PostalAddress) a partir do primeiro endereço", () => {
    const addr = jsonLdDentista(perfil()).address as Record<string, unknown>;
    expect(addr["@type"]).toBe("PostalAddress");
    expect(addr.addressLocality).toBe("Sorocaba");
    expect(addr.addressRegion).toBe("SP");
  });

  it("NÃO inclui aggregateRating quando não há avaliações", () => {
    expect(jsonLdDentista(perfil()).aggregateRating).toBeUndefined();
  });

  it("inclui aggregateRating quando há avaliações", () => {
    const ld = jsonLdDentista(
      perfil({ avaliacoes: { media_geral: 4.5, total_avaliacoes: 10, por_atividade: [] } }),
    );
    const ar = ld.aggregateRating as Record<string, unknown>;
    expect(ar["@type"]).toBe("AggregateRating");
    expect(ar.ratingValue).toBe("4.5");
    expect(ar.reviewCount).toBe(10);
  });

  it("declara a especialidade médica", () => {
    expect(jsonLdDentista(perfil()).medicalSpecialty).toBe("Implante dentário");
  });
});

describe("jsonLdFaq", () => {
  it("gera um FAQPage com cada pergunta como Question", () => {
    const ld = jsonLdFaq([{ pergunta: "Dói?", resposta: "Não." }]);
    expect(ld["@type"]).toBe("FAQPage");
    const itens = ld.mainEntity as Array<Record<string, unknown>>;
    expect(itens).toHaveLength(1);
    expect(itens[0]["@type"]).toBe("Question");
    expect(itens[0].name).toBe("Dói?");
    const ans = itens[0].acceptedAnswer as Record<string, unknown>;
    expect(ans["@type"]).toBe("Answer");
    expect(ans.text).toBe("Não.");
  });
});

describe("jsonLdBreadcrumb", () => {
  it("gera um BreadcrumbList com posições em ordem", () => {
    const ld = jsonLdBreadcrumb([
      { nome: "Início", url: "/" },
      { nome: "Implante dentário", url: "/especialidade/implante-dentario" },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    const itens = ld.itemListElement as Array<Record<string, unknown>>;
    expect(itens[0].position).toBe(1);
    expect(itens[1].position).toBe(2);
    expect(itens[1].name).toBe("Implante dentário");
    expect(String(itens[0].item)).toContain("https://");
  });
});
