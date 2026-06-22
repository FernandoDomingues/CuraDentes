// ═══════════════════════════════════════════════════════════════════════════════
// DBA — helpers puros do painel de banco de dados (períodos, agregação, formato).
// Portados do site-k11 (DashboardAnalyticsDBA). Sem rede; fáceis de testar.
// ═══════════════════════════════════════════════════════════════════════════════

/** Série diária crua vinda da RPC dba_series. */
export interface SerieDia {
  dia: string;
  buscas: number;
  logins: number;
  views: number;
  contatos: number;
  dentistas: number;
  pacientes: number;
}

export const PERIODOS = [
  { v: "7", label: "1 semana" },
  { v: "30", label: "1 mês" },
  { v: "180", label: "6 meses" },
  { v: "365", label: "1 ano" },
  { v: "ytd", label: "YTD" },
] as const;

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const chaveDia = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const chaveMes = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

/** Formata bytes em KB/MB (igual ao site-k11). */
export function fmtBytes(b: number): string {
  return b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB`;
}

/** Coerção numérica segura (undefined/null/NaN → 0). */
export const num = (x: unknown) => Number(x) || 0;

/** Nome amigável de um bucket de Storage. */
export function nomeBucket(id: string): string {
  if (id === "fotos-dentistas") return "Fotos de perfil";
  if (id === "especialidades") return "Imagens de especialidades";
  return id;
}

/**
 * Chaves/labels (dia ou mês) da janela do período. Acima de 31 dias agrupa por mês
 * (início alinhado ao dia 1). `agora` é injetável para testes determinísticos.
 */
export function bucketsDoPeriodo(periodo: string, agora: Date = new Date()) {
  const ytd = periodo === "ytd";
  const inicio = ytd ? new Date(agora.getFullYear(), 0, 1) : new Date(agora);
  inicio.setHours(0, 0, 0, 0);
  if (!ytd) inicio.setDate(inicio.getDate() - (parseInt(periodo) - 1));
  const hoje0 = new Date(agora);
  hoje0.setHours(0, 0, 0, 0);
  const dias = Math.round((hoje0.getTime() - inicio.getTime()) / 86400000) + 1;
  const mensal = dias > 31;
  if (mensal) inicio.setDate(1);

  const chaves: { k: string; label: string }[] = [];
  if (mensal) {
    const c = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth(), 1);
    while (c.getTime() <= fim.getTime()) {
      chaves.push({ k: chaveMes(c), label: `${pad2(c.getMonth() + 1)}/${String(c.getFullYear()).slice(2)}` });
      c.setMonth(c.getMonth() + 1);
    }
  } else {
    for (let i = 0; i < dias; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      chaves.push({ k: chaveDia(d), label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}` });
    }
  }
  return { inicio, mensal, chaves };
}

/** Agrega a série diária nos buckets do período, somando `valor(linha)`. */
export function agregar(
  serie: SerieDia[],
  periodo: string,
  valor: (r: SerieDia) => number,
  agora: Date = new Date(),
) {
  const { inicio, mensal, chaves } = bucketsDoPeriodo(periodo, agora);
  const acc = new Map<string, number>();
  for (const r of serie) {
    const d = new Date(`${r.dia}T00:00:00`);
    if (d.getTime() < inicio.getTime()) continue;
    const k = mensal ? chaveMes(d) : chaveDia(d);
    acc.set(k, (acc.get(k) || 0) + valor(r));
  }
  return chaves.map((c) => ({ chave: c.k, label: c.label, total: acc.get(c.k) || 0 }));
}
