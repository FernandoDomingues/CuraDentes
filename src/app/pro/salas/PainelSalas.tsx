"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// PainelSalas — administração de Locação de Salas num lugar só, com abas:
//   Recebidas (locador) · Minhas solicitações (locatário) · Minhas salas.
// Cada aba mostra um contador de pendências. Reutiliza SolicitacaoCard.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";
import { Plus, MapPin, Building2, Pencil, Inbox, Send, DoorOpen } from "lucide-react";
import { formatarPreco, type MinhaSala } from "@/lib/salas";
import SolicitacaoCard from "./SolicitacaoCard";
import type { SolicitacaoItem } from "./acoes";

type Aba = "recebidas" | "enviadas" | "salas";

export default function PainelSalas({
  salas,
  recebidas,
  enviadas,
  semEndereco,
  abaInicial,
}: {
  salas: MinhaSala[];
  recebidas: SolicitacaoItem[];
  enviadas: SolicitacaoItem[];
  semEndereco: boolean;
  abaInicial: Aba;
}) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const recPend = recebidas.filter((r) => r.status === "pendente");
  const recOutras = recebidas.filter((r) => r.status !== "pendente");
  const pagPend = enviadas.filter((e) => e.status === "aprovada" && !e.pagamento_resolvido).length;

  const abas: { id: Aba; label: string; icone: React.ReactNode; badge: number }[] = [
    { id: "recebidas", label: "Recebidas", icone: <Inbox size={15} />, badge: recPend.length },
    { id: "enviadas", label: "Minhas solicitações", icone: <Send size={15} />, badge: pagPend },
    { id: "salas", label: "Minhas salas", icone: <DoorOpen size={15} />, badge: 0 },
  ];

  return (
    <div>
      {/* Abas */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-100">
        {abas.map((t) => {
          const on = aba === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              className="relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[14px] font-semibold transition-colors"
              style={
                on
                  ? { borderColor: "#007aff", color: "#007aff" }
                  : { borderColor: "transparent", color: "#6b7280" }
              }
            >
              {t.icone} {t.label}
              {t.badge > 0 && (
                <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ background: "#e6004c" }}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* RECEBIDAS (locador) */}
      {aba === "recebidas" && (
        recebidas.length === 0 ? (
          <Vazio icone={<Inbox size={34} />} titulo="Nenhuma solicitação recebida" texto="Quando um dentista pedir uma das suas salas, aparece aqui." />
        ) : (
          <div className="flex flex-col gap-6">
            {recPend.length > 0 && (
              <Secao titulo={`Pendentes (${recPend.length})`}>
                {recPend.map((i) => <SolicitacaoCard key={i.id} item={i} modo="recebida" />)}
              </Secao>
            )}
            {recOutras.length > 0 && (
              <Secao titulo="Histórico">
                {recOutras.map((i) => <SolicitacaoCard key={i.id} item={i} modo="recebida" />)}
              </Secao>
            )}
          </div>
        )
      )}

      {/* ENVIADAS (locatário) */}
      {aba === "enviadas" && (
        enviadas.length === 0 ? (
          <Vazio
            icone={<Send size={32} />}
            titulo="Você ainda não solicitou salas"
            texto=""
            acao={<Link href="/salas" className="mt-2 inline-flex items-center gap-2 rounded-[14px] px-6 py-3 text-[14px] font-semibold text-white" style={{ background: "#007aff" }}>Procurar salas</Link>}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {enviadas.map((i) => <SolicitacaoCard key={i.id} item={i} modo="enviada" />)}
          </div>
        )
      )}

      {/* MINHAS SALAS */}
      {aba === "salas" && (
        <div>
          <div className="mb-5 flex items-center justify-end">
            {!semEndereco && (
              <Link href="/pro/salas/nova" className="inline-flex min-h-[44px] items-center gap-2 rounded-[14px] px-5 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110" style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.25)" }}>
                <Plus size={18} /> Anunciar sala
              </Link>
            )}
          </div>
          {semEndereco ? (
            <Vazio
              icone={<Building2 size={34} />}
              titulo="Cadastre um endereço primeiro"
              texto="Uma sala fica vinculada a um dos seus endereços de clínica. Adicione um endereço no seu perfil para poder anunciar."
              acao={<Link href="/pro/perfil" className="mt-2 rounded-[14px] px-6 py-3 text-[14px] font-semibold text-white" style={{ background: "#007aff" }}>Ir para o perfil</Link>}
            />
          ) : salas.length === 0 ? (
            <Vazio icone={<MapPin size={34} />} titulo="Nenhuma sala anunciada ainda" texto="Clique em “Anunciar sala” para criar a primeira." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {salas.map((s) => (
                <div key={s.id} className="flex flex-col gap-3 rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-[17px] font-bold text-brand-navy">{s.titulo}</h2>
                      <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-muted">
                        <MapPin size={13} />
                        {[s.bairro, s.cidade].filter(Boolean).join(", ") || s.nome_clinica || "—"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={s.status === "ativa" ? { background: "rgba(52,199,89,0.12)", color: "#2a8a3e" } : { background: "rgba(255,149,0,0.14)", color: "#b56a00" }}>
                      {s.status === "ativa" ? "Ativa" : "Pausada"}
                    </span>
                  </div>
                  <p className="text-[15px] font-bold text-brand-blue">{formatarPreco(s.preco_valor, s.preco_unidade)}</p>
                  <div className="mt-1 flex items-center gap-2 border-t border-gray-100 pt-3">
                    <Link href={`/pro/salas/${s.id}/editar`} className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold text-brand-navy transition-colors hover:bg-black/[0.04]">
                      <Pencil size={14} /> Editar / fotos
                    </Link>
                    <Link href={`/salas/${s.id}`} className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-black/[0.04]">
                      Ver anúncio
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-muted">{titulo}</h2>
      {children}
    </section>
  );
}

function Vazio({ icone, titulo, texto, acao }: { icone: React.ReactNode; titulo: string; texto: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] py-14 text-center" style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}>
      <span style={{ color: "rgba(0,122,255,0.30)" }}>{icone}</span>
      <p className="text-[16px] font-semibold text-brand-navy">{titulo}</p>
      {texto && <p className="max-w-md text-[14px] text-ink-muted">{texto}</p>}
      {acao}
    </div>
  );
}
