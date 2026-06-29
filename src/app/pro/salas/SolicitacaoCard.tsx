"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// SolicitacaoCard — cartão de uma solicitação, nos dois lados:
//   modo="recebida" (locador): WhatsApp/Ligar (vê o solicitante), Aprovar, Recusar
//     (com motivo opcional).
//   modo="enviada"  (locatário): Cancelar; após aprovação vê o contato da clínica e
//     marca o pagamento como resolvido.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Loader2, Check, X, Phone, Mail, MessageCircle, CheckCircle2 } from "lucide-react";
import type { ContatoReserva, ContatoSolicitante, StatusSolicitacao } from "@/lib/salas";
import {
  decidirSolicitacao,
  cancelarSolicitacao,
  verContato,
  contatoSolicitante,
  marcarPagamentoResolvido,
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

function BlocoContato({ nome, whatsapp, telefone, email }: { nome?: string | null; whatsapp?: string | null; telefone?: string | null; email?: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      {nome && <p className="text-[15px] font-bold text-brand-navy">{nome}</p>}
      {whatsapp && (
        <a href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[14px] font-semibold text-brand-blue">
          <MessageCircle size={15} /> {whatsapp}
        </a>
      )}
      {telefone && telefone !== whatsapp && (
        <a href={`tel:${telefone.replace(/\D/g, "")}`} className="flex items-center gap-2 text-[14px] font-semibold text-brand-blue">
          <Phone size={15} /> {telefone}
        </a>
      )}
      {telefone && telefone === whatsapp && (
        <a href={`tel:${telefone.replace(/\D/g, "")}`} className="flex items-center gap-2 text-[14px] font-semibold text-brand-blue">
          <Phone size={15} /> Ligar
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className="flex items-center gap-2 break-all text-[14px] font-semibold text-brand-blue">
          <Mail size={15} /> {email}
        </a>
      )}
    </div>
  );
}

export default function SolicitacaoCard({ item, modo }: { item: SolicitacaoItem; modo: "recebida" | "enviada" }) {
  const [status, setStatus] = useState<StatusSolicitacao>(item.status);
  const [pago, setPago] = useState<boolean>(item.pagamento_resolvido ?? false);
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");
  const [contatoClinica, setContatoClinica] = useState<ContatoReserva | null>(null);
  const [contatoDent, setContatoDent] = useState<ContatoSolicitante | null>(null);
  const [modoRecusa, setModoRecusa] = useState(false);
  const [motivo, setMotivo] = useState("");

  async function decidir(decisao: "aprovada" | "recusada") {
    setErro("");
    setOcupado(decisao);
    const res = await decidirSolicitacao(item.id, decisao, decisao === "recusada" ? motivo : undefined);
    setOcupado("");
    if (!res.ok) return setErro(res.erro || "Falhou.");
    setStatus(decisao);
    setModoRecusa(false);
  }
  async function cancelar() {
    setErro("");
    setOcupado("cancelar");
    const res = await cancelarSolicitacao(item.id);
    setOcupado("");
    if (!res.ok) return setErro(res.erro || "Falhou.");
    setStatus("cancelada");
  }
  async function verContatoClinica() {
    setErro("");
    setOcupado("contato");
    const res = await verContato(item.id);
    setOcupado("");
    if (!res.ok) return setErro(res.erro || "Contato indisponível.");
    setContatoClinica(res.contato ?? null);
  }
  async function verContatoDent() {
    setErro("");
    setOcupado("contatoDent");
    const res = await contatoSolicitante(item.id);
    setOcupado("");
    if (!res.ok) return setErro(res.erro || "Contato indisponível.");
    setContatoDent(res.contato ?? null);
  }
  async function marcarPago() {
    setErro("");
    setOcupado("pago");
    const res = await marcarPagamentoResolvido(item.id);
    setOcupado("");
    if (!res.ok) return setErro(res.erro || "Falhou.");
    setPago(true);
  }

  const b = BADGE[status];
  const btn = "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[12px] px-4 text-[14px] font-semibold transition-all disabled:opacity-50";

  return (
    <div className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold text-brand-navy">{item.sala_titulo ?? "Sala"}</h3>
          {item.sala_local && <p className="text-[13px] text-ink-muted">{item.sala_local}</p>}
        </div>
        <span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ background: b.bg, color: b.fg }}>
          {b.txt}
        </span>
      </div>

      <p className="mt-3 text-[14px] text-ink-soft">
        <span className="font-semibold text-ink">{dataBR(item.data)}</span> · {item.hora_inicio}–{item.hora_fim}
      </p>

      {item.mensagem && (
        <p className="mt-2 rounded-[12px] bg-black/[0.03] px-3 py-2 text-[14px] text-ink-soft">“{item.mensagem}”</p>
      )}
      {item.observacao_anfitriao && status !== "pendente" && (
        <p className="mt-2 text-[13px] text-ink-muted">Resposta da clínica: {item.observacao_anfitriao}</p>
      )}
      {erro && <p role="alert" className="mt-2 text-[13px] text-danger">{erro}</p>}

      {/* ── LOCADOR (recebida) ── */}
      {modo === "recebida" && (
        <>
          {/* contato do solicitante (qualquer status) */}
          <div className="mt-4">
            {!contatoDent ? (
              <button onClick={verContatoDent} disabled={!!ocupado} className={`${btn} w-full border border-black/10 text-brand-navy hover:bg-black/[0.04]`}>
                {ocupado === "contatoDent" ? <Loader2 size={15} className="animate-spin" /> : <Phone size={15} />}
                WhatsApp / Ligar para o dentista
              </button>
            ) : (
              <div className="rounded-[14px] border border-brand-soft bg-brand-soft/40 p-4">
                <BlocoContato nome={contatoDent.nome} whatsapp={contatoDent.telefone} telefone={contatoDent.telefone} email={contatoDent.email} />
              </div>
            )}
          </div>

          {status === "pendente" && !modoRecusa && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => decidir("aprovada")} disabled={!!ocupado} className={btn} style={{ background: "#34c759", color: "#fff" }}>
                {ocupado === "aprovada" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Aprovar
              </button>
              <button onClick={() => setModoRecusa(true)} disabled={!!ocupado} className={`${btn} border border-black/10 text-ink-soft hover:bg-black/[0.04]`}>
                <X size={15} /> Recusar
              </button>
            </div>
          )}

          {status === "pendente" && modoRecusa && (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Motivo da recusa (opcional) — o dentista recebe esta mensagem."
                className="w-full resize-none rounded-[12px] border border-black/15 px-3 py-2.5 text-[14px] outline-none focus:border-brand-blue"
              />
              <div className="flex gap-2">
                <button onClick={() => decidir("recusada")} disabled={!!ocupado} className={btn} style={{ background: "#ff3b30", color: "#fff" }}>
                  {ocupado === "recusada" ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Confirmar recusa
                </button>
                <button onClick={() => setModoRecusa(false)} disabled={!!ocupado} className={`${btn} text-ink-muted hover:bg-black/[0.04]`}>
                  Voltar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── LOCATÁRIO (enviada) ── */}
      {modo === "enviada" && (
        <>
          {status === "pendente" && (
            <div className="mt-4">
              <button onClick={cancelar} disabled={!!ocupado} className={`${btn} border border-black/10 text-ink-soft hover:bg-black/[0.04]`}>
                {ocupado === "cancelar" ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Cancelar solicitação
              </button>
            </div>
          )}

          {status === "aprovada" && (
            <div className="mt-4 flex flex-col gap-3">
              {/* contato da clínica */}
              <div className="rounded-[14px] border border-brand-soft bg-brand-soft/40 p-4">
                {!contatoClinica ? (
                  <button onClick={verContatoClinica} disabled={!!ocupado} className={`${btn} w-full`} style={{ background: "#007aff", color: "#fff" }}>
                    {ocupado === "contato" ? <Loader2 size={15} className="animate-spin" /> : <Phone size={15} />} Ver contato da clínica
                  </button>
                ) : (
                  <BlocoContato nome={contatoClinica.nome} whatsapp={contatoClinica.whatsapp} telefone={contatoClinica.telefone} email={contatoClinica.email} />
                )}
              </div>

              {/* pagamento */}
              {pago ? (
                <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-700">
                  <CheckCircle2 size={15} style={{ color: "#34c759" }} /> Pagamento resolvido
                </p>
              ) : (
                <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-[13px] text-ink-soft">
                    Combine o pagamento direto com a clínica (WhatsApp acima). O CuraDentes não intermedia.
                  </p>
                  <button onClick={marcarPago} disabled={!!ocupado} className={`${btn} w-full`} style={{ background: "#0a2a66", color: "#fff" }}>
                    {ocupado === "pago" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Marcar pagamento como resolvido
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
