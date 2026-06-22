"use client";

// Painel DBA (parte interativa): barras de uso vs. limite (storage expansível por
// tipo de arquivo), KPIs, tamanho por tabela e séries de tráfego/crescimento com
// filtro de período. Portado do site-k11 (DashboardAnalyticsDBA), recharts.

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import Container from "@/components/Container";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  Database, HardDrive, Image as ImageIcon, Users, Activity, ArrowLeft, ChevronDown, ChevronUp,
} from "lucide-react";
import { PERIODOS, fmtBytes, num, nomeBucket, agregar, type SerieDia } from "@/lib/dba";

export interface DbaStats {
  gerado_em: string;
  banco: { bytes: number; limite_bytes: number };
  storage: { limite_bytes: number; total_bytes: number; buckets: { bucket: string; bytes: number; objetos: number }[] };
  tabelas: { nome: string; bytes: number; linhas: number }[];
  contagens: Record<string, number>;
}

function FiltroPeriodo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODOS.map((p) => (
        <button
          key={p.v}
          onClick={() => onChange(p.v)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${value === p.v ? "bg-brand-blue text-white" : "border border-black/10 bg-white text-brand-navy hover:bg-black/5"}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function DbaPainel({ stats, serie }: { stats: DbaStats; serie: SerieDia[] }) {
  const [periodoTrafego, setPeriodoTrafego] = useState("30");
  const [periodoCrescimento, setPeriodoCrescimento] = useState("30");

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
    () => (stats.tabelas || []).map((t) => ({ nome: t.nome, kb: Math.round(t.bytes / 1024), linhas: t.linhas })),
    [stats],
  );

  const fotos = stats.storage.buckets.find((b) => b.bucket === "fotos-dentistas");
  const totalEventos =
    (stats.contagens.logs_busca || 0) + (stats.contagens.logs_login || 0) +
    (stats.contagens.perfil_visualizacoes || 0) + (stats.contagens.perfil_contatos || 0);

  return (
    <Container className="space-y-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Análise do Banco de Dados</h1>
          <p className="text-xs text-ink-muted">Uso vs. limites do plano gratuito do Supabase (banco 500 MB · storage 1 GB).</p>
        </div>
        <Link href="/pro/dashboard-analytics" className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-black/5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      {/* Barras de uso vs. limite */}
      <div className="grid gap-4 md:grid-cols-2">
        <BarraUso label="Banco de dados" usado={stats.banco.bytes} limite={stats.banco.limite_bytes} icon={Database} />
        <BarraUso
          label="Storage (arquivos)"
          usado={stats.storage.total_bytes}
          limite={stats.storage.limite_bytes}
          icon={HardDrive}
          detalhes={stats.storage.buckets.map((b) => ({ nome: nomeBucket(b.bucket), bytes: b.bytes, objetos: b.objetos }))}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={ImageIcon} label="Fotos de perfil" value={fotos ? fmtBytes(fotos.bytes) : "0"} sub={fotos ? `${fotos.objetos} arquivos` : "sem fotos"} />
        <Kpi icon={Activity} label="Eventos logados" value={totalEventos.toLocaleString("pt-BR")} sub="buscas + logins + views + contatos" />
        <Kpi icon={Users} label="Dentistas ativos" value={stats.contagens.dentistas_ativos || 0} />
        <Kpi icon={Users} label="Pacientes" value={stats.contagens.pacientes || 0} />
      </div>

      {/* Tamanho por tabela */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-brand-navy">Tamanho por tabela</h2>
        <p className="mb-4 text-xs text-ink-muted">Espaço ocupado no banco (dados + índices), em KB.</p>
        <ResponsiveContainer width="100%" height={Math.max(240, tabelasKB.length * 28)}>
          <BarChart data={tabelasKB} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={160} />
            <Tooltip formatter={(v, _n, item) => [`${v} KB · ${(item as { payload?: { linhas?: number } })?.payload?.linhas ?? 0} linhas`, "Tamanho"]} />
            <Bar dataKey="kb" name="KB" fill="#007AFF" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Tráfego dia a dia */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-navy">Tráfego dia a dia</h2>
            <p className="text-xs text-ink-muted">Eventos por dia (buscas + logins + visualizações + contatos).</p>
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
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-navy">Novos cadastros por dia</h2>
            <p className="text-xs text-ink-muted">Crescimento da base — o que mais ocupa o banco no longo prazo.</p>
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

      <p className="text-center text-xs text-ink-muted">Snapshot gerado em {new Date(stats.gerado_em).toLocaleString("pt-BR")}.</p>
    </Container>
  );
}

function BarraUso({
  label, usado, limite, icon: Icon, detalhes,
}: {
  label: string;
  usado: number;
  limite: number;
  icon: ComponentType<{ className?: string }>;
  detalhes?: { nome: string; bytes: number; objetos: number }[];
}) {
  const [aberto, setAberto] = useState(false);
  const pct = limite > 0 ? Math.min(100, (usado / limite) * 100) : 0;
  const cor = pct < 60 ? "#34C759" : pct < 85 ? "#FF9500" : "#FF3B30";
  const expansivel = !!detalhes && detalhes.length > 0;
  const itens = expansivel ? [...detalhes].sort((a, b) => b.bytes - a.bytes) : [];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <Icon className="h-4 w-4 text-brand-blue" /> {label}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          {fmtBytes(usado)} / {fmtBytes(limite)} · <strong style={{ color: cor }}>{pct.toFixed(pct < 1 ? 2 : 1)}%</strong>
          {expansivel && (
            <button onClick={() => setAberto((v) => !v)} className="ml-0.5 text-ink-muted transition-colors hover:text-brand-navy" aria-expanded={aberto} aria-label={aberto ? "Recolher" : "Detalhar por tipo de arquivo"}>
              {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/8">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%`, background: cor }} />
      </div>
      {expansivel && aberto && (
        <div className="mt-4 flex flex-col gap-3 border-t border-black/8 pt-3">
          <p className="text-[11px] text-ink-muted">Composição do uso por tipo de arquivo:</p>
          {itens.map((d) => {
            const share = usado > 0 ? (d.bytes / usado) * 100 : 0;
            return (
              <div key={d.nome}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink-soft">{d.nome}</span>
                  <span className="text-ink-muted">{fmtBytes(d.bytes)} · {share.toFixed(0)}% · {d.objetos} arq.</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/8">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(share, 1)}%`, background: "#007AFF" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand-blue/10 p-2"><Icon className="h-5 w-5 text-brand-blue" /></div>
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">{label}</p>
          <p className="text-xl font-bold text-brand-navy">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] leading-tight text-ink-muted">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
