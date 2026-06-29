"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DO ANFITRIÃO (servidor) — CRUD das salas, sempre com o id da SESSÃO.
// Os campos desnormalizados (nome_clinica/cidade/lat/lng) NÃO são enviados: o
// trigger salas_sync_endereco os deriva do endereço (e valida a posse). Ver Fase 0.
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  SalaForm,
  SalaStatus,
  MinhaSala,
  EnderecoResumo,
  SolicitacaoReserva,
  ContatoReserva,
  ContatoSolicitante,
} from "@/lib/salas";

/** Solicitação enriquecida com o título/local da sala (para listar nos painéis). */
export interface SolicitacaoItem extends SolicitacaoReserva {
  sala_titulo: string | null;
  sala_local: string | null;
}

async function sessao() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, uid: (user?.id ?? null) as string | null };
}

/** Carrega as salas do anfitrião + seus endereços (para o formulário). */
export async function carregarMinhasSalas(): Promise<{
  ok: boolean;
  semSessao?: boolean;
  enderecos: EnderecoResumo[];
  salas: MinhaSala[];
}> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: true, semSessao: true, enderecos: [], salas: [] };

  const [endRes, salaRes] = await Promise.all([
    supabase
      .from("curadentespro_enderecos")
      .select("id, nome_clinica, cidade, bairro")
      .eq("curadentespro_id", uid),
    supabase
      .from("salas")
      .select("*")
      .eq("anfitriao_id", uid)
      .neq("status", "removida")
      .order("created_at", { ascending: false }),
  ]);

  return {
    ok: true,
    enderecos: (endRes.data as EnderecoResumo[]) ?? [],
    salas: (salaRes.data as MinhaSala[]) ?? [],
  };
}

/** Cria ou atualiza uma sala. anfitriao_id = sessão; trigger deriva o resto. */
export async function salvarSala(
  input: SalaForm,
): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  // Validações de borda (a RLS/trigger é a guarda final).
  if (!input.endereco_id) return { ok: false, erro: "Escolha em qual endereço a sala fica." };
  if (!input.titulo.trim()) return { ok: false, erro: "Dê um título à sala." };
  const preco = Number(String(input.preco_valor).replace(",", "."));
  if (!Number.isFinite(preco) || preco < 0) return { ok: false, erro: "Informe um preço válido." };
  if (!input.contato_whatsapp.trim() && !input.contato_email.trim()) {
    return { ok: false, erro: "Informe ao menos um contato de locação (WhatsApp ou e-mail)." };
  }

  const payload = {
    anfitriao_id: uid,
    endereco_id: input.endereco_id,
    titulo: input.titulo.trim(),
    descricao: input.descricao.trim() || null,
    equipamentos: input.equipamentos,
    preco_valor: preco,
    preco_unidade: input.preco_unidade,
    disponibilidade: input.disponibilidade,
    politica_cancelamento: input.politica_cancelamento.trim() || null,
    contato_whatsapp: input.contato_whatsapp.trim() || null,
    contato_email: input.contato_email.trim() || null,
  };

  if (input.id) {
    const { error } = await supabase.from("salas").update(payload).eq("id", input.id);
    if (error) return { ok: false, erro: error.message || "Não foi possível salvar a sala." };
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabase.from("salas").insert(payload).select("id").single();
  if (error) return { ok: false, erro: error.message || "Não foi possível criar a sala." };
  return { ok: true, id: (data?.id as string) ?? undefined };
}

/** Pausa / reativa / remove (soft) uma sala do anfitrião. */
export async function atualizarStatusSala(
  id: string,
  status: SalaStatus,
): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada." };
  const { error } = await supabase.from("salas").update({ status }).eq("id", id);
  if (error) return { ok: false, erro: error.message || "Não foi possível atualizar a sala." };
  return { ok: true };
}

// ─── Solicitações de reserva ─────────────────────────────────────────────────────
// A RLS só deixa cada parte LER as suas (sol_select); toda escrita é via RPC gated.

/** Solicitações RECEBIDAS (anfitrião): título da sala vem por embed (ele é o dono). */
export async function carregarRecebidas(): Promise<{
  ok: boolean;
  semSessao?: boolean;
  itens: SolicitacaoItem[];
}> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: true, semSessao: true, itens: [] };
  const { data } = await supabase
    .from("solicitacoes_reserva")
    .select("*, sala:salas(titulo, cidade, bairro)")
    .eq("anfitriao_id", uid)
    .order("created_at", { ascending: false });
  const itens = ((data as Record<string, unknown>[]) ?? []).map((r) => {
    const sala = (r.sala ?? {}) as { titulo?: string; cidade?: string; bairro?: string };
    return {
      ...(r as unknown as SolicitacaoReserva),
      sala_titulo: sala.titulo ?? null,
      sala_local: [sala.bairro, sala.cidade].filter(Boolean).join(", ") || null,
    };
  });
  return { ok: true, itens };
}

/** Solicitações ENVIADAS (locatário): a base `salas` é owner-only, então o título
 *  vem da view pública `salas_publicas` (só ativas; pausada cai para "Sala"). */
export async function carregarEnviadas(): Promise<{
  ok: boolean;
  semSessao?: boolean;
  itens: SolicitacaoItem[];
}> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: true, semSessao: true, itens: [] };
  const { data } = await supabase
    .from("solicitacoes_reserva")
    .select("*")
    .eq("locatario_id", uid)
    .order("created_at", { ascending: false });
  const rows = (data as SolicitacaoReserva[]) ?? [];

  const ids = [...new Set(rows.map((r) => r.sala_id))];
  const mapa = new Map<string, { titulo: string; local: string | null }>();
  if (ids.length) {
    const { data: pubs } = await supabase
      .from("salas_publicas")
      .select("id, titulo, cidade, bairro")
      .in("id", ids);
    for (const p of (pubs as { id: string; titulo: string; cidade?: string; bairro?: string }[]) ?? []) {
      mapa.set(p.id, {
        titulo: p.titulo,
        local: [p.bairro, p.cidade].filter(Boolean).join(", ") || null,
      });
    }
  }
  const itens = rows.map((r) => ({
    ...r,
    sala_titulo: mapa.get(r.sala_id)?.titulo ?? null,
    sala_local: mapa.get(r.sala_id)?.local ?? null,
  }));
  return { ok: true, itens };
}

/** Anfitrião aprova/recusa (RPC revalida CRO na aprovação). Notifica best-effort. */
export async function decidirSolicitacao(
  id: string,
  decisao: "aprovada" | "recusada",
  observacao?: string,
): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada." };
  const { error } = await supabase.rpc("decidir_solicitacao_reserva", {
    p_id: id,
    p_decisao: decisao,
    p_observacao: observacao?.trim() || null,
  });
  if (error) return { ok: false, erro: error.message || "Não foi possível registrar a decisão." };
  try {
    await supabase.functions.invoke("notificar-reserva-sala", {
      body: { tipo: decisao, solicitacao_id: id },
    });
  } catch (e) {
    console.warn("[decidirSolicitacao] notificação:", e);
  }
  return { ok: true };
}

/** Locatário cancela a própria solicitação (só enquanto pendente; RPC valida). */
export async function cancelarSolicitacao(id: string): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada." };
  const { error } = await supabase.rpc("cancelar_solicitacao", { p_id: id });
  if (error) return { ok: false, erro: error.message || "Não foi possível cancelar." };
  return { ok: true };
}

/** Contato da contraparte — só após aprovação. A RPC devolve a linha conforme o papel. */
export async function verContato(
  id: string,
): Promise<{ ok: boolean; erro?: string; contato?: ContatoReserva }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada." };
  const { data, error } = await supabase.rpc("contato_da_reserva", { p_id: id });
  if (error) return { ok: false, erro: error.message || "Contato indisponível." };
  const row = (Array.isArray(data) ? data[0] : data) as ContatoReserva | undefined;
  if (!row) return { ok: false, erro: "Contato indisponível." };
  return { ok: true, contato: row };
}

/** Locador vê o contato do SOLICITANTE (inclusive antes de decidir). RPC gated. */
export async function contatoSolicitante(
  id: string,
): Promise<{ ok: boolean; erro?: string; contato?: ContatoSolicitante }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada." };
  const { data, error } = await supabase.rpc("contato_solicitante", { p_id: id });
  if (error) return { ok: false, erro: error.message || "Contato indisponível." };
  const row = (Array.isArray(data) ? data[0] : data) as ContatoSolicitante | undefined;
  if (!row) return { ok: false, erro: "Contato indisponível." };
  return { ok: true, contato: row };
}

/** Locatário marca o pagamento como resolvido (off-platform). RPC gated. */
export async function marcarPagamentoResolvido(id: string): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada." };
  const { error } = await supabase.rpc("marcar_pagamento_resolvido", { p_id: id });
  if (error) return { ok: false, erro: error.message || "Não foi possível marcar." };
  return { ok: true };
}

/** Contadores de pendência p/ o badge do dashboard (locador + locatário). */
export async function contarPendencias(): Promise<{
  recebidasPendentes: number;
  pagamentosPendentes: number;
  total: number;
}> {
  const { supabase, uid } = await sessao();
  if (!uid) return { recebidasPendentes: 0, pagamentosPendentes: 0, total: 0 };
  const [rec, pag] = await Promise.all([
    supabase
      .from("solicitacoes_reserva")
      .select("id", { count: "exact", head: true })
      .eq("anfitriao_id", uid)
      .eq("status", "pendente"),
    supabase
      .from("solicitacoes_reserva")
      .select("id", { count: "exact", head: true })
      .eq("locatario_id", uid)
      .eq("status", "aprovada")
      .eq("pagamento_resolvido", false),
  ]);
  const recebidasPendentes = rec.count ?? 0;
  const pagamentosPendentes = pag.count ?? 0;
  return { recebidasPendentes, pagamentosPendentes, total: recebidasPendentes + pagamentosPendentes };
}
