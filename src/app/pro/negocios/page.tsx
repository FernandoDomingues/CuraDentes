// ═══════════════════════════════════════════════════════════════════════════════
// /pro/negocios — PAINEL único de Locação de Salas (locador + locatário).
// Guarda de CRO herdada de /pro/negocios/layout.tsx. Carrega salas + solicitações
// recebidas + enviadas e entrega ao PainelSalas (abas com contadores).
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { History } from "lucide-react";
import Container from "@/components/Container";
import { carregarMinhasSalas, carregarRecebidas, carregarEnviadas } from "./acoes";
import PainelSalas from "./PainelSalas";

export const dynamic = "force-dynamic";

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const [minhas, rec, env] = await Promise.all([
    carregarMinhasSalas(),
    carregarRecebidas(),
    carregarEnviadas(),
  ]);
  const abaInicial = aba === "enviadas" ? "enviadas" : aba === "salas" ? "salas" : "recebidas";

  return (
    <Container className="py-10 md:py-12">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-brand-navy">Locação de salas</h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            Gerencie suas salas, as solicitações que você recebeu e os seus próprios pedidos.
          </p>
        </div>
        <Link
          href="/pro/negocios/historico"
          className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-[12px] border border-black/10 px-4 text-[14px] font-semibold text-brand-navy transition-colors hover:bg-black/[0.04]"
        >
          <History size={16} /> Histórico
        </Link>
      </div>
      <PainelSalas
        salas={minhas.salas}
        enderecos={minhas.enderecos}
        recebidas={rec.itens}
        enviadas={env.itens}
        semEndereco={minhas.enderecos.length === 0}
        abaInicial={abaInicial}
      />
    </Container>
  );
}
