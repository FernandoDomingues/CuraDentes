// Página 404 (não encontrado) com a cara da marca. O Next mostra esta página
// sempre que uma rota não existe ou quando chamamos notFound() (ex.: dentista
// inexistente). Não deve ser indexada.

import Link from "next/link";
import type { Metadata } from "next";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-6xl font-bold text-brand-blue">404</p>
      <h1 className="mt-4 text-3xl font-bold text-brand-navy">Página não encontrada</h1>
      <p className="mt-3 max-w-md text-ink-soft">
        O que você procura não existe ou foi movido. Que tal voltar para o início e
        buscar um dentista?
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-[48px] items-center rounded-[14px] bg-brand-blue px-7 font-semibold text-white transition-colors hover:bg-brand-blue-600"
      >
        Voltar para o início
      </Link>
    </Container>
  );
}
