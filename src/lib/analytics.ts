// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS — shaping puro do painel de Análise do negócio (superuser).
//
// Estratégia (igual ao site-k11): carrega ~365 dias de eventos e FILTRA por janela
// NO CLIENTE — cada gráfico tem seu próprio período sem refazer query. Datas usam
// horário LOCAL do navegador. `agora` é injetável para testes determinísticos.
// Reaproveita o bucketing de período do painel DBA (lib/dba).
// ═══════════════════════════════════════════════════════════════════════════════

import { bucketsDoPeriodo, chaveDia, chaveMes } from "./dba";

// ─── Tipos crus ──────────────────────────────────────────────────────────────
export interface LogBusca {
  query?: string | null;
  cidade?: string | null;
  estado?: string | null;
  bairro?: string | null;
  resultados_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  criado_em: string;
}
export interface LoginLog {
  origem?: string | null;
  criado_em: string;
}
export interface EnderecoGeo {
  bairro?: string | null;
  cidade?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
export interface ComCriadoEm {
  criado_em: string;
}

export type PontoCalor = [number, number, number];

// ─── Período ──────────────────────────────────────────────────────────────────
export function inicioYTD(agora: Date): Date {
  return new Date(agora.getFullYear(), 0, 1);
}

/** Número de dias do período ("ytd" = desde 1º jan; senão parseInt). */
export function diasDoPeriodo(periodo: string, agora: Date = new Date()): number {
  if (periodo === "ytd") {
    return Math.max(1, Math.ceil((agora.getTime() - inicioYTD(agora).getTime()) / 86400000));
  }
  return parseInt(periodo, 10);
}

/** Timestamp-limite para o filtro client-side (criado_em >= limite). */
function limiteDoPeriodo(periodo: string, agora: Date): number {
  return periodo === "ytd"
    ? inicioYTD(agora).getTime()
    : agora.getTime() - parseInt(periodo, 10) * 86400000;
}

/** Filtra eventos pela janela do período (por criado_em). */
export function logsNoPeriodo<T extends ComCriadoEm>(logs: T[], periodo: string, agora: Date = new Date()): T[] {
  const limite = limiteDoPeriodo(periodo, agora);
  return logs.filter((l) => new Date(l.criado_em).getTime() >= limite);
}

// ─── Séries temporais (preenchendo buckets vazios com 0) ──────────────────────
/** Conta eventos por bucket (dia ou mês) dentro do período. */
export function serieContagem(items: ComCriadoEm[], periodo: string, agora: Date = new Date()) {
  const { inicio, mensal, chaves } = bucketsDoPeriodo(periodo, agora);
  const acc = new Map<string, number>();
  for (const it of items) {
    const d = new Date(it.criado_em);
    if (d.getTime() < inicio.getTime()) continue;
    const k = mensal ? chaveMes(d) : chaveDia(d);
    acc.set(k, (acc.get(k) || 0) + 1);
  }
  return chaves.map((c) => ({ chave: c.k, label: c.label, total: acc.get(c.k) || 0 }));
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
export function metricas(logs: LogBusca[], periodo: string, agora: Date = new Date()) {
  const ls = logsNoPeriodo(logs, periodo, agora);
  return {
    totalBuscas: ls.length,
    cidadesUnicas: new Set(ls.map((l) => l.cidade).filter(Boolean)).size,
    bairrosUnicos: new Set(ls.map((l) => l.bairro).filter(Boolean)).size,
  };
}

// ─── Origem dos logins ──────────────────────────────────────────────────────
export function origemLogins(loginLogs: LoginLog[], periodo: string, agora: Date = new Date()) {
  const ls = logsNoPeriodo(loginLogs, periodo, agora);
  const acc = new Map<string, number>();
  for (const l of ls) acc.set(l.origem || "Outro", (acc.get(l.origem || "Outro") || 0) + 1);
  return Array.from(acc.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

// ─── Funil de conversão ──────────────────────────────────────────────────────
export function funil(
  logs: LogBusca[],
  views: ComCriadoEm[],
  contatos: ComCriadoEm[],
  periodo: string,
  agora: Date = new Date(),
) {
  const buscas = logsNoPeriodo(logs, periodo, agora).length;
  const v = logsNoPeriodo(views, periodo, agora).length;
  const c = logsNoPeriodo(contatos, periodo, agora).length;
  return {
    dados: [
      { etapa: "Buscas", total: buscas },
      { etapa: "Visualizações de perfil", total: v },
      { etapa: "Contatos", total: c },
    ],
    convBuscaView: buscas > 0 ? (v / buscas) * 100 : 0,
    convViewContato: v > 0 ? (c / v) * 100 : 0,
  };
}

// ─── Top cidades/bairros (demanda × oferta, em % relativo ao maior exibido) ───
const norm = (s: string) => s.trim().toLowerCase();

export function topListas(
  logs: LogBusca[],
  enderecos: EnderecoGeo[],
  campo: "cidade" | "bairro",
  periodo: string,
  agora: Date = new Date(),
) {
  const ls = logsNoPeriodo(logs, periodo, agora);
  const buscas = new Map<string, { name: string; buscas: number }>();
  for (const l of ls) {
    const v = l[campo];
    if (!v) continue;
    const k = norm(v);
    const cur = buscas.get(k) ?? { name: v, buscas: 0 };
    cur.buscas += 1;
    buscas.set(k, cur);
  }
  const dentistas = new Map<string, number>();
  for (const e of enderecos) {
    const v = e[campo];
    if (!v) continue;
    const k = norm(v);
    dentistas.set(k, (dentistas.get(k) || 0) + 1);
  }
  const linhas = Array.from(buscas.entries())
    .map(([k, b]) => ({ name: b.name, buscas: b.buscas, dentistas: dentistas.get(k) || 0 }))
    .sort((a, b) => b.buscas - a.buscas)
    .slice(0, 10);
  const maxB = Math.max(1, ...linhas.map((l) => l.buscas));
  const maxD = Math.max(1, ...linhas.map((l) => l.dentistas));
  return linhas.map((l) => ({
    ...l,
    buscasPct: (l.buscas / maxB) * 100,
    dentistasPct: (l.dentistas / maxD) * 100,
  }));
}

// ─── Novos cadastros (2 linhas alinhadas por bucket) ──────────────────────────
export function cadastros(
  cadDentistas: ComCriadoEm[],
  cadPacientes: ComCriadoEm[],
  periodo: string,
  agora: Date = new Date(),
) {
  const den = serieContagem(cadDentistas, periodo, agora);
  const pac = serieContagem(cadPacientes, periodo, agora);
  return den.map((d, i) => ({ label: d.label, dentistas: d.total, pacientes: pac[i]?.total || 0 }));
}

// ─── Buscas sem resultado ─────────────────────────────────────────────────────
export function buscasSemResultado(logs: LogBusca[], periodo: string, agora: Date = new Date()) {
  const ls = logsNoPeriodo(logs, periodo, agora);
  const sem = ls.filter((l) => (l.resultados_count ?? 0) === 0);
  return {
    total: ls.length,
    qtdSemResultado: sem.length,
    pct: ls.length > 0 ? (sem.length / ls.length) * 100 : 0,
    serie: serieContagem(sem, periodo, agora),
  };
}

// ─── Urgências (pedidos de atendimento de urgência) ──────────────────────────
/** Filtra os logs que são pedidos de URGÊNCIA (query "urgência"/"urgencia"). */
export function apenasUrgencias(logs: LogBusca[]): LogBusca[] {
  return logs.filter((l) => {
    const q = (l.query || "").trim().toLowerCase();
    return q === "urgência" || q === "urgencia";
  });
}

// ─── Mapa de calor ──────────────────────────────────────────────────────────
function temGeo(p: { latitude?: number | null; longitude?: number | null }): boolean {
  return p.latitude != null && p.longitude != null;
}

export function heatPoints(enderecos: EnderecoGeo[]): PontoCalor[] {
  return enderecos.filter(temGeo).map((e) => [e.latitude!, e.longitude!, 1]);
}
export function heatPointsUsuarios(logs: LogBusca[]): PontoCalor[] {
  return logs.filter(temGeo).map((l) => [l.latitude!, l.longitude!, 1]);
}
/** Regiões "quentes": muita busca, pouca oferta (célula ~5 km). */
export function heatPointsFracas(enderecos: EnderecoGeo[], logs: LogBusca[]): PontoCalor[] {
  const cel = (lat: number, lng: number) => `${Math.round(lat / 0.05)}:${Math.round(lng / 0.05)}`;
  const oferta = new Map<string, number>();
  for (const e of enderecos) {
    if (!temGeo(e)) continue;
    const k = cel(e.latitude!, e.longitude!);
    oferta.set(k, (oferta.get(k) || 0) + 1);
  }
  const demanda = new Map<string, { lat: number; lng: number; q: number }>();
  for (const l of logs) {
    if (!temGeo(l)) continue;
    const k = cel(l.latitude!, l.longitude!);
    const cur = demanda.get(k) ?? { lat: l.latitude!, lng: l.longitude!, q: 0 };
    cur.q += 1;
    demanda.set(k, cur);
  }
  return Array.from(demanda.entries()).map(([k, d]) => [d.lat, d.lng, d.q / ((oferta.get(k) || 0) + 1)]);
}

// ─── Projeção (regressão linear simples) ──────────────────────────────────────
export function projecao(
  buscasPorDia: { total: number }[],
  periodo: string,
  agora: Date = new Date(),
): { atual: number; projetado: number; crescimento: string } | null {
  if (diasDoPeriodo(periodo, agora) > 31 || buscasPorDia.length < 3) return null;
  const n = buscasPorDia.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  buscasPorDia.forEach((p, x) => {
    sumX += x;
    sumY += p.total;
    sumXY += x * p.total;
    sumX2 += x * x;
  });
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const atual = buscasPorDia[n - 1].total || 1;
  const projetado = Math.max(0, Math.round(intercept + slope * (n + 30)));
  const crescimento = (((projetado - atual) / atual) * 100).toFixed(1);
  return { atual, projetado, crescimento };
}
