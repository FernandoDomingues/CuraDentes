"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISE DE URGÊNCIAS — /pro/dashboard-analytics/urgencias (parte interativa).
//
// Superuser-only (mesma proteção das demais telas de analytics: RLS de logs_busca
// libera SELECT só para o superuser). Os pedidos de urgência são gravados em
// logs_busca com query="urgência" + coords (o /urgencia captura a localização).
// Aqui mostramos de ONDE vêm (mapa de calor) e a DISTRIBUIÇÃO por dia (mesmo
// padrão do resto do painel: recharts + Leaflet + shaping de lib/analytics).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Container from "@/components/Container";
import { carregarUrgencias } from "../acoes";
import { PERIODOS } from "@/lib/dba";
import {
  serieContagem, heatPointsUsuarios, logsNoPeriodo, diasDoPeriodo,
  type LogBusca,
} from "@/lib/analytics";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Loader2, ArrowLeft, Siren, CalendarClock, Activity, TrendingUp } from "lucide-react";

const PINK = "#E6004C";

// Leaflet só no cliente (toca window/DOM).
const HeatMapLayer = dynamic(() => import("@/components/analytics/HeatMapLayer"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-ink-muted">Carregando mapa…</div>,
});

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

export default function UrgenciasPainel() {
  const [periodo, setPeriodo] = useState("30");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [urgencias, setUrgencias] = useState<LogBusca[]>([]);

  // Carrega ~365 dias de logs_busca e fica só com os pedidos de urgência.
  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      const res = await carregarUrgencias();
      if (!ativo) return;
      if (!res.ok) {
        setErro(res.erro || "Erro ao carregar as urgências.");
        setLoading(false);
        return;
      }
      setUrgencias(res.urgencias);
      setLoading(false);
    })();
    return () => { ativo = false; };
  }, []);

  const noPeriodo = useMemo(() => logsNoPeriodo(urgencias, periodo), [urgencias, periodo]);
  const serie = useMemo(() => serieContagem(urgencias, periodo), [urgencias, periodo]);
  const pontos = useMemo(() => heatPointsUsuarios(noPeriodo), [noPeriodo]);
  const mediaDia = useMemo(
    () => (noPeriodo.length / Math.max(1, diasDoPeriodo(periodo))).toFixed(1),
    [noPeriodo, periodo],
  );
  const pico = useMemo(
    () => serie.reduce((max, d) => (d.total > max.total ? d : max), { label: "—", total: 0 }),
    [serie],
  );

  if (loading) {
    return (
      <Container className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
      </Container>
    );
  }

  return (
    <Container className="space-y-6 py-8">
      {/* Cabeçalho */}
      <div>
        <Link href="/pro/dashboard-analytics" className="inline-flex items-center gap-1 text-sm text-brand-blue hover:underline">
          <ArrowLeft size={15} /> Voltar para Analytics
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="inline-flex rounded-xl p-2 text-white" style={{ background: PINK }}><Siren size={20} /></span>
          <h1 className="text-2xl font-bold text-brand-navy">Análise de Urgências</h1>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          De onde partem os pedidos de urgência e como se distribuem ao longo do tempo.
        </p>
      </div>

      {erro && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={Siren} label="Urgências (período)" value={noPeriodo.length} />
        <Kpi icon={CalendarClock} label="Total (12 meses)" value={urgencias.length} />
        <Kpi icon={Activity} label="Média por dia" value={mediaDia} />
        <Kpi icon={TrendingUp} label="Dia de pico" value={pico.total} sub={pico.total > 0 ? pico.label : undefined} />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-ink-muted">Período:</span>
        <FiltroPeriodo value={periodo} onChange={setPeriodo} />
      </div>

      {/* Mapa de calor — origem das urgências */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-brand-navy">Mapa de calor — origem das urgências</h2>
          <p className="text-xs text-ink-muted">
            De onde partem os pedidos (localização do paciente no momento da urgência).
          </p>
        </div>
        {pontos.length === 0 ? (
          <div className="flex h-[400px] items-center justify-center text-sm text-ink-muted">
            Sem urgências com localização neste período.
          </div>
        ) : (
          <div className="h-[400px] overflow-hidden rounded-xl">
            <HeatMapLayer points={pontos} />
          </div>
        )}
      </section>

      {/* Distribuição por dia */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-brand-navy">Urgências por dia</h2>
          <p className="text-xs text-ink-muted">Distribuição dos pedidos de urgência no período selecionado.</p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={serie}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
            <YAxis allowDecimals={false} domain={[0, "auto"]} />
            <Tooltip />
            <Line type="monotone" dataKey="total" name="Urgências" stroke={PINK} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </Container>
  );
}

function Kpi({
  icon: Icon, label, value, sub,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 inline-flex rounded-xl p-2 text-white" style={{ background: PINK }}><Icon size={18} /></div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-2xl font-bold text-brand-navy">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-tight text-ink-muted">{sub}</p>}
    </div>
  );
}
