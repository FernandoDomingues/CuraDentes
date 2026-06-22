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

  const { data, error } = await supabase
    .from("cro_verificacoes")
    .select("*, curadentespro!inner ( nome, email, cro, cro_verificado, foto_url )")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return <VerificarCroDetalheCliente verificacao={data as unknown as VerificacaoDetalhe} />;
}
