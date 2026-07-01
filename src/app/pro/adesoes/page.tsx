// ═══════════════════════════════════════════════════════════════════════════════
// /pro/adesoes — o DONO da clínica vê e decide pedidos de OUTROS dentistas que se
// cadastraram no mesmo endereço físico (mesma clinica_key). Aprovar libera o
// perfil daquele dentista naquele endereço (passa a aparecer no /coworking etc.).
//
// NÃO é gateado por CRO: o dono pode não ter CRO verificado e ainda assim precisa
// decidir quem entra na "sua" clínica. Só exige sessão de dentista.
// ═══════════════════════════════════════════════════════════════════════════════

import { redirect } from "next/navigation";
import Link from "next/link";
import Container from "@/components/Container";
import { Building2, ArrowLeft } from "lucide-react";
import { getUsuario } from "@/lib/auth";
import { carregarAdesoesPendentes } from "./acoes";
import AdesoesCliente from "./AdesoesCliente";

export const dynamic = "force-dynamic";

export default async function AdesoesPage() {
  const usuario = await getUsuario();
  // (O layout /pro já barra anônimo → /login-necessario; mantido por segurança/consistência.)
  if (!usuario) redirect("/login-necessario");
  if (usuario.papel === "paciente") redirect("/");

  const adesoes = await carregarAdesoesPendentes();

  return (
    <Container className="py-10 md:py-12">
      <Link href="/pro/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-brand-blue">
        <ArrowLeft size={15} /> Voltar ao painel
      </Link>

      <div className="mb-2 flex items-center gap-2.5">
        <Building2 size={22} style={{ color: "#007AFF" }} />
        <h1 className="text-2xl font-bold text-brand-navy">Pedidos de adesão à sua clínica</h1>
      </div>
      <p className="mb-8 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Outros dentistas se cadastraram no mesmo endereço de uma clínica que você criou.
        Ao <strong>aprovar</strong>, o perfil do dentista passa a aparecer naquele endereço (busca, coworking).
        Enquanto estiver pendente, o endereço dele fica oculto.
      </p>

      <AdesoesCliente iniciais={adesoes} />
    </Container>
  );
}
