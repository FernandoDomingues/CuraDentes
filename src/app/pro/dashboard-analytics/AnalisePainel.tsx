"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISE DO NEGÓCIO — /pro/dashboard-analytics (parte interativa).
//
// Superuser-only (guard no layout). Carrega ~365 dias de eventos no navegador e
// filtra por janela no cliente (cada gráfico tem seu período). Recharts + Leaflet.
// Todo o shaping vem de lib/analytics (testado). Portado do site-k11.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Container from "@/components/Container";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { PERIODOS } from "@/lib/dba";
import {
  metricas, origemLogins, funil as calcFunil, topListas, cadastros as calcCadastros,
  buscasSemResultado as calcSemResultado, serieContagem, projecao as calcProjecao,
  heatPoints, heatPointsUsuarios, heatPointsFracas,
  type LogBusca, type LoginLog, type EnderecoGeo, type ComCriadoEm, type PontoCalor,
} from "@/lib/analytics";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  Loader2, Search, MapPin, Building2, Activity, TrendingUp, AlertTriangle, ShieldCheck, Database,
} from "lucide-react";

// Leaflet só no cliente (toca window/DOM).
const HeatMapLayer = dynamic(() => import("@/components/analytics/HeatMapLayer"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-ink-muted">Carregando mapa…</div>,
});

const ANO_DIAS_YTD = "ytd";

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

function diasArg(periodo: string): number {
  if (periodo === ANO_DIAS_YTD) {
    const agora = new Date();
    return Math.max(1, Math.ceil((agora.getTime() - new Date(agora.getFullYear(), 0, 1).getTime()) / 86400000));
  }
  return parseInt(periodo, 10);
}

interface Sucesso { buscaram: number; sucesso: number; whatsapp: number; telefone: number; }

export default function AnalisePainel() {
  const [periodo, setPeriodo] = useState("30"); // KPIs + RPC (re-fetch)
  const [periodoTempo, setPeriodoTempo] = useState("30");
  const [periodoLogins, setPeriodoLogins] = useState("30");
  const [periodoComp, setPeriodoComp] = useState("30");
  const [periodoFunil, setPeriodoFunil] = useState("30");
  const [periodoCadastros, setPeriodoCadastros] = useState("30");
  const [periodoSemResultado, setPeriodoSemResultado] = useState("30");
  const [modoMapa, setModoMapa] = useState<"dentistas" | "usuarios" | "fracas">("dentistas");

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [logs, setLogs] = useState<LogBusca[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [enderecos, setEnderecos] = useState<EnderecoGeo[]>([]);
  const [totalDentistas, setTotalDentistas] = useState(0);
  const [cadDentistas, setCadDentistas] = useState<ComCriadoEm[]>([]);
  const [cadPacientes, setCadPacientes] = useState<ComCriadoEm[]>([]);
  const [perfilViews, setPerfilViews] = useState<ComCriadoEm[]>([]);
  const [perfilContatos, setPerfilContatos] = useState<ComCriadoEm[]>([]);
  const [sucesso, setSucesso] = useState<Sucesso>({ buscaram: 0, sucesso: 0, whatsapp: 0, telefone: 0 });

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      const supabase = criarClienteNavegador();
      const desde = new Date(Date.now() - 365 * 86400000).toISOString();
      try {
        const [
          rBusca, rLogin, rEnd, rDentCount, rCadDent, rCadPac, rViews, rContatos, rTaxa,
        ] = await Promise.all([
          supabase.from("logs_busca").select("query, cidade, estado, bairro, resultados_count, latitude, longitude, criado_em").gte("criado_em", desde).order("criado_em", { ascending: false }),
          supabase.from("logs_login").select("origem, criado_em").gte("criado_em", desde).order("criado_em", { ascending: false }),
          supabase.from("curadentespro_enderecos").select("bairro, cidade, latitude, longitude").not("latitude", "is", null).not("longitude", "is", null),
          supabase.from("curadentespro").select("id", { count: "exact", head: true }).eq("lgpd_aceito", true).is("deleted_at", null),
          supabase.from("curadentespro").select("criado_em").eq("lgpd_aceito", true).is("deleted_at", null).gte("criado_em", desde),
          supabase.from("clientes").select("criado_em").is("deleted_at", null).gte("criado_em", desde),
          supabase.from("perfil_visualizacoes").select("criado_em").gte("criado_em", desde),
          supabase.from("perfil_contatos").select("criado_em").gte("criado_em", desde),
          supabase.rpc("taxa_sucesso_contato", { p_dias: diasArg(periodo) }),
        ]);
        if (!ativo) return;
        if (rBusca.error) throw rBusca.error;
        // As demais consultas não derrubam o painel, mas erros (ex.: RLS) não devem
        // ficar invisíveis — senão um gráfico zerado parece "sem dados".
        const outros = [rLogin, rEnd, rDentCount, rCadDent, rCadPac, rViews, rContatos, rTaxa]
          .map((r) => r.error)
          .filter(Boolean);
        if (outros.length) console.warn("[analytics] consultas com erro:", outros.map((e) => e?.message));
        setLogs((rBusca.data as LogBusca[]) ?? []);
        setLoginLogs((rLogin.data as LoginLog[]) ?? []);
        setEnderecos((rEnd.data as EnderecoGeo[]) ?? []);
        setTotalDentistas(rDentCount.count ?? 0);
        setCadDentistas((rCadDent.data as ComCriadoEm[]) ?? []);
        setCadPacientes((rCadPac.data as ComCriadoEm[]) ?? []);
        setPerfilViews((rViews.data as ComCriadoEm[]) ?? []);
        setPerfilContatos((rContatos.data as ComCriadoEm[]) ?? []);
        const t = (Array.isArray(rTaxa.data) ? rTaxa.data[0] : rTaxa.data) as Record<string, unknown> | null;
        setSucesso({
          buscaram: Number(t?.buscaram) || 0,
          sucesso: Number(t?.sucesso) || 0,
          whatsapp: Number(t?.sucesso_whatsapp) || 0,
          telefone: Number(t?.sucesso_telefone) || 0,
        });
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar a análise.");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [periodo]);

  const m = useMemo(() => metricas(logs, periodo), [logs, periodo]);
  const taxaSucesso = sucesso.buscaram > 0 ? (sucesso.sucesso / sucesso.buscaram) * 100 : 0;
  const logins = useMemo(() => origemLogins(loginLogs, periodoLogins), [loginLogs, periodoLogins]);
  const funil = useMemo(() => calcFunil(logs, perfilViews, perfilContatos, periodoFunil), [logs, perfilViews, perfilContatos, periodoFunil]);
  const topCidades = useMemo(() => topListas(logs, enderecos, "cidade", periodoComp), [logs, enderecos, periodoComp]);
  const topBairros = useMemo(() => topListas(logs, enderecos, "bairro", periodoComp), [logs, enderecos, periodoComp]);
  const cadastros = useMemo(() => calcCadastros(cadDentistas, cadPacientes, periodoCadastros), [cadDentistas, cadPacientes, periodoCadastros]);
  const semResultado = useMemo(() => calcSemResultado(logs, periodoSemResultado), [logs, periodoSemResultado]);
  const buscasPorDia = useMemo(() => serieContagem(logs, periodoTempo), [logs, periodoTempo]);
  const projecao = useMemo(() => calcProjecao(buscasPorDia, periodoTempo), [buscasPorDia, periodoTempo]);

  const ptsDentistas = useMemo(() => heatPoints(enderecos), [enderecos]);
  const ptsUsuarios = useMemo(() => heatPointsUsuarios(logs), [logs]);
  const ptsFracas = useMemo(() => heatPointsFracas(enderecos, logs), [enderecos, logs]);
  const mapaPoints: PontoCalor[] = modoMapa === "usuarios" ? ptsUsuarios : modoMapa === "fracas" ? ptsFracas : ptsDentistas;

  if (loading) {
    return <Container className="flex min-h-[60vh] items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-blue" /></Container>;
  }

  return (
    <Container className="space-y-8 py-8">
      {/* Cabeçalho + navegação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy">Análise do site</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/pro/dashboard-analytics/dba" className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy-700">
            <Database size={16} /> Banco de dados
          </Link>
          <Link href="/pro/verificar-cro" className="inline-flex items-center gap-2 rounded-xl bg-[#0A6E5C] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <ShieldCheck size={16} /> Conferência de CRO
          </Link>
        </div>
      </div>

      {erro && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kpi icon={Search} label="Buscas (período)" value={m.totalBuscas} />
        <Kpi icon={Building2} label="Dentistas" value={totalDentistas} />
        <Kpi icon={MapPin} label="Cidades" value={m.cidadesUnicas} />
        <Kpi icon={Activity} label="Bairros" value={m.bairrosUnicos} />
        <Kpi
          icon={TrendingUp}
          label="Taxa de sucesso"
          value={`${taxaSucesso.toFixed(1)}%`}
          sub={`${sucesso.sucesso}/${sucesso.buscaram} contataram · ${sucesso.whatsapp} WhatsApp · ${sucesso.telefone} ligação`}
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-ink-muted">Indicadores acima:</span>
        <FiltroPeriodo value={periodo} onChange={setPeriodo} />
      </div>

      {/* Buscas ao longo do tempo */}
      <Secao titulo="Buscas ao longo do tempo" filtro={<FiltroPeriodo value={periodoTempo} onChange={setPeriodoTempo} />}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={buscasPorDia}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
            <YAxis allowDecimals={false} domain={[0, "auto"]} />
            <Tooltip />
            <Line type="monotone" dataKey="total" name="Buscas" stroke="#007AFF" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        {projecao && (
          <div className="mt-4 rounded-xl border-l-4 border-brand-blue bg-brand-soft/50 p-4 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5 font-semibold text-brand-navy"><TrendingUp size={15} /> Projeção</span>{" "}
            Com base nos últimos {periodoTempo} dias, a projeção para os próximos 30 dias é de{" "}
            <strong>{projecao.projetado} buscas/dia</strong> ({projecao.crescimento}% vs. {projecao.atual} atuais).
            {Number(projecao.crescimento) < 0 && (
              <span className="mt-1 flex items-center gap-1.5 text-warning"><AlertTriangle size={14} /> Queda projetada — vale investigar.</span>
            )}
          </div>
        )}
      </Secao>

      {/* Origem dos logins */}
      <Secao titulo="Origem dos logins" filtro={<FiltroPeriodo value={periodoLogins} onChange={setPeriodoLogins} />}>
        {logins.length === 0 ? (
          <Vazio altura={280}>Ainda sem logins registrados neste período.</Vazio>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={logins} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" allowDecimals={false} domain={[0, "auto"]} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" name="Logins" fill="#5856D6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Secao>

      {/* Buscas × Dentistas */}
      <Secao titulo="Buscas × Dentistas" subtitulo="Demanda (buscas) vs. oferta (dentistas), em % relativo ao maior da lista." filtro={<FiltroPeriodo value={periodoComp} onChange={setPeriodoComp} />}>
        <div className="grid gap-6 md:grid-cols-2">
          <GraficoComparativo titulo="Cidades" data={topCidades} />
          <GraficoComparativo titulo="Bairros" data={topBairros} />
        </div>
      </Secao>

      {/* Funil */}
      <Secao titulo="Funil de conversão" filtro={<FiltroPeriodo value={periodoFunil} onChange={setPeriodoFunil} />}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={funil.dados} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" allowDecimals={false} domain={[0, "auto"]} />
            <YAxis type="category" dataKey="etapa" width={150} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="total" name="Total" fill="#007AFF" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink-soft">
          <span>Busca → perfil: <strong className="text-brand-navy">{funil.convBuscaView.toFixed(1)}%</strong></span>
          <span>Perfil → contato: <strong className="text-brand-navy">{funil.convViewContato.toFixed(1)}%</strong></span>
        </div>
      </Secao>

      {/* Novos cadastros */}
      <Secao titulo="Novos cadastros" filtro={<FiltroPeriodo value={periodoCadastros} onChange={setPeriodoCadastros} />}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cadastros}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
            <YAxis allowDecimals={false} domain={[0, "auto"]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="dentistas" name="Dentistas" stroke="#34C759" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="pacientes" name="Pacientes" stroke="#007AFF" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Secao>

      {/* Buscas sem resultado */}
      <Secao
        titulo="Buscas sem resultado"
        subtitulo={`${semResultado.qtdSemResultado} de ${semResultado.total} buscas não retornaram dentistas (${semResultado.pct.toFixed(1)}%) — onde há demanda sem oferta.`}
        filtro={<FiltroPeriodo value={periodoSemResultado} onChange={setPeriodoSemResultado} />}
      >
        {semResultado.qtdSemResultado === 0 ? (
          <Vazio altura={240}>Nenhuma busca sem resultado neste período.</Vazio>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={semResultado.serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis allowDecimals={false} domain={[0, "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="total" name="Buscas sem resultado" stroke="#FF3B30" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Secao>

      {/* Mapa de calor */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-navy">
              {modoMapa === "dentistas" ? "Onde estão os dentistas" : modoMapa === "usuarios" ? "De onde vêm as buscas" : "Regiões com demanda e pouca oferta"}
            </h2>
            <p className="text-xs text-ink-muted">
              {modoMapa === "fracas" ? "Quanto mais quente, mais busca e menos dentistas — oportunidade." : "Mapa de calor por concentração."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([["dentistas", "Dentistas"], ["usuarios", "Usuários"], ["fracas", "Regiões fracas"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setModoMapa(k)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${modoMapa === k ? "bg-brand-blue text-white" : "border border-black/10 bg-white text-brand-navy hover:bg-black/5"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[400px] overflow-hidden rounded-xl">
          <HeatMapLayer points={mapaPoints} />
        </div>
      </section>
    </Container>
  );
}

function Secao({ titulo, subtitulo, filtro, children }: { titulo: string; subtitulo?: string; filtro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">{titulo}</h2>
          {subtitulo && <p className="text-xs text-ink-muted">{subtitulo}</p>}
        </div>
        {filtro}
      </div>
      {children}
    </section>
  );
}

function Vazio({ children, altura }: { children: React.ReactNode; altura: number }) {
  return (
    <div className="flex items-center justify-center text-sm text-ink-muted" style={{ height: altura }}>
      {children}
    </div>
  );
}

interface LinhaComp { name: string; buscas: number; dentistas: number; buscasPct: number; dentistasPct: number; }
function GraficoComparativo({ titulo, data }: { titulo: string; data: LinhaComp[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink-soft">{titulo}</h3>
      {data.length === 0 ? (
        <Vazio altura={260}>Sem dados neste período.</Vazio>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(_value, name, item) => {
                const p = (item as { payload?: LinhaComp })?.payload;
                const real = name === "Buscas" ? p?.buscas : p?.dentistas;
                return [String(real ?? 0), String(name)];
              }}
            />
            <Legend />
            <Bar dataKey="buscasPct" name="Buscas" fill="#007AFF" radius={[0, 6, 6, 0]} />
            <Bar dataKey="dentistasPct" name="Dentistas cadastrados" fill="#34C759" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: ComponentType<{ size?: number; className?: string }>; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 inline-flex rounded-xl bg-brand-blue/10 p-2 text-brand-blue"><Icon size={18} /></div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-2xl font-bold text-brand-navy">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-tight text-ink-muted">{sub}</p>}
    </div>
  );
}
