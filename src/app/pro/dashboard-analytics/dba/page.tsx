// ═══════════════════════════════════════════════════════════════════════════════
// PAINEL DBA — /pro/dashboard-analytics/dba (Server Component).
//
// Superuser-only (guard no layout pai). Carrega no servidor os dados das RPCs
// SECURITY DEFINER dba_estatisticas() (snapshot) e dba_series() (séries por dia),
// e entrega ao componente cliente, que monta os gráficos (recharts) e filtros.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import Container from "@/components/Container";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { SerieDia } from "@/lib/dba";
import DbaPainel, { type DbaStats } from "./DbaPainel";

export const dynamic = "force-dynamic";

export default async function DbaPage() {
  const supabase = await criarClienteServidor();
  const [statsRes, serieRes] = await Promise.all([
    supabase.rpc("dba_estatisticas"),
    supabase.rpc("dba_series"),
  ]);

  if (statsRes.error || !statsRes.data) {
    return (
      <Container className="py-10">
        <Link href="/pro/dashboard-analytics" className="text-sm text-brand-blue hover:underline">← Voltar</Link>
        <div className="mt-4 rounded-2xl bg-white p-6 text-ink-muted shadow-sm">
          Não foi possível carregar as estatísticas do banco. {statsRes.error?.message}
        </div>
      </Container>
    );
  }

  // Se a série falhar (mas o snapshot veio), seguimos com os gráficos vazios —
  // mas registramos para não confundir "sem dados" com "falha ao carregar".
  if (serieRes.error) console.warn("[dba] dba_series falhou:", serieRes.error.message);

  return <DbaPainel stats={statsRes.data as DbaStats} serie={(serieRes.data as SerieDia[]) ?? []} />;
}
