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
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Loader2, Search, MapPin, Building2, Activity, TrendingUp, AlertTriangle } from "lucide-react";
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

export default function DashboardAnalytics() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [enderecos, setEnderecos] = useState<DentistaEndereco[]>([]);
  const [totalDentistas, setTotalDentistas] = useState(0);
  const [periodo, setPeriodo] = useState<"7" | "30" | "90">("30");

  useEffect(() => {
    async function carregar() {
      try {
        const dias = parseInt(periodo);

        const [logRes, endRes, countRes] = await Promise.all([
          supabase
            .from("logs_busca")
            .select("query, cidade, estado, bairro, resultados_count, criado_em")
            .gte("criado_em", new Date(Date.now() - dias * 86400000).toISOString())
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
        ]);

        if (logRes.data) setLogs(logRes.data);
        if (endRes.data) setEnderecos(endRes.data as DentistaEndereco[]);
        if (countRes.count !== null) setTotalDentistas(countRes.count);
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
    const totalBuscas = logs.length;
    const buscasComResultado = logs.filter((l) => l.resultados_count > 0).length;
    const taxaSucesso = totalBuscas > 0 ? (buscasComResultado / totalBuscas) * 100 : 0;
    const cidadesUnicas = [...new Set(logs.map((l) => l.cidade).filter(Boolean))];
    const bairrosUnicos = [...new Set(logs.map((l) => l.bairro).filter(Boolean))];

    return { totalBuscas, taxaSucesso, cidadesUnicas: cidadesUnicas.length, bairrosUnicos: bairrosUnicos.length };
  }, [logs]);

  // ─── Top Cidades ─────────────────────────────────────────────────────────────

  const topCidades = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      if (l.cidade) map.set(l.cidade, (map.get(l.cidade) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [logs]);

  // ─── Top Bairros ─────────────────────────────────────────────────────────────

  const topBairros = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      if (l.bairro) map.set(l.bairro, (map.get(l.bairro) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [logs]);

  // ─── Buscas ao longo do tempo ────────────────────────────────────────────────

  const buscasPorDia = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      const dia = l.criado_em.slice(0, 10);
      map.set(dia, (map.get(dia) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, total]) => ({ dia, total }));
  }, [logs]);

  // ─── Projeção linear simples ─────────────────────────────────────────────────

  const projecao = useMemo(() => {
    if (buscasPorDia.length < 3) return null;
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
  }, [buscasPorDia]);

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
        <h1 className="text-2xl font-bold text-[#0A2A66]">Analytics do Site</h1>

        {/* ─── KPIs ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard icon={Search} label="Buscas (período)" value={metricas.totalBuscas} />
          <KpiCard icon={Building2} label="Dentistas" value={totalDentistas} />
          <KpiCard icon={MapPin} label="Cidades" value={metricas.cidadesUnicas} />
          <KpiCard icon={Activity} label="Bairros" value={metricas.bairrosUnicos} />
          <KpiCard icon={TrendingUp} label="Taxa sucesso" value={`${metricas.taxaSucesso.toFixed(1)}%`} />
        </div>

        {/* ─── Seletor de período ─────────────────────────────────────────── */}
        <div className="flex gap-2">
          {(["7", "30", "90"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                periodo === p
                  ? "bg-[#007AFF] text-white"
                  : "bg-white text-[#0A2A66] hover:bg-gray-100"
              }`}
            >
              {p} dias
            </button>
          ))}
        </div>

        {/* ─── Gráfico: buscas ao longo do tempo ──────────────────────────── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2A66] mb-4">Buscas ao longo do tempo</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={buscasPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#007AFF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* ─── Top Cidades + Top Bairros ──────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2A66] mb-4">Top Cidades</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topCidades} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#007AFF" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2A66] mb-4">Top Bairros</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topBairros} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#34C759" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
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
                  Com base nos últimos {periodo} dias, a projeção para os próximos 30 dias é de
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#007AFF]/10 rounded-xl">
          <Icon className="h-5 w-5 text-[#007AFF]" />
        </div>
        <div>
          <p className="text-xs text-[#6B7280]">{label}</p>
          <p className="text-2xl font-bold text-[#0A2A66]">{value}</p>
        </div>
      </div>
    </div>
  );
}
