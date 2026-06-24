// ═══════════════════════════════════════════════════════════════════════════════
// PerfilDentistaView — apresentação (visual portado do site-k11) do perfil público.
//
// COMPONENTE CLIENTE: existe só para a interatividade do accordion de horários.
// NÃO faz fetch nem SEO — recebe o `DentistaPerfil` já carregado no servidor pela
// page.tsx (que mantém metadata, JSON-LD, revalidate e generateStaticParams).
//
// Conversões em relação ao k11:
//   • react-router (Link/useParams) → next/link; auth via useSessao (muro de login).
//   • Botões de WhatsApp/Ligar usam o muro de login (pedirLoginPaciente): se logado
//     abrem o link E registram o contato em `perfil_contatos`; se não, abrem o modal.
//   • Botão "Ver" das barras por atividade abre modal de avaliações individuais.
//   • formas_pagamento/convênios do R0 são string[] (não objetos): inferimos o
//     ícone/cor pelo nome.
//   • CroVerificationBadge de @/components/CroVerificationBadge.
//   • nomeAmigavel/slugDaEspecialidade de @/lib/especialidades.
// ═══════════════════════════════════════════════════════════════════════════════

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Star,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  Shield,
  CheckCircle,
  BarChart2,
  X,
  Trophy,
} from "lucide-react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { useSessao } from "@/components/SessaoProvider";

/** Ícone do Instagram (inline — lucide-react ^1.x não exporta `Instagram`). */
function IconeInstagram({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
import CroVerificationBadge from "@/components/CroVerificationBadge";
import { nomeAmigavel, slugDaEspecialidade } from "@/lib/especialidades";
import { urlWhatsapp, telLimpo, urlInstagram, urlMapsEndereco, urlAvaliarGoogle } from "@/lib/contato";
import type { DentistaPerfil, EnderecoClinica, AgendaDia } from "@/types/dentista";
import type { ResumoAtividade } from "@/lib/avaliacoes";

// Logo de fallback quando o dentista não tem foto (mesma intenção do k11).
const FOTO_FALLBACK = "/logos/logo-pro-alt.png";

// ─── Helpers de estilo para formas de pagamento (portados do k11) ─────────────
// No R0 as formas de pagamento são string[] (nomes). Inferimos o "tipo" pelo nome
// para reaproveitar exatamente as cores/ícones do visual original.

type TipoPagamento =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "boleto"
  | "transferencia";

function tipoFormaPagamento(nome: string): TipoPagamento {
  const n = nome.toLowerCase();
  if (n.includes("pix")) return "pix";
  if (n.includes("débito") || n.includes("debito")) return "cartao_debito";
  if (n.includes("crédito") || n.includes("credito") || n.includes("cartão") || n.includes("cartao"))
    return "cartao_credito";
  if (n.includes("boleto")) return "boleto";
  if (n.includes("transfer")) return "transferencia";
  return "dinheiro";
}

/** Retorna o componente de ícone adequado para cada tipo de pagamento */
function iconeFormaPagamento(tipo: TipoPagamento) {
  const mapa = {
    dinheiro: Banknote,
    pix: Smartphone,
    cartao_credito: CreditCard,
    cartao_debito: CreditCard,
    boleto: Building2,
    transferencia: Building2,
  };
  return mapa[tipo];
}

/** Retorna a cor de fundo do ícone de pagamento */
function fundoFormaPagamento(tipo: TipoPagamento): string {
  const mapa: Record<string, string> = {
    dinheiro: "rgba(52,199,89,0.10)",
    pix: "rgba(0,122,255,0.10)",
    cartao_credito: "rgba(255,149,0,0.10)",
    cartao_debito: "rgba(255,149,0,0.10)",
    boleto: "rgba(142,142,147,0.12)",
    transferencia: "rgba(142,142,147,0.12)",
  };
  return mapa[tipo] ?? "rgba(0,0,0,0.06)";
}

/** Retorna a cor do ícone de pagamento */
function corFormaPagamento(tipo: TipoPagamento): string {
  const mapa: Record<string, string> = {
    dinheiro: "#34C759",
    pix: "#007AFF",
    cartao_credito: "#FF9500",
    cartao_debito: "#FF9500",
    boleto: "#8E8E93",
    transferencia: "#8E8E93",
  };
  return mapa[tipo] ?? "#8E8E93";
}

// ─── Tipo: avaliação individual exibida no modal "Ver" (portado do k11) ───────
interface AvaliacaoIndividual {
  nota: number;
  paciente_nome: string;
  paciente_foto: string;
  comentario: string | null;
  criado_em: string;
}

// ─── Subcomponente: Badge de pódio (Top 1, 2, 3) — portado do k11 ─────────────
// Renderiza um selo dourado/prata/bronze com o ícone Trophy quando o dentista
// está no Top 1/2/3 (geral da cidade no hero, ou por atividade na barra).
//
// FONTE DE DADOS (pódio): NÃO há, hoje, RPC/view pública que devolva a posição de
// um dentista ARBITRÁRIO para a página pública. No k11 a página pública
// (DentistProfile.tsx) também monta o perfil SEM `posicao_*` — os badges só
// aparecem para os perfis-demo (constants/profiles.ts). As RPCs existentes não
// servem aqui: `meu_dashboard_resumo` é self-only (ranking do dentista LOGADO) e
// `get_top_dentistas_especialidade` é por especialidade+cidade do viewer, sem
// posição por dentista. Por isso `posicao_cidade`/`posicao_ranking` ficam
// `undefined` e o badge fica oculto — o componente está pronto e a renderização
// liga sozinha assim que o backend expuser o dado. (Ver pendência no relatório.)
interface BadgePodioProps {
  posicao: number;
  tamanho: "sm" | "md";
}

function BadgePodio({ posicao, tamanho }: BadgePodioProps) {
  const config = {
    1: { texto: "Top 1", bg: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", cor: "#0A2A66" }, // ouro #FFD700
    2: { texto: "Top 2", bg: "linear-gradient(135deg, #E0E0E0 0%, #C0C0C0 100%)", cor: "#3A3A3C" }, // prata #C0C0C0
    3: { texto: "Top 3", bg: "linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)", cor: "#fff" },     // bronze #CD7F32
  }[posicao as 1 | 2 | 3] || {
    texto: `Top ${posicao}`,
    bg: "linear-gradient(135deg, #007AFF 0%, #0056B3 100%)",
    cor: "#fff",
  };

  const estiloTamanho =
    tamanho === "sm"
      ? { px: "6px", py: "1px", font: "10px", icon: 10 }
      : { px: "10px", py: "3px", font: "12px", icon: 12 };

  return (
    <div
      className="inline-flex items-center gap-1 font-bold rounded-full text-white shadow-sm"
      style={{
        background: config.bg,
        color: config.cor,
        padding: `${estiloTamanho.py} ${estiloTamanho.px}`,
        fontSize: estiloTamanho.font,
        lineHeight: 1,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Trophy size={estiloTamanho.icon} />
      <span>{config.texto}</span>
    </div>
  );
}

// ─── Subcomponente: Barra de avaliação por atividade (visual k11) ─────────────
function BarraAvaliacao({
  atividade,
  onVerAvaliacoes,
}: {
  atividade: ResumoAtividade;
  onVerAvaliacoes?: (atividade: string) => void;
}) {
  // Calcula a porcentagem da barra com base na escala 0-5
  const porcentagem = (atividade.media_nota / 5) * 100;

  // Define a cor da barra conforme a nota
  const corBarra =
    atividade.media_nota >= 4.5
      ? "#34C759" // Verde — excelente
      : atividade.media_nota >= 3.5
      ? "#FF9500" // Amarelo — regular
      : "#FF3B30"; // Vermelho — ruim (derruba a média geral)

  return (
    <div
      style={{
        padding: "12px 0",
        borderBottom: "0.5px solid rgba(60,60,67,0.06)",
      }}
    >
      {/* Nome da atividade + badge de pódio + nota e total de avaliações */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/especialidade/${slugDaEspecialidade(atividade.nome_atividade)}`}
            className="text-[13px] font-medium hover:underline"
            style={{ color: "#3A3A3C" }}
          >
            {nomeAmigavel(atividade.nome_atividade)}
          </Link>
          {/* Badge de pódio por atividade — visível apenas quando Top 1, 2 ou 3.
              `posicao_ranking` fica undefined até o backend expor o ranking público
              (ver nota em BadgePodio); então o badge não aparece sem inventar dado. */}
          {atividade.posicao_ranking != null && atividade.posicao_ranking <= 3 && (
            <BadgePodio posicao={atividade.posicao_ranking} tamanho="sm" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Star size={12} fill="#FFCC00" stroke="none" />
            <span className="text-[13px] font-bold" style={{ color: "#0A2A66" }}>
              {atividade.media_nota.toFixed(1)}
            </span>
          </div>
          <span className="text-[11px]" style={{ color: "#8E8E93" }}>
            ({atividade.total_avaliacoes} aval.)
          </span>
          {/* Botão "Ver" — abre o modal de avaliações individuais desta atividade */}
          {atividade.total_avaliacoes > 0 && (
            <button
              type="button"
              onClick={() => onVerAvaliacoes?.(atividade.nome_atividade)}
              className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full transition-colors"
              style={{ color: "#007AFF", background: "rgba(0,122,255,0.08)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,122,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,122,255,0.08)";
              }}
            >
              Ver <ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      <div
        style={{
          height: "6px",
          borderRadius: "3px",
          background: "rgba(60,60,67,0.10)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${porcentagem}%`,
            height: "100%",
            borderRadius: "3px",
            background: corBarra,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Subcomponente: Card de endereço com accordion de agenda (visual k11) ─────
function EnderecoCard({
  endereco,
  index,
  saudacaoDentista,
  onContactRequest,
}: {
  endereco: EnderecoClinica;
  index: number;
  saudacaoDentista: string;
  /** Muro de login + registro de contato: recebe a URL (wa.me/tel:) e o tipo. */
  onContactRequest: (url: string, tipo: "whatsapp" | "telefone") => void;
}) {
  // Primeiro endereço começa com agenda aberta
  const [agendaAberta, setAgendaAberta] = useState(index === 0);

  const mapsUrl = urlMapsEndereco(endereco);
  // URL do WhatsApp deste endereço (mesma mensagem do k11). null se não houver.
  const baseWpp = urlWhatsapp(endereco.whatsapp);
  const wpp = baseWpp
    ? baseWpp +
      `?text=${encodeURIComponent(
        `Olá, ${saudacaoDentista}!\n\nTudo bem?\n\nEncontrei você pela CuraDentes e gostaria de agendar uma consulta.`,
      )}`
    : null;
  const tel = telLimpo(endereco.telefone);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "20px",
        border: endereco.atende_urgencias ? "1.5px solid #E6004C" : "0.5px solid rgba(60,60,67,0.10)",
        boxShadow: endereco.atende_urgencias
          ? "0 4px 14px rgba(230,0,76,0.18)"
          : "0 2px 8px rgba(16,24,64,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Faixa de urgência — só nos endereços marcados como "atende urgências" */}
      {endereco.atende_urgencias && (
        <div
          className="flex items-center gap-1.5"
          style={{
            background: "#E6004C",
            color: "#fff",
            padding: "6px 16px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          <img src="/icons/emergencia.svg" width={14} height={14} alt="" aria-hidden="true" />
          Atende urgências
        </div>
      )}
      {/* Cabeçalho: ícone + nome da clínica + endereço + botão mapa */}
      <div style={{ padding: "20px 20px 0" }}>
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "rgba(0,122,255,0.10)",
            }}
          >
            <Building2 size={18} style={{ color: "#007AFF" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="font-bold text-[16px] leading-tight"
              style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}
            >
              {endereco.nome_clinica}
            </h3>
            <p className="text-[13px] mt-0.5" style={{ color: "#8E8E93" }}>
              {endereco.logradouro}, {endereco.numero}
              {endereco.complemento ? `, ${endereco.complemento}` : ""} —{" "}
              {endereco.bairro}, {endereco.cidade}/{endereco.estado}
            </p>
          </div>
          {/* Botão de abertura no Google Maps */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              background: "rgba(0,122,255,0.08)",
              color: "#007AFF",
              border: "0.5px solid rgba(0,122,255,0.18)",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={11} />
            Mapa
          </a>
        </div>

        {/* Telefone do endereço */}
        {endereco.telefone && (
          <div className="flex items-center gap-1.5 mt-3 mb-4">
            <Phone size={13} style={{ color: "#8E8E93" }} />
            <span className="text-[13px]" style={{ color: "#8E8E93" }}>
              {endereco.telefone}
            </span>
          </div>
        )}
      </div>

      {/* Lista de atividades realizadas neste endereço */}
      {endereco.atividades.length > 0 && (
        <div style={{ padding: "0 20px 16px" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#8E8E93" }}>
            Procedimentos neste endereço
          </p>
          <div className="flex flex-wrap gap-1.5">
            {endereco.atividades.map((atividade) => (
              <Link
                key={atividade}
                href={`/especialidade/${slugDaEspecialidade(atividade)}`}
                className="px-3 py-1 rounded-full text-[12px] font-medium inline-block hover:opacity-80 transition-opacity"
                style={{
                  background: "rgba(10,42,102,0.06)",
                  color: "#0A2A66",
                  border: "0.5px solid rgba(10,42,102,0.12)",
                }}
              >
                {nomeAmigavel(atividade)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Estacionamento + informações do endereço (exibidos antes da agenda) */}
      {(endereco.estacionamento || (endereco.observacoes && endereco.observacoes.trim())) && (
        <div style={{ padding: "0 20px 16px" }} className="flex flex-col gap-2.5">
          {endereco.estacionamento && (
            <div className="flex items-center gap-2 text-[13px]">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "22px",
                  height: "22px",
                  borderRadius: "6px",
                  background: "rgba(52,199,89,0.12)",
                  color: "#34C759",
                  fontWeight: 800,
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                P
              </span>
              <span className="font-medium" style={{ color: "#0A2A66" }}>
                Estacionamento no local
              </span>
            </div>
          )}
          {endereco.observacoes && endereco.observacoes.trim() && (
            <p className="text-[13px]" style={{ color: "#3A3A3C", lineHeight: 1.55, margin: 0 }}>
              {endereco.observacoes}
            </p>
          )}
        </div>
      )}

      {/* Accordion de horários */}
      {endereco.agenda.length > 0 && (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)" }}>
          <button
            onClick={() => setAgendaAberta(!agendaAberta)}
            className="w-full flex items-center justify-between px-5 py-3"
            style={{ background: "transparent", cursor: "pointer" }}
            aria-expanded={agendaAberta}
            aria-label={`${agendaAberta ? "Fechar" : "Abrir"} agenda de ${endereco.nome_clinica}`}
          >
            <div className="flex items-center gap-2">
              <Clock size={14} style={{ color: "#007AFF" }} />
              <span className="text-[13px] font-semibold" style={{ color: "#007AFF" }}>
                Horários de atendimento
              </span>
            </div>
            {agendaAberta ? (
              <ChevronUp size={16} style={{ color: "#8E8E93" }} />
            ) : (
              <ChevronDown size={16} style={{ color: "#8E8E93" }} />
            )}
          </button>

          {/* Tabela de horários por dia da semana */}
          {agendaAberta && (
            <div style={{ padding: "0 20px 16px" }}>
              <div className="flex flex-col gap-1">
                {endereco.agenda.map((horario: AgendaDia) => (
                  <div
                    key={horario.dia_semana}
                    className="flex items-center justify-between"
                    style={{
                      padding: "6px 0",
                      borderBottom: "0.5px solid rgba(60,60,67,0.06)",
                    }}
                  >
                    <span className="text-[13px]" style={{ color: "#3A3A3C" }}>
                      {horario.dia_semana}
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: "#0A2A66" }}>
                      {horario.horario_inicio} – {horario.horario_fim}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Formas de pagamento deste endereço ── */}
      {endereco.formas_pagamento.length > 0 && (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)", padding: "16px 20px" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#8E8E93" }}>
            Formas de pagamento
          </p>
          <div className="flex flex-wrap gap-2">
            {endereco.formas_pagamento.map((fp, i) => {
              const tipo = tipoFormaPagamento(fp);
              const Icone = iconeFormaPagamento(tipo);
              return (
                <div
                  key={`${fp}-${i}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[10px]"
                  style={{
                    background: fundoFormaPagamento(tipo),
                    border: `0.5px solid ${fundoFormaPagamento(tipo)}`,
                  }}
                >
                  <Icone size={13} style={{ color: corFormaPagamento(tipo) }} />
                  <span className="text-[12px] font-medium" style={{ color: "#1C1C1E" }}>
                    {fp}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Convênios aceitos neste endereço ── */}
      {endereco.convenios.length > 0 ? (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)", padding: "16px 20px" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#8E8E93" }}>
            Convênios aceitos neste endereço
          </p>
          <div className="flex flex-wrap gap-1.5">
            {endereco.convenios.map((conv, i) => (
              <div
                key={`${conv}-${i}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ background: "rgba(52,199,89,0.08)", border: "0.5px solid rgba(52,199,89,0.20)" }}
              >
                <CheckCircle size={11} style={{ color: "#34C759" }} />
                <span className="text-[12px] font-medium" style={{ color: "#1C1C1E" }}>
                  {conv}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Nenhum convênio neste endereço */
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)", padding: "12px 20px" }}>
          <p className="text-[12px]" style={{ color: "#8E8E93" }}>
            Nenhum convênio aceito neste endereço.
          </p>
        </div>
      )}

      {/* ── Entrar em contato neste endereço ── */}
      {(endereco.whatsapp || endereco.telefone) && (
        <div
          style={{
            padding: "16px 20px",
            borderTop: "0.5px solid rgba(60,60,67,0.08)",
            background: "rgba(0,122,255,0.03)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#8E8E93" }}>
            Entrar em contato
          </p>
          <div className="flex gap-2">
            {/* Botão WhatsApp deste endereço — gated por login (k11) */}
            {endereco.whatsapp && wpp && (
              <button
                type="button"
                onClick={() => onContactRequest(wpp, "whatsapp")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] font-semibold text-[14px] transition-all duration-200"
                style={{
                  background: "#25D366",
                  color: "#fff",
                  textDecoration: "none",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(37,211,102,0.25)",
                }}
              >
                <MessageCircle size={15} />
                WhatsApp
              </button>
            )}
            {/* Botão de ligação deste endereço — gated por login (k11) */}
            {endereco.telefone && tel && (
              <button
                type="button"
                onClick={() => onContactRequest(tel, "telefone")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] font-semibold text-[14px] transition-all duration-200"
                style={{
                  background: "rgba(0,122,255,0.08)",
                  color: "#007AFF",
                  textDecoration: "none",
                  border: "0.5px solid rgba(0,122,255,0.20)",
                  cursor: "pointer",
                }}
              >
                <Phone size={15} />
                Ligar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SVG do Google para o botão de login (portado do k11) ─────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Seção "Avaliar este dentista" (paciente logado) ──────────────────────────
//
// Fluxo portado do k11 (DentistProfile.tsx):
//   • NÃO logado → botão "Entrar com Google para avaliar" (signInWithOAuth google,
//     redirect /auth/callback voltando para esta página via ?next=).
//   • Logado (paciente) → formulário: estrelas (1-5) + procedimento opcional →
//     insert na tabela `avaliacoes`.
//
// O insert replica EXATAMENTE o do k11: { paciente_id, dentista_id, nota, atividade }.
// (Sem coluna `comentario` — o k11 não a insere; enviá-la quebraria o schema.)
function AvaliarDentista({
  dentistaId,
  nomeDentista,
  atividades,
  googleUrl,
}: {
  dentistaId: string;
  /** Nome de exibição do dentista (para a notificação de nova avaliação). */
  nomeDentista: string;
  /** Procedimentos do dentista (para o select de "qual procedimento você realizou"). */
  atividades: string[];
  /** Link de avaliação no Google (CTA pós-avaliação). null/ausente = sem botão. */
  googleUrl?: string | null;
}) {
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [logado, setLogado] = useState(false);

  const [formAberto, setFormAberto] = useState(false);
  const [nota, setNota] = useState(0);
  const [atividade, setAtividade] = useState("");
  const [comentario, setComentario] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  // Descobre se há paciente logado (sessão em cookies via @supabase/ssr).
  useEffect(() => {
    let ativo = true;
    const supabase = criarClienteNavegador();
    supabase.auth.getUser().then(({ data }) => {
      if (!ativo) return;
      setLogado(!!data.user);
      setCarregandoSessao(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!ativo) return;
      setLogado(!!session?.user);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function entrarComGoogle() {
    setErro("");
    const supabase = criarClienteNavegador();
    // Volta para esta mesma página após o login (callback respeita ?next= interno).
    const next = `${window.location.pathname}${window.location.search}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setErro("Não foi possível entrar com o Google. Tente novamente.");
    }
    // Sucesso: o navegador é redirecionado para o Google.
  }

  async function enviarAvaliacao() {
    setErro("");
    if (nota === 0) {
      setErro("Por favor, selecione as estrelas.");
      return;
    }

    setEnviando(true);
    const supabase = criarClienteNavegador();

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setEnviando(false);
      setLogado(false);
      setErro("Você precisa entrar com sua conta Google para avaliar.");
      return;
    }

    // Salva a avaliação: nota + atividade (opcional) + comentário (opcional, máx 300).
    const { error: insertError } = await supabase.from("avaliacoes").insert({
      paciente_id: user.id,
      dentista_id: dentistaId,
      nota,
      atividade: atividade || null,
      comentario: comentario.trim() || null,
    });

    if (insertError) {
      setEnviando(false);
      setErro("Falha ao salvar a avaliação. Tente novamente.");
      return;
    }

    // Notifica o dentista por e-mail (fire-and-forget; erros ignorados — k11).
    // dentistEmail não vai aqui: o perfil público omite e-mail por LGPD; a Edge
    // Function resolve o destinatário pelo dentista_id quando o e-mail não vem.
    try {
      void supabase.functions.invoke("send-rating-notification", {
        body: {
          dentistId: dentistaId,
          dentistName: nomeDentista,
          specialty: atividade || null,
          patientName:
            (user.user_metadata as { full_name?: string } | undefined)?.full_name ||
            user.email ||
            null,
        },
      });
    } catch {
      /* ignora — notificação é best-effort */
    }

    setEnviando(false);
    setSucesso(true);
    setFormAberto(false);
    setNota(0);
    setAtividade("");
    setComentario("");
  }

  return (
    <div className="flex flex-col gap-4 bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden mt-2 p-5 lg:p-8">
      <div className="flex items-center gap-2 mb-1">
        <Star size={20} style={{ color: "#E6004C" }} />
        <h2 className="text-[18px] lg:text-[20px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
          Avaliar este dentista
        </h2>
      </div>

      {/* Sucesso + CTA "Avaliar também no Google" (aparece só se o dentista tem link). */}
      {sucesso && (
        <div className="flex flex-col gap-3 px-4 py-3.5 rounded-[14px]" style={{ background: "rgba(52,199,89,0.10)" }}>
          <div className="flex items-start gap-2">
            <CheckCircle size={16} style={{ color: "#34C759", marginTop: "1px", flexShrink: 0 }} />
            <p className="text-[14px] font-medium" style={{ color: "#1C7A3E", lineHeight: 1.5 }}>
              Avaliação salva com sucesso! Obrigado por contribuir. 🦷
            </p>
          </div>
          {googleUrl && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px]" style={{ color: "#3A4F68", lineHeight: 1.5 }}>
                Quer ajudar ainda mais? Deixe também a sua avaliação no Google ⭐
              </p>
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[14px] font-semibold"
                style={{ background: "#fff", color: "#1C1C1E", border: "1px solid rgba(60,60,67,0.18)", textDecoration: "none" }}
              >
                <Star size={15} style={{ color: "#F5B400" }} fill="#F5B400" stroke="none" /> Avaliar também no Google
              </a>
            </div>
          )}
        </div>
      )}

      {/* Mensagem de erro (inline, sem toast). */}
      {erro && (
        <div className="px-3 py-2.5 rounded-[12px]" style={{ background: "rgba(255,59,48,0.10)" }}>
          <p className="text-[13px]" style={{ color: "#FF3B30", lineHeight: 1.5 }}>
            {erro}
          </p>
        </div>
      )}

      {/* Estado de carregamento da sessão. */}
      {carregandoSessao ? (
        <p className="text-[14px]" style={{ color: "#8E8E93" }}>
          Carregando…
        </p>
      ) : !logado ? (
        /* ── NÃO logado: botão de login com Google ── */
        <div>
          <p className="text-[14px] mb-5" style={{ color: "#3A3A3C" }}>
            Sua opinião ajuda outros pacientes a encontrarem os melhores profissionais. Entre com o
            Google para deixar sua avaliação.
          </p>
          <button
            onClick={entrarComGoogle}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3.5 rounded-[14px] font-semibold text-[15px] transition-colors"
            style={{
              background: "#fff",
              border: "1.5px solid rgba(60,60,67,0.18)",
              color: "#1C1C1E",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <GoogleIcon />
            Entrar com Google para avaliar
          </button>
        </div>
      ) : !formAberto ? (
        /* ── Logado, formulário fechado: convite ── */
        <div>
          <p className="text-[14px] mb-5" style={{ color: "#3A3A3C" }}>
            Sua opinião ajuda outros pacientes a encontrarem os melhores profissionais. Como foi o seu
            atendimento?
          </p>
          <button
            onClick={() => {
              setSucesso(false);
              setErro("");
              setFormAberto(true);
            }}
            className="w-full md:w-auto px-6 py-3.5 rounded-xl font-bold transition-colors shadow-sm"
            style={{ color: "#007AFF", background: "rgba(0,122,255,0.08)", border: "1px solid rgba(0,122,255,0.18)" }}
          >
            Deixar uma avaliação
          </button>
        </div>
      ) : (
        /* ── Logado, formulário aberto ── */
        <div className="flex flex-col gap-5 mt-1">
          {/* Estrelas */}
          <div>
            <label className="text-[12px] font-bold mb-3 block uppercase tracking-wider" style={{ color: "#8E8E93" }}>
              Quantas estrelas?
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNota(s)}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                  aria-label={`${s} ${s === 1 ? "estrela" : "estrelas"}`}
                >
                  <Star
                    size={36}
                    fill={s <= nota ? "#FFCC00" : "transparent"}
                    stroke={s <= nota ? "#FFCC00" : "#C7C7CC"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Procedimento (opcional) */}
          <div>
            <label className="text-[12px] font-bold mb-2 block uppercase tracking-wider" style={{ color: "#8E8E93" }}>
              Qual procedimento você realizou? <span style={{ fontWeight: 500, textTransform: "none" }}>(opcional)</span>
            </label>
            <select
              value={atividade}
              onChange={(e) => setAtividade(e.target.value)}
              className="w-full h-12 rounded-xl px-4 outline-none border transition-all font-medium"
              style={{ background: "#F2F2F7", color: "#1C1C1E", borderColor: "transparent" }}
            >
              <option value="">Selecione o procedimento…</option>
              {atividades.length > 0 ? (
                atividades.map((atv) => (
                  <option key={atv} value={atv}>
                    {nomeAmigavel(atv)}
                  </option>
                ))
              ) : (
                <option value="Consulta Geral">Consulta Geral</option>
              )}
            </select>
          </div>

          {/* Comentário (opcional, máx. 300) */}
          <div>
            <label className="text-[12px] font-bold mb-2 block uppercase tracking-wider" style={{ color: "#8E8E93" }}>
              Comentário <span style={{ fontWeight: 500, textTransform: "none" }}>(opcional)</span>
            </label>
            <textarea
              value={comentario}
              onChange={(e) => { if (e.target.value.length <= 300) setComentario(e.target.value); }}
              rows={3}
              maxLength={300}
              placeholder="Conte como foi o seu atendimento…"
              className="w-full rounded-xl px-4 py-3 outline-none border transition-all text-[14px]"
              style={{ background: "#F2F2F7", color: "#1C1C1E", borderColor: "transparent", resize: "vertical", lineHeight: 1.6 }}
            />
            <p className="mt-1 text-right text-[12px]" style={{ color: "#8E8E93" }}>{comentario.length}/300</p>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-3 mt-1 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={() => {
                setFormAberto(false);
                setErro("");
              }}
              className="flex-1 py-3.5 rounded-xl font-semibold transition-colors"
              style={{ color: "#3A3A3C", background: "#E5E5EA" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={enviarAvaliacao}
              disabled={enviando}
              className="flex-1 py-3.5 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: "#007AFF" }}
            >
              {enviando ? "Salvando…" : "Enviar avaliação"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal (apresentação) ──────────────────────────────────────
export default function PerfilDentistaView({
  perfil,
  nome,
}: {
  /** Perfil já carregado no servidor pela page.tsx. */
  perfil: DentistaPerfil;
  /** Nome de exibição completo (tratamento + nome) montado no servidor. */
  nome: string;
}) {
  const rating = perfil.avaliacoes.media_geral;
  const totalAvaliacoes = perfil.avaliacoes.total_avaliacoes;
  const igUrl = urlInstagram(perfil.instagram);

  // Saudação da mensagem de WhatsApp: tratamento (Dr./Dra.) + PRIMEIRO nome
  // (ex.: "Dra. Evelin"). Se o nome já vier com o tratamento, removemos antes.
  const nomeBaseSaudacao =
    perfil.tratamento && perfil.nome.startsWith(perfil.tratamento)
      ? perfil.nome.slice(perfil.tratamento.length).trim()
      : perfil.nome;
  const primeiroNome = nomeBaseSaudacao.trim().split(/\s+/)[0] || nomeBaseSaudacao.trim();
  const saudacaoDentista = perfil.tratamento ? `${perfil.tratamento} ${primeiroNome}` : primeiroNome;

  // Muro de login (igual ao k11): contato exige paciente logado.
  const { user, pedirLoginPaciente } = useSessao();

  // Modal de avaliações individuais (aberto pelo botão "Ver" de cada atividade).
  const [avaliacoesIndividuais, setAvaliacoesIndividuais] = useState<{
    atividade: string;
    ratings: AvaliacaoIndividual[];
  } | null>(null);

  // Procedimentos do dentista (todos os endereços) para o select de avaliação.
  const todasAtividades = Array.from(
    new Set(perfil.enderecos.flatMap((e) => e.atividades || [])),
  );

  // ── Contato gated (k11) ─────────────────────────────────────────────────────
  // Não logado → abre o modal de login (pedirLoginPaciente retorna false).
  // Logado → abre o link E registra o clique (1x/dia por conta por tipo) em
  // `perfil_contatos` (upsert idempotente — métrica do dashboard do dentista).
  const handleContactRequest = useCallback(
    (url: string, tipo: "whatsapp" | "telefone") => {
      if (!pedirLoginPaciente()) return;
      window.open(url, "_blank", "noopener,noreferrer");
      if (user) {
        const supabase = criarClienteNavegador();
        supabase
          .from("perfil_contatos")
          .upsert(
            { dentista_id: perfil.id, viewer_id: user.id, tipo },
            { onConflict: "dentista_id,viewer_id,tipo,data_visita", ignoreDuplicates: true },
          )
          .then(undefined, () => {});
      }
    },
    [pedirLoginPaciente, user, perfil.id],
  );

  // ── Registra a VISUALIZAÇÃO do perfil (alimenta o funil e as métricas) ────────
  // Regra (igual k11): 1× por dia por CONTA LOGADA por dentista. Anônimos não
  // contam (a RLS exige authenticated) e o próprio dentista não conta a si mesmo.
  // Espelha o padrão do perfil_contatos (upsert idempotente, best-effort).
  useEffect(() => {
    if (!user || user.id === perfil.id) return;
    const supabase = criarClienteNavegador();
    supabase
      .from("perfil_visualizacoes")
      .upsert(
        { dentista_id: perfil.id, viewer_id: user.id },
        { onConflict: "dentista_id,viewer_id,data_visita", ignoreDuplicates: true },
      )
      .then(undefined, () => {});
  }, [user, perfil.id]);

  // ── Busca as avaliações individuais de uma atividade (modal "Ver", k11) ───────
  // Lê de `avaliacoes` (por dentista_id + atividade) e `clientes` (nome/foto).
  const fetchAvaliacoesIndividuais = useCallback(
    async (atividade: string) => {
      try {
        const supabase = criarClienteNavegador();
        const { data: avaliacoes, error } = await supabase
          .from("avaliacoes")
          .select("paciente_id, nota, comentario, criado_em")
          .eq("dentista_id", perfil.id)
          .eq("atividade", atividade)
          .order("criado_em", { ascending: false });

        if (error) throw error;

        const lista = (avaliacoes ?? []) as {
          paciente_id: string;
          nota: number;
          comentario: string | null;
          criado_em: string;
        }[];

        // Resolve nome/foto dos pacientes (clientes não excluídos).
        const ids = [...new Set(lista.map((a) => a.paciente_id))];
        let mapaPacientes: Record<string, { nome: string; foto: string }> = {};
        if (ids.length > 0) {
          const { data: pacientes } = await supabase
            .from("clientes")
            .select("id, nome, foto")
            .in("id", ids)
            .is("deleted_at", null);
          mapaPacientes = Object.fromEntries(
            ((pacientes ?? []) as { id: string; nome: string; foto: string }[]).map((p) => [
              p.id,
              { nome: p.nome, foto: p.foto },
            ]),
          );
        }

        setAvaliacoesIndividuais({
          atividade,
          ratings: lista.map((r) => ({
            nota: r.nota,
            paciente_nome: mapaPacientes[r.paciente_id]?.nome || "Anônimo",
            paciente_foto: mapaPacientes[r.paciente_id]?.foto || "",
            comentario: r.comentario,
            criado_em: r.criado_em,
          })),
        });
      } catch {
        // Sem toast (convenção R0): abre o modal vazio com a mensagem padrão.
        setAvaliacoesIndividuais({ atividade, ratings: [] });
      }
    },
    [perfil.id],
  );

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
      {/* ── Hero do perfil ── */}
      <div style={{ background: "linear-gradient(160deg, #E3F2FD 0%, #fff 100%)" }}>
        <div className="container mx-auto px-4 md:px-8 lg:px-16 pt-8 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Foto de perfil circular */}
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid #fff",
                boxShadow: "0 4px 20px rgba(10,42,102,0.16)",
                flexShrink: 0,
              }}
            >
              <img
                src={perfil.foto_url || FOTO_FALLBACK}
                alt={nome}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Nome, especialidade, CRO e rating */}
            <div className="flex-1 text-center sm:text-left">
              {/* Nome do dentista + Instagram */}
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-1">
                <h1
                  className="font-bold leading-tight"
                  style={{
                    fontSize: "clamp(22px, 4vw, 28px)",
                    color: "#0A2A66",
                    fontFamily: "Inter, sans-serif",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {nome}
                </h1>
                {/* Badge de pódio geral da cidade — visível apenas quando Top 1, 2 ou 3.
                    `posicao_cidade` fica undefined até o backend expor o ranking público
                    (ver nota em BadgePodio); então o badge não aparece sem inventar dado. */}
                {perfil.posicao_cidade != null && perfil.posicao_cidade <= 3 && (
                  <BadgePodio posicao={perfil.posicao_cidade} tamanho="md" />
                )}
                {igUrl && (
                  <a
                    href={igUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center"
                    style={{ color: "#E4405F" }}
                    title="Instagram"
                  >
                    <IconeInstagram size={22} />
                  </a>
                )}
              </div>

              <Link
                href={`/especialidade/${slugDaEspecialidade(perfil.especialidade_principal)}`}
                className="inline-block text-[14px] font-semibold mb-1 hover:underline"
                style={{ color: "#E6004C" }}
              >
                {nomeAmigavel(perfil.especialidade_principal)}
              </Link>

              {/* CRO com badge de verificação à direita.
                  Paridade com o k11: o bloco aparece sempre que houver `perfil.cro`
                  (CRO ausente/vazio → não renderiza, sem quebrar). O badge reflete
                  o estado: verde "Verificado*" quando cro_verificado === true,
                  laranja "Não verificado*" caso contrário. */}
              {perfil.cro && (
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                  <div className="relative inline-flex items-center gap-2">
                    <Shield size={13} style={{ color: "#8E8E93" }} />
                    <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                      {perfil.cro}
                    </span>
                  </div>
                  <CroVerificationBadge verificado={perfil.cro_verificado === true} size="sm" />
                </div>
              )}

              {/* Rating geral em estrelas */}
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      fill={s <= Math.round(rating) ? "#FFCC00" : "#E5E5EA"}
                      stroke="none"
                    />
                  ))}
                </div>
                <span className="font-bold text-[16px]" style={{ color: "#0A2A66" }}>
                  {rating.toFixed(1)}
                </span>
                <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                  ({totalAvaliacoes} avaliações)
                </span>
              </div>
            </div>
          </div>

          {/* Bio do dentista — só aparece se existir (sem texto padrão) */}
          {perfil.bio && perfil.bio.trim() && (
            <div
              className="mt-5"
              style={{
                background: "rgba(255,255,255,0.80)",
                borderRadius: "16px",
                padding: "16px 20px",
                border: "0.5px solid rgba(60,60,67,0.08)",
              }}
            >
              <p className="text-[14px] leading-relaxed" style={{ color: "#3A3A3C", lineHeight: 1.7 }}>
                {perfil.bio}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Conteúdo principal ── */}
      <div className="container mx-auto px-4 md:px-8 lg:px-16 py-6">
        <div className="grid grid-cols-1 gap-5">
          {/* ── Endereços + avaliações por atividade ── */}
          <div className="flex flex-col gap-4">
            {/* Título da seção de endereços */}
            <div className="flex items-center gap-2">
              <MapPin size={16} style={{ color: "#007AFF" }} />
              <h2 className="text-[16px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
                Locais de atendimento
              </h2>
              <span
                className="ml-auto text-[12px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(0,122,255,0.10)", color: "#007AFF" }}
              >
                {perfil.enderecos.length}{" "}
                {perfil.enderecos.length === 1 ? "endereço" : "endereços"}
              </span>
            </div>

            {/* Cards de endereço */}
            {perfil.enderecos.length === 0 && (
              <p className="text-[13px]" style={{ color: "#8E8E93" }}>
                Este profissional ainda não cadastrou endereços de atendimento.
              </p>
            )}
            {perfil.enderecos.map((end, idx) => (
              <EnderecoCard
                key={end.id}
                endereco={end}
                index={idx}
                saudacaoDentista={saudacaoDentista}
                onContactRequest={handleContactRequest}
              />
            ))}

            {/* ── Seção de avaliações por atividade ── */}
            {perfil.avaliacoes.por_atividade.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "20px",
                  border: "0.5px solid rgba(60,60,67,0.10)",
                  boxShadow: "0 2px 8px rgba(16,24,64,0.06)",
                  overflow: "hidden",
                  padding: "20px",
                }}
              >
                {/* Cabeçalho da seção de avaliações */}
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={16} style={{ color: "#007AFF" }} />
                  <h3
                    className="text-[15px] font-bold"
                    style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}
                  >
                    Avaliação por especialidade
                  </h3>
                </div>

                {/* Aviso explicativo da metodologia */}
                <div
                  className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-[12px]"
                  style={{ background: "rgba(0,122,255,0.06)" }}
                >
                  <Star size={13} fill="#007AFF" stroke="none" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <p className="text-[12px]" style={{ color: "#007AFF", lineHeight: 1.5 }}>
                    A avaliação geral é a média das notas de cada atividade. Atividades com notas
                    baixas impactam a média geral do profissional.
                  </p>
                </div>

                {/* Barras de avaliação por atividade */}
                <div>
                  {perfil.avaliacoes.por_atividade.map((av) => (
                    <BarraAvaliacao
                      key={av.nome_atividade}
                      atividade={av}
                      onVerAvaliacoes={fetchAvaliacoesIndividuais}
                    />
                  ))}
                </div>

                {/* Resumo: nota geral + total de avaliações */}
                <div
                  className="flex items-center justify-between mt-4 pt-4"
                  style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)" }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: "#8E8E93" }}>
                    Média geral calculada
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Star size={15} fill="#FFCC00" stroke="none" />
                    <span className="text-[16px] font-bold" style={{ color: "#0A2A66" }}>
                      {perfil.avaliacoes.media_geral.toFixed(1)}
                    </span>
                    <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                      ({perfil.avaliacoes.total_avaliacoes} avaliações)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Sem avaliações ainda */}
            {perfil.avaliacoes.total_avaliacoes === 0 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "20px",
                  border: "0.5px solid rgba(60,60,67,0.10)",
                  boxShadow: "0 2px 8px rgba(16,24,64,0.06)",
                  padding: "20px",
                }}
              >
                <p className="text-[13px]" style={{ color: "#8E8E93" }}>
                  Este dentista ainda não recebeu avaliações.
                </p>
              </div>
            )}

            {/* ── Avaliar este dentista (paciente logado) ── */}
            <AvaliarDentista dentistaId={perfil.id} nomeDentista={nome} atividades={todasAtividades} googleUrl={urlAvaliarGoogle(perfil.google_review_url)} />
          </div>
        </div>
      </div>

      {/* ── Modal de avaliações individuais (botão "Ver" de cada atividade) ── */}
      {avaliacoesIndividuais && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[200] px-4"
          style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(6px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAvaliacoesIndividuais(null);
          }}
        >
          <div
            className="w-full max-w-[420px] max-h-[70vh] overflow-y-auto rounded-[24px] p-6 flex flex-col gap-4"
            style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.20)" }}
          >
            <div
              className="flex items-center justify-between sticky top-0 bg-white pb-2"
              style={{ zIndex: 1 }}
            >
              <h2
                className="text-[16px] font-bold"
                style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}
              >
                {nomeAmigavel(avaliacoesIndividuais.atividade)}
              </h2>
              <button
                onClick={() => setAvaliacoesIndividuais(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ color: "#8E8E93" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(60,60,67,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {avaliacoesIndividuais.ratings.length === 0 ? (
                <p className="text-[13px] text-center py-6" style={{ color: "#8E8E93" }}>
                  Nenhuma avaliação encontrada.
                </p>
              ) : (
                avaliacoesIndividuais.ratings.map((r, i) => (
                  <div
                    key={i}
                    className="group relative flex items-center gap-3 p-3 rounded-[12px]"
                    style={{ background: "#F2F2F7", cursor: r.comentario ? "help" : "default" }}
                    title={r.comentario || undefined}
                  >
                    <img
                      src={r.paciente_foto || FOTO_FALLBACK}
                      alt={r.paciente_nome}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      style={{ border: "2px solid #fff" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-semibold truncate"
                        style={{ color: "#1C1C1E" }}
                      >
                        {r.paciente_nome}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            fill={s <= r.nota ? "#FFCC00" : "#E5E5EA"}
                            stroke="none"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Indicador de que há comentário (some sem comentário) */}
                    {r.comentario && (
                      <MessageCircle size={15} className="flex-shrink-0" style={{ color: "#007AFF" }} />
                    )}

                    {/* Balãozinho de conversa com o comentário (aparece ao passar o
                        mouse na linha — foto, nota e ícone). title = fallback no toque. */}
                    {r.comentario && (
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[260px] -translate-x-1/2 rounded-[14px] px-3.5 py-2.5 text-left text-[12.5px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
                        style={{ background: "rgba(10,42,102,0.96)" }}
                      >
                        &ldquo;{r.comentario}&rdquo;
                        <span
                          className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1.5 rotate-45"
                          style={{ background: "rgba(10,42,102,0.96)" }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
