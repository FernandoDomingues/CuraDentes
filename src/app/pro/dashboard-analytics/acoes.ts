"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DO PAINEL DE ANÁLISE (servidor, superuser) — refactor do C1.
// Carrega ~365 dias de eventos NO SERVIDOR (a RLS dessas tabelas só libera o
// superuser) e devolve os arrays já prontos; o shaping/gráficos seguem no cliente.
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";
import { apenasUrgencias } from "@/lib/analytics";
import type { LogBusca, LoginLog, EnderecoGeo, ComCriadoEm } from "@/lib/analytics";

interface Sucesso {
  buscaram: number;
  sucesso: number;
  whatsapp: number;
  telefone: number;
}

interface DadosAnalise {
  logs: LogBusca[];
  loginLogs: LoginLog[];
  enderecos: EnderecoGeo[];
  totalDentistas: number;
  cadDentistas: ComCriadoEm[];
  cadPacientes: ComCriadoEm[];
  perfilViews: ComCriadoEm[];
  perfilContatos: ComCriadoEm[];
  sucesso: Sucesso;
}

const VAZIO: DadosAnalise = {
  logs: [], loginLogs: [], enderecos: [], totalDentistas: 0,
  cadDentistas: [], cadPacientes: [], perfilViews: [], perfilContatos: [],
  sucesso: { buscaram: 0, sucesso: 0, whatsapp: 0, telefone: 0 },
};

/** Carrega os dados do painel de análise. `periodoDias` alimenta a RPC de taxa de sucesso. */
export async function carregarAnalise(
  periodoDias: number,
): Promise<{ ok: boolean; erro?: string } & DadosAnalise> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente.", ...VAZIO };

  const desde = new Date(Date.now() - 365 * 86400000).toISOString();
  try {
    const [rBusca, rLogin, rEnd, rDentCount, rCadDent, rCadPac, rViews, rContatos, rTaxa] = await Promise.all([
      supabase.from("logs_busca").select("query, cidade, estado, bairro, resultados_count, latitude, longitude, criado_em").gte("criado_em", desde).order("criado_em", { ascending: false }),
      supabase.from("logs_login").select("origem, criado_em").gte("criado_em", desde).order("criado_em", { ascending: false }),
      supabase.from("curadentespro_enderecos").select("bairro, cidade, latitude, longitude").not("latitude", "is", null).not("longitude", "is", null),
      supabase.from("curadentespro").select("id", { count: "exact", head: true }).eq("lgpd_aceito", true).is("deleted_at", null),
      supabase.from("curadentespro").select("criado_em").eq("lgpd_aceito", true).is("deleted_at", null).gte("criado_em", desde),
      supabase.from("clientes").select("criado_em").is("deleted_at", null).gte("criado_em", desde),
      supabase.from("perfil_visualizacoes").select("criado_em").gte("criado_em", desde),
      supabase.from("perfil_contatos").select("criado_em").gte("criado_em", desde),
      supabase.rpc("taxa_sucesso_contato", { p_dias: periodoDias }),
    ]);
    if (rBusca.error) return { ok: false, erro: rBusca.error.message, ...VAZIO };
    const outros = [rLogin, rEnd, rDentCount, rCadDent, rCadPac, rViews, rContatos, rTaxa]
      .map((r) => r.error)
      .filter(Boolean);
    if (outros.length) console.warn("[analytics] consultas com erro:", outros.map((e) => e?.message));

    const t = (Array.isArray(rTaxa.data) ? rTaxa.data[0] : rTaxa.data) as Record<string, unknown> | null;
    return {
      ok: true,
      logs: (rBusca.data as LogBusca[]) ?? [],
      loginLogs: (rLogin.data as LoginLog[]) ?? [],
      enderecos: (rEnd.data as EnderecoGeo[]) ?? [],
      totalDentistas: rDentCount.count ?? 0,
      cadDentistas: (rCadDent.data as ComCriadoEm[]) ?? [],
      cadPacientes: (rCadPac.data as ComCriadoEm[]) ?? [],
      perfilViews: (rViews.data as ComCriadoEm[]) ?? [],
      perfilContatos: (rContatos.data as ComCriadoEm[]) ?? [],
      sucesso: {
        buscaram: Number(t?.buscaram) || 0,
        sucesso: Number(t?.sucesso) || 0,
        whatsapp: Number(t?.sucesso_whatsapp) || 0,
        telefone: Number(t?.sucesso_telefone) || 0,
      },
    };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao carregar a análise.", ...VAZIO };
  }
}

/** Carrega ~365 dias de logs_busca e devolve só os pedidos de urgência (já filtrados). */
export async function carregarUrgencias(): Promise<{ ok: boolean; erro?: string; urgencias: LogBusca[] }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente.", urgencias: [] };

  const desde = new Date(Date.now() - 365 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("logs_busca")
    .select("query, cidade, estado, bairro, latitude, longitude, criado_em")
    .gte("criado_em", desde)
    .order("criado_em", { ascending: false });
  if (error) return { ok: false, erro: error.message, urgencias: [] };
  return { ok: true, urgencias: apenasUrgencias((data as LogBusca[]) ?? []) };
}
