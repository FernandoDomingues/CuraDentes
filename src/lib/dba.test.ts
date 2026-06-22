// TESTE (TDD) — helpers puros do painel DBA (formato + agregação por período).
// `agora` é injetado para os testes não dependerem da data real.

import { describe, it, expect } from "vitest";
import { fmtBytes, num, chaveDia, chaveMes, nomeBucket, bucketsDoPeriodo, agregar, type SerieDia } from "./dba";

describe("fmtBytes", () => {
  it("usa KB abaixo de 1 MB e MB acima", () => {
    expect(fmtBytes(1024)).toBe("1.0 KB");
    expect(fmtBytes(2 * 1048576)).toBe("2.0 MB");
  });
});

describe("num", () => {
  it("converte com segurança e zera o inválido", () => {
    expect(num("5")).toBe(5);
    expect(num(undefined)).toBe(0);
    expect(num("abc")).toBe(0);
  });
});

describe("chaveDia/chaveMes", () => {
  it("formata YYYY-MM-DD e YYYY-MM", () => {
    const d = new Date(2026, 0, 5); // 5 jan 2026 (local)
    expect(chaveDia(d)).toBe("2026-01-05");
    expect(chaveMes(d)).toBe("2026-01");
  });
});

describe("nomeBucket", () => {
  it("traduz buckets conhecidos", () => {
    expect(nomeBucket("fotos-dentistas")).toBe("Fotos de perfil");
    expect(nomeBucket("xyz")).toBe("xyz");
  });
});

describe("bucketsDoPeriodo", () => {
  it("7 dias → 7 buckets diários", () => {
    const agora = new Date(2026, 5, 22);
    const { mensal, chaves } = bucketsDoPeriodo("7", agora);
    expect(mensal).toBe(false);
    expect(chaves).toHaveLength(7);
    expect(chaves[6].k).toBe("2026-06-22");
  });
  it("acima de 31 dias → buckets mensais", () => {
    const agora = new Date(2026, 5, 22);
    const { mensal } = bucketsDoPeriodo("180", agora);
    expect(mensal).toBe(true);
  });
});

describe("agregar", () => {
  it("soma os valores no bucket do dia certo e zera os demais", () => {
    const agora = new Date(2026, 5, 22);
    const serie: SerieDia[] = [
      { dia: "2026-06-22", buscas: 3, logins: 1, views: 0, contatos: 0, dentistas: 0, pacientes: 0 },
      { dia: "2026-06-21", buscas: 5, logins: 0, views: 0, contatos: 0, dentistas: 0, pacientes: 0 },
    ];
    const r = agregar(serie, "7", (x) => x.buscas, agora);
    expect(r).toHaveLength(7);
    expect(r[6]).toMatchObject({ chave: "2026-06-22", total: 3 });
    expect(r[5]).toMatchObject({ chave: "2026-06-21", total: 5 });
    expect(r[0].total).toBe(0);
  });
});
