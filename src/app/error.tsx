"use client";

// Error boundary global (App Router). Captura exceções não tratadas em qualquer
// página/segmento e mostra uma tela com a cara da marca + botão "tentar de novo"
// (reset()), em vez da tela genérica do Next ("Application error"). Precisa ser
// Client Component. Não cobre erros do PRÓPRIO layout raiz (isso seria
// app/global-error.tsx) — cobre o conteúdo das páginas, que é onde quase tudo
// pode falhar (ex.: Supabase fora do ar numa página de perfil).

import { useEffect } from "react";
import Link from "next/link";
import Container from "@/components/Container";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log para diagnóstico no console (sem expor detalhes internos ao usuário).
    console.error("[erro]", error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-6xl font-bold text-brand-blue">Ops!</p>
      <h1 className="mt-4 text-3xl font-bold text-brand-navy">Algo deu errado</h1>
      <p className="mt-3 max-w-md text-ink-soft">
        Tivemos um problema inesperado ao carregar esta página. Você pode tentar
        novamente ou voltar para o início.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex min-h-[48px] items-center rounded-[14px] bg-brand-blue px-7 font-semibold text-white transition-colors hover:bg-brand-blue-600"
        >
          Tentar de novo
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[48px] items-center rounded-[14px] border px-7 font-semibold text-brand-navy transition-colors hover:bg-black/5"
          style={{ borderColor: "rgba(60,60,67,0.18)" }}
        >
          Voltar para o início
        </Link>
      </div>
    </Container>
  );
}
