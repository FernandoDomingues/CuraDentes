"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// SolicitarReserva — ilha cliente no detalhe da sala. Muro de login: só dentista
// com CRO verificado solicita. O horário é escolhido no calendário (AgendaSala);
// cada faixa contígua selecionada vira uma solicitação (RPC criar_solicitacao_reserva).
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Loader2, CheckCircle, CalendarClock, CalendarDays, Pencil } from "lucide-react";
import { useSessao } from "@/components/SessaoProvider";
import { agruparHorasEmFaixas, type BlocoDisponibilidade, type SlotOcupado } from "@/lib/salas";
import { solicitarReserva } from "./acoes";
import AgendaSala from "./AgendaSala";

export default function SolicitarReserva({
  salaId,
  disponibilidade,
  ocupados,
}: {
  salaId: string;
  disponibilidade: BlocoDisponibilidade[];
  ocupados: SlotOcupado[];
}) {
  const { user, carregando, abrirModalDentista } = useSessao();
  const [modal, setModal] = useState(false);
  const [sel, setSel] = useState<{ data: string; horas: number[] } | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [enviada, setEnviada] = useState(false);

  const card = "rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm";

  async function enviar() {
    if (!sel) return;
    setErro("");
    setOcupado(true);
    const faixas = agruparHorasEmFaixas(sel.horas);
    let falhou = "";
    for (const f of faixas) {
      const res = await solicitarReserva({
        salaId, data: sel.data, horaInicio: f.inicio, horaFim: f.fim, mensagem,
      });
      if (!res.ok) {
        falhou = res.erro || "Não foi possível enviar.";
        break;
      }
    }
    setOcupado(false);
    if (falhou) {
      setErro(falhou);
      return;
    }
    setEnviada(true);
  }

  if (carregando) {
    return (
      <div className={card}>
        <Loader2 className="animate-spin text-brand-blue" size={20} />
      </div>
    );
  }

  // Não logado → muro de login (dentista).
  if (!user) {
    return (
      <div className={card}>
        <h2 className="mb-1 text-[16px] font-bold text-brand-navy">Quer alugar esta sala?</h2>
        <p className="mb-4 text-[14px] text-ink-soft">Entre com sua conta de dentista para solicitar um horário.</p>
        <button
          onClick={abrirModalDentista}
          className="min-h-[48px] w-full rounded-[14px] py-3 text-[15px] font-semibold text-white"
          style={{ background: "#0a2a66" }}
        >
          Entrar como dentista
        </button>
      </div>
    );
  }

  // Logado, mas não é dentista com CRO aprovado.
  if (!user.ehPro || !user.croVerificado) {
    return (
      <div className={card}>
        <p className="text-[14px] text-ink-soft">
          Apenas dentistas com CRO verificado podem solicitar uma sala.
        </p>
      </div>
    );
  }

  if (enviada) {
    return (
      <div className={card}>
        <div className="flex items-start gap-2">
          <CheckCircle size={18} style={{ color: "#34c759", marginTop: 1 }} />
          <div>
            <p className="text-[15px] font-semibold text-brand-navy">Solicitação enviada!</p>
            <p className="mt-1 text-[14px] text-ink-soft">
              A clínica vai aprovar ou recusar. Acompanhe em “Minhas solicitações”.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const faixas = sel ? agruparHorasEmFaixas(sel.horas) : [];
  const resumo = faixas.map((f) => `${f.inicio}–${f.fim}`).join(", ");

  return (
    <div className={card}>
      <h2 className="mb-3 flex items-center gap-2 text-[16px] font-bold text-brand-navy">
        <CalendarClock size={18} style={{ color: "#007aff" }} /> Solicitar um horário
      </h2>

      {!sel ? (
        <button
          onClick={() => setModal(true)}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110"
          style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.25)" }}
        >
          <CalendarDays size={17} /> Ver agenda e escolher
        </button>
      ) : (
        <>
          <div className="mb-3 flex items-start justify-between gap-2 rounded-[12px] bg-brand-soft/50 p-3">
            <div>
              <p className="text-[13px] font-semibold text-brand-navy">
                {sel.data.split("-").reverse().join("/")}
              </p>
              <p className="text-[13px] text-ink-soft">{resumo}</p>
            </div>
            <button
              onClick={() => setModal(true)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-blue"
            >
              <Pencil size={12} /> Alterar
            </button>
          </div>

          <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Mensagem (opcional)</label>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Ex.: preciso para um atendimento de ortodontia."
            className="w-full resize-none rounded-[12px] border border-black/15 px-3 py-2.5 text-[15px] outline-none focus:border-brand-blue"
          />

          {erro && (
            <p role="alert" className="mt-2 text-[13px] text-danger">{erro}</p>
          )}

          <button
            onClick={enviar}
            disabled={ocupado}
            className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.25)" }}
          >
            {ocupado && <Loader2 size={16} className="animate-spin" />}
            Solicitar horário
          </button>
        </>
      )}

      <p className="mt-2 text-center text-[12px] text-ink-muted">
        O pagamento é combinado direto com a clínica após a aprovação.
      </p>

      {modal && (
        <AgendaSala
          disponibilidade={disponibilidade}
          ocupados={ocupados}
          onFechar={() => setModal(false)}
          onConfirmar={(s) => {
            setSel(s);
            setModal(false);
            setErro("");
          }}
        />
      )}
    </div>
  );
}
