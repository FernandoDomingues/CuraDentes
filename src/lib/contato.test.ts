// TESTE (TDD) — montagem dos links de contato/mapa (funções puras).
// Esses links aparecem em vários lugares (perfil, urgência, busca), então vale
// garantir que ficam corretos e seguros.

import { describe, it, expect } from "vitest";
import { urlWhatsapp, urlInstagram, urlMapsEndereco, telLimpo, urlAvaliarGoogle } from "./contato";

describe("urlWhatsapp", () => {
  it("monta o link wa.me só com dígitos", () => {
    expect(urlWhatsapp("(15) 99999-8888")).toBe("https://wa.me/5515999998888");
  });
  it("não duplica o 55 se já vier com DDI", () => {
    expect(urlWhatsapp("5515999998888")).toBe("https://wa.me/5515999998888");
  });
  it("retorna null se não houver número", () => {
    expect(urlWhatsapp("")).toBeNull();
    expect(urlWhatsapp(null)).toBeNull();
  });
});

describe("urlAvaliarGoogle", () => {
  it("usa um link pronto como está", () => {
    expect(urlAvaliarGoogle("https://g.page/r/abc/review")).toBe("https://g.page/r/abc/review");
  });
  it("monta o deep link de avaliação a partir de um Place ID", () => {
    expect(urlAvaliarGoogle("ChIJN1t_tDeuEmsRUsoyG83frY4")).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
    );
  });
  it("retorna null para vazio/ inválido", () => {
    expect(urlAvaliarGoogle("")).toBeNull();
    expect(urlAvaliarGoogle(null)).toBeNull();
    expect(urlAvaliarGoogle("abc")).toBeNull();
  });
});

describe("urlInstagram", () => {
  it("monta a URL a partir do handle, ignorando @", () => {
    expect(urlInstagram("@ana.dentista")).toBe("https://instagram.com/ana.dentista");
    expect(urlInstagram("ana.dentista")).toBe("https://instagram.com/ana.dentista");
  });
  it("aceita URL completa já pronta", () => {
    expect(urlInstagram("https://instagram.com/ana")).toBe("https://instagram.com/ana");
  });
  it("retorna null sem handle", () => {
    expect(urlInstagram(null)).toBeNull();
  });
});

describe("urlMapsEndereco", () => {
  it("monta uma busca do Google Maps a partir das partes do endereço", () => {
    const u = urlMapsEndereco({ logradouro: "Rua A", numero: "100", bairro: "Centro", cidade: "Sorocaba", estado: "SP" });
    expect(u).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(decodeURIComponent(u)).toContain("Rua A, 100");
    expect(decodeURIComponent(u)).toContain("Sorocaba");
  });
});

describe("telLimpo", () => {
  it("gera o href tel: só com dígitos", () => {
    expect(telLimpo("(15) 3333-3333")).toBe("tel:1533333333");
  });
  it("retorna null sem número", () => {
    expect(telLimpo(null)).toBeNull();
  });
});
