// ═══════════════════════════════════════════════════════════════════════════════
// /pro/salas — PAINEL único de Locação de Salas (locador + locatário).
// Guarda de CRO herdada de /pro/salas/layout.tsx. Carrega salas + solicitações
// recebidas + enviadas e entrega ao PainelSalas (abas com contadores).
// ═══════════════════════════════════════════════════════════════════════════════

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
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-brand-navy">Locação de salas</h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          Gerencie suas salas, as solicitações que você recebeu e os seus próprios pedidos.
        </p>
      </div>
      <PainelSalas
        salas={minhas.salas}
        recebidas={rec.itens}
        enviadas={env.itens}
        semEndereco={minhas.enderecos.length === 0}
        abaInicial={abaInicial}
      />
    </Container>
  );
}
