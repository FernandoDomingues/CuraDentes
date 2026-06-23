// ═══════════════════════════════════════════════════════════════════════════════
// TESTE (TDD) — montagem do perfil público do dentista (partes PURAS).
//
// As funções de rede (que falam com o Supabase) não são testadas aqui; testamos
// as transformações puras, que são o que pode dar errado silenciosamente:
//   • normalizarAgenda — aceitar formatos novo/antigo e descartar lixo;
//   • montarPerfilDentista — escolher especialidade, limpar CRO, descartar foto blob;
//   • nomeExibicao — juntar tratamento + nome sem duplicar.
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  normalizarAgenda,
  montarPerfilDentista,
  nomeExibicao,
  type DentistaRow,
  type EnderecoRow,
} from "./dentistas";

// Linha de dentista "completa" reaproveitada nos testes (com overrides).
function dentistaRow(over: Partial<DentistaRow> = {}): DentistaRow {
  return {
    id: "abc-123",
    nome: "Ana Silva",
    tratamento: "Dra.",
    cro: "CRO SP 12345",
    cro_verificado: true,
    foto_url: "https://exemplo/foto.webp",
    bio: "Atendo com carinho.",
    instagram: "ana.dentista",
    especialidade: null,
    lgpd_aceito: true,
    deleted_at: null,
    ...over,
  };
}

function enderecoRow(over: Partial<EnderecoRow> = {}): EnderecoRow {
  return {
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
    atividades: ["Implante dentário", "Limpeza"],
    convenios: ["Amil"],
    formas_pagamento: ["Pix"],
    agenda: [],
    atende_urgencias: false,
    estacionamento: true,
    observacoes: null,
    ...over,
  };
}

describe("normalizarAgenda", () => {
  it("devolve [] para entradas que não são lista", () => {
    expect(normalizarAgenda(null)).toEqual([]);
    expect(normalizarAgenda("seg-sex")).toEqual([]);
  });

  it("aceita o formato novo (dia/inicio/fim)", () => {
    const r = normalizarAgenda([{ dia: "Segunda-feira", inicio: "08:00", fim: "18:00" }]);
    expect(r).toEqual([{ dia_semana: "Segunda-feira", horario_inicio: "08:00", horario_fim: "18:00" }]);
  });

  it("aceita o formato antigo (dia_semana/horario_inicio/horario_fim)", () => {
    const r = normalizarAgenda([{ dia_semana: "Terça", horario_inicio: "09:00", horario_fim: "17:00" }]);
    expect(r[0].dia_semana).toBe("Terça");
  });

  it("descarta dias inativos e incompletos", () => {
    const r = normalizarAgenda([
      { dia: "Seg", inicio: "08:00", fim: "12:00", ativo: false },
      { dia: "Ter", inicio: "", fim: "12:00" },
      { dia: "Qua", inicio: "08:00", fim: "12:00" },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].dia_semana).toBe("Qua");
  });
});

describe("montarPerfilDentista", () => {
  it("limpa o CRO (sem espaços) e marca cro_verificado", () => {
    const p = montarPerfilDentista(dentistaRow(), [enderecoRow()], []);
    expect(p.cro).toBe("CROSP12345");
    expect(p.cro_verificado).toBe(true);
  });

  it("usa a especialidade EXPLÍCITA do dentista quando preenchida (vence a atividade)", () => {
    const p = montarPerfilDentista(
      dentistaRow({ especialidade: "Ortodontia (aparelho)" }),
      [enderecoRow()],
      [],
    );
    expect(p.especialidade_principal).toBe("Ortodontia (aparelho)");
  });

  it("sem especialidade explícita, usa a 1ª atividade do 1º endereço (fallback)", () => {
    const p = montarPerfilDentista(dentistaRow(), [enderecoRow()], []);
    expect(p.especialidade_principal).toBe("Implante dentário");
  });

  it('cai em "Clínico Geral" quando não há atividades', () => {
    const p = montarPerfilDentista(dentistaRow(), [enderecoRow({ atividades: [] })], []);
    expect(p.especialidade_principal).toBe("Clínico Geral");
  });

  it("descarta foto blob: (upload não salvo)", () => {
    const p = montarPerfilDentista(dentistaRow({ foto_url: "blob:http://x/y" }), [], []);
    expect(p.foto_url).toBe("");
  });

  it("inclui o resumo de avaliações", () => {
    const p = montarPerfilDentista(dentistaRow(), [enderecoRow()], [{ nota: 4 }, { nota: 5 }]);
    expect(p.avaliacoes.total_avaliacoes).toBe(2);
    expect(p.avaliacoes.media_geral).toBeCloseTo(4.5);
  });

  it("normaliza a agenda dos endereços", () => {
    const p = montarPerfilDentista(
      dentistaRow(),
      [enderecoRow({ agenda: [{ dia: "Sex", inicio: "08:00", fim: "12:00" }] })],
      [],
    );
    expect(p.enderecos[0].agenda).toHaveLength(1);
  });
});

describe("nomeExibicao", () => {
  it("junta tratamento + nome", () => {
    expect(nomeExibicao({ nome: "Ana Silva", tratamento: "Dra." })).toBe("Dra. Ana Silva");
  });

  it("não duplica o tratamento se o nome já começa com ele", () => {
    expect(nomeExibicao({ nome: "Dra. Ana", tratamento: "Dra." })).toBe("Dra. Ana");
  });

  it("sem tratamento, devolve só o nome", () => {
    expect(nomeExibicao({ nome: "Ana Silva", tratamento: null })).toBe("Ana Silva");
  });
});
