"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DA VERIFICAÇÃO DE CRO (servidor, superuser) — refactor do C1.
// marcar/reabrir via cliente do servidor (RLS/RPC gated em superuser); a notificação
// por Edge Function passa a ser invocada NO SERVIDOR (com a sessão dos cookies), em
// vez de ler o token na mão via lerSessaoDoCookie no cliente (o caso mais dependente).
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";

/** Marca a CRO como verificada/rejeitada (RPC fonte da verdade; gated em superuser). */
export async function marcarVerificacaoCro(
  dentistaId: string,
  verificado: boolean,
  observacao: string | null,
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase.rpc("marcar_verificacao_cro", {
    p_dentista_id: dentistaId,
    p_verificado: verificado,
    p_observacao: observacao,
  });
  const ok = !error && (data as { success?: boolean } | null)?.success;
  if (!ok) {
    const detalhe = (data as { error?: string } | null)?.error || error?.message || "Erro desconhecido";
    return { ok: false, erro: detalhe };
  }
  return { ok: true };
}

/** Envia o e-mail oficial de regularização (Edge Function) — best-effort, com a sessão. */
export async function notificarCroInativa(args: { email: string; nome: string; cro: string }): Promise<boolean> {
  try {
    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !args.email) return false;
    const { error } = await supabase.functions.invoke("notificar-cro-inativa", {
      body: { email: args.email, nome: args.nome, cro: args.cro },
    });
    return !error;
  } catch {
    return false;
  }
}

/** Reabre uma verificação que falhou (volta a status "pendente"). */
export async function reabrirVerificacao(verificacaoId: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const { error } = await supabase
    .from("cro_verificacoes")
    .update({ status: "pendente", erro: null })
    .eq("id", verificacaoId);
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}
