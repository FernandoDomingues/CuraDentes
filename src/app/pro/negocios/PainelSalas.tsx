"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// PainelSalas — administração de Locação de Salas num lugar só, com abas:
//   Recebidas (locador) · Minhas solicitações (locatário) · Minhas salas.
// Cada aba mostra um contador de pendências. Reutiliza SolicitacaoCard.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";
import { Plus, MapPin, Building2, Inbox, Send, DoorOpen, Settings } from "lucide-react";
import { formatarPreco, type MinhaSala, type EnderecoResumo } from "@/lib/salas";
import SolicitacaoCard from "./SolicitacaoCard";
import type { SolicitacaoItem } from "./acoes";

type Aba = "recebidas" | "enviadas" | "salas";

export default function PainelSalas({
  salas,
  enderecos,
  recebidas,
  enviadas,
  semEndereco,
  abaInicial,
}: {
  salas: MinhaSala[];
  enderecos: EnderecoResumo[];
  recebidas: SolicitacaoItem[];
  enviadas: SolicitacaoItem[];
  semEndereco: boolean;
  abaInicial: Aba;
}) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  // Painel = só o ATIVO. Recusadas/canceladas e CONCLUÍDAS (aprovada + pagamento
  // confirmado) saem daqui e ficam só no Histórico.
  const recPend = recebidas.filter((r) => r.status === "pendente");
  const recAprov = recebidas.filter((r) => r.status === "aprovada" && !r.pagamento_resolvido);
  const envAtivas = enviadas.filter((e) => e.status === "pendente" || e.status === "aprovada");
  const aPagar = enviadas.filter((e) => e.status === "aprovada" && !e.pagamento_resolvido).length;

  const abas: { id: Aba; label: string; icone: React.ReactNode; badge: number }[] = [
    { id: "recebidas", label: "Caixa de entrada", icone: <Inbox size={15} />, badge: recPend.length },
    { id: "enviadas", label: "Salas Contratadas", icone: <Send size={15} />, badge: aPagar },
    { id: "salas", label: "Minhas salas", icone: <DoorOpen size={15} />, badge: 0 },
  ];

  return (
    <div>
      {/* Abas */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-100">
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

      {/* Texto-guia da aba ativa (desfaz a confusão locador/locatário) */}
      <p className="mb-5 text-[13px] leading-relaxed text-ink-muted">
        {aba === "recebidas" &&
          "Pedidos que outros dentistas fizeram para alugar as SUAS salas. Aqui você aprova, recusa e confirma o pagamento recebido."}
        {aba === "enviadas" &&
          "Salas que VOCÊ pediu para alugar de outras clínicas. Acompanhe o status e veja o contato da clínica quando aprovado."}
        {aba === "salas" &&
          "Suas salas anunciadas. Edite, adicione fotos e gerencie a disponibilidade."}
      </p>

      {/* RECEBIDAS (locador) — só ativas */}
      {aba === "recebidas" && (
        recPend.length + recAprov.length === 0 ? (
          <Vazio icone={<Inbox size={34} />} titulo="Nenhuma solicitação ativa" texto="Pedidos pendentes e reservas aprovadas aparecem aqui. O histórico fica no botão “Histórico”." />
        ) : (
          <div className="flex flex-col gap-6">
            {recPend.length > 0 && (
              <Secao titulo={`Aguardando sua resposta (${recPend.length})`}>
                {recPend.map((i) => <SolicitacaoCard key={i.id} item={i} modo="recebida" />)}
              </Secao>
            )}
            {recAprov.length > 0 && (
              <Secao titulo="Aprovadas">
                {recAprov.map((i) => <SolicitacaoCard key={i.id} item={i} modo="recebida" />)}
              </Secao>
            )}
          </div>
        )
      )}

      {/* ENVIADAS (locatário) — só ativas */}
      {aba === "enviadas" && (
        envAtivas.length === 0 ? (
          <Vazio
            icone={<Send size={32} />}
            titulo="Você não tem solicitações ativas"
            texto="Pedidos recusados ou cancelados ficam no Histórico."
            acao={<Link href="/coworking" className="mt-2 inline-flex items-center gap-2 rounded-[14px] px-6 py-3 text-[14px] font-semibold text-white" style={{ background: "#007aff" }}>Procurar salas</Link>}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {envAtivas.map((i) => <SolicitacaoCard key={i.id} item={i} modo="enviada" />)}
          </div>
        )
      )}

      {/* MINHAS SALAS — agrupadas por CLÍNICA (engrenagem na clínica e em cada sala) */}
      {aba === "salas" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-end">
            {!semEndereco && (
              <Link href="/pro/negocios/nova" className="inline-flex min-h-[44px] items-center gap-2 rounded-[14px] px-5 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110" style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.25)" }}>
                <Plus size={18} /> Anunciar sala
              </Link>
            )}
          </div>
          {semEndereco ? (
            <Vazio
              icone={<Building2 size={34} />}
              titulo="Cadastre um endereço primeiro"
              texto="Uma sala fica vinculada a um dos seus endereços de clínica. Adicione um endereço no seu perfil para poder anunciar."
              acao={<Link href="/pro/editar-perfil" className="mt-2 rounded-[14px] px-6 py-3 text-[14px] font-semibold text-white" style={{ background: "#007aff" }}>Ir para o perfil</Link>}
            />
          ) : (
            enderecos.map((end) => (
              <ClinicaPainelCard key={end.id} endereco={end} salas={salas.filter((s) => s.endereco_id === end.id)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Card da CLÍNICA com as salas dentro. Engrenagem na clínica → editar perfil daquele
// endereço; engrenagem em cada sala → editar a sala.
function ClinicaPainelCard({ endereco, salas }: { endereco: EnderecoResumo; salas: MinhaSala[] }) {
  const rs = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[18px] font-bold text-brand-navy">
            <Building2 size={18} style={{ color: "#007aff" }} />
            <span className="truncate">{endereco.nome_clinica || "Clínica"}</span>
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-muted">
            <MapPin size={13} /> {[endereco.bairro, endereco.cidade].filter(Boolean).join(", ") || "—"}
          </p>
        </div>
        <Link
          href={`/pro/editar-perfil#endereco-${endereco.id}`}
          title="Editar a clínica"
          aria-label="Editar a clínica"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-brand-blue"
        >
          <Settings size={18} />
        </Link>
      </div>

      {salas.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-black/12 bg-black/[0.02] px-4 py-4 text-center text-[13px] text-ink-muted">
          Nenhuma sala neste endereço.{" "}
          <Link href="/pro/negocios/nova" className="font-semibold text-brand-blue hover:underline">Anunciar</Link>
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {salas.map((s) => {
            const numero = s.numero_na_clinica != null ? `Sala ${String(s.numero_na_clinica).padStart(2, "0")}` : "Sala";
            return (
              <div key={s.id} className="flex flex-col gap-2 rounded-[14px] border border-gray-100 bg-black/[0.015] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">{numero}</span>
                    <h3 className="truncate text-[15px] font-bold text-brand-navy">{s.titulo}</h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={s.status === "ativa" ? { background: "rgba(52,199,89,0.12)", color: "#2a8a3e" } : { background: "rgba(255,149,0,0.14)", color: "#b56a00" }}>
                      {s.status === "ativa" ? "Ativa" : "Pausada"}
                    </span>
                    <Link href={`/pro/negocios/${s.id}/editar`} title="Editar a sala" aria-label="Editar a sala" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/[0.06] hover:text-brand-blue">
                      <Settings size={16} />
                    </Link>
                  </div>
                </div>
                <p className="text-[14px] font-bold text-brand-blue">
                  {formatarPreco(s.preco_valor, s.preco_unidade)}
                  {s.preco_diaria != null && (
                    <span className="text-[12px] font-medium text-ink-muted"> · {rs(s.preco_diaria)}/dia</span>
                  )}
                </p>
                <Link href={`/coworking/${s.id}`} className="text-[12px] font-medium text-ink-muted hover:text-brand-blue">Ver anúncio →</Link>
              </div>
            );
          })}
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
