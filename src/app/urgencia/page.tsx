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
      <div className="mx-auto" style={{ maxWidth: 560 }}>
        {/* Título (porte fiel do k11) — renderizado no servidor para SEO/indexação.
            O H1 fica aqui (único na página); o componente cliente só cuida da
            interação (localização + lista). */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "#E6004C", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <img src="/icons/emergencia.svg" width={32} height={32} alt="" />
          </div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", color: "#0A2A66", margin: 0 }}>
            Urgência odontológica
          </h1>
          <p style={{ color: "#5c6b7a", fontSize: 15, marginTop: 6, lineHeight: 1.5 }}>
            Dor de dente, fratura ou inchaço não esperam — encontre os dentistas que atendem
            urgência mais perto de você, com contato direto por WhatsApp ou telefone.
          </p>
        </div>

        <UrgenciaCliente />
      </div>
    </Container>
  );
}
