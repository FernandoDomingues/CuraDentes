// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICAR CRO — detalhe (/pro/verificar-cro/[id]) — Server Component.
// Carrega a verificação + dados do dentista (join) e entrega ao cliente, que faz a
// consulta no CFO (iframe) e marca verificado/falhou via RPC. Superuser-only (layout).
// ═══════════════════════════════════════════════════════════════════════════════

import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import VerificarCroDetalheCliente, { type VerificacaoDetalhe } from "./VerificarCroDetalheCliente";

export const dynamic = "force-dynamic";

export default async function VerificarCroDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await criarClienteServidor();

  // A coluna `email` de curadentespro NÃO é legível via REST (revogada por
  // privilégio — ver proteger_contato_dentista). Selecioná-la aqui fazia a query
  // do superuser falhar (erro 42501) e cair no notFound() → 404. Por isso o join
  // NÃO inclui `email`; lemos o e-mail à parte pela RPC gated `emails_dentistas_cro`,
  // exatamente como a página da fila (verificar-cro/page.tsx).
  const { data, error } = await supabase
    .from("cro_verificacoes")
    .select("*, curadentespro!inner ( nome, cro, cro_verificado, foto_url )")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  // E-mail do dentista (necessário para notificá-lo na rejeição) via RPC superuser.
  const dentistaId = (data as { dentista_id: string }).dentista_id;
  const { data: emails } = await supabase.rpc("emails_dentistas_cro");
  const email =
    ((emails as { id: string; email: string | null }[] | null) ?? []).find((e) => e.id === dentistaId)?.email ?? "";

  const detalhe = {
    ...(data as Record<string, unknown>),
    curadentespro: {
      ...(data as { curadentespro: Record<string, unknown> }).curadentespro,
      email,
    },
  };

  return <VerificarCroDetalheCliente verificacao={detalhe as unknown as VerificacaoDetalhe} />;
}
