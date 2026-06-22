// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: Análise do Banco de Dados (/pro/dashboard-analytics/dba)
//
// Painel de DBA (apenas superuser): uso atual do banco e do Storage vs. limites
// do plano gratuito, tamanho por tabela, tráfego dia a dia e crescimento da base.
//
// TODO o dado vem de RPCs SECURITY DEFINER guardadas por is_superuser():
//   - dba_estatisticas() → snapshot (tamanhos, contagens, buckets).
//   - dba_series()       → contagens por DIA (tráfego e cadastros), agregadas no
//     servidor (evita o teto de 1000 linhas do PostgREST e não depende de RLS
//     de clientes/curadentespro no cliente). O bucketing dia/mês é só visual.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Loader2, Database, HardDrive, Image as ImageIcon, Users, Activity, ArrowLeft } from "lucide-react";

interface DbaStats {
  gerado_em: string;
  banco: { bytes: number; limite_bytes: number };
  storage: { limite_bytes: number; total_bytes: number; buckets: { bucket: string; bytes: number; objetos: number }[] };
  tabelas: { nome: string; bytes: number; linhas: number }[];
  contagens: Record<string, number>;
}
interface SerieDia {
  dia: string; buscas: number; logins: number; views: number; contatos: number; dentistas: number; pacientes: number;
}

const PERIODOS = [
  { v: "7", label: "1 semana" }, { v: "30", label: "1 mês" }, { v: "180", label: "6 meses" },
  { v: "365", label: "1 ano" }, { v: "ytd", label: "YTD" },
] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");
const chaveDia = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const chaveMes = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const fmtBytes = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB`);
const num = (x: unknown) => Number(x) || 0;

function FiltroPeriodo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PERIODOS.map((p) => (
        <button key={p.v} onClick={() => onChange(p.v)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${value === p.v ? "bg-[#007AFF] text-white" : "bg-white text-[#0A2A66] hover:bg-gray-100 border border-gray-200"}`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

// Chaves/labels (dia ou mês) da janela do período. No modo mensal, o início é
// alinhado ao 1º dia do mês para o primeiro ponto representar o mês completo.
function bucketsDoPeriodo(periodo: string) {
  const ytd = periodo === "ytd";
  const agora = new Date();
  const inicio = ytd ? new Date(agora.getFullYear(), 0, 1) : new Date(agora);
  inicio.setHours(0, 0, 0, 0);
  if (!ytd) inicio.setDate(inicio.getDate() - (parseInt(periodo) - 1));
  const hoje0 = new Date(agora); hoje0.setHours(0, 0, 0, 0);
  const dias = Math.round((hoje0.getTime() - inicio.getTime()) / 86400000) + 1;
  const mensal = dias > 31;
  if (mensal) inicio.setDate(1);
  const chaves: { k: string; label: string }[] = [];
  if (mensal) {
    const c = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth(), 1);
    while (c.getTime() <= fim.getTime()) { chaves.push({ k: chaveMes(c), label: `${pad2(c.getMonth() + 1)}/${String(c.getFullYear()).slice(2)}` }); c.setMonth(c.getMonth() + 1); }
  } else {
    for (let i = 0; i < dias; i++) { const d = new Date(inicio); d.setDate(d.getDate() + i); chaves.push({ k: chaveDia(d), label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}` }); }
  }
  return { inicio, mensal, chaves };
}

// Agrega a série diária (servidor) nos buckets do período, somando `valor(linha)`.
function agregar(serie: SerieDia[], periodo: string, valor: (r: SerieDia) => number) {
  const { inicio, mensal, chaves } = bucketsDoPeriodo(periodo);
  const acc = new Map<string, number>();
  for (const r of serie) {
    const d = new Date(`${r.dia}T00:00:00`);
    if (d.getTime() < inicio.getTime()) continue;
    const k = mensal ? chaveMes(d) : chaveDia(d);
    acc.set(k, (acc.get(k) || 0) + valor(r));
  }
  return chaves.map((c) => ({ chave: c.k, label: c.label, total: acc.get(c.k) || 0 }));
}

export default function DashboardAnalyticsDBA() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [stats, setStats] = useState<DbaStats | null>(null);
  const [serie, setSerie] = useState<SerieDia[]>([]);
  const [periodoTrafego, setPeriodoTrafego] = useState("30");
  const [periodoCrescimento, setPeriodoCrescimento] = useState("30");

  useEffect(() => {
    (async () => {
      try {
        const [rpc, serieRpc] = await Promise.all([
          supabase.rpc("dba_estatisticas"),
          supabase.rpc("dba_series"),
        ]);
        if (rpc.error) throw rpc.error;
        if (serieRpc.error) throw serieRpc.error;
        setStats(rpc.data as DbaStats);
        setSerie((serieRpc.data as SerieDia[]) || []);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar estatísticas.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const trafego = useMemo(
    () => agregar(serie, periodoTrafego, (r) => num(r.buscas) + num(r.logins) + num(r.views) + num(r.contatos)),
    [serie, periodoTrafego],
  );
  const crescimento = useMemo(() => {
    const den = agregar(serie, periodoCrescimento, (r) => num(r.dentistas));
    const pac = agregar(serie, periodoCrescimento, (r) => num(r.pacientes));
    return den.map((d, i) => ({ label: d.label, dentistas: d.total, pacientes: pac[i]?.total || 0 }));
  }, [serie, periodoCrescimento]);

  const tabelasKB = useMemo(
    () => (stats?.tabelas || []).map((t) => ({ nome: t.nome, kb: Math.round(t.bytes / 1024), linhas: t.linhas })),
    [stats],
  );

  if (loading) {
    return <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" /></div>;
  }

  if (erro || !stats) {
    return (
      <div className="min-h-screen bg-[#F2F2F7]">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <button onClick={() => navigate("/pro/dashboard-analytics")} className="text-sm text-[#007AFF] mb-4 inline-flex items-center gap-1"><ArrowLeft size={16} /> Voltar</button>
          <div className="bg-white rounded-2xl p-6 shadow-sm text-[#6B7280]">Não foi possível carregar as estatísticas do banco. {erro}</div>
        </main>
      </div>
    );
  }

  const fotos = stats.storage.buckets.find((b) => b.bucket === "fotos-dentistas");
  const totalEventos = (stats.contagens.logs_busca || 0) + (stats.contagens.logs_login || 0) + (stats.contagens.perfil_visualizacoes || 0) + (stats.contagens.perfil_contatos || 0);

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0A2A66]">Análise do Banco de Dados</h1>
            <p className="text-xs text-[#6B7280]">Uso vs. limites do plano gratuito do Supabase (banco 500 MB · storage 1 GB).</p>
          </div>
          <button onClick={() => navigate("/pro/dashboard-analytics")} className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-semibold text-[#0A2A66] hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Analytics
          </button>
        </div>

        {/* Barras de uso vs. limite */}
        <div className="grid md:grid-cols-2 gap-4">
          <BarraUso label="Banco de dados" usado={stats.banco.bytes} limite={stats.banco.limite_bytes} icon={Database} />
          <BarraUso label="Storage (arquivos)" usado={stats.storage.total_bytes} limite={stats.storage.limite_bytes} icon={HardDrive} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi icon={ImageIcon} label="Fotos de perfil" value={fotos ? fmtBytes(fotos.bytes) : "0"} sub={fotos ? `${fotos.objetos} arquivos` : "sem fotos"} />
          <Kpi icon={Activity} label="Eventos logados" value={totalEventos.toLocaleString("pt-BR")} sub="buscas + logins + views + contatos" />
          <Kpi icon={Users} label="Dentistas ativos" value={stats.contagens.dentistas_ativos || 0} />
          <Kpi icon={Users} label="Pacientes" value={stats.contagens.pacientes || 0} />
        </div>

        {/* Tamanho por tabela */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2A66] mb-1">Tamanho por tabela</h2>
          <p className="text-xs text-[#6B7280] mb-4">Espaço ocupado no banco (dados + índices), em KB. Passe o mouse para ver as linhas.</p>
          <ResponsiveContainer width="100%" height={Math.max(240, tabelasKB.length * 28)}>
            <BarChart data={tabelasKB} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={160} />
              <Tooltip formatter={(v: number, _n: string, item: { payload?: { linhas?: number } }) => [`${v} KB · ${item?.payload?.linhas ?? 0} linhas`, "Tamanho"]} />
              <Bar dataKey="kb" name="KB" fill="#007AFF" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Tráfego dia a dia */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2A66]">Tráfego dia a dia</h2>
              <p className="text-xs text-[#6B7280]">Eventos registrados por dia (buscas + logins + visualizações + contatos).</p>
            </div>
            <FiltroPeriodo value={periodoTrafego} onChange={setPeriodoTrafego} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trafego}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis allowDecimals={false} domain={[0, "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="total" name="Eventos" stroke="#5856D6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Crescimento da base */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2A66]">Novos cadastros por dia</h2>
              <p className="text-xs text-[#6B7280]">Crescimento da base — o que mais ocupa o banco no longo prazo.</p>
            </div>
            <FiltroPeriodo value={periodoCrescimento} onChange={setPeriodoCrescimento} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={crescimento}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis allowDecimals={false} domain={[0, "auto"]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="dentistas" name="Dentistas" stroke="#34C759" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pacientes" name="Pacientes" stroke="#007AFF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <p className="text-center text-xs text-[#8E8E93]">Snapshot gerado em {new Date(stats.gerado_em).toLocaleString("pt-BR")}.</p>
      </main>
    </div>
  );
}

function BarraUso({ label, usado, limite, icon: Icon }: { label: string; usado: number; limite: number; icon: React.ComponentType<{ className?: string }> }) {
  const pct = limite > 0 ? Math.min(100, (usado / limite) * 100) : 0;
  const cor = pct < 60 ? "#34C759" : pct < 85 ? "#FF9500" : "#FF3B30";
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A2A66]"><Icon className="h-4 w-4 text-[#007AFF]" />{label}</span>
        <span className="text-xs text-[#6B7280]">{fmtBytes(usado)} / {fmtBytes(limite)} · <strong style={{ color: cor }}>{pct.toFixed(pct < 1 ? 2 : 1)}%</strong></span>
      </div>
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%`, background: cor }} />
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#007AFF]/10 rounded-xl"><Icon className="h-5 w-5 text-[#007AFF]" /></div>
        <div className="min-w-0">
          <p className="text-xs text-[#6B7280]">{label}</p>
          <p className="text-xl font-bold text-[#0A2A66]">{value}</p>
          {sub && <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-tight">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
