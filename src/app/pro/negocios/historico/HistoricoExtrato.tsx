"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// HistoricoExtrato — histórico de locação em formato de "extrato", em duas tabelas:
//   Como dono da sala: clínica · sala · dentista · horário · status
//   Como quem alugou:  clínica · sala · horário · status
// Botão no canto superior direito baixa tudo em planilha (CSV UTF-8, abre no Excel).
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Download, Loader2, Inbox, Send } from "lucide-react";
import { formatarPreco, type StatusSolicitacao, type PrecoUnidade } from "@/lib/salas";
import type { SolicitacaoItem } from "../acoes";

function valorDe(it: SolicitacaoItem) {
  return it.sala_preco != null ? formatarPreco(it.sala_preco, (it.sala_unidade ?? "hora") as PrecoUnidade) : "—";
}
function horasDe(it: SolicitacaoItem) {
  const a = parseInt(it.hora_inicio, 10);
  const z = parseInt(it.hora_fim, 10);
  return Number.isFinite(a) && Number.isFinite(z) ? Math.max(0, z - a) : 0;
}
/** Custo total: por hora = valor × horas; por turno/dia = o valor da unidade. */
function totalDe(it: SolicitacaoItem) {
  if (it.sala_preco == null) return 0;
  return it.sala_unidade === "hora" ? it.sala_preco * horasDe(it) : it.sala_preco;
}

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
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    // Célula numérica em R$ (Number de verdade → soma/ordena no Excel).
    const rs = (v: number, bold = false) =>
      ({ value: Number(v.toFixed(2)), type: Number, format: '"R$" #,##0.00', ...(bold ? { fontWeight: "bold" as const } : {}) });
    const cab = (cols: string[]) => cols.map((c) => ({ value: c, fontWeight: "bold" as const }));
    const vazia = (n: number) => Array.from({ length: n }, () => ({ value: "" }));

    // Só reservas APROVADAS (as que aconteceram). Documento financeiro p/ IR.
    const despesas = enviadas.filter((e) => e.status === "aprovada");
    const receitas = recebidas.filter((r) => r.status === "aprovada");

    type Sheet = { sheet: string; columns: { width: number }[]; data: unknown[][] };
    const sheets: Sheet[] = [];

    if (despesas.length) {
      let soma = 0;
      const linhas = despesas.map((e) => {
        const t = totalDe(e);
        soma += t;
        return [dataBR(e.data), e.sala_clinica ?? "—", e.sala_titulo ?? "Sala", `${e.hora_inicio}–${e.hora_fim}`, horasDe(e), rs(e.sala_preco ?? 0), rs(t)];
      });
      sheets.push({
        sheet: "Despesas (aluguei)",
        columns: [{ width: 12 }, { width: 26 }, { width: 28 }, { width: 16 }, { width: 8 }, { width: 15 }, { width: 15 }],
        data: [
          cab(["Data", "Clínica", "Sala", "Horário", "Horas", "Valor/hora", "Total"]),
          ...linhas,
          [...vazia(5), { value: "TOTAL", fontWeight: "bold" as const }, rs(soma, true)],
        ],
      });
    }

    if (receitas.length) {
      let soma = 0;
      const linhas = receitas.map((r) => {
        const t = totalDe(r);
        soma += t;
        return [dataBR(r.data), r.sala_titulo ?? "Sala", r.dentista_nome || "Dentista", `${r.hora_inicio}–${r.hora_fim}`, horasDe(r), rs(r.sala_preco ?? 0), rs(t)];
      });
      sheets.push({
        sheet: "Receitas (minhas salas)",
        columns: [{ width: 12 }, { width: 28 }, { width: 24 }, { width: 16 }, { width: 8 }, { width: 15 }, { width: 15 }],
        data: [
          cab(["Data", "Sala", "Dentista", "Horário", "Horas", "Valor/hora", "Total"]),
          ...linhas,
          [...vazia(5), { value: "TOTAL", fontWeight: "bold" as const }, rs(soma, true)],
        ],
      });
    }

    if (!sheets.length) return; // nada aprovado para exportar

    setBaixando(true);
    try {
      // Lib carregada só agora (dynamic import) — não pesa no carregamento da página.
      const writeXlsxFile = (await import("write-excel-file/browser")).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out = await writeXlsxFile(sheets as any);
      await out.toFile("extrato-locacao.xlsx");
    } catch (e) {
      console.error("[historico] xlsx:", e);
    } finally {
      setBaixando(false);
    }
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
          disabled={!temAlgo || baixando}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
          style={{ background: "#0a2a66" }}
        >
          {baixando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Baixar Excel
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
            colunas={["Clínica", "Sala", "Dentista", "Horário", "Valor", "Status"]}
            linhas={recebidas.map((r) => [
              r.sala_clinica ?? "—",
              r.sala_titulo ?? "Sala",
              r.dentista_nome || "Dentista",
              `${dataBR(r.data)} · ${r.hora_inicio}–${r.hora_fim}`,
              valorDe(r),
              <StatusTag key={r.id} status={r.status} pago={r.pagamento_resolvido} />,
            ])}
          />
          <Tabela
            titulo="Como quem alugou"
            icone={<Send size={16} />}
            colunas={["Clínica", "Sala", "Horário", "Valor", "Status"]}
            linhas={enviadas.map((e) => [
              e.sala_clinica ?? "—",
              e.sala_titulo ?? "Sala",
              `${dataBR(e.data)} · ${e.hora_inicio}–${e.hora_fim}`,
              valorDe(e),
              <StatusTag key={e.id} status={e.status} pago={e.pagamento_resolvido} />,
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

function StatusTag({ status, pago }: { status: StatusSolicitacao; pago?: boolean }) {
  // Aprovada + pagamento confirmado = reserva CONCLUÍDA (etiqueta própria, navy).
  const concluida = status === "aprovada" && pago === true;
  const cor: Record<StatusSolicitacao, { bg: string; fg: string }> = {
    pendente: { bg: "rgba(255,149,0,0.14)", fg: "#b56a00" },
    aprovada: { bg: "rgba(52,199,89,0.14)", fg: "#2a8a3e" },
    recusada: { bg: "rgba(255,59,48,0.12)", fg: "#c0392b" },
    cancelada: { bg: "rgba(60,60,67,0.10)", fg: "#6b7280" },
  };
  const c = concluida ? { bg: "rgba(10,42,102,0.10)", fg: "#0a2a66" } : cor[status];
  return (
    <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ background: c.bg, color: c.fg }}>
      {concluida ? "Concluída" : LABEL[status]}
    </span>
  );
}
