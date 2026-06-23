// ═══════════════════════════════════════════════════════════════════════════════
// HOME (/) — Server Component que compõe as seções da landing page na MESMA
// ordem do site antigo (k11), para ficar visualmente idêntica:
//   Hero → Como funciona → Últimos dentistas → Especialidades
//   → CTA dentistas → Missão/Visão/Valores → App mobile
//
// O fundo da home é #F2F2F7 (igual ao antigo); as seções trazem seus próprios
// fundos (glass, tints). Inclui JSON-LD de Organization e WebSite (SEO/AEO).
// ═══════════════════════════════════════════════════════════════════════════════

import JsonLd from "@/components/JsonLd";
import { jsonLdOrganizacao, jsonLdWebSite } from "@/lib/jsonld";
import { supabase } from "@/lib/supabase/public";
import Hero from "@/components/home/Hero";
import ComoFunciona from "@/components/home/ComoFunciona";
import UltimosDentistas from "@/components/home/UltimosDentistas";
import Especialidades from "@/components/home/Especialidades";
import CtaDentistas from "@/components/home/CtaDentistas";
import SobreMVV from "@/components/home/SobreMVV";
import AppMobile from "@/components/home/AppMobile";

// Recacheia a home a cada 5 min (ISR): a contagem de dentistas é buscada no
// servidor na revalidação — no MÁXIMO 1 query a cada 5 min, compartilhada por
// TODOS os visitantes (sem query por visita; não satura o banco sob tráfego/ataque).
export const revalidate = 300;

async function contarDentistas(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("curadentespro")
      .select("id", { count: "exact", head: true })
      .eq("lgpd_aceito", true)
      .is("deleted_at", null);
    return !error && typeof count === "number" ? count : 0;
  } catch {
    return 0;
  }
}

export default async function Home() {
  const contagem = await contarDentistas();
  return (
    <>
      <JsonLd data={[jsonLdOrganizacao(), jsonLdWebSite()]} />

      <div style={{ background: "#F2F2F7" }}>
        {/* Herói: busca, localização, urgência, chips e contador (vem do servidor) */}
        <Hero contagemInicial={contagem} />

        {/* 3 passos para agendar */}
        <ComoFunciona />

        {/* Últimos dentistas cadastrados (expansível, dados do Supabase) */}
        <UltimosDentistas />

        {/* Grade de especialidades */}
        <Especialidades />

        {/* Chamada para dentistas se cadastrarem */}
        <CtaDentistas />

        {/* Missão, visão e valores */}
        <SobreMVV />

        {/* App mobile (em breve) */}
        <AppMobile />
      </div>
    </>
  );
}
