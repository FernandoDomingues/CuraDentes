// ═══════════════════════════════════════════════════════════════════════════════
// BUSCA — /busca (Server Component: casca + SEO).
//
// Lê o parâmetro ?q= da URL (vem da home e das páginas de especialidade) e passa
// para o componente cliente, que faz a busca de fato. O título reflete o termo.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Container from "@/components/Container";
import BuscaCliente from "./BuscaCliente";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const termo = q?.trim();
  return {
    title: termo ? `Dentistas para “${termo}”` : "Buscar dentistas",
    description: termo
      ? `Resultados de dentistas para “${termo}” no CuraDentes — com avaliações, convênios e contato direto.`
      : "Busque dentistas por especialidade, procedimento, cidade ou nome no CuraDentes.",
    alternates: { canonical: "/busca" },
  };
}

export default async function BuscaPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const termo = q?.trim() ?? "";

  return (
    // Largura ampla (≈k11 max-w-[1200px]) para caber a sidebar de filtros + a grade
    // de cards em 2 colunas. O <h1> visível e o resto da casca ficam no
    // BuscaCliente (info bar), exatamente como no k11 (Pesquisa.tsx).
    <Container className="py-8 md:py-10">
      {/* key = termo: ao navegar para outro ?q, o componente remonta e o campo
          de busca + resultados ficam coerentes com a URL (sem dessincronizar). */}
      <BuscaCliente key={termo} queryInicial={termo} />
    </Container>
  );
}
