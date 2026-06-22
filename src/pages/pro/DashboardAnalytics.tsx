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
  latitude: number | null;
  longitude: number | null;
  criado_em: string;
};

type DentistaEndereco = {
  bairro: string | null;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
};

type LoginLogRow = {
  origem: string | null;
  criado_em: string;
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
  { v: "ytd", label: "YTD" },
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

// Início (00:00) do dia 1º de janeiro do ano corrente — base do filtro YTD.
function inicioYTD(): Date {
  const a = new Date();
  return new Date(a.getFullYear(), 0, 1);
}

// Converte o valor do filtro em número de dias da janela
// ("7"/"30"/... = últimos N dias; "ytd" = dias desde 1º de janeiro).
function diasDoPeriodo(periodo: string): number {
  if (periodo === "ytd") {
    return Math.max(1, Math.ceil((Date.now() - inicioYTD().getTime()) / 86400000));
  }
  return parseInt(periodo);
}

// Filtra os logs já carregados para a janela do período (client-side).
function logsNoPeriodo<T extends { criado_em: string }>(logs: T[], periodo: string): T[] {
  const limite = periodo === "ytd" ? inicioYTD().getTime() : Date.now() - parseInt(periodo) * 86400000;
  return logs.filter((l) => new Date(l.criado_em).getTime() >= limite);
}

export default function DashboardAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [enderecos, setEnderecos] = useState<DentistaEndereco[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogRow[]>([]);
  const [perfilViews, setPerfilViews] = useState<{ criado_em: string }[]>([]);
  const [perfilContatos, setPerfilContatos] = useState<{ criado_em: string }[]>([]);
  const [cadDentistas, setCadDentistas] = useState<{ criado_em: string }[]>([]);
  const [cadPacientes, setCadPacientes] = useState<{ criado_em: string }[]>([]);
  const [totalDentistas, setTotalDentistas] = useState(0);
  const [periodo, setPeriodo] = useState<string>("30"); // KPIs (indicadores)
  const [periodoTempo, setPeriodoTempo] = useState<string>("30"); // gráfico "Buscas ao longo do tempo"
  const [periodoComp, setPeriodoComp] = useState<string>("30"); // gráficos "Buscas × Dentistas"
  const [periodoLogins, setPeriodoLogins] = useState<string>("30"); // gráfico "Origem dos logins"
  const [periodoFunil, setPeriodoFunil] = useState<string>("30"); // funil de conversão
  const [periodoCadastros, setPeriodoCadastros] = useState<string>("30"); // novos cadastros
  const [periodoSemResultado, setPeriodoSemResultado] = useState<string>("30"); // buscas sem resultado
  const [modoMapa, setModoMapa] = useState<"dentistas" | "usuarios" | "fracas">("dentistas"); // visão do mapa
  // Taxa de sucesso: usuários que buscaram e depois clicaram em WhatsApp/ligação
  const [sucesso, setSucesso] = useState({ buscaram: 0, sucesso: 0, whatsapp: 0, telefone: 0 });

  useEffect(() => {
    async function carregar() {
      try {
        const dias = diasDoPeriodo(periodo);

        const [logRes, endRes, countRes, sucRes, loginRes, viewsRes, contatosRes, cadDentRes, cadPacRes] = await Promise.all([
          // Buscamos sempre até 1 ano de logs e filtramos por período no cliente,
          // assim cada gráfico tem seu próprio filtro sem precisar refazer a query.
          supabase
            .from("logs_busca")
            .select("query, cidade, estado, bairro, resultados_count, latitude, longitude, criado_em")
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
          supabase
            .from("logs_login")
            .select("origem, criado_em")
            .gte("criado_em", new Date(Date.now() - 365 * 86400000).toISOString())
            .order("criado_em", { ascending: false }),
          supabase
            .from("perfil_visualizacoes")
            .select("criado_em")
            .gte("criado_em", new Date(Date.now() - 365 * 86400000).toISOString()),
          supabase
            .from("perfil_contatos")
            .select("criado_em")
            .gte("criado_em", new Date(Date.now() - 365 * 86400000).toISOString()),
          supabase
            .from("curadentespro")
            .select("criado_em")
            .eq("lgpd_aceito", true)
            .is("deleted_at", null)
            .gte("criado_em", new Date(Date.now() - 365 * 86400000).toISOString()),
          supabase
            .from("clientes")
            .select("criado_em")
            .is("deleted_at", null)
            .gte("criado_em", new Date(Date.now() - 365 * 86400000).toISOString()),
        ]);

        if (logRes.data) setLogs(logRes.data);
        if (endRes.data) setEnderecos(endRes.data as DentistaEndereco[]);
        if (countRes.count !== null) setTotalDentistas(countRes.count);
        if (loginRes.data) setLoginLogs(loginRes.data as LoginLogRow[]);
        if (viewsRes.data) setPerfilViews(viewsRes.data as { criado_em: string }[]);
        if (contatosRes.data) setPerfilContatos(contatosRes.data as { criado_em: string }[]);
        if (cadDentRes.data) setCadDentistas(cadDentRes.data as { criado_em: string }[]);
        if (cadPacRes.data) setCadPacientes(cadPacRes.data as { criado_em: string }[]);
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
    const ls = logsNoPeriodo(logs, periodo);
    const totalBuscas = ls.length;
    const cidadesUnicas = [...new Set(ls.map((l) => l.cidade).filter(Boolean))];
    const bairrosUnicos = [...new Set(ls.map((l) => l.bairro).filter(Boolean))];

    return { totalBuscas, cidadesUnicas: cidadesUnicas.length, bairrosUnicos: bairrosUnicos.length };
  }, [logs, periodo]);

  const taxaSucesso = sucesso.buscaram > 0 ? (sucesso.sucesso / sucesso.buscaram) * 100 : 0;

  // ─── Origem dos logins (navegador no desktop, ou Android/iOS no celular/app) ──
  const originLogins = useMemo(() => {
    const conta = new Map<string, number>();
    logsNoPeriodo(loginLogs, periodoLogins).forEach((l) => {
      const k = l.origem || "Outro";
      conta.set(k, (conta.get(k) || 0) + 1);
    });
    return Array.from(conta.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [loginLogs, periodoLogins]);

  // ─── Funil de conversão: busca → visualização de perfil → contato ────────────
  const funil = useMemo(() => {
    const buscas = logsNoPeriodo(logs, periodoFunil).length;
    const views = logsNoPeriodo(perfilViews, periodoFunil).length;
    const contatos = logsNoPeriodo(perfilContatos, periodoFunil).length;
    return {
      dados: [
        { etapa: "Buscas", total: buscas },
        { etapa: "Visualizações de perfil", total: views },
        { etapa: "Contatos", total: contatos },
      ],
      convBuscaView: buscas > 0 ? (views / buscas) * 100 : 0,
      convViewContato: views > 0 ? (contatos / views) * 100 : 0,
    };
  }, [logs, perfilViews, perfilContatos, periodoFunil]);

  // ─── Buscas sem resultado (demanda não atendida) ao longo do tempo ───────────
  const buscasSemResultado = useMemo(() => {
    const ls = logsNoPeriodo(logs, periodoSemResultado);
    const sem = ls.filter((l) => (l.resultados_count ?? 0) === 0);

    // Série por dia/mês (mesma lógica dos demais gráficos temporais).
    const ytd = periodoSemResultado === "ytd";
    const agora = new Date();
    const inicio = ytd ? inicioYTD() : new Date(agora);
    inicio.setHours(0, 0, 0, 0);
    if (!ytd) inicio.setDate(inicio.getDate() - (parseInt(periodoSemResultado) - 1));
    const hoje0 = new Date(agora);
    hoje0.setHours(0, 0, 0, 0);
    const dias = Math.round((hoje0.getTime() - inicio.getTime()) / 86400000) + 1;
    const mensal = dias > 31;

    const cont = new Map<string, number>();
    sem.forEach((l) => {
      const d = new Date(l.criado_em);
      if (d.getTime() < inicio.getTime()) return;
      const k = mensal ? chaveMes(d) : chaveDia(d);
      cont.set(k, (cont.get(k) || 0) + 1);
    });

    const serie: { label: string; total: number }[] = [];
    if (mensal) {
      const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      const fim = new Date(agora.getFullYear(), agora.getMonth(), 1);
      while (cursor.getTime() <= fim.getTime()) {
        const k = chaveMes(cursor);
        serie.push({ label: `${pad2(cursor.getMonth() + 1)}/${String(cursor.getFullYear()).slice(2)}`, total: cont.get(k) || 0 });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      for (let i = 0; i < dias; i++) {
        const d = new Date(inicio);
        d.setDate(d.getDate() + i);
        const k = chaveDia(d);
        serie.push({ label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`, total: cont.get(k) || 0 });
      }
    }

    return {
      total: ls.length,
      qtdSemResultado: sem.length,
      pct: ls.length > 0 ? (sem.length / ls.length) * 100 : 0,
      serie,
    };
  }, [logs, periodoSemResultado]);

  // ─── Novos cadastros (dentistas + pacientes) ao longo do tempo ───────────────
  const cadastros = useMemo(() => {
    const ytd = periodoCadastros === "ytd";
    const agora = new Date();
    const inicio = ytd ? inicioYTD() : new Date(agora);
    inicio.setHours(0, 0, 0, 0);
    if (!ytd) inicio.setDate(inicio.getDate() - (parseInt(periodoCadastros) - 1));
    const hoje0 = new Date(agora);
    hoje0.setHours(0, 0, 0, 0);
    const dias = Math.round((hoje0.getTime() - inicio.getTime()) / 86400000) + 1;
    const mensal = dias > 31;

    const contar = (items: { criado_em: string }[]) => {
      const m = new Map<string, number>();
      items.forEach((it) => {
        const d = new Date(it.criado_em);
        if (d.getTime() < inicio.getTime()) return;
        const k = mensal ? chaveMes(d) : chaveDia(d);
        m.set(k, (m.get(k) || 0) + 1);
      });
      return m;
    };
    const md = contar(cadDentistas);
    const mp = contar(cadPacientes);

    const pts: { label: string; dentistas: number; pacientes: number }[] = [];
    if (mensal) {
      const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      const fim = new Date(agora.getFullYear(), agora.getMonth(), 1);
      while (cursor.getTime() <= fim.getTime()) {
        const k = chaveMes(cursor);
        pts.push({ label: `${pad2(cursor.getMonth() + 1)}/${String(cursor.getFullYear()).slice(2)}`, dentistas: md.get(k) || 0, pacientes: mp.get(k) || 0 });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      for (let i = 0; i < dias; i++) {
        const d = new Date(inicio);
        d.setDate(d.getDate() + i);
        const k = chaveDia(d);
        pts.push({ label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`, dentistas: md.get(k) || 0, pacientes: mp.get(k) || 0 });
      }
    }
    return pts;
  }, [cadDentistas, cadPacientes, periodoCadastros]);

  // ─── Top Cidades ─────────────────────────────────────────────────────────────

  const topCidades = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase();
    const buscas = new Map<string, { name: string; buscas: number }>();
    logsNoPeriodo(logs, periodoComp).forEach((l) => {
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
    logsNoPeriodo(logs, periodoComp).forEach((l) => {
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
    const ytd = periodoTempo === "ytd";
    const agora = new Date();
    const inicio = ytd ? inicioYTD() : new Date(agora);
    inicio.setHours(0, 0, 0, 0);
    if (!ytd) inicio.setDate(inicio.getDate() - (parseInt(periodoTempo) - 1));
    const hoje0 = new Date(agora);
    hoje0.setHours(0, 0, 0, 0);
    const dias = Math.round((hoje0.getTime() - inicio.getTime()) / 86400000) + 1;
    const mensal = dias > 31; // janelas longas (>31 dias) agrupam por mês; senão, por dia

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
    if (diasDoPeriodo(periodoTempo) > 31 || buscasPorDia.length < 3) return null;
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

  // Pontos de DEMANDA: de onde partem as buscas (logs com lat/long).
  const heatPointsUsuarios = useMemo(() => {
    return logs
      .filter((l) => l.latitude !== null && l.longitude !== null)
      .map((l) => [l.latitude!, l.longitude!, 1] as [number, number, number]);
  }, [logs]);

  // Pontos de REGIÕES FRACAS: por célula de grade (~5 km), intensidade = demanda / (oferta + 1).
  // Muita busca + poucos dentistas => mais quente (área carente de oferta).
  const heatPointsFracas = useMemo(() => {
    const chaveCelula = (lat: number, lng: number) => `${Math.round(lat / 0.05)}:${Math.round(lng / 0.05)}`;
    const oferta = new Map<string, number>();
    enderecos.forEach((e) => {
      if (e.latitude == null || e.longitude == null) return;
      oferta.set(chaveCelula(e.latitude, e.longitude), (oferta.get(chaveCelula(e.latitude, e.longitude)) || 0) + 1);
    });
    const demanda = new Map<string, { lat: number; lng: number; q: number }>();
    logs.forEach((l) => {
      if (l.latitude == null || l.longitude == null) return;
      const k = chaveCelula(l.latitude, l.longitude);
      const e = demanda.get(k) || { lat: l.latitude, lng: l.longitude, q: 0 };
      e.q++;
      demanda.set(k, e);
    });
    return Array.from(demanda.entries()).map(([k, d]) => {
      const sup = oferta.get(k) || 0;
      return [d.lat, d.lng, d.q / (sup + 1)] as [number, number, number];
    });
  }, [logs, enderecos]);

  const mapaPoints = modoMapa === "usuarios" ? heatPointsUsuarios : modoMapa === "fracas" ? heatPointsFracas : heatPoints;

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

        {/* ─── Origem dos logins ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2A66]">Origem dos logins</h2>
              <p className="text-xs text-[#6B7280]">
                Navegador no desktop, ou Android/iOS no celular e no app. Coletado a partir de agora.
              </p>
            </div>
            <FiltroPeriodo value={periodoLogins} onChange={setPeriodoLogins} />
          </div>
          {originLogins.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-[#8E8E93]">
              Ainda sem logins registrados neste período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={originLogins} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" allowDecimals={false} domain={[0, "auto"]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                <Tooltip />
                <Bar dataKey="total" name="Logins" fill="#5856D6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
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
        {/* ─── Funil de conversão ───────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2A66]">Funil de conversão</h2>
              <p className="text-xs text-[#6B7280]">Busca → visualização de perfil → contato. Coletado a partir do registro de cada evento.</p>
            </div>
            <FiltroPeriodo value={periodoFunil} onChange={setPeriodoFunil} />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funil.dados} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" allowDecimals={false} domain={[0, "auto"]} />
              <YAxis type="category" dataKey="etapa" tick={{ fontSize: 12 }} width={150} />
              <Tooltip />
              <Bar dataKey="total" name="Total" fill="#007AFF" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-2 text-sm flex-wrap">
            <span className="text-[#6B7280]">Busca → perfil: <strong className="text-[#0A2A66]">{funil.convBuscaView.toFixed(1)}%</strong></span>
            <span className="text-[#6B7280]">Perfil → contato: <strong className="text-[#0A2A66]">{funil.convViewContato.toFixed(1)}%</strong></span>
          </div>
        </section>

        {/* ─── Novos cadastros ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2A66]">Novos cadastros</h2>
              <p className="text-xs text-[#6B7280]">Dentistas e pacientes que se cadastraram ao longo do tempo.</p>
            </div>
            <FiltroPeriodo value={periodoCadastros} onChange={setPeriodoCadastros} />
          </div>
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
        </section>

        {/* ─── Buscas sem resultado (demanda não atendida) ──────────────── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2A66]">Buscas sem resultado</h2>
              <p className="text-xs text-[#6B7280]">
                {buscasSemResultado.qtdSemResultado} de {buscasSemResultado.total} buscas não retornaram dentistas
                {" "}({buscasSemResultado.pct.toFixed(1)}%) — onde há demanda sem oferta.
              </p>
            </div>
            <FiltroPeriodo value={periodoSemResultado} onChange={setPeriodoSemResultado} />
          </div>
          {buscasSemResultado.qtdSemResultado === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-[#8E8E93]">
              Nenhuma busca sem resultado neste período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={buscasSemResultado.serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
                <YAxis allowDecimals={false} domain={[0, "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="total" name="Buscas sem resultado" stroke="#FF3B30" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* ─── Mapa de calor (Dentistas / Usuários / Regiões fracas) ────── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2A66]">
                {modoMapa === "dentistas"
                  ? "Mapa de Calor — Dentistas (oferta)"
                  : modoMapa === "usuarios"
                  ? "Mapa de Calor — Usuários (demanda)"
                  : "Mapa de Calor — Regiões fracas de oferta"}
              </h2>
              <p className="text-xs text-[#6B7280]">
                {modoMapa === "dentistas"
                  ? "Onde estão os dentistas cadastrados."
                  : modoMapa === "usuarios"
                  ? "De onde partem as buscas dos usuários."
                  : "Muita busca e pouca oferta de dentistas — quanto mais quente, mais carente a região."}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {([
                ["dentistas", "Dentistas"],
                ["usuarios", "Usuários"],
                ["fracas", "Regiões fracas"],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setModoMapa(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    modoMapa === v ? "bg-[#007AFF] text-white" : "bg-white text-[#0A2A66] hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[400px] rounded-xl overflow-hidden">
            <HeatMapLayer points={mapaPoints} />
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
