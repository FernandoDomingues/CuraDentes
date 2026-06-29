"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// HistoricoExtrato — histórico de locação em formato de "extrato", em duas tabelas:
//   Como dono da sala: clínica · sala · dentista · horário · status
//   Como quem alugou:  clínica · sala · horário · status
// Botão no canto superior direito baixa tudo em planilha (CSV UTF-8, abre no Excel).
// ═══════════════════════════════════════════════════════════════════════════════

import { Download, Inbox, Send } from "lucide-react";
import type { StatusSolicitacao } from "@/lib/salas";
import type { SolicitacaoItem } from "../acoes";

const LABEL: Record<StatusSolicitacao, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

function dataBR(iso: string) {
  return iso.split("-").reverse().join("/");
}

export default function HistoricoExtrato({
  recebidas,
  enviadas,
}: {
  recebidas: SolicitacaoItem[];
  enviadas: SolicitacaoItem[];
}) {
  function baixar() {
    const linhas: string[][] = [["Papel", "Clínica", "Sala", "Dentista", "Data", "Horário", "Status"]];
    for (const r of recebidas)
      linhas.push(["Dono da sala", r.sala_clinica ?? "", r.sala_titulo ?? "", r.dentista_nome ?? "", dataBR(r.data), `${r.hora_inicio}-${r.hora_fim}`, LABEL[r.status]]);
    for (const e of enviadas)
      linhas.push(["Aluguei", e.sala_clinica ?? "", e.sala_titulo ?? "", "", dataBR(e.data), `${e.hora_inicio}-${e.hora_fim}`, LABEL[e.status]]);
    const csv = "﻿" + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "historico-locacao.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const temAlgo = recebidas.length > 0 || enviadas.length > 0;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-brand-navy">Histórico de locação</h1>
          <p className="mt-1 text-[14px] text-ink-soft">Seu extrato completo, como dono da sala e como quem alugou.</p>
        </div>
        <button
          onClick={baixar}
          disabled={!temAlgo}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
          style={{ background: "#0a2a66" }}
        >
          <Download size={16} /> Baixar planilha
        </button>
      </div>

      {!temAlgo ? (
        <p className="rounded-[16px] border border-dashed border-black/15 bg-white py-12 text-center text-[14px] text-ink-muted">
          Ainda não há histórico de locação.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <Tabela
            titulo="Como dono da sala"
            icone={<Inbox size={16} />}
            colunas={["Clínica", "Sala", "Dentista", "Horário", "Status"]}
            linhas={recebidas.map((r) => [
              r.sala_clinica ?? "—",
              r.sala_titulo ?? "Sala",
              r.dentista_nome || "Dentista",
              `${dataBR(r.data)} · ${r.hora_inicio}–${r.hora_fim}`,
              <StatusTag key={r.id} status={r.status} />,
            ])}
          />
          <Tabela
            titulo="Como quem alugou"
            icone={<Send size={16} />}
            colunas={["Clínica", "Sala", "Horário", "Status"]}
            linhas={enviadas.map((e) => [
              e.sala_clinica ?? "—",
              e.sala_titulo ?? "Sala",
              `${dataBR(e.data)} · ${e.hora_inicio}–${e.hora_fim}`,
              <StatusTag key={e.id} status={e.status} />,
            ])}
          />
        </div>
      )}
    </div>
  );
}

function Tabela({
  titulo,
  icone,
  colunas,
  linhas,
}: {
  titulo: string;
  icone: React.ReactNode;
  colunas: string[];
  linhas: React.ReactNode[][];
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
        <span style={{ color: "#007aff" }}>{icone}</span> {titulo}
      </h2>
      {linhas.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-black/12 bg-white px-4 py-6 text-center text-[13px] text-ink-muted">Nada por aqui.</p>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100">
                {colunas.map((c) => (
                  <th key={c} className="px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-ink-muted">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  {linha.map((cel, j) => (
                    <td key={j} className="px-4 py-3 text-[14px] text-ink-soft">{cel}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusTag({ status }: { status: StatusSolicitacao }) {
  const cor: Record<StatusSolicitacao, { bg: string; fg: string }> = {
    pendente: { bg: "rgba(255,149,0,0.14)", fg: "#b56a00" },
    aprovada: { bg: "rgba(52,199,89,0.14)", fg: "#2a8a3e" },
    recusada: { bg: "rgba(255,59,48,0.12)", fg: "#c0392b" },
    cancelada: { bg: "rgba(60,60,67,0.10)", fg: "#6b7280" },
  };
  const c = cor[status];
  return (
    <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ background: c.bg, color: c.fg }}>
      {LABEL[status]}
    </span>
  );
}
