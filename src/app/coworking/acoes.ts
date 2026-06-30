"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÃO DO LOCATÁRIO (servidor) — solicitar reserva de uma sala. Toda a regra (CRO
// dos dois lados, sala ativa, não-própria) vive na RPC criar_solicitacao_reserva
// (SECURITY DEFINER). Aqui só passamos o id da SESSÃO implícito (a RPC usa auth.uid).
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";

export async function solicitarReserva(input: {
  salaId: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  horaFim: string;
  mensagem: string;
}): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Entre como dentista para solicitar." };

  const { data, error } = await supabase.rpc("criar_solicitacao_reserva", {
    p_sala_id: input.salaId,
    p_data: input.data,
    p_hora_inicio: input.horaInicio,
    p_hora_fim: input.horaFim,
    p_mensagem: input.mensagem.trim() || null,
  });
  if (error) {
    // As mensagens da RPC já vêm em PT e são amigáveis (ex.: "Apenas dentistas com
    // CRO verificado podem solicitar."); o índice único devolve duplicidade.
    const msg = /duplicate key|sol_pendente_unica/i.test(error.message)
      ? "Você já tem uma solicitação pendente igual para esta sala."
      : error.message || "Não foi possível enviar a solicitação.";
    return { ok: false, erro: msg };
  }

  // Notifica o anfitrião (best-effort). A Edge Function vive no Supabase; se ainda
  // não existir, a falha é ignorada e não derruba a solicitação.
  try {
    await supabase.functions.invoke("notificar-reserva-sala", {
      body: { tipo: "nova", solicitacao_id: data },
    });
  } catch (e) {
    console.warn("[solicitarReserva] notificação:", e);
  }

  return { ok: true, id: data as string };
}
