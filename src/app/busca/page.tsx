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
    <Container className="py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-brand-navy">
          {termo ? `Resultados para “${termo}”` : "Buscar dentistas"}
        </h1>
        <p className="mt-2 text-ink-soft">
          Encontre profissionais por especialidade, cidade ou nome. Perfis verificados por CRO.
        </p>
        <div className="mt-8">
          {/* key = termo: ao navegar para outro ?q, o componente remonta e o campo
              de busca + resultados ficam coerentes com a URL (sem dessincronizar). */}
          <BuscaCliente key={termo} queryInicial={termo} />
        </div>
      </div>
    </Container>
  );
}
