// ═══════════════════════════════════════════════════════════════════════════════
// /pro/salas/solicitacoes — painel do ANFITRIÃO: pedidos recebidos nas suas salas.
// Aprovar/recusar; após aprovar, libera o contato do dentista. Guarda via ProLayout.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";
import Container from "@/components/Container";
import { carregarRecebidas } from "../acoes";
import SolicitacaoCard from "../SolicitacaoCard";

export const dynamic = "force-dynamic";

export default async function SolicitacoesRecebidasPage() {
  const { itens } = await carregarRecebidas();
  const pendentes = itens.filter((i) => i.status === "pendente");
  const outras = itens.filter((i) => i.status !== "pendente");

  return (
    <Container className="py-10 md:py-12">
      <Link
        href="/pro/salas"
        className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> Minhas salas
      </Link>
      <h1 className="text-[26px] font-bold text-brand-navy">Solicitações recebidas</h1>
      <p className="mt-1 mb-8 text-[15px] text-ink-soft">
        Pedidos de dentistas para usar suas salas. Ao aprovar, vocês trocam o contato.
      </p>

      {itens.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-[20px] py-14 text-center"
          style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}
        >
          <Inbox size={34} style={{ color: "rgba(0,122,255,0.30)" }} />
          <p className="text-[16px] font-semibold text-brand-navy">Nenhuma solicitação ainda</p>
          <p className="text-[14px] text-ink-muted">
            Quando um dentista pedir uma das suas salas, aparece aqui.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {pendentes.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-muted">
                Pendentes ({pendentes.length})
              </h2>
              {pendentes.map((i) => (
                <SolicitacaoCard key={i.id} item={i} modo="recebida" />
              ))}
            </section>
          )}
          {outras.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-muted">
                Histórico
              </h2>
              {outras.map((i) => (
                <SolicitacaoCard key={i.id} item={i} modo="recebida" />
              ))}
            </section>
          )}
        </div>
      )}
    </Container>
  );
}
