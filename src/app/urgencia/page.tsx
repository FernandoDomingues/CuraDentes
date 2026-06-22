// ═══════════════════════════════════════════════════════════════════════════════
// URGÊNCIA — /urgencia (Server Component: casca + SEO).
//
// Conteúdo indexável (título, descrição, intro) renderizado no servidor; a parte
// que depende de localização do usuário é o componente cliente <UrgenciaCliente />.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Container from "@/components/Container";
import UrgenciaCliente from "./UrgenciaCliente";

export const metadata: Metadata = {
  title: "Dentista de urgência perto de você",
  description:
    "Está com dor de dente agora? Encontre dentistas que atendem urgência perto de você e fale direto por WhatsApp ou telefone.",
  alternates: { canonical: "/urgencia" },
};

export default function UrgenciaPage() {
  return (
    <Container className="py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <span className="text-[13px] font-semibold uppercase tracking-widest text-brand-magenta">
          Urgência odontológica
        </span>
        <h1 className="mt-2 text-3xl font-bold text-brand-navy md:text-4xl">
          Precisa de um dentista agora?
        </h1>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Dor de dente, fratura ou inchaço não esperam. Mostramos os dentistas que atendem
          urgência mais próximos de você, com contato direto por WhatsApp ou telefone — sem
          intermediários.
        </p>

        <div className="mt-8">
          <UrgenciaCliente />
        </div>
      </div>
    </Container>
  );
}
