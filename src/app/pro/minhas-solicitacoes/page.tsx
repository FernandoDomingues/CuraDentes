// ═══════════════════════════════════════════════════════════════════════════════
// /pro/minhas-solicitacoes — painel do LOCATÁRIO: pedidos que ELE enviou.
// Acompanha status; cancela enquanto pendente; vê o contato da clínica se aprovado.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { Send, Search } from "lucide-react";
import Container from "@/components/Container";
import { carregarEnviadas } from "../salas/acoes";
import SolicitacaoCard from "../salas/SolicitacaoCard";

export const dynamic = "force-dynamic";

export default async function MinhasSolicitacoesPage() {
  const { itens } = await carregarEnviadas();

  return (
    <Container className="py-10 md:py-12">
      <h1 className="text-[26px] font-bold text-brand-navy">Minhas solicitações</h1>
      <p className="mt-1 mb-8 text-[15px] text-ink-soft">
        Salas que você pediu para alugar. Se aprovada, o contato da clínica fica disponível aqui.
      </p>

      {itens.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-[20px] py-14 text-center"
          style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}
        >
          <Send size={32} style={{ color: "rgba(0,122,255,0.30)" }} />
          <p className="text-[16px] font-semibold text-brand-navy">Você ainda não solicitou salas</p>
          <Link
            href="/salas"
            className="mt-2 inline-flex items-center gap-2 rounded-[14px] px-6 py-3 text-[14px] font-semibold text-white"
            style={{ background: "#007aff" }}
          >
            <Search size={16} /> Procurar salas
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {itens.map((i) => (
            <SolicitacaoCard key={i.id} item={i} modo="enviada" />
          ))}
        </div>
      )}
    </Container>
  );
}
