"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// CARD DE ENDEREÇO DO DASHBOARD — porte fiel do EnderecoCard do k11.
//
// Faixa de urgência (magenta), cabeçalho com clínica + endereço + botão "Editar",
// contatos, procedimentos, ACORDEÃO de horários (estado local), formas de pagamento
// e convênios. Client Component só por causa do acordeão.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";
import { Building2, MapPin, Settings, Phone, MessageCircle, Clock, ChevronDown, ChevronUp, CreditCard, CheckCircle, Zap } from "lucide-react";
import { montarEndereco } from "@/lib/dentistas";

type EnderecoClinica = ReturnType<typeof montarEndereco>;

const COR_URGENCIA = "#E6004C";

export default function EnderecoCard({ endereco }: { endereco: EnderecoClinica }) {
  const [agendaAberta, setAgendaAberta] = useState(false);
  const isUrgencia = endereco.atende_urgencias;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        border: isUrgencia ? `1.5px solid ${COR_URGENCIA}` : "0.5px solid rgba(60,60,67,0.10)",
        boxShadow: isUrgencia ? "0 4px 16px rgba(230,0,76,0.12)" : "0 2px 8px rgba(16,24,64,0.06)",
        overflow: "hidden",
      }}
    >
      {isUrgencia && (
        <div className="flex items-center gap-2 px-5 py-2" style={{ background: COR_URGENCIA }}>
          <Zap size={13} fill="#fff" stroke="none" />
          <span className="text-[12px] font-bold uppercase tracking-wide text-white">Atende Urgências</span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-shrink-0 items-center justify-center" style={{ width: 42, height: 42, borderRadius: 12, background: isUrgencia ? "rgba(230,0,76,0.10)" : "rgba(0,122,255,0.08)" }}>
            <Building2 size={18} style={{ color: isUrgencia ? COR_URGENCIA : "#007AFF" }} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>{endereco.nome_clinica || "Endereço"}</h3>
            <div className="mt-0.5 flex items-center gap-1">
              <MapPin size={11} style={{ color: "#8E8E93" }} />
              <p className="text-[12px]" style={{ color: "#8E8E93" }}>
                {[endereco.logradouro, endereco.numero].filter(Boolean).join(", ")}
                {endereco.complemento ? `, ${endereco.complemento}` : ""} — {[endereco.bairro, endereco.cidade].filter(Boolean).join(", ")}
                {endereco.estado ? `/${endereco.estado}` : ""}
              </p>
            </div>
          </div>
        </div>
        <Link
          href={`/pro/perfil#endereco-${endereco.id}`}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
          style={{ background: "rgba(60,60,67,0.06)", color: "#8E8E93", border: "0.5px solid rgba(60,60,67,0.12)" }}
          title="Editar informações deste endereço"
        >
          <Settings size={13} />
          <span className="text-[12px] font-semibold">Editar</span>
        </Link>
      </div>

      {/* Contatos */}
      {(endereco.telefone || endereco.whatsapp) && (
        <div className="flex items-center gap-4 px-5 pb-3">
          {endereco.telefone && (
            <div className="flex items-center gap-1"><Phone size={12} style={{ color: "#8E8E93" }} /><span className="text-[12px]" style={{ color: "#8E8E93" }}>{endereco.telefone}</span></div>
          )}
          {endereco.whatsapp && (
            <div className="flex items-center gap-1"><MessageCircle size={12} style={{ color: "#25D366" }} /><span className="text-[12px]" style={{ color: "#25D366" }}>WhatsApp</span></div>
          )}
        </div>
      )}

      {/* Procedimentos */}
      {endereco.atividades.length > 0 && (
        <div className="px-5 pb-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "#8E8E93" }}>Procedimentos</p>
          <div className="flex flex-wrap gap-1.5">
            {endereco.atividades.map((a) => (
              <span key={a} className="rounded-full px-2.5 py-0.5 text-[12px] font-medium" style={{ background: "rgba(0,122,255,0.07)", color: "#007AFF", border: "0.5px solid rgba(0,122,255,0.14)" }}>{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Horários (acordeão) */}
      {endereco.agenda.length > 0 && (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.08)" }}>
          <button onClick={() => setAgendaAberta(!agendaAberta)} className="flex w-full items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2"><Clock size={13} style={{ color: "#007AFF" }} /><span className="text-[13px] font-semibold" style={{ color: "#007AFF" }}>Horários de atendimento</span></div>
            {agendaAberta ? <ChevronUp size={15} style={{ color: "#8E8E93" }} /> : <ChevronDown size={15} style={{ color: "#8E8E93" }} />}
          </button>
          {agendaAberta && (
            <div className="px-5 pb-4">
              {endereco.agenda.map((h) => (
                <div key={h.dia_semana} className="flex items-center justify-between py-1.5" style={{ borderBottom: "0.5px solid rgba(60,60,67,0.05)" }}>
                  <span className="text-[13px]" style={{ color: "#3A3A3C" }}>{h.dia_semana}</span>
                  <span className="text-[13px] font-semibold" style={{ color: "#0A2A66" }}>{h.horario_inicio} – {h.horario_fim}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Formas de pagamento */}
      {endereco.formas_pagamento.length > 0 && (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.08)", padding: "12px 20px" }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "#8E8E93" }}>Formas de pagamento</p>
          <div className="flex flex-wrap gap-1.5">
            {endereco.formas_pagamento.map((fp) => (
              <div key={fp} className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1" style={{ background: "rgba(255,149,0,0.08)", border: "0.5px solid rgba(255,149,0,0.20)" }}>
                <CreditCard size={11} style={{ color: "#FF9500" }} /><span className="text-[12px] font-medium" style={{ color: "#1C1C1E" }}>{fp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Convênios */}
      {endereco.convenios.length > 0 ? (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.08)", padding: "12px 20px" }}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "#8E8E93" }}>Convênios aceitos</p>
          <div className="flex flex-wrap gap-1.5">
            {endereco.convenios.map((c) => (
              <div key={c} className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: "rgba(52,199,89,0.08)", border: "0.5px solid rgba(52,199,89,0.20)" }}>
                <CheckCircle size={10} style={{ color: "#34C759" }} /><span className="text-[12px] font-medium" style={{ color: "#1C1C1E" }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.08)", padding: "10px 20px" }}>
          <p className="text-[12px]" style={{ color: "#8E8E93" }}>Sem convênios neste endereço.</p>
        </div>
      )}
    </div>
  );
}
