"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DO ANFITRIÃO (servidor) — CRUD das salas, sempre com o id da SESSÃO.
// Os campos desnormalizados (nome_clinica/cidade/lat/lng) NÃO são enviados: o
// trigger salas_sync_endereco os deriva do endereço (e valida a posse). Ver Fase 0.
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";
import { numeroOuNull, clinicaKeyDe } from "@/lib/salas";
import type {
  SalaForm,
  SalaStatus,
  MinhaSala,
  EnderecoResumo,
  SolicitacaoReserva,
  ContatoReserva,
  ContatoSolicitante,
} from "@/lib/salas";

/** Solicitação enriquecida com título/local/clínica/preço da sala + nome do solicitante. */
export interface SolicitacaoItem extends SolicitacaoReserva {
  sala_titulo: string | null;
  sala_local: string | null;
  sala_clinica: string | null;
  sala_preco: number | null;
  sala_unidade: string | null;
  dentista_nome: string | null; // nome do solicitante (para o histórico do locador)
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

  // `preco_valor`/`preco_diaria` são `numeric` → chegam como string; coage p/ number.
  const salas = ((salaRes.data as MinhaSala[]) ?? []).map((s) => ({
    ...s,
    preco_valor: numeroOuNull(s.preco_valor) ?? 0,
    preco_diaria: numeroOuNull(s.preco_diaria),
  }));

  return {
    ok: true,
    enderecos: (endRes.data as EnderecoResumo[]) ?? [],
    salas,
  };
}

/** Cria ou atualiza uma sala. anfitriao_id = sessão; trigger deriva o resto. */
export async function salvarSala(
  input: SalaForm,
): Promise<{ ok: boolean; erro?: string; id?: string; clinicaKey?: string | null }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  // Validações de borda (a RLS/trigger é a guarda final).
  if (!input.endereco_id) return { ok: false, erro: "Escolha em qual endereço a sala fica." };
  if (!input.titulo.trim()) return { ok: false, erro: "Dê um título à sala." };
  const preco = Number(String(input.preco_valor).replace(",", "."));
  if (!Number.isFinite(preco) || preco < 0) return { ok: false, erro: "Informe um preço válido." };
  if (!input.fotos?.length) return { ok: false, erro: "Adicione ao menos uma foto da sala." };

  // O contato de locação agora é o da CLÍNICA (endereço). Buscamos o telefone/WhatsApp
  // dela para preencher a coluna antiga da sala — a constraint salas_tem_contato segue
  // existindo até a limpeza final. O detalhe lê o contato pela get_sala_detalhe (clínica).
  const { data: end } = await supabase
    .from("curadentespro_enderecos")
    .select("whatsapp, telefone, cep, numero, complemento")
    .eq("id", input.endereco_id)
    .eq("curadentespro_id", uid)
    .maybeSingle<{ whatsapp: string | null; telefone: string | null; cep: string | null; numero: string | null; complemento: string | null }>();
  const contatoClinica = end?.whatsapp || end?.telefone || "definir-no-perfil";
  // Chave da clínica (para redirecionar ao anúncio dela após anunciar).
  const clinicaKey = end ? clinicaKeyDe(end.cep ?? "", end.numero ?? "", end.complemento ?? "") : null;

  const diariaNum = input.preco_diaria?.trim() ? Number(String(input.preco_diaria).replace(",", ".")) : null;
  const preco_diaria = diariaNum != null && Number.isFinite(diariaNum) && diariaNum >= 0 ? diariaNum : null;

  const payload = {
    anfitriao_id: uid,
    endereco_id: input.endereco_id,
    titulo: input.titulo.trim(),
    descricao: input.descricao.trim() || null,
    equipamentos: input.equipamentos,
    equipamentos_extra: input.equipamentos_extra?.trim() || null,
    preco_valor: preco,
    preco_unidade: input.preco_unidade,
    preco_diaria,
    disponibilidade: input.disponibilidade,
    politica_cancelamento: input.politica_cancelamento.trim() || null,
    fotos: input.fotos,
    contato_whatsapp: contatoClinica,
    contato_email: null,
  };

  if (input.id) {
    const { error } = await supabase.from("salas").update(payload).eq("id", input.id);
    if (error) return { ok: false, erro: error.message || "Não foi possível salvar a sala." };
    return { ok: true, id: input.id, clinicaKey };
  }
  const { data, error } = await supabase.from("salas").insert(payload).select("id").single();
  if (error) return { ok: false, erro: error.message || "Não foi possível criar a sala." };
  return { ok: true, id: (data?.id as string) ?? undefined, clinicaKey };
}

/** Número que uma NOVA sala teria nesta clínica (máx da clínica + 1) — para o formulário
 *  já mostrar "Sala 2" quando outro dentista da mesma clínica já tem a Sala 1. */
export async function proximoNumeroSala(enderecoId: string): Promise<number> {
  const { supabase, uid } = await sessao();
  if (!uid || !enderecoId) return 1;
  const { data, error } = await supabase.rpc("proximo_numero_sala", { p_endereco_id: enderecoId });
  if (error) return 1;
  return Number(data) || 1;
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
    .select("*, sala:salas(titulo, cidade, bairro, nome_clinica, preco_valor, preco_unidade)")
    .eq("anfitriao_id", uid)
    .order("created_at", { ascending: false });
  const rows = (data as Record<string, unknown>[]) ?? [];

  // Nomes dos solicitantes (dentistas), em lote — nome é público (perfil completo).
  const locIds = [...new Set(rows.map((r) => r.locatario_id as string))];
  const nomes = new Map<string, string>();
  if (locIds.length) {
    const { data: dents } = await supabase.from("curadentespro").select("id, nome").in("id", locIds);
    for (const d of (dents as { id: string; nome: string | null }[]) ?? []) nomes.set(d.id, d.nome ?? "");
  }

  const itens = rows.map((r) => {
    const sala = (r.sala ?? {}) as { titulo?: string; cidade?: string; bairro?: string; nome_clinica?: string; preco_valor?: number; preco_unidade?: string };
    return {
      ...(r as unknown as SolicitacaoReserva),
      sala_titulo: sala.titulo ?? null,
      sala_local: [sala.bairro, sala.cidade].filter(Boolean).join(", ") || null,
      sala_clinica: sala.nome_clinica ?? null,
      sala_preco: numeroOuNull(sala.preco_valor),
      sala_unidade: sala.preco_unidade ?? null,
      dentista_nome: nomes.get(r.locatario_id as string) || null,
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
  const mapa = new Map<string, { titulo: string; local: string | null; clinica: string | null; preco: number | null; unidade: string | null }>();
  if (ids.length) {
    const { data: pubs } = await supabase
      .from("salas_publicas")
      .select("id, titulo, cidade, bairro, nome_clinica, preco_valor, preco_unidade")
      .in("id", ids);
    for (const p of (pubs as { id: string; titulo: string; cidade?: string; bairro?: string; nome_clinica?: string; preco_valor?: number; preco_unidade?: string }[]) ?? []) {
      mapa.set(p.id, {
        titulo: p.titulo,
        local: [p.bairro, p.cidade].filter(Boolean).join(", ") || null,
        clinica: p.nome_clinica ?? null,
        preco: numeroOuNull(p.preco_valor),
        unidade: p.preco_unidade ?? null,
      });
    }
  }
  const itens = rows.map((r) => ({
    ...r,
    sala_titulo: mapa.get(r.sala_id)?.titulo ?? null,
    sala_local: mapa.get(r.sala_id)?.local ?? null,
    sala_clinica: mapa.get(r.sala_id)?.clinica ?? null,
    sala_preco: mapa.get(r.sala_id)?.preco ?? null,
    sala_unidade: mapa.get(r.sala_id)?.unidade ?? null,
    dentista_nome: null,
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
  // Avisa o locatário que a clínica confirmou o pagamento (best-effort).
  try {
    await supabase.functions.invoke("notificar-reserva-sala", { body: { tipo: "pagamento", solicitacao_id: id } });
  } catch (e) {
    console.warn("[marcarPagamentoResolvido] notificação:", e);
  }
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
    // Pagamento a confirmar é tarefa do DONO DA SALA (anfitrião): aprovadas não pagas.
    supabase
      .from("solicitacoes_reserva")
      .select("id", { count: "exact", head: true })
      .eq("anfitriao_id", uid)
      .eq("status", "aprovada")
      .eq("pagamento_resolvido", false),
  ]);
  const recebidasPendentes = rec.count ?? 0;
  const pagamentosPendentes = pag.count ?? 0;
  return { recebidasPendentes, pagamentosPendentes, total: recebidasPendentes + pagamentosPendentes };
}
