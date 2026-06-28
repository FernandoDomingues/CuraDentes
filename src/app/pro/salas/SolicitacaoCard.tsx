"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// SolicitacaoCard — cartão de uma solicitação, nos dois painéis:
//   modo="recebida" (anfitrião): aprovar/recusar + ver contato do dentista
//   modo="enviada"  (locatário): cancelar + ver contato da clínica
// Toda ação chama uma Server Action gated; o estado é atualizado localmente.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Loader2, Check, X, Phone, Mail, MessageCircle } from "lucide-react";
import type { ContatoReserva, StatusSolicitacao } from "@/lib/salas";
import {
  decidirSolicitacao,
  cancelarSolicitacao,
  verContato,
  type SolicitacaoItem,
} from "./acoes";

const BADGE: Record<StatusSolicitacao, { txt: string; bg: string; fg: string }> = {
  pendente: { txt: "Pendente", bg: "rgba(255,149,0,0.14)", fg: "#b56a00" },
  aprovada: { txt: "Aprovada", bg: "rgba(52,199,89,0.14)", fg: "#2a8a3e" },
  recusada: { txt: "Recusada", bg: "rgba(255,59,48,0.12)", fg: "#c0392b" },
  cancelada: { txt: "Cancelada", bg: "rgba(60,60,67,0.10)", fg: "#6b7280" },
};

function dataBR(iso: string) {
  return iso.split("-").reverse().join("/");
}

export default function SolicitacaoCard({
  item,
  modo,
}: {
  item: SolicitacaoItem;
  modo: "recebida" | "enviada";
}) {
  const [status, setStatus] = useState<StatusSolicitacao>(item.status);
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");
  const [contato, setContato] = useState<ContatoReserva | null>(null);

  async function decidir(decisao: "aprovada" | "recusada") {
    setErro("");
    setOcupado(decisao);
    const res = await decidirSolicitacao(item.id, decisao);
    setOcupado("");
    if (!res.ok) return setErro(res.erro || "Falhou.");
    setStatus(decisao);
  }

  async function cancelar() {
    setErro("");
    setOcupado("cancelar");
    const res = await cancelarSolicitacao(item.id);
    setOcupado("");
    if (!res.ok) return setErro(res.erro || "Falhou.");
    setStatus("cancelada");
  }

  async function carregarContato() {
    setErro("");
    setOcupado("contato");
    const res = await verContato(item.id);
    setOcupado("");
    if (!res.ok) return setErro(res.erro || "Contato indisponível.");
    setContato(res.contato ?? null);
  }

  const b = BADGE[status];
  const btn =
    "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[12px] px-4 text-[14px] font-semibold transition-all disabled:opacity-50";

  return (
    <div className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold text-brand-navy">
            {item.sala_titulo ?? "Sala"}
          </h3>
          {item.sala_local && <p className="text-[13px] text-ink-muted">{item.sala_local}</p>}
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: b.bg, color: b.fg }}
        >
          {b.txt}
        </span>
      </div>

      <p className="mt-3 text-[14px] text-ink-soft">
        <span className="font-semibold text-ink">{dataBR(item.data)}</span> · {item.hora_inicio}–
        {item.hora_fim}
      </p>

      {item.mensagem && (
        <p className="mt-2 rounded-[12px] bg-black/[0.03] px-3 py-2 text-[14px] text-ink-soft">
          “{item.mensagem}”
        </p>
      )}

      {item.observacao_anfitriao && status !== "pendente" && (
        <p className="mt-2 text-[13px] text-ink-muted">
          Resposta da clínica: {item.observacao_anfitriao}
        </p>
      )}

      {erro && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {erro}
        </p>
      )}

      {/* Ações por modo + estado */}
      {modo === "recebida" && status === "pendente" && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => decidir("aprovada")}
            disabled={!!ocupado}
            className={btn}
            style={{ background: "#34c759", color: "#fff" }}
          >
            {ocupado === "aprovada" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Aprovar
          </button>
          <button
            onClick={() => decidir("recusada")}
            disabled={!!ocupado}
            className={`${btn} border border-black/10 text-ink-soft hover:bg-black/[0.04]`}
          >
            {ocupado === "recusada" ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
            Recusar
          </button>
        </div>
      )}

      {modo === "enviada" && status === "pendente" && (
        <div className="mt-4">
          <button
            onClick={cancelar}
            disabled={!!ocupado}
            className={`${btn} border border-black/10 text-ink-soft hover:bg-black/[0.04]`}
          >
            {ocupado === "cancelar" ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
            Cancelar solicitação
          </button>
        </div>
      )}

      {/* Contato liberado após aprovação */}
      {status === "aprovada" && (
        <div className="mt-4 rounded-[14px] border border-brand-soft bg-brand-soft/40 p-4">
          {!contato ? (
            <button
              onClick={carregarContato}
              disabled={!!ocupado}
              className={`${btn} w-full`}
              style={{ background: "#007aff", color: "#fff" }}
            >
              {ocupado === "contato" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Phone size={15} />
              )}
              {modo === "recebida" ? "Ver contato do dentista" : "Ver contato da clínica"}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {contato.nome && (
                <p className="text-[15px] font-bold text-brand-navy">{contato.nome}</p>
              )}
              {contato.whatsapp && (
                <a
                  href={`https://wa.me/55${contato.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[14px] font-semibold text-brand-blue"
                >
                  <MessageCircle size={15} /> {contato.whatsapp}
                </a>
              )}
              {contato.telefone && (
                <a
                  href={`tel:${contato.telefone.replace(/\D/g, "")}`}
                  className="flex items-center gap-2 text-[14px] font-semibold text-brand-blue"
                >
                  <Phone size={15} /> {contato.telefone}
                </a>
              )}
              {contato.email && (
                <a
                  href={`mailto:${contato.email}`}
                  className="flex items-center gap-2 break-all text-[14px] font-semibold text-brand-blue"
                >
                  <Mail size={15} /> {contato.email}
                </a>
              )}
              <p className="mt-1 text-[12px] text-ink-muted">
                Combine valor e detalhes direto com a contraparte. O pagamento é por fora da
                plataforma nesta fase.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
