// ═══════════════════════════════════════════════════════════════════════════════
// /pro/negocios/historico — extrato completo da locação (locador + locatário) + download.
// Guarda de CRO herdada de /pro/negocios/layout.tsx.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Container from "@/components/Container";
import { carregarRecebidas, carregarEnviadas } from "../acoes";
import HistoricoExtrato from "./HistoricoExtrato";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const [rec, env] = await Promise.all([carregarRecebidas(), carregarEnviadas()]);

  return (
    <Container className="py-10 md:py-12">
      <Link href="/pro/negocios" className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft size={16} /> Painel de salas
      </Link>
      <HistoricoExtrato recebidas={rec.itens} enviadas={env.itens} />
    </Container>
  );
}
