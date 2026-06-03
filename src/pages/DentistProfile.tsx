// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA DE PERFIL DO DENTISTA
//
// Exibe todas as informações do dentista selecionado:
//   - Foto, nome, especialidade, CRO e rating geral
//   - Endereços com atividades e agenda (accordion)
//   - Sistema de avaliações por atividade com barra de progresso visual
//   - Formas de pagamento aceitas
//   - Convênios aceitos
//   - Botões de contato (WhatsApp e ligação)
//
// Fonte dos dados: 3 queries paralelas no Supabase (curadentespro,
// curadentespro_enderecos, avaliacoes). Antes de buscar no banco,
// tenta carregar do cache local (`curadentes_search_cache`) para
// renderização instantânea (estratégia offline-first).
//
// Subcomponentes definidos neste arquivo:
//   - BadgePodio: badge dourado/prata/bronze para Top 1/2/3
//   - BarraAvaliacao: barra de progresso colorida por nota média
//   - EnderecoCard: card de endereço com accordion de agenda
// ═══════════════════════════════════════════════════════════════════════════════

import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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
  ExternalLink,
  Shield,
  CheckCircle,
  BarChart2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { EnderecoClinica, FormaPagamento, Convenio, ResumoAvaliacaoAtividade, DentistProfile } from "@/types/dentist";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CachedDentistResult } from "@/lib/dentistCache";
import logoProAltUrl from "@/assets/logos/logo-pro-alt.png";

// ─── Dados do pódio de ranking ─────────────────────────────────────────────

/** Configuração visual de cada posição do pódio (Top 1, 2 ou 3) */
const PODIO: Record<number, { fundo: string; texto: string; borda: string; emoji: string; label: string }> = {
  1: { fundo: "#FFD700", texto: "#7A5800", borda: "rgba(255,215,0,0.50)",  emoji: "🥇", label: "1º da cidade" },
  2: { fundo: "#E8E8E8", texto: "#4A4A4A", borda: "rgba(192,192,192,0.50)", emoji: "🥈", label: "2º da cidade" },
  3: { fundo: "#EDCBAA", texto: "#5A3000", borda: "rgba(205,127,50,0.50)",  emoji: "🥉", label: "3º da cidade" },
};

// ─── Subcomponente: Badge de pódio ───────────────────────────────────────────

/**
 * Exibe um badge dourado/prateado/bronze indicando a posição no ranking.
 * Usado tanto ao lado do nome do dentista (posição geral) quanto
 * em cada barra de atividade (posição por procedimento).
 */
function BadgePodio({
  posicao,
  tamanho = "md",
}: {
  posicao: number;
  tamanho?: "sm" | "md";
}) {
  // Exibe apenas Top 1, 2 ou 3
  if (!PODIO[posicao]) return null;
  const conf = PODIO[posicao];

  return (
    <span
      className="inline-flex items-center gap-1 font-bold"
      style={{
        background: conf.fundo,
        color: conf.texto,
        border: `1px solid ${conf.borda}`,
        borderRadius: tamanho === "sm" ? "8px" : "10px",
        padding: tamanho === "sm" ? "1px 6px" : "3px 8px",
        fontSize: tamanho === "sm" ? "11px" : "12px",
        boxShadow: `0 2px 6px ${conf.borda}`,
        whiteSpace: "nowrap" as const,
        flexShrink: 0,
      }}
      title={`${conf.emoji} ${conf.label}`}
    >
      {conf.emoji} {conf.label}
    </span>
  );
}

import logoIconUrl from "@/assets/logos/logo-icon.png";

// URL do logotipo exibido no cabeçalho
const LOGO_ICON = logoIconUrl;

// ─── Helpers de estilo para formas de pagamento ──────────────────────────────

/** Retorna o componente de ícone adequado para cada tipo de pagamento */
function iconeFormaPagamento(tipo: FormaPagamento["tipo"]) {
  const mapa = {
    dinheiro:       Banknote,
    pix:            Smartphone,
    cartao_credito: CreditCard,
    cartao_debito:  CreditCard,
    boleto:         Building2,
    transferencia:  Building2,
  };
  return mapa[tipo];
}

/** Retorna a cor de fundo do ícone de pagamento */
function fundoFormaPagamento(tipo: FormaPagamento["tipo"]): string {
  const mapa: Record<string, string> = {
    dinheiro:       "rgba(52,199,89,0.10)",
    pix:            "rgba(0,122,255,0.10)",
    cartao_credito: "rgba(255,149,0,0.10)",
    cartao_debito:  "rgba(255,149,0,0.10)",
    boleto:         "rgba(142,142,147,0.12)",
    transferencia:  "rgba(142,142,147,0.12)",
  };
  return mapa[tipo] ?? "rgba(0,0,0,0.06)";
}

/** Retorna a cor do ícone de pagamento */
function corFormaPagamento(tipo: FormaPagamento["tipo"]): string {
  const mapa: Record<string, string> = {
    dinheiro:       "#34C759",
    pix:            "#007AFF",
    cartao_credito: "#FF9500",
    cartao_debito:  "#FF9500",
    boleto:         "#8E8E93",
    transferencia:  "#8E8E93",
  };
  return mapa[tipo] ?? "#8E8E93";
}

// ─── Subcomponente: Barra de avaliação por atividade ─────────────────────────

/**
 * Exibe a nota média de uma atividade como barra de progresso colorida.
 * Cor da barra varia conforme a nota: verde (≥4.5), amarelo (≥3.5), vermelho (<3.5)
 * Exibe badge de pódio quando a posição está no Top 1, 2 ou 3.
 */
function BarraAvaliacao({ atividade }: { atividade: ResumoAvaliacaoAtividade }) {
  // Calcula a porcentagem da barra com base na escala 0-5
  const porcentagem = (atividade.media_nota / 5) * 100;

  // Define a cor da barra conforme a nota
  const corBarra =
    atividade.media_nota >= 4.5
      ? "#34C759"  // Verde — excelente
      : atividade.media_nota >= 3.5
      ? "#FF9500"  // Amarelo — regular
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
          <span className="text-[13px] font-medium" style={{ color: "#3A3A3C" }}>
            {atividade.nome_atividade}
          </span>
          {/* Badge de pódio por atividade — visível apenas quando Top 1, 2 ou 3 */}
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

// ─── Subcomponente: Card de endereço com accordion de agenda ─────────────────

/**
 * Exibe um endereço de atendimento com:
 * - Nome da clínica, endereço, link para mapa, telefone
 * - Atividades realizadas neste endereço (tags)
 * - Agenda em accordion (primeiro endereço aberto por padrão)
 * - Formas de pagamento aceitas neste endereço
 * - Convênios aceitos neste endereço
 * - Botão de WhatsApp específico do endereço
 */
function EnderecoCard({ endereco, index }: { endereco: EnderecoClinica; index: number }) {
  // Primeiro endereço começa com agenda aberta
  const [agendaAberta, setAgendaAberta] = useState(index === 0);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "20px",
        border: "0.5px solid rgba(60,60,67,0.10)",
        boxShadow: "0 2px 8px rgba(16,24,64,0.06)",
        overflow: "hidden",
      }}
    >
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
          {endereco.maps_url && (
            <a
              href={endereco.maps_url}
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
          )}
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
      <div style={{ padding: "0 20px 16px" }}>
        <p
          className="text-[11px] font-bold uppercase tracking-wider mb-2"
          style={{ color: "#8E8E93" }}
        >
          Procedimentos neste endereço
        </p>
        <div className="flex flex-wrap gap-1.5">
          {endereco.atividades.map((atividade) => (
            <span
              key={atividade}
              className="px-3 py-1 rounded-full text-[12px] font-medium"
              style={{
                background: "rgba(10,42,102,0.06)",
                color: "#0A2A66",
                border: "0.5px solid rgba(10,42,102,0.12)",
              }}
            >
              {atividade}
            </span>
          ))}
        </div>
      </div>

      {/* Accordion de horários */}
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
              {endereco.agenda.map((horario) => (
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

      {/* ── Formas de pagamento deste endereço ── */}
      {endereco.formas_pagamento.length > 0 && (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)", padding: "16px 20px" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#8E8E93" }}>
            Formas de pagamento
          </p>
          <div className="flex flex-wrap gap-2">
            {endereco.formas_pagamento.map((fp: FormaPagamento) => {
              const Icone = iconeFormaPagamento(fp.tipo);
              return (
                <div
                  key={fp.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[10px]"
                  style={{
                    background: fundoFormaPagamento(fp.tipo),
                    border: `0.5px solid ${fundoFormaPagamento(fp.tipo)}`,
                  }}
                >
                  <Icone size={13} style={{ color: corFormaPagamento(fp.tipo) }} />
                  <span className="text-[12px] font-medium" style={{ color: "#1C1C1E" }}>
                    {fp.nome}
                    {fp.parcelas_ate ? ` (até ${fp.parcelas_ate}x)` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Convênios aceitos neste endereço ── */}
      {endereco.convenios.length > 0 && (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)", padding: "16px 20px" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#8E8E93" }}>
            Convênios aceitos neste endereço
          </p>
          <div className="flex flex-wrap gap-1.5">
            {endereco.convenios.map((conv: Convenio) => (
              <div key={conv.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(52,199,89,0.08)", border: "0.5px solid rgba(52,199,89,0.20)" }}>
                <CheckCircle size={11} style={{ color: "#34C759" }} />
                <span className="text-[12px] font-medium" style={{ color: "#1C1C1E" }}>{conv.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nenhum convênio neste endereço */}
      {endereco.convenios.length === 0 && (
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
            {/* Botão WhatsApp deste endereço */}
            {endereco.whatsapp && (
              <a
                href={`https://wa.me/${endereco.whatsapp}?text=Olá, gostaria de agendar uma consulta!`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] font-semibold text-[14px] transition-all duration-200"
                style={{
                  background: "#25D366",
                  color: "#fff",
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(37,211,102,0.25)",
                }}
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>
            )}
            {/* Botão de ligação deste endereço */}
            {endereco.telefone && (
              <a
                href={`tel:${endereco.telefone.replace(/\D/g, "")}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] font-semibold text-[14px] transition-all duration-200"
                style={{
                  background: "rgba(0,122,255,0.08)",
                  color: "#007AFF",
                  textDecoration: "none",
                  border: "0.5px solid rgba(0,122,255,0.20)",
                }}
              >
                <Phone size={15} />
                Ligar
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

function isCRO(valor: string): boolean {
  return /^CRO-[A-Z]{2}\s?\d{3,6}$/.test(valor.toUpperCase());
}

/** Página de perfil completo do dentista, acessada via /dentista/:id ou /dentista/:cro */
export default function DentistProfilePage() {
  const { id } = useParams<{ id: string }>();
  const dentistaId = id && isCRO(id) ? null : id; // UUID (null se for CRO)
  const croParam = id && isCRO(id) ? id.toUpperCase().replace(/\s/g, "") : null;
  const navigate = useNavigate();
  const { user } = useAuth(); // para o paciente

  const [perfil, setPerfil] = useState<DentistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Estados para o formulário de avaliação
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingNota, setRatingNota] = useState(0);
  const [ratingAtividade, setRatingAtividade] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Extrair todas as atividades do dentista para o select
  const todasAtividades = perfil ? Array.from(new Set(perfil.enderecos.flatMap(e => e.atividades || []))) : [];

  const fetchPerfil = useCallback(async () => {
    if (!id) return;
    try {
      if (!perfil) {
        setLoading(true);
      }
      setError(false);

      // Tenta cache — busca por UUID ou CRO
      try {
        const cachedStr = localStorage.getItem("curadentes_search_cache");
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (parsed.resultados) {
            const doCache = (parsed.resultados as CachedDentistResult[]).find((r) =>
              dentistaId ? r.dentista_id === dentistaId : r.dentista_cro === croParam
            );
            if (doCache) {
              const espec = doCache.atividades && doCache.atividades.length > 0 ? doCache.atividades[0] : "Clínico Geral";
              const partialProfile: DentistProfile = {
                dentista_id: doCache.dentista_id,
                nome_completo: doCache.dentista_nome,
                foto_url: doCache.dentista_foto || "",
                cro: doCache.dentista_cro || "",
                especialidade_principal: espec,
                bio: doCache.dentista_bio || "",
                rating: doCache.dentista_avaliacao || 5.0,
                total_avaliacoes: 0,
                enderecos: [
                  {
                      id: doCache.endereco_id,
                      nome_clinica: doCache.nome_clinica || "",
                      logradouro: doCache.logradouro || "",
                      numero: doCache.numero || "",
                      complemento: "",
                      bairro: doCache.bairro || "",
                      cidade: doCache.cidade || "",
                      estado: doCache.estado || "",
                      cep: "",
                      telefone: "",
                      atividades: doCache.atividades || [],
                      agenda: [],
                      formas_pagamento: doCache.formas_pagamento ? doCache.formas_pagamento.map((fp: string, i: number) => ({ id: `${i}`, nome: fp, tipo: "dinheiro" as const })) : [],
                      convenios: doCache.convenios ? doCache.convenios.map((c: string, i: number) => ({ id: `${i}`, nome: c })) : [],
                    }
                  ]
                };
                setPerfil(partialProfile);
                setLoading(false);
              }
            }
          }
        } catch (e) {
          console.error("Erro ao ler cache do dentista:", e);
        }

      // 1. Busca o dentista — por UUID (dentistaId) ou por CRO (croParam)
      const queryField = croParam ? "cro" : "id";
      const queryValue = croParam || dentistaId;
      const { data: pro, error: proError } = await supabase
        .from("curadentespro")
        .select("*")
        .eq(queryField, queryValue)
        .maybeSingle();

      if (proError || !pro) throw new Error("Dentista não encontrado");

      const proId = pro.id; // UUID real do dentista

      // 2. Busca os endereços
      const { data: ends, error: endError } = await supabase
        .from("curadentespro_enderecos")
        .select("*")
        .eq("curadentespro_id", proId);

      if (endError) throw endError;

      // 3. Busca as avaliações do dentista
      const { data: avs, error: avError } = await supabase
        .from("avaliacoes")
        .select("*")
        .eq("dentista_id", proId);

      if (avError) throw avError;

      // 4. Calcula médias de avaliações
      let mediaGeral = 0;
      let totalAvs = 0;
      const porAtividadeMap = new Map<string, { soma: number, count: number }>();

      if (avs && avs.length > 0) {
        totalAvs = avs.length;
        let somaTotal = 0;
        avs.forEach((av: { nota: number; atividade?: string }) => {
          somaTotal += av.nota;
          const atv = av.atividade || "Geral";
          if (!porAtividadeMap.has(atv)) {
            porAtividadeMap.set(atv, { soma: 0, count: 0 });
          }
          porAtividadeMap.get(atv)!.soma += av.nota;
          porAtividadeMap.get(atv)!.count += 1;
        });
        mediaGeral = somaTotal / totalAvs;
      }

      const porAtividade: ResumoAvaliacaoAtividade[] = Array.from(porAtividadeMap.entries()).map(([nome, dados]) => ({
        nome_atividade: nome,
        media_nota: dados.soma / dados.count,
        total_avaliacoes: dados.count
      }));

      // A especialidade principal será a primeira atividade do primeiro endereço (se existir)
      let espec = "Clínico Geral";
      if (ends && ends.length > 0 && ends[0].atividades && ends[0].atividades.length > 0) {
        espec = ends[0].atividades[0];
      }

      const formatarEnderecos = (ends || []).map((e: {
        id: string;
        nome_clinica: string;
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string;
        cep: string;
        telefone: string;
        whatsapp?: string;
        atividades?: string[];
        agenda?: EnderecoClinica["agenda"];
        formas_pagamento?: string[];
        convenios?: string[];
      }) => ({
        id: e.id,
        nome_clinica: e.nome_clinica,
        logradouro: e.logradouro,
        numero: e.numero,
        complemento: e.complemento,
        bairro: e.bairro,
        cidade: e.cidade,
        estado: e.estado,
        cep: e.cep,
        telefone: e.telefone,
        whatsapp: e.whatsapp,
        atividades: e.atividades || [],
        agenda: e.agenda || [],
        formas_pagamento: e.formas_pagamento ? e.formas_pagamento.map((fp: string, i: number) => ({ id: `${i}`, nome: fp, tipo: "dinheiro" as const })) : [],
        convenios: e.convenios ? e.convenios.map((c: string, i: number) => ({ id: `${i}`, nome: c })) : [],
      }));

      const perfilMontado: DentistProfile = {
        dentista_id: pro.id,
        nome_completo: pro.nome,
        foto_url: pro.foto_url || "",
        cro: (pro.cro || "").replace(/\s/g, ""),
        especialidade_principal: espec,
        bio: pro.bio,
        rating: mediaGeral,
        total_avaliacoes: totalAvs,
        enderecos: formatarEnderecos,
        avaliacoes: totalAvs > 0 ? {
          media_geral: mediaGeral,
          total_avaliacoes: totalAvs,
          por_atividade: porAtividade
        } : undefined,
      };

      setPerfil(perfilMontado);
    } catch (err) {
      console.error(err);
      // Se não temos perfil algum (nem do cache), então é erro de fato.
      // Se já temos o perfil do cache, apenas ignoramos o erro (offline mode).
      setPerfil((atual) => {
        if (!atual) setError(true);
        return atual;
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPerfil();
  }, [id, fetchPerfil]);

  const handleSubmitRating = async () => {
    if (!user) {
      toast.error("Você precisa entrar com sua conta Google para avaliar!");
      return;
    }
    if (ratingNota === 0) {
      toast.error("Por favor, selecione as estrelas.");
      return;
    }
    if (!ratingAtividade) {
      toast.error("Por favor, selecione qual tratamento você realizou.");
      return;
    }

    setSubmittingRating(true);
    const toastId = toast.loading("Salvando sua avaliação...");

    try {
      const { error: insertError } = await supabase
        .from("avaliacoes")
        .insert({
          paciente_id: user.id,
          dentista_id: perfil?.dentista_id,
          nota: ratingNota,
          atividade: ratingAtividade,
        });

      if (insertError) throw insertError;

      toast.dismiss(toastId);
      toast.success("Avaliação salva com sucesso! Obrigado.");
      
      setShowRatingForm(false);
      setRatingNota(0);
      setRatingAtividade("");
      fetchPerfil();
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      toast.error("Falha ao salvar a avaliação.");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7]">
        <Loader2 className="animate-spin text-[#007AFF] mb-4" size={40} />
        <p className="text-[#8E8E93] font-medium">Carregando perfil do dentista...</p>
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F2F2F7]">
        <p className="text-[18px] font-semibold text-[#0A2A66]">Dentista não encontrado.</p>
        <button onClick={() => navigate("/")} className="px-5 py-3 rounded-[14px] font-semibold text-white text-[15px] bg-[#007AFF]">
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>

      {/* ── Barra de navegação superior fixa ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(24px) saturate(120%)",
          WebkitBackdropFilter: "blur(24px) saturate(120%)",
          borderBottom: "0.5px solid rgba(60,60,67,0.10)",
        }}
      >
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <div className="flex items-center justify-between h-[60px] gap-3">
            {/* Botão voltar */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 min-h-[44px] px-1 rounded-xl transition-opacity duration-150"
              style={{ color: "#007AFF", background: "transparent" }}
              aria-label="Voltar para a listagem"
            >
              <ArrowLeft size={20} />
              <span className="text-[15px] font-medium hidden sm:inline">Voltar</span>
            </button>

            {/* Logo CuraDentes */}
            <a href="/" className="flex items-center gap-2 flex-shrink-0">
              <img src={LOGO_ICON} alt="CuraDentes" className="h-7 w-7" />
              <span
                className="font-bold text-[16px] hidden sm:inline"
                style={{
                  color: "#0A2A66",
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                CuraDentes
              </span>
            </a>


          </div>
        </div>
      </header>

      {/* ── Hero do perfil ── */}
      <div
        style={{
          background: "linear-gradient(160deg, #E3F2FD 0%, #fff 100%)",
        }}
      >
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
                src={perfil.foto_url || logoProAltUrl}
                alt={perfil.nome_completo}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Nome, especialidade, CRO e rating */}
            <div className="flex-1 text-center sm:text-left">
              {/* Nome do dentista + badge de pódio geral da cidade */}
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
                  {perfil.nome_completo}
                </h1>
                {/* Badge exibido apenas quando o dentista está no Top 1, 2 ou 3 da cidade */}
                {perfil.posicao_cidade != null && perfil.posicao_cidade <= 3 && (
                  <BadgePodio posicao={perfil.posicao_cidade} tamanho="md" />
                )}
              </div>

              <p className="text-[14px] font-semibold mb-1" style={{ color: "#E6004C" }}>
                {perfil.especialidade_principal}
              </p>

              {/* CRO com ícone de verificação */}
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                <Shield size={13} style={{ color: "#8E8E93" }} />
                <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                  {perfil.cro}
                </span>
              </div>

              {/* Rating geral em estrelas */}
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      fill={s <= Math.round(perfil.rating) ? "#FFCC00" : "#E5E5EA"}
                      stroke="none"
                    />
                  ))}
                </div>
                <span className="font-bold text-[16px]" style={{ color: "#0A2A66" }}>
                  {perfil.rating.toFixed(1)}
                </span>
                <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                  ({perfil.total_avaliacoes} avaliações)
                </span>
              </div>
            </div>
          </div>

          {/* Bio do dentista */}
          {perfil.bio && (
            <div
              className="mt-5"
              style={{
                background: "rgba(255,255,255,0.80)",
                borderRadius: "16px",
                padding: "16px 20px",
                border: "0.5px solid rgba(60,60,67,0.08)",
              }}
            >
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: "#3A3A3C", lineHeight: 1.7 }}
              >
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
              <h2
                className="text-[16px] font-bold"
                style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}
              >
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
            {perfil.enderecos.map((end, idx) => (
              <EnderecoCard key={end.id} endereco={end} index={idx} />
            ))}

            {/* ── Seção de avaliações por atividade ── */}
            {perfil.avaliacoes && perfil.avaliacoes.por_atividade.length > 0 && (
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
                    A avaliação geral é a média das notas de cada atividade. Atividades com
                    notas baixas impactam a média geral do profissional.
                  </p>
                </div>

                {/* Barras de avaliação por atividade */}
                <div>
                  {perfil.avaliacoes.por_atividade.map((av) => (
                    <BarraAvaliacao key={av.nome_atividade} atividade={av} />
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
          </div>

          {/* ── Formulário de Avaliação (Paciente) ── */}
          <div className="flex flex-col gap-4 bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden mt-6 p-5 lg:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Star size={20} style={{ color: "#E6004C" }} />
              <h2 className="text-[18px] lg:text-[20px] font-bold text-[#0A2A66] font-inter">Avalie este Dentista</h2>
            </div>
            
            {showRatingForm ? (
              <div className="flex flex-col gap-5 mt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                <div>
                  <label className="text-[12px] font-bold text-[#8E8E93] mb-3 block uppercase tracking-wider">Quantas estrelas?</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setRatingNota(s)} className="p-1 transition-transform hover:scale-110 active:scale-95">
                        <Star size={36} fill={s <= ratingNota ? "#FFCC00" : "transparent"} stroke={s <= ratingNota ? "#FFCC00" : "#C7C7CC"} strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-[#8E8E93] mb-2 block uppercase tracking-wider">Qual procedimento você realizou?</label>
                  <select 
                    value={ratingAtividade}
                    onChange={(e) => setRatingAtividade(e.target.value)}
                    className="w-full h-12 bg-[#F2F2F7] rounded-xl px-4 outline-none text-[#1C1C1E] border border-transparent focus:border-[#007AFF] transition-all font-medium"
                  >
                    <option value="">Selecione o procedimento...</option>
                    {todasAtividades.length > 0 ? (
                      todasAtividades.map(atv => <option key={atv} value={atv}>{atv}</option>)
                    ) : (
                      <option value="Consulta Geral">Consulta Geral</option>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-3 mt-4 border-t border-gray-100 pt-5">
                  <button onClick={() => setShowRatingForm(false)} className="flex-1 py-3.5 rounded-xl text-[#3A3A3C] font-semibold bg-[#E5E5EA] hover:bg-gray-300 transition-colors">Cancelar</button>
                  <button onClick={handleSubmitRating} disabled={submittingRating} className="flex-1 py-3.5 rounded-xl text-white font-semibold bg-[#007AFF] hover:bg-blue-600 transition-colors disabled:opacity-50">
                    {submittingRating ? "Salvando..." : "Enviar Avaliação"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[14px] text-[#3A3A3C] mb-5">
                  Sua opinião ajuda outros pacientes a encontrarem os melhores profissionais. Como foi o seu atendimento?
                </p>
                <button 
                  onClick={() => {
                    if (!user) {
                      toast.error("Por favor, faça login antes de avaliar!");
                      // Opcional: redirecionar para login
                    } else {
                      setShowRatingForm(true);
                    }
                  }}
                  className="w-full md:w-auto px-6 py-3.5 rounded-xl font-bold text-[#007AFF] bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm"
                >
                  Deixar uma Avaliação
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
