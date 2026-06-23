"use client";

// Fila de verificação de CRO (parte interativa): KPIs, filtros, busca e lista.
// Recebe as linhas já combinadas do servidor; aqui só filtra/busca/navega.

import { useMemo, useState } from "react";
import Link from "next/link";
import Container from "@/components/Container";
import CroVerificationBadge from "@/components/CroVerificationBadge";
import {
  ExternalLink, Search, ShieldCheck, ShieldAlert, Clock, CheckCircle, XCircle, Eye, Loader2,
} from "lucide-react";

export interface VerificacaoRow {
  id: string | null;
  dentista_id: string;
  cro: string;
  uf: string;
  status: "pendente" | "processando" | "verificado" | "falhou";
  erro: string | null;
  criado_em: string;
  nome: string;
  email: string;
  cro_verificado: boolean;
  deleted_at: string | null;
}

function statusIcon(status: string) {
  if (status === "verificado") return <CheckCircle size={16} className="text-success" />;
  if (status === "pendente") return <Clock size={16} className="text-warning" />;
  if (status === "falhou") return <XCircle size={16} className="text-danger" />;
  return <Loader2 size={16} className="animate-spin text-ink-muted" />;
}
const FILTROS = [
  { key: "todas", label: "Todas" },
  { key: "pendentes", label: "Pendentes" },
  { key: "verificadas", label: "Verificadas" },
  { key: "falhas", label: "Rejeitadas" },
] as const;

export default function VerificarCroLista({ rows }: { rows: VerificacaoRow[] }) {
  const [filtro, setFiltro] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  const pendentes = rows.filter((v) => v.status === "pendente").length;
  const verificadas = rows.filter((v) => v.status === "verificado").length;
  const inativas = rows.filter((v) => v.status === "falhou").length;

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((v) => {
      if (filtro === "pendentes" && v.status !== "pendente") return false;
      if (filtro === "verificadas" && v.status !== "verificado") return false;
      if (filtro === "falhas" && v.status !== "falhou") return false;
      if (q && !v.nome.toLowerCase().includes(q) && !v.cro.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filtro, busca]);

  return (
    <Container className="space-y-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy">Verificação de CRO</h1>
        <a
          href="https://busca-profissionais.cfo.org.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-medium text-brand-blue hover:bg-black/3"
        >
          <ExternalLink size={14} /> Abrir busca do CFO
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Kpi icon={<ShieldAlert size={20} className="text-warning" />} label="Pendentes" valor={pendentes} />
        <Kpi icon={<ShieldCheck size={20} className="text-success" />} label="Verificadas" valor={verificadas} />
        <Kpi icon={<XCircle size={20} className="text-danger" />} label="Rejeitadas" valor={inativas} />
      </div>

      {/* Filtros + busca */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* Os 4 filtros SEMPRE em uma linha: no mobile viram segmentos de largura
            igual (flex-1 + min-w-0, sem quebra nem overflow); no desktop, largura natural. */}
        <div className="flex items-stretch gap-1.5 md:gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-center text-[12px] font-medium leading-tight transition-colors md:flex-none md:px-4 md:text-sm ${filtro === f.key ? "bg-brand-blue text-white" : "bg-white text-brand-navy hover:bg-black/5"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CRO…"
            className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-brand-blue md:w-64"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtradas.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center">
            <ShieldCheck size={40} className="mx-auto mb-3 text-success" />
            <p className="text-ink-muted">Nenhuma verificação encontrada.</p>
          </div>
        ) : (
          filtradas.map((v) => (
            <div key={v.dentista_id} className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
              {/* Cabeçalho: dentista à esquerda, selo de status no canto SUPERIOR DIREITO */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {statusIcon(v.status)}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-brand-navy">{v.nome || "Sem nome"}</p>
                    <span className="font-mono text-sm text-ink-muted">{v.cro}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <CroVerificationBadge verificado={v.cro_verificado} inativo={v.status === "falhou"} />
                </div>
              </div>

              {/* Rodapé: data + ação */}
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-ink-muted">{v.criado_em ? new Date(v.criado_em).toLocaleDateString("pt-BR") : "—"}</p>
                {v.id ? (
                  <Link
                    href={`/pro/verificar-cro/${v.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-2 text-xs font-medium text-white hover:bg-brand-blue-600"
                  >
                    <Eye size={13} /> Verificar
                  </Link>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-brand-blue/40 px-3 py-2 text-xs font-medium text-white" title="Sem registro de verificação ainda">
                    <Eye size={13} /> Verificar
                  </span>
                )}
              </div>
              {v.erro && v.status === "falhou" && <p className="mt-2 text-xs text-danger">{v.erro}</p>}
            </div>
          ))
        )}
      </div>
    </Container>
  );
}

function Kpi({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-ink-muted">{label}</p>
          <p className="text-2xl font-bold text-brand-navy">{valor}</p>
        </div>
      </div>
    </div>
  );
}
