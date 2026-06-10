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

import { useParams, useNavigate, Link } from "react-router-dom";
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
  ExternalLink,
  Shield,
  CheckCircle,
  BarChart2,
  X,
  ChevronRight,
  Trophy,
  Instagram,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { EnderecoClinica, FormaPagamento, Convenio, ResumoAvaliacaoAtividade, DentistProfile, AvaliacaoIndividual, HorarioAtendimento } from "@/types/dentist";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CachedDentistResult, loadProfileCache, saveProfileCache } from "@/lib/dentistCache";
import Header from "@/components/layout/Header";
import logoProAltUrl from "@/assets/logos/logo-pro-alt.png";
import CroVerificationBadge from "@/components/analytics/CroVerificationBadge";
import { ESPECIALIDADES_SEO } from "@/constants/especialidadesSEO";

/** Retorna o slug da especialidade a partir do nome */
function slugifyEspecialidade(nome: string): string {
  return ESPECIALIDADES_SEO[nome]?.slug || nome.toLowerCase().replace(/\s+/g, "-");
}

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

// ─── Subcomponente: Badge de pódio (Top 1, 2, 3) ─────────────────────────────
interface BadgePodioProps {
  posicao: number;
  tamanho: "sm" | "md";
}

function BadgePodio({ posicao, tamanho }: BadgePodioProps) {
  const config = {
    1: { texto: "Top 1", bg: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", cor: "#0A2A66" },
    2: { texto: "Top 2", bg: "linear-gradient(135deg, #E0E0E0 0%, #B0B0B0 100%)", cor: "#3A3A3C" },
    3: { texto: "Top 3", bg: "linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)", cor: "#fff" },
  }[posicao as 1 | 2 | 3] || { texto: `Top ${posicao}`, bg: "linear-gradient(135deg, #007AFF 0%, #0056B3 100%)", cor: "#fff" };

  const estiloTamanho = tamanho === "sm"
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

/** normalizar agenda do banco para o frontend */
function normalizarAgenda(agendaRaw: any): HorarioAtendimento[] {
  if (!Array.isArray(agendaRaw)) return [];
  return agendaRaw
    .filter((item: any) => item && item.ativo !== false)
    .map((item: any) => ({
      dia_semana: item.dia || item.dia_semana || "",
      horario_inicio: item.inicio || item.horario_inicio || "",
      horario_fim: item.fim || item.horario_fim || "",
    }))
    .filter((item: any) => item.dia_semana && item.horario_inicio && item.horario_fim);
}

async function queryTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// ─── Subcomponente: Barra de avaliação por atividade ─────────────────────────

/**
 * Exibe a nota média de uma atividade como barra de progresso colorida.
 * Cor da barra varia conforme a nota: verde (≥4.5), amarelo (≥3.5), vermelho (<3.5)
 * Exibe badge de pódio quando a posição está no Top 1, 2 ou 3.
 */
function BarraAvaliacao({ atividade, onVerAvaliacoes }: {
  atividade: ResumoAvaliacaoAtividade;
  onVerAvaliacoes?: (atividade: string) => void;
}) {
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
          <Link
            to={`/especialidade/${slugifyEspecialidade(atividade.nome_atividade)}`}
            className="text-[13px] font-medium hover:underline"
            style={{ color: "#3A3A3C" }}
          >
            {atividade.nome_atividade}
          </Link>
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
          {atividade.total_avaliacoes > 0 && (
            <button
              type="button"
              onClick={() => onVerAvaliacoes?.(atividade.nome_atividade)}
              className="flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full transition-colors"
              style={{ color: "#007AFF", background: "rgba(0,122,255,0.08)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,122,255,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,122,255,0.08)"; }}
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
function EnderecoCard({ endereco, index, nomeDentista, onContactRequest }: {
  endereco: EnderecoClinica;
  index: number;
  nomeDentista: string;
  onContactRequest: (url: string) => void;
}) {
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
            <Link
              key={atividade}
              to={`/especialidade/${slugifyEspecialidade(atividade)}`}
              className="px-3 py-1 rounded-full text-[12px] font-medium inline-block hover:opacity-80 transition-opacity"
              style={{
                background: "rgba(10,42,102,0.06)",
                color: "#0A2A66",
                border: "0.5px solid rgba(10,42,102,0.12)",
              }}
            >
              {atividade}
            </Link>
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
              <button
                onClick={() => onContactRequest(`https://wa.me/${endereco.whatsapp}?text=${encodeURIComponent(`Olá, te encontrei na CuraDentes e gostaria de agendar uma consulta com o dr. ${nomeDentista}`)}`)}
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
            {/* Botão de ligação deste endereço */}
            {endereco.telefone && (
              <button
                onClick={() => onContactRequest(`tel:${endereco.telefone.replace(/\D/g, "")}`)}
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

// ─── Página principal ─────────────────────────────────────────────────────────

function isCRO(valor: string): boolean {
  return /^CRO-[A-Z]{2}\s?\d{3,6}$/.test(valor.toUpperCase());
}

// ─── SVG do Google para o botão de login ─────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

/** Página de perfil completo do dentista, acessada via /dentista/:id ou /dentista/:cro */
export default function DentistProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // para o paciente

  const [perfil, setPerfil] = useState<DentistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);

  // Estados para o formulário de avaliação
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingNota, setRatingNota] = useState(0);
  const [ratingAtividade, setRatingAtividade] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Estados para o modal de login obrigatório antes do contato
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Estado para o modal de avaliações individuais
  const [avaliacoesIndividuais, setAvaliacoesIndividuais] = useState<{
    atividade: string;
    ratings: AvaliacaoIndividual[];
  } | null>(null);

  const handleContactRequest = useCallback((url: string) => {
    if (user) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setShowLoginModal(true);
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    const loadingToast = toast.loading("Redirecionando para o Google...");
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.href },
      });
      toast.dismiss(loadingToast);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Falha ao inicializar login com o Google.");
      console.error(error);
    }
  };

  const fetchAvaliacoesIndividuais = async (atividade: string) => {
    console.log("[fetchAvaliacoesIndividuais] Called for activity:", atividade, "perfil:", perfil);
    if (!perfil) {
      console.warn("[fetchAvaliacoesIndividuais] Aborted: perfil is null");
      return;
    }
    try {
      console.log("[fetchAvaliacoesIndividuais] Querying reviews for dentista_id:", perfil.dentista_id, "atividade:", atividade);
      const { data: avaliacoes, error } = await queryTimeout(
        supabase
          .from("avaliacoes")
          .select("paciente_id, nota, criado_em")
          .eq("dentista_id", perfil.dentista_id)
          .eq("atividade", atividade)
          .order("criado_em", { ascending: false }),
        5000
      );

      if (error) {
        console.error("[fetchAvaliacoesIndividuais] Error fetching reviews:", error);
        throw error;
      }
      console.log("[fetchAvaliacoesIndividuais] Reviews returned:", avaliacoes);
      if (!avaliacoes || avaliacoes.length === 0) {
        console.warn("[fetchAvaliacoesIndividuais] No reviews found for this activity.");
        return;
      }

      const ids = [...new Set(avaliacoes.map((a: any) => a.paciente_id))];
      console.log("[fetchAvaliacoesIndividuais] Querying clients for patient_ids:", ids);
        const { data: pacientes, error: pacError } = await supabase
          .from("clientes")
          .select("id, nome, foto")
          .in("id", ids)
          .is("deleted_at", null);

      if (pacError) {
        console.error("[fetchAvaliacoesIndividuais] Error fetching clients:", pacError);
        throw pacError;
      }
      console.log("[fetchAvaliacoesIndividuais] Clients returned:", pacientes);

      const mapaPacientes = Object.fromEntries(
        (pacientes || []).map((p: any) => [p.id, { nome: p.nome, foto: p.foto }])
      );

      console.log("[fetchAvaliacoesIndividuais] Setting avaliacoesIndividuais state...");
      setAvaliacoesIndividuais({
        atividade,
        ratings: (avaliacoes || []).map((r: any) => ({
          nota: r.nota,
          paciente_nome: mapaPacientes[r.paciente_id]?.nome || "Anônimo",
          paciente_foto: mapaPacientes[r.paciente_id]?.foto || "",
          criado_em: r.criado_em,
        })),
      });
    } catch (err) {
      console.error("Erro ao buscar avaliações individuais:", err);
      toast.error("Erro ao carregar avaliações.");
    }
  };

  // Extrair todas as atividades do dentista para o select
  const todasAtividades = perfil ? Array.from(new Set(perfil.enderecos.flatMap(e => e.atividades || []))) : [];

  useEffect(() => {
    const dId = id && isCRO(id) ? null : id;
    const cParam = id && isCRO(id) ? id.toUpperCase().replace(/\s/g, "") : null;
    console.log("[DentistProfile] id:", id, "| queryField:", cParam ? "cro" : "id", "| queryValue:", cParam || dId, "| reloadFlag:", reloadFlag);
    if (!id) return;

    let cancel = false;
    const cacheKey = cParam || dId || "";

    // ─── Tenta cache de perfil completo (inclui agenda) ────────────────
    (async () => {
      setPerfil(null);
      setLoading(true);
      setError(false);

      // 0. Cache de perfil completo — mostra instantaneamente se existir
      if (cacheKey) {
        const cachedProfile = loadProfileCache(cacheKey);
        if (cachedProfile) {
          console.log("[DentistProfile] Profile cache hit:", cacheKey);
          if (!cancel) {
            setPerfil(cachedProfile);
            setLoading(false);
          }
        }
      }

      if (cancel) return;

      try {
        // Tenta cache de busca (dados parciais, sem agenda)
        try {
          const cachedStr = localStorage.getItem("curadentes_search_cache");
          if (cachedStr) {
            const parsed = JSON.parse(cachedStr);
            if (parsed.resultados) {
              const doCache = (parsed.resultados as CachedDentistResult[]).find((r) =>
                dId ? r.dentista_id === dId : r.dentista_cro === cParam
              );
              if (doCache && !loadProfileCache(cacheKey)) {
                // Só mostra search cache se NÃO temos profile cache completo
                const espec = doCache.atividades && doCache.atividades.length > 0 ? doCache.atividades[0] : "Clínico Geral";
                const partialProfile: DentistProfile = {
                  dentista_id: doCache.dentista_id,
                  nome_completo: doCache.dentista_nome,
                  foto_url: doCache.dentista_foto || "",
                  cro: doCache.dentista_cro || "",
                  especialidade_principal: espec,
                  bio: doCache.dentista_bio || "",
                  rating: doCache.dentista_avaliacao || 0,
                  total_avaliacoes: 0,
                  enderecos: [{
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
                  }],
                };
                if (!cancel) {
                  setPerfil(partialProfile);
                  if (!loadProfileCache(cacheKey)) setLoading(false);
                }
              }
            }
          }
        } catch (e) {
          console.error("Erro ao ler cache do dentista:", e);
        }

        if (cancel) return;

        // ─── 1. Query principal com timeout ──────────────────────────────
        const queryField = cParam ? "cro" : "id";
        const queryValue = cParam || dId;
        console.log("[DentistProfile] Query curadentespro:", queryField, "=", queryValue);
        const { data: pro, error: proError } = await queryTimeout(
          supabase
            .from("curadentespro")
            .select("*")
            .eq(queryField, queryValue)
            .is("deleted_at", null)
            .maybeSingle(),
          15000
        );

        if (cancel) return;
        if (proError || !pro) throw new Error("Dentista não encontrado");
        if (!pro.lgpd_aceito) throw new Error("Perfil incompleto ou indisponível");

        const proId = pro.id;

        // ─── 2. Endereços com timeout ────────────────────────────────────
        const { data: ends, error: endError } = await queryTimeout(
          supabase
            .from("curadentespro_enderecos")
            .select("*")
            .eq("curadentespro_id", proId),
          15000
        );

        if (cancel) return;
        if (endError) throw endError;

        // ─── 3. Avaliações com timeout ────────────────────────────────────
        const { data: avs, error: avError } = await queryTimeout(
          supabase
            .from("avaliacoes")
            .select("*")
            .eq("dentista_id", proId),
          15000
        );

        if (cancel) return;
        if (avError) throw avError;

        // ─── 4. Calcula médias ────────────────────────────────────────────
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
          agenda?: any;
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
          agenda: normalizarAgenda(e.agenda),
          formas_pagamento: e.formas_pagamento ? e.formas_pagamento.map((fp: string, i: number) => ({ id: `${i}`, nome: fp, tipo: "dinheiro" as const })) : [],
          convenios: e.convenios ? e.convenios.map((c: string, i: number) => ({ id: `${i}`, nome: c })) : [],
        }));

        const perfilMontado: DentistProfile = {
          dentista_id: pro.id,
          nome_completo: pro.nome,
          foto_url: (pro.foto_url && !pro.foto_url.startsWith("blob:")) ? pro.foto_url : "",
          cro: (pro.cro || "").replace(/\s/g, ""),
          cro_verificado: !!pro.cro_verificado,
          email: pro.email,
          especialidade_principal: espec,
          bio: pro.bio,
          instagram: pro.instagram || undefined,
          rating: mediaGeral,
          total_avaliacoes: totalAvs,
          enderecos: formatarEnderecos,
          avaliacoes: totalAvs > 0 ? {
            media_geral: mediaGeral,
            total_avaliacoes: totalAvs,
            por_atividade: porAtividade
          } : undefined,
        };

        if (!cancel) {
          setPerfil(perfilMontado);
          setLoading(false);
          // Salva no cache de perfil completo para F5
          if (cacheKey) saveProfileCache(cacheKey, perfilMontado);
        }
      } catch (err: any) {
        if (cancel) return;
        // Se já temos um perfil do cache, não marca erro
        if (err?.message === "timeout") {
          console.warn("[DentistProfile] Query timeout, usando dados do cache");
          // Loading já foi removido pelo cache
        } else {
          console.error(err);
          setPerfil((atual) => {
            if (!atual) setError(true);
            return atual;
          });
          setLoading(false);
        }
      }
    })();

    return () => { cancel = true; };
  }, [id, reloadFlag]);

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

    const { error: insertError } = await supabase
      .from("avaliacoes")
      .insert({
        paciente_id: user.id,
        dentista_id: perfil?.dentista_id,
        nota: ratingNota,
        atividade: ratingAtividade,
      });

    if (insertError) {
      setSubmittingRating(false);
      toast.error("Falha ao salvar a avaliação.");
      return;
    }

    toast.success("Avaliação salva com sucesso! Obrigado.");

    setShowRatingForm(false);
    setRatingNota(0);
    setRatingAtividade("");

    supabase.functions.invoke("send-rating-notification", {
      body: {
        dentistEmail: perfil?.email,
        dentistName: perfil?.nome_completo,
        specialty: ratingAtividade,
        patientName: user.name,
      },
    }).then(async (res) => {
      if (res.error) {
        const msg = res.response ? await res.response.text() : res.error.message;
        console.warn("[notificação] Erro:", msg);
      } else {
        console.log("[notificação] Email enviado com sucesso");
      }
    });

    setSubmittingRating(false);
    setReloadFlag(n => n + 1);
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

      <Header />

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
                {perfil.instagram && (
                  <a
                    href={perfil.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center"
                    style={{ color: "#E4405F" }}
                    title="Instagram"
                  >
                    <Instagram size={22} />
                  </a>
                )}
              </div>

              <Link
                to={`/especialidade/${slugifyEspecialidade(perfil.especialidade_principal)}`}
                className="inline-block text-[14px] font-semibold mb-1 hover:underline"
                style={{ color: "#E6004C" }}
              >
                {perfil.especialidade_principal}
              </Link>

              {/* CRO com badge de verificação à direita */}
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                <div className="relative inline-flex items-center gap-2">
                  <Shield size={13} style={{ color: "#8E8E93" }} />
                  <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                    {perfil.cro}
                  </span>
                </div>
                {perfil.cro_verificado === true ? (
                  <CroVerificationBadge verificado size="sm" />
                ) : perfil.cro_verificado !== undefined ? (
                  <CroVerificationBadge verificado={false} size="sm" />
                ) : null}
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
              <EnderecoCard key={end.id} endereco={end} index={idx} nomeDentista={perfil.nome_completo} onContactRequest={handleContactRequest} />
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
                    <BarraAvaliacao key={av.nome_atividade} atividade={av} onVerAvaliacoes={fetchAvaliacoesIndividuais} />
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

      {/* ── Modal de login obrigatório para contato ── */}
      {showLoginModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[200] px-4"
          style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false); }}
        >
          <div
            className="w-full max-w-[400px] rounded-[24px] p-7 flex flex-col gap-5"
            style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.20)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
                Entrar
              </h2>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                style={{ color: "#8E8E93" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(60,60,67,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[14px]" style={{ color: "#8E8E93", lineHeight: 1.6 }}>
              Faça login com sua conta Google para entrar em contato com o dentista.
            </p>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-[14px] font-semibold text-[15px] min-h-[52px] transition-all duration-200"
              style={{
                background: "#fff",
                border: "1.5px solid rgba(60,60,67,0.18)",
                color: "#1C1C1E",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(60,60,67,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
            >
              <GoogleIcon />
              Continuar com Google
            </button>

            <p className="text-[12px] text-center" style={{ color: "#8E8E93", lineHeight: 1.6 }}>
              Ao entrar, você concorda com nossos{" "}
              <a href="/termos" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#007AFF" }}>Termos de Uso</a>{" "}
              e{" "}
              <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#007AFF" }}>Política de Privacidade</a>.
            </p>
          </div>
        </div>
      )}

      {/* ── Modal de avaliações individuais ── */}
      {avaliacoesIndividuais && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[200] px-4"
          style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setAvaliacoesIndividuais(null); }}
        >
          <div
            className="w-full max-w-[420px] max-h-[70vh] overflow-y-auto rounded-[24px] p-6 flex flex-col gap-4"
            style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.20)" }}
          >
            <div className="flex items-center justify-between sticky top-0 bg-white pb-2" style={{ zIndex: 1 }}>
              <h2 className="text-[16px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
                {avaliacoesIndividuais.atividade}
              </h2>
              <button
                onClick={() => setAvaliacoesIndividuais(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ color: "#8E8E93" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(60,60,67,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
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
                  <div key={i} className="flex items-center gap-3 p-3 rounded-[12px]" style={{ background: "#F2F2F7" }}>
                    <img
                      src={r.paciente_foto || logoProAltUrl}
                      alt={r.paciente_nome}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      style={{ border: "2px solid #fff" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "#1C1C1E" }}>
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
