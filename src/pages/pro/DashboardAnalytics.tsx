// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: Dashboard Analytics (/pro/dashboard-analytics)
//
// Painel de inteligência do CuraDentes com:
//   - KPIs em tempo real (buscas, dentistas, cidades, bairros, uptime)
//   - Gráficos de evolução (buscas ao longo do tempo)
//   - Top cidades e bairros mais buscados
//   - Mapa de calor de dentistas cadastrados
//   - Projeção linear de crescimento
//
// Acesso: apenas superuser (autorizado por RLS)
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Loader2, Search, MapPin, Building2, Activity, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";
import HeatMapLayer from "@/components/analytics/HeatMapLayer";

type LogRow = {
  query: string;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  resultados_count: number;
  criado_em: string;
};

type DentistaEndereco = {
  bairro: string | null;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Tooltip dos gráficos "Buscas × Dentistas": as barras exibem proporção (% do
// maior valor exibido), mas o tooltip mostra os números reais de cada local.
function pctTooltip(
  _value: number | string,
  name: string,
  item: { payload?: { buscas?: number; dentistas?: number } },
): [string, string] {
  const p = item?.payload || {};
  const real = name === "Buscas" ? p.buscas ?? 0 : p.dentistas ?? 0;
  return [`${real}`, name];
}

// Períodos de filtro (em dias) compartilhados por todos os gráficos do painel.
const PERIODOS = [
  { v: "7", label: "1 semana" },
  { v: "30", label: "1 mês" },
  { v: "180", label: "6 meses" },
  { v: "365", label: "1 ano" },
] as const;

function FiltroPeriodo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PERIODOS.map((p) => (
        <button
          key={p.v}
          onClick={() => onChange(p.v)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === p.v ? "bg-[#007AFF] text-white" : "bg-white text-[#0A2A66] hover:bg-gray-100"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const chaveDia = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const chaveMes = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

// Filtra os logs já carregados para a janela de `dias` (filtro client-side).
function logsNoPeriodo<T extends { criado_em: string }>(logs: T[], dias: number): T[] {
  const limite = Date.now() - dias * 86400000;
  return logs.filter((l) => new Date(l.criado_em).getTime() >= limite);
}

export default function DashboardAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [enderecos, setEnderecos] = useState<DentistaEndereco[]>([]);
  const [totalDentistas, setTotalDentistas] = useState(0);
  const [periodo, setPeriodo] = useState<string>("30"); // KPIs (indicadores)
  const [periodoTempo, setPeriodoTempo] = useState<string>("30"); // gráfico "Buscas ao longo do tempo"
  const [periodoComp, setPeriodoComp] = useState<string>("30"); // gráficos "Buscas × Dentistas"
  // Taxa de sucesso: usuários que buscaram e depois clicaram em WhatsApp/ligação
  const [sucesso, setSucesso] = useState({ buscaram: 0, sucesso: 0, whatsapp: 0, telefone: 0 });

  useEffect(() => {
    async function carregar() {
      try {
        const dias = parseInt(periodo);

        const [logRes, endRes, countRes, sucRes] = await Promise.all([
          // Buscamos sempre até 1 ano de logs e filtramos por período no cliente,
          // assim cada gráfico tem seu próprio filtro sem precisar refazer a query.
          supabase
            .from("logs_busca")
            .select("query, cidade, estado, bairro, resultados_count, criado_em")
            .gte("criado_em", new Date(Date.now() - 365 * 86400000).toISOString())
            .order("criado_em", { ascending: false }),
          supabase
            .from("curadentespro_enderecos")
            .select("bairro, cidade, latitude, longitude")
            .not("latitude", "is", null)
            .not("longitude", "is", null),
          supabase
            .from("curadentespro")
            .select("id", { count: "exact", head: true })
            .eq("lgpd_aceito", true)
            .is("deleted_at", null),
          supabase.rpc("taxa_sucesso_contato", { p_dias: dias }),
        ]);

        if (logRes.data) setLogs(logRes.data);
        if (endRes.data) setEnderecos(endRes.data as DentistaEndereco[]);
        if (countRes.count !== null) setTotalDentistas(countRes.count);
        const sr = Array.isArray(sucRes.data) ? sucRes.data[0] : sucRes.data;
        if (sr) setSucesso({
          buscaram: Number(sr.buscaram) || 0,
          sucesso: Number(sr.sucesso) || 0,
          whatsapp: Number(sr.sucesso_whatsapp) || 0,
          telefone: Number(sr.sucesso_telefone) || 0,
        });
      } catch (err) {
        console.error("[DashboardAnalytics] Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [periodo]);

  // ─── Métricas calculadas ─────────────────────────────────────────────────────

  const metricas = useMemo(() => {
    const ls = logsNoPeriodo(logs, parseInt(periodo));
    const totalBuscas = ls.length;
    const cidadesUnicas = [...new Set(ls.map((l) => l.cidade).filter(Boolean))];
    const bairrosUnicos = [...new Set(ls.map((l) => l.bairro).filter(Boolean))];

    return { totalBuscas, cidadesUnicas: cidadesUnicas.length, bairrosUnicos: bairrosUnicos.length };
  }, [logs, periodo]);

  const taxaSucesso = sucesso.buscaram > 0 ? (sucesso.sucesso / sucesso.buscaram) * 100 : 0;

  // ─── Top Cidades ─────────────────────────────────────────────────────────────

  const topCidades = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase();
    const buscas = new Map<string, { name: string; buscas: number }>();
    logsNoPeriodo(logs, parseInt(periodoComp)).forEach((l) => {
      if (l.cidade) {
        const k = norm(l.cidade);
        const e = buscas.get(k) || { name: l.cidade, buscas: 0 };
        e.buscas++;
        buscas.set(k, e);
      }
    });
    const dentistas = new Map<string, number>();
    enderecos.forEach((e) => {
      if (e.cidade) {
        const k = norm(e.cidade);
        dentistas.set(k, (dentistas.get(k) || 0) + 1);
      }
    });
    const arr = Array.from(buscas.entries())
      .map(([k, v]) => ({ name: v.name, buscas: v.buscas, dentistas: dentistas.get(k) || 0 }))
      .sort((a, b) => b.buscas - a.buscas)
      .slice(0, 10);
    const maxB = Math.max(1, ...arr.map((d) => d.buscas));
    const maxD = Math.max(1, ...arr.map((d) => d.dentistas));
    return arr.map((d) => ({ ...d, buscasPct: (d.buscas / maxB) * 100, dentistasPct: (d.dentistas / maxD) * 100 }));
  }, [logs, enderecos, periodoComp]);

  // ─── Top Bairros ─────────────────────────────────────────────────────────────

  const topBairros = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase();
    const buscas = new Map<string, { name: string; buscas: number }>();
    logsNoPeriodo(logs, parseInt(periodoComp)).forEach((l) => {
      if (l.bairro) {
        const k = norm(l.bairro);
        const e = buscas.get(k) || { name: l.bairro, buscas: 0 };
        e.buscas++;
        buscas.set(k, e);
      }
    });
    const dentistas = new Map<string, number>();
    enderecos.forEach((e) => {
      if (e.bairro) {
        const k = norm(e.bairro);
        dentistas.set(k, (dentistas.get(k) || 0) + 1);
      }
    });
    const arr = Array.from(buscas.entries())
      .map(([k, v]) => ({ name: v.name, buscas: v.buscas, dentistas: dentistas.get(k) || 0 }))
      .sort((a, b) => b.buscas - a.buscas)
      .slice(0, 10);
    const maxB = Math.max(1, ...arr.map((d) => d.buscas));
    const maxD = Math.max(1, ...arr.map((d) => d.dentistas));
    return arr.map((d) => ({ ...d, buscasPct: (d.buscas / maxB) * 100, dentistasPct: (d.dentistas / maxD) * 100 }));
  }, [logs, enderecos, periodoComp]);

  // ─── Buscas ao longo do tempo ────────────────────────────────────────────────

  const buscasPorDia = useMemo(() => {
    const dias = parseInt(periodoTempo);
    const mensal = dias > 31; // 6 meses / 1 ano agrupam por mês; 1 semana / 1 mês por dia
    const agora = new Date();
    const inicio = new Date(agora);
    inicio.setHours(0, 0, 0, 0);
    inicio.setDate(inicio.getDate() - (dias - 1));

    // Conta as buscas por dia/mês dentro da janela.
    const cont = new Map<string, number>();
    logs.forEach((l) => {
      const d = new Date(l.criado_em);
      if (d.getTime() < inicio.getTime()) return;
      const k = mensal ? chaveMes(d) : chaveDia(d);
      cont.set(k, (cont.get(k) || 0) + 1);
    });

    // Gera TODOS os pontos do período (inclusive os zerados) para a linha não "pular" dias.
    const pts: { dia: string; label: string; total: number }[] = [];
    if (mensal) {
      const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      const fim = new Date(agora.getFullYear(), agora.getMonth(), 1);
      while (cursor.getTime() <= fim.getTime()) {
        const k = chaveMes(cursor);
        pts.push({ dia: k, label: `${pad2(cursor.getMonth() + 1)}/${String(cursor.getFullYear()).slice(2)}`, total: cont.get(k) || 0 });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      for (let i = 0; i < dias; i++) {
        const d = new Date(inicio);
        d.setDate(d.getDate() + i);
        const k = chaveDia(d);
        pts.push({ dia: k, label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`, total: cont.get(k) || 0 });
      }
    }
    return pts;
  }, [logs, periodoTempo]);

  // ─── Projeção linear simples ─────────────────────────────────────────────────

  const projecao = useMemo(() => {
    // Só projetamos "buscas/dia" quando a série é diária (1 semana / 1 mês).
    // Em 6 meses / 1 ano a série é mensal e a projeção diária não faria sentido.
    if (parseInt(periodoTempo) > 31 || buscasPorDia.length < 3) return null;
    const dias = buscasPorDia.map((_, i) => i);
    const valores = buscasPorDia.map((b) => b.total);
    const n = dias.length;
    const sumX = dias.reduce((a, b) => a + b, 0);
    const sumY = valores.reduce((a, b) => a + b, 0);
    const sumXY = dias.reduce((a, i) => a + i * valores[i], 0);
    const sumX2 = dias.reduce((a, i) => a + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const ultimoValor = valores[valores.length - 1] || 1;
    const proj30 = Math.max(0, Math.round(intercept + slope * (n + 30)));
    const crescimento = ((proj30 - ultimoValor) / ultimoValor) * 100;
    return { atual: ultimoValor, projetado: proj30, crescimento: crescimento.toFixed(1) };
  }, [buscasPorDia, periodoTempo]);

  // ─── Pontos para o mapa de calor ─────────────────────────────────────────────

  const heatPoints = useMemo(() => {
    return enderecos
      .filter((e) => e.latitude !== null && e.longitude !== null)
      .map((e) => [e.latitude!, e.longitude!, 1] as [number, number, number]);
  }, [enderecos]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-[#0A2A66]">Analytics do Site</h1>
          <button
            onClick={() => navigate("/pro/verificar-cro")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A6E5C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#08594b]"
          >
            <ShieldCheck className="h-4 w-4" />
            Conferência de CRO
          </button>
        </div>

        {/* ─── KPIs ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard icon={Search} label="Buscas (período)" value={metricas.totalBuscas} />
          <KpiCard icon={Building2} label="Dentistas" value={totalDentistas} />
          <KpiCard icon={MapPin} label="Cidades" value={metricas.cidadesUnicas} />
          <KpiCard icon={Activity} label="Bairros" value={metricas.bairrosUnicos} />
          <KpiCard
            icon={TrendingUp}
            label="Taxa de sucesso"
            value={`${taxaSucesso.toFixed(1)}%`}
            sub={`${sucesso.sucesso}/${sucesso.buscaram} contataram · ${sucesso.whatsapp} WhatsApp · ${sucesso.telefone} ligação`}
          />
        </div>

        {/* ─── Seletor de período dos indicadores (KPIs) ──────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-[#8E8E93]">Indicadores acima:</span>
          <FiltroPeriodo value={periodo} onChange={setPeriodo} />
        </div>

        {/* ─── Gráfico: buscas ao longo do tempo ──────────────────────────── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2A66]">Buscas ao longo do tempo</h2>
              <p className="text-xs text-[#6B7280]">Inclui os períodos sem buscas (mostrados em 0). Acima de 1 mês, agrupado por mês.</p>
            </div>
            <FiltroPeriodo value={periodoTempo} onChange={setPeriodoTempo} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={buscasPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis allowDecimals={false} domain={[0, "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#007AFF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* ─── Top Cidades + Top Bairros ──────────────────────────────────── */}
        <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-[#8E8E93]">Buscas × Dentistas:</span>
          <FiltroPeriodo value={periodoComp} onChange={setPeriodoComp} />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2A66] mb-1">Buscas × Dentistas — Cidades</h2>
            <p className="text-xs text-[#6B7280] mb-4">Demanda (buscas) vs. oferta (dentistas cadastrados), em % do maior valor exibido. Passe o mouse para ver os números reais.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCidades} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${Math.round(Number(v))}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                <Tooltip formatter={pctTooltip} />
                <Legend />
                <Bar dataKey="buscasPct" name="Buscas" fill="#007AFF" radius={[0, 6, 6, 0]} />
                <Bar dataKey="dentistasPct" name="Dentistas cadastrados" fill="#34C759" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2A66] mb-1">Buscas × Dentistas — Bairros</h2>
            <p className="text-xs text-[#6B7280] mb-4">Demanda (buscas) vs. oferta (dentistas cadastrados), em % do maior valor exibido. Passe o mouse para ver os números reais.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topBairros} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${Math.round(Number(v))}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                <Tooltip formatter={pctTooltip} />
                <Legend />
                <Bar dataKey="buscasPct" name="Buscas" fill="#007AFF" radius={[0, 6, 6, 0]} />
                <Bar dataKey="dentistasPct" name="Dentistas cadastrados" fill="#34C759" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>
        </div>

        {/* ─── Mapa de calor ───────────────────────────────────────────── ──*/}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2A66] mb-4">
            Mapa de Calor — Dentistas Cadastrados
          </h2>
          <div className="h-[400px] rounded-xl overflow-hidden">
            <HeatMapLayer points={heatPoints} />
          </div>
        </section>

        {/* ─── Projeção ──────────────────────────────────────────────────── */}
        {projecao && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-[#007AFF]">
            <div className="flex items-start gap-4">
              <TrendingUp className="h-8 w-8 text-[#007AFF] shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-[#0A2A66]">Projeção de Crescimento</h2>
                <p className="text-[#6B7280] mt-1">
                  Com base nos últimos {periodoTempo} dias, a projeção para os próximos 30 dias é de
                  <strong className="text-[#0A2A66]"> {projecao.projetado} buscas/dia</strong>
                  {" "}(<strong className={parseFloat(projecao.crescimento) >= 0 ? "text-green-600" : "text-red-600"}>
                    {projecao.crescimento}%
                  </strong> em relação ao valor atual de {projecao.atual} buscas/dia).
                </p>
                {parseFloat(projecao.crescimento) < 0 && (
                  <div className="flex items-center gap-2 mt-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-sm">Queda projetada. Considere revisar suas estratégias de aquisição.</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// ─── Subcomponente: KPI Card ──────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#007AFF]/10 rounded-xl">
          <Icon className="h-5 w-5 text-[#007AFF]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[#6B7280]">{label}</p>
          <p className="text-2xl font-bold text-[#0A2A66]">{value}</p>
          {sub && <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-tight">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
