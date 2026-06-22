// TESTE (TDD) — shaping da Análise do negócio. `agora` fixo p/ determinismo.
import { describe, it, expect } from "vitest";
import {
  diasDoPeriodo, logsNoPeriodo, origemLogins, funil, topListas,
  buscasSemResultado, heatPointsFracas, projecao, type LogBusca,
} from "./analytics";

const AGORA = new Date(2026, 5, 22, 12, 0, 0); // 22 jun 2026

function log(over: Partial<LogBusca> & { criado_em: string }): LogBusca {
  return { resultados_count: 1, ...over };
}

describe("diasDoPeriodo", () => {
  it("parseInt para período numérico", () => {
    expect(diasDoPeriodo("30", AGORA)).toBe(30);
  });
  it("ytd conta desde 1º de janeiro", () => {
    // 1 jan → 22 jun 2026: 172 dias (ceil)
    expect(diasDoPeriodo("ytd", AGORA)).toBeGreaterThan(160);
  });
});

describe("logsNoPeriodo", () => {
  it("mantém só eventos dentro da janela", () => {
    const logs = [log({ criado_em: "2026-06-20T10:00:00" }), log({ criado_em: "2026-01-01T10:00:00" })];
    expect(logsNoPeriodo(logs, "7", AGORA)).toHaveLength(1);
  });
});

describe("origemLogins", () => {
  it("agrupa por origem (null → Outro) e ordena desc", () => {
    const r = origemLogins(
      [
        { origem: "Chrome", criado_em: "2026-06-20T10:00:00" },
        { origem: "Chrome", criado_em: "2026-06-21T10:00:00" },
        { origem: null, criado_em: "2026-06-21T10:00:00" },
      ],
      "30",
      AGORA,
    );
    expect(r[0]).toEqual({ name: "Chrome", total: 2 });
    expect(r.find((x) => x.name === "Outro")?.total).toBe(1);
  });
});

describe("funil", () => {
  it("calcula etapas e taxas de conversão", () => {
    const logs = [log({ criado_em: "2026-06-20T10:00:00" }), log({ criado_em: "2026-06-20T11:00:00" })];
    const views = [{ criado_em: "2026-06-20T10:30:00" }];
    const contatos: { criado_em: string }[] = [];
    const f = funil(logs, views, contatos, "30", AGORA);
    expect(f.dados.map((d) => d.total)).toEqual([2, 1, 0]);
    expect(f.convBuscaView).toBeCloseTo(50);
    expect(f.convViewContato).toBe(0);
  });
});

describe("topListas", () => {
  it("junta demanda (buscas) e oferta (dentistas) por cidade normalizada", () => {
    const logs = [
      log({ cidade: "Sorocaba", criado_em: "2026-06-20T10:00:00" }),
      log({ cidade: "sorocaba", criado_em: "2026-06-20T11:00:00" }),
    ];
    const ends = [{ cidade: "Sorocaba" }, { cidade: "São Paulo" }];
    const r = topListas(logs, ends, "cidade", "30", AGORA);
    expect(r[0].name).toBe("Sorocaba"); // 1ª grafia preservada
    expect(r[0].buscas).toBe(2);
    expect(r[0].dentistas).toBe(1);
    expect(r[0].buscasPct).toBe(100);
  });
});

describe("buscasSemResultado", () => {
  it("conta as buscas com resultados_count 0", () => {
    const logs = [
      log({ resultados_count: 0, criado_em: "2026-06-20T10:00:00" }),
      log({ resultados_count: 3, criado_em: "2026-06-20T11:00:00" }),
    ];
    const r = buscasSemResultado(logs, "30", AGORA);
    expect(r.total).toBe(2);
    expect(r.qtdSemResultado).toBe(1);
    expect(r.pct).toBeCloseTo(50);
  });
});

describe("heatPointsFracas", () => {
  it("fica mais quente onde há busca e pouca oferta", () => {
    // mesma célula: 1 endereço (oferta) + 2 buscas (demanda) → q/(oferta+1)=2/2=1
    const ends = [{ latitude: -23.5, longitude: -47.5 }];
    const logs = [
      log({ latitude: -23.5, longitude: -47.5, criado_em: "2026-06-20T10:00:00" }),
      log({ latitude: -23.5, longitude: -47.5, criado_em: "2026-06-20T11:00:00" }),
    ];
    const r = heatPointsFracas(ends, logs);
    expect(r).toHaveLength(1);
    expect(r[0][2]).toBeCloseTo(1);
  });
});

describe("projecao", () => {
  it("null para série mensal (período > 31 dias)", () => {
    expect(projecao([{ total: 1 }, { total: 2 }, { total: 3 }], "180", AGORA)).toBeNull();
  });
  it("projeta crescimento numa tendência de alta", () => {
    const serie = [{ total: 1 }, { total: 2 }, { total: 3 }, { total: 4 }, { total: 5 }];
    const p = projecao(serie, "7", AGORA);
    expect(p).not.toBeNull();
    expect(p!.projetado).toBeGreaterThan(p!.atual);
  });
});
