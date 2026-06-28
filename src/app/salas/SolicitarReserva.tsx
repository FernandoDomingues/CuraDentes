"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// SolicitarReserva — ilha cliente no detalhe da sala. Muro de login: só dentista
// logado solicita. Envia via Server Action solicitarReserva (RPC gated no banco).
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Loader2, CheckCircle, CalendarClock } from "lucide-react";
import { useSessao } from "@/components/SessaoProvider";
import { solicitarReserva } from "./acoes";

export default function SolicitarReserva({ salaId }: { salaId: string }) {
  const { user, carregando, abrirModalDentista } = useSessao();
  const [data, setData] = useState("");
  const [inicio, setInicio] = useState("09:00");
  const [fim, setFim] = useState("10:00");
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [enviada, setEnviada] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);

  async function enviar() {
    setErro("");
    if (!data) {
      setErro("Escolha uma data.");
      return;
    }
    if (fim <= inicio) {
      setErro("O horário final precisa ser depois do inicial.");
      return;
    }
    setOcupado(true);
    const res = await solicitarReserva({ salaId, data, horaInicio: inicio, horaFim: fim, mensagem });
    setOcupado(false);
    if (!res.ok) {
      setErro(res.erro || "Não foi possível enviar.");
      return;
    }
    setEnviada(true);
  }

  const card =
    "rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm";

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

  // Logado, mas não é dentista (paciente/superuser).
  if (!user.ehPro) {
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
              A clínica vai aprovar ou recusar. Se aprovar, vocês recebem o contato um do outro para
              acertar os detalhes. Acompanhe em “Minhas solicitações”.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const inputBase =
    "w-full rounded-[12px] border border-black/15 px-3 py-2.5 text-[15px] outline-none focus:border-brand-blue";
  const label = "mb-1.5 block text-[13px] font-semibold text-ink-soft";

  return (
    <div className={card}>
      <h2 className="mb-3 flex items-center gap-2 text-[16px] font-bold text-brand-navy">
        <CalendarClock size={18} style={{ color: "#007aff" }} /> Solicitar um horário
      </h2>

      <label className={label}>Data</label>
      <input type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} className={inputBase} />

      <div className="mt-3 flex gap-3">
        <div className="flex-1">
          <label className={label}>Início</label>
          <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} className={inputBase} />
        </div>
        <div className="flex-1">
          <label className={label}>Fim</label>
          <input type="time" value={fim} onChange={(e) => setFim(e.target.value)} className={inputBase} />
        </div>
      </div>

      <label className={`${label} mt-3`}>Mensagem (opcional)</label>
      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Ex.: preciso para um atendimento de ortodontia."
        className={`${inputBase} resize-none`}
      />

      {erro && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {erro}
        </p>
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
      <p className="mt-2 text-center text-[12px] text-ink-muted">
        O pagamento é combinado direto com a clínica após a aprovação.
      </p>
    </div>
  );
}
