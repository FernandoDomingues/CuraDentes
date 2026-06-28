"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DO ANFITRIÃO (servidor) — CRUD das salas, sempre com o id da SESSÃO.
// Os campos desnormalizados (nome_clinica/cidade/lat/lng) NÃO são enviados: o
// trigger salas_sync_endereco os deriva do endereço (e valida a posse). Ver Fase 0.
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";
import type { SalaForm, SalaStatus, MinhaSala, EnderecoResumo } from "@/lib/salas";

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
