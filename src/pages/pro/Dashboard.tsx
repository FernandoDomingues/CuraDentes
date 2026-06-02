// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD DO DENTISTA — CURADENTES PRO
//
// Painel exclusivo para profissionais autenticados, exibindo:
//   - Boas-vindas com foto do dentista (com opção de editar ao hover)
//   - Todos os endereços cadastrados com horários, convênios e pagamentos
//   - Destaque em dark pink (#E6004C) para endereços com atendimento de urgência
//   - Engrenagem de edição em cada endereço
//   - Pontuação geral e por especialidade + colocação no ranking
//   - Menu superior direito: logoff e configurações gerais (editar bio, excluir perfil)
//
// Em produção: substituir dados mock pelo retorno do banco via Supabase.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { uploadFotoDentista } from "@/lib/uploadService";
import { supabase } from "@/lib/supabase";
import {
  LogOut,
  Settings,
  Camera,
  Star,
  Building2,
  Clock,
  User,
  CreditCard,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  BarChart2,
  Edit3,
  Trash2,
  X,
  MapPin,
  Phone,
  MessageCircle,
  Zap,
  Trophy,
  Check,
  Loader2,
} from "lucide-react";
import type { DentistaPro } from "@/constants/demoDentists";

import logoProUrl from "@/assets/logos/logo-pro.png";
import logoProAltUrl from "@/assets/logos/logo-pro-alt.png";

// ─── Logo CuraDentes Pro ──────────────────────────────────────────────────────
const LOGO_PRO = logoProUrl;

// ─── Cor de destaque para urgências ──────────────────────────────────────────
const COR_URGENCIA = "#E6004C";

// ─── Componente: Barra de avaliação por atividade ─────────────────────────────

/** Exibe a nota de uma atividade como barra de progresso colorida */
function BarraAvaliacao({
  nome,
  media,
  total,
  posicao,
}: {
  nome: string;
  media: number;
  total: number;
  posicao?: number;
}) {
  const porcentagem = (media / 5) * 100;
  const cor =
    media >= 4.5 ? "#34C759" : media >= 3.5 ? "#FF9500" : "#FF3B30";

  return (
    <div style={{ padding: "10px 0", borderBottom: "0.5px solid rgba(60,60,67,0.06)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium" style={{ color: "#3A3A3C" }}>
          {nome}
        </span>
        <div className="flex items-center gap-3">
          {posicao != null && posicao > 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,122,255,0.10)", color: "#007AFF" }}
            >
              #{posicao}º ranking
            </span>
          )}
          <div className="flex items-center gap-1">
            <Star size={12} fill="#FFCC00" stroke="none" />
            <span className="text-[13px] font-bold" style={{ color: "#0A2A66" }}>{media.toFixed(1)}</span>
          </div>
          <span className="text-[11px]" style={{ color: "#8E8E93" }}>({total} aval.)</span>
        </div>
      </div>
      <div style={{ height: "5px", borderRadius: "3px", background: "rgba(60,60,67,0.10)", overflow: "hidden" }}>
        <div style={{ width: `${porcentagem}%`, height: "100%", borderRadius: "3px", background: cor, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ─── Componente: Card de endereço no dashboard ────────────────────────────────

/** Exibe um endereço com todas as informações e opção de editar */
function EnderecoCard({
  endereco,
  isUrgencia,
}: {
  endereco: DentistaPro["enderecos"][0];
  isUrgencia: boolean;
}) {
  // Controla se o accordion de horários está expandido
  const [agendaAberta, setAgendaAberta] = useState(false);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "20px",
        border: isUrgencia
          ? `1.5px solid ${COR_URGENCIA}`
          : "0.5px solid rgba(60,60,67,0.10)",
        boxShadow: isUrgencia
          ? `0 4px 16px rgba(230,0,76,0.12)`
          : "0 2px 8px rgba(16,24,64,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Faixa de urgência — visível apenas para endereços marcados */}
      {isUrgencia && (
        <div
          className="flex items-center gap-2 px-5 py-2"
          style={{ background: COR_URGENCIA }}
        >
          <Zap size={13} fill="#fff" stroke="none" />
          <span className="text-[12px] font-bold text-white tracking-wide uppercase">
            Atende Urgências
          </span>
        </div>
      )}

      {/* Cabeçalho do endereço */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: isUrgencia
                ? `rgba(230,0,76,0.10)`
                : "rgba(0,122,255,0.08)",
            }}
          >
            <Building2
              size={18}
              style={{ color: isUrgencia ? COR_URGENCIA : "#007AFF" }}
            />
          </div>
          <div>
            <h3 className="font-bold text-[16px]" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
              {endereco.nome_clinica}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} style={{ color: "#8E8E93" }} />
              <p className="text-[12px]" style={{ color: "#8E8E93" }}>
                {endereco.logradouro}, {endereco.numero}
                {endereco.complemento ? `, ${endereco.complemento}` : ""} —{" "}
                {endereco.bairro}, {endereco.cidade}/{endereco.estado}
              </p>
            </div>
          </div>
        </div>

        {/* Botão de editar endereço */}
        <button
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: "rgba(60,60,67,0.06)",
            color: "#8E8E93",
            border: "0.5px solid rgba(60,60,67,0.12)",
          }}
          title="Editar informações deste endereço"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,122,255,0.08)";
            e.currentTarget.style.color = "#007AFF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(60,60,67,0.06)";
            e.currentTarget.style.color = "#8E8E93";
          }}
        >
          <Settings size={13} />
          <span className="text-[12px] font-semibold">Editar</span>
        </button>
      </div>

      {/* Contatos */}
      {(endereco.telefone || endereco.whatsapp) && (
        <div className="flex items-center gap-4 px-5 pb-3">
          {endereco.telefone && (
            <div className="flex items-center gap-1">
              <Phone size={12} style={{ color: "#8E8E93" }} />
              <span className="text-[12px]" style={{ color: "#8E8E93" }}>{endereco.telefone}</span>
            </div>
          )}
          {endereco.whatsapp && (
            <div className="flex items-center gap-1">
              <MessageCircle size={12} style={{ color: "#25D366" }} />
              <span className="text-[12px]" style={{ color: "#25D366" }}>WhatsApp</span>
            </div>
          )}
        </div>
      )}

      {/* Atividades */}
      <div className="px-5 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#8E8E93" }}>
          Procedimentos
        </p>
        <div className="flex flex-wrap gap-1.5">
          {endereco.atividades.map((a) => (
            <span
              key={a}
              className="px-2.5 py-0.5 rounded-full text-[12px] font-medium"
              style={{ background: "rgba(0,122,255,0.07)", color: "#007AFF", border: "0.5px solid rgba(0,122,255,0.14)" }}
            >
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Accordion de horários */}
      <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.08)" }}>
        <button
          onClick={() => setAgendaAberta(!agendaAberta)}
          className="w-full flex items-center justify-between px-5 py-3"
          style={{ background: "transparent", cursor: "pointer" }}
        >
          <div className="flex items-center gap-2">
            <Clock size={13} style={{ color: "#007AFF" }} />
            <span className="text-[13px] font-semibold" style={{ color: "#007AFF" }}>
              Horários de atendimento
            </span>
          </div>
          {agendaAberta
            ? <ChevronUp size={15} style={{ color: "#8E8E93" }} />
            : <ChevronDown size={15} style={{ color: "#8E8E93" }} />
          }
        </button>
        {agendaAberta && (
          <div className="px-5 pb-4">
            {endereco.agenda.map((h) => (
              <div
                key={h.dia_semana}
                className="flex items-center justify-between py-1.5"
                style={{ borderBottom: "0.5px solid rgba(60,60,67,0.05)" }}
              >
                <span className="text-[13px]" style={{ color: "#3A3A3C" }}>{h.dia_semana}</span>
                <span className="text-[13px] font-semibold" style={{ color: "#0A2A66" }}>
                  {h.horario_inicio} – {h.horario_fim}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formas de pagamento */}
      {endereco.formas_pagamento.length > 0 && (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.08)", padding: "12px 20px" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#8E8E93" }}>
            Formas de pagamento
          </p>
          <div className="flex flex-wrap gap-1.5">
            {endereco.formas_pagamento.map((fp) => (
              <div
                key={fp.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px]"
                style={{ background: "rgba(255,149,0,0.08)", border: "0.5px solid rgba(255,149,0,0.20)" }}
              >
                <CreditCard size={11} style={{ color: "#FF9500" }} />
                <span className="text-[12px] font-medium" style={{ color: "#1C1C1E" }}>
                  {fp.nome}{fp.parcelas_ate ? ` (até ${fp.parcelas_ate}x)` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Convênios */}
      {endereco.convenios.length > 0 && (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.08)", padding: "12px 20px" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#8E8E93" }}>
            Convênios aceitos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {endereco.convenios.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(52,199,89,0.08)", border: "0.5px solid rgba(52,199,89,0.20)" }}
              >
                <CheckCircle size={10} style={{ color: "#34C759" }} />
                <span className="text-[12px] font-medium" style={{ color: "#1C1C1E" }}>{conv.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {endereco.convenios.length === 0 && (
        <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.08)", padding: "10px 20px" }}>
          <p className="text-[12px]" style={{ color: "#8E8E93" }}>Sem convênios neste endereço.</p>
        </div>
      )}
    </div>
  );
}

// ─── Página principal do dashboard ───────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();

  // ─ Estado de autenticação (login demo) ────────────────────────────────────
  const [dentista, setDentista] = useState<DentistaPro | null>(null);
  const [loginUsuario, setLoginUsuario] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [loginErro, setLoginErro] = useState("");

  // ─ Modal de configurações (bio e excluir perfil) ──────────────────────────
  const [modalConfig, setModalConfig] = useState(false);
  const [editandoBio, setEditandoBio] = useState(false);
  const [bioEditada, setBioEditada] = useState("");

  // ─ Modal de confirmação de exclusão de perfil ─────────────────────────────
  const [modalExcluir, setModalExcluir] = useState(false);

  // ─ Upload de Foto ─────────────────────────────────────────────────────────
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !dentista) return;

    const toastId = toast.loading("Enviando foto...");
    try {
      setIsUploadingFoto(true);

      // Em produção, o ID virá do banco de dados (UUID real).
      // Aqui usamos o ID do mock convertendo para string.
      const dentistaId = dentista.id.toString();
      const publicUrl = await uploadFotoDentista(file, dentistaId);

      // Atualiza a interface
      setDentista({ ...dentista, foto_url: publicUrl });
      toast.success("Foto atualizada com sucesso!", { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar foto.";
      toast.error(message, { id: toastId });
    } finally {
      setIsUploadingFoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // ─ Efeito para carregar sessão existente ────────────────────────────────
  useEffect(() => {
    async function carregarSessao() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        carregarDadosDentista(session.user.id);
      }
    }
    carregarSessao();
  }, []);

  async function carregarDadosDentista(userId: string) {
    try {
      const { data: perfil, error: perfilError } = await supabase
        .from('curadentespro')
        .select('*')
        .eq('id', userId)
        .single();

      if (perfilError) throw perfilError;

      const { data: enderecosData } = await supabase
        .from('curadentespro_enderecos')
        .select('*')
        .eq('curadentespro_id', userId);

      const dentistaLogado: DentistaPro = {
        id: perfil.id,
        usuario: perfil.email || "",
        senha: "",
        nome_completo: perfil.nome,
        email: perfil.email || "",
        telefone: perfil.telefone || "",
        foto_url: perfil.foto_url || logoProAltUrl,
        cro: perfil.cro,
        cpf: perfil.cpf || "",
        ano_formacao: perfil.ano_formacao || 0,
        bio: perfil.bio || "",
        cadastro_completo: true,
        posicao_geral: 1,
        avaliacoes: { media_geral: 0, total_avaliacoes: 0, por_atividade: [] },
        enderecos: (enderecosData || []).map((e) => ({
          id: e.id,
          nome_clinica: e.nome_clinica,
          logradouro: e.logradouro,
          numero: e.numero || "",
          complemento: e.complemento || "",
          bairro: e.bairro,
          cidade: e.cidade,
          estado: e.estado,
          cep: e.cep || "",
          telefone: e.telefone || "",
          whatsapp: e.whatsapp || "",
          maps_url: "",
          atividades: e.atividades || [],
          agenda: e.agenda || [],
          formas_pagamento: e.formas_pagamento || [],
          convenios: e.convenios ? e.convenios.map((c: string) => ({ id: c, nome: c })) : []
        }))
      };

      setDentista(dentistaLogado);
      setBioEditada(dentistaLogado.bio);
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Autentica o dentista com usuário e senha
  // ─────────────────────────────────────────────────────────────────────────
  async function fazerLogin() {
    setLoginErro("");
    const toastId = toast.loading("Entrando...");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginUsuario,
        password: loginSenha
      });
      if (error) {
        throw new Error("E-mail ou senha incorretos.");
      }
      
      await carregarDadosDentista(data.user.id);
      toast.success("Bem-vindo ao painel!", { id: toastId });
      navigate("/pro/perfil");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao entrar.";
      setLoginErro(message);
      toast.error(message, { id: toastId });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Encerra a sessão do dentista
  // ─────────────────────────────────────────────────────────────────────────
  async function fazerLogoff() {
    await supabase.auth.signOut();
    setDentista(null);
    setLoginUsuario("");
    setLoginSenha("");
    setModalConfig(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Salva a bio editada
  // Em produção: UPDATE em dentistas_perfis SET bio = :bio WHERE id = :id
  // ─────────────────────────────────────────────────────────────────────────
  function salvarBio() {
    if (dentista) {
      setDentista({ ...dentista, bio: bioEditada });
      setEditandoBio(false);
      setModalConfig(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Se não autenticado, exibe tela de login do dashboard
  // ─────────────────────────────────────────────────────────────────────────
  if (!dentista) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F2F2F7" }}>
        <div
          className="w-full max-w-[420px] rounded-[24px] p-8 flex flex-col gap-6"
          style={{
            background: "#fff",
            boxShadow: "0 16px 48px rgba(10,42,102,0.12)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <img src={LOGO_PRO} alt="CuraDentes Pro" className="h-10 w-auto" />
            <p className="text-[14px] text-center" style={{ color: "#8E8E93" }}>
              Acesse o painel do profissional
            </p>
          </div>

          {/* Formulário de login */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#3A3A3C" }}>
                E-mail
              </label>
              <input
                type="email"
                value={loginUsuario}
                onChange={(e) => setLoginUsuario(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full px-4 py-3 rounded-[12px] text-[15px] outline-none"
                style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E" }}
                onKeyDown={(e) => e.key === "Enter" && fazerLogin()}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#3A3A3C" }}>
                Senha
              </label>
              <input
                type="password"
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                placeholder="Sua senha"
                className="w-full px-4 py-3 rounded-[12px] text-[15px] outline-none"
                style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E" }}
                onKeyDown={(e) => e.key === "Enter" && fazerLogin()}
              />
            </div>

            {loginErro && (
              <div
                className="flex items-start gap-2 p-3 rounded-[12px]"
                style={{ background: "rgba(255,59,48,0.08)", border: "0.5px solid rgba(255,59,48,0.20)" }}
              >
                <AlertCircle size={14} style={{ color: "#FF3B30", marginTop: "1px", flexShrink: 0 }} />
                <p className="text-[13px]" style={{ color: "#FF3B30", lineHeight: 1.5 }}>{loginErro}</p>
              </div>
            )}

            <button
              onClick={fazerLogin}
              className="w-full py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] text-white transition-all duration-200"
              style={{ background: "#007AFF", boxShadow: "0 4px 16px rgba(0,122,255,0.28)" }}
            >
              Entrar no Painel
            </button>
          </div>

          <button
            onClick={() => navigate("/")}
            className="text-[13px] font-medium text-center transition-colors"
            style={{ color: "#8E8E93" }}
          >
            ← Voltar para o site
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dashboard autenticado
  // ─────────────────────────────────────────────────────────────────────────

  // Identifica endereços que atendem urgências (para destaque visual)
  // Como os dados demo vêm de EnderecoClinica (sem campo atende_urgencias),
  // usamos uma lógica mock: primeiro endereço do demo user 1 atende urgências
  const idsComUrgencia = dentista.id === 101 ? ["end-1-a"] : [];

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>

      {/* ── Barra superior fixa ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "0.5px solid rgba(60,60,67,0.10)",
        }}
      >
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-[60px]">
            <img src={LOGO_PRO} alt="CuraDentes Pro" className="h-7 w-auto" />

            {/* Menu do canto superior direito */}
            <div className="flex items-center gap-2">
              {/* Botão Meu Perfil */}
              <button
                onClick={() => navigate("/pro/perfil")}
                className="flex items-center gap-2 px-3 py-2 rounded-[12px] transition-all duration-200"
                style={{ color: "#8E8E93", background: "rgba(60,60,67,0.06)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#007AFF"; e.currentTarget.style.background = "rgba(0,122,255,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8E8E93"; e.currentTarget.style.background = "rgba(60,60,67,0.06)"; }}
                title="Meu Perfil"
              >
                <User size={16} />
                <span className="text-[13px] font-medium hidden sm:inline">Meu Perfil</span>
              </button>

              {/* Botão de configurações */}
              <button
                onClick={() => setModalConfig(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-[12px] transition-all duration-200"
                style={{ color: "#8E8E93", background: "rgba(60,60,67,0.06)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#007AFF"; e.currentTarget.style.background = "rgba(0,122,255,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8E8E93"; e.currentTarget.style.background = "rgba(60,60,67,0.06)"; }}
                title="Configurações"
              >
                <Settings size={16} />
                <span className="text-[13px] font-medium hidden sm:inline">Configurações</span>
              </button>

              {/* Botão de logoff */}
              <button
                onClick={fazerLogoff}
                className="flex items-center gap-2 px-3 py-2 rounded-[12px] transition-all duration-200"
                style={{ color: "#FF3B30", background: "rgba(255,59,48,0.06)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,59,48,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,59,48,0.06)"; }}
                title="Sair"
              >
                <LogOut size={16} />
                <span className="text-[13px] font-medium hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-6 max-w-4xl">
        <div className="flex flex-col gap-6">

          {/* ── Card de boas-vindas com foto do dentista ── */}
          <div
            style={{
              background: "linear-gradient(135deg, #0A2A66 0%, #1a4b99 100%)",
              borderRadius: "24px",
              padding: "clamp(24px, 4vw, 36px)",
              boxShadow: "0 12px 40px rgba(10,42,102,0.25)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

              {/* Foto com overlay de edição ao hover */}
              <div
                className={`relative flex-shrink-0 group ${isUploadingFoto ? "opacity-80 pointer-events-none" : "cursor-pointer"}`}
                style={{ width: "90px", height: "90px" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div
                  className="w-full h-full overflow-hidden"
                  style={{
                    borderRadius: "50%",
                    border: "3px solid rgba(255,255,255,0.30)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.30)",
                  }}
                >
                  <img
                    src={dentista.foto_url || logoProAltUrl}
                    alt={dentista.nome_completo}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Overlay de edição — aparece ao hover ou carregando */}
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-200 ${isUploadingFoto ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  style={{ borderRadius: "50%", background: "rgba(0,0,0,0.55)" }}
                >
                  {isUploadingFoto ? (
                    <Loader2 className="animate-spin" size={18} style={{ color: "#fff" }} />
                  ) : (
                    <>
                      <Camera size={18} style={{ color: "#fff" }} />
                      <span className="text-[10px] text-white font-semibold mt-1">Editar</span>
                    </>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFotoUpload}
                />
              </div>

              {/* Mensagem de boas-vindas e informações do perfil */}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-[14px] font-medium mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Bem-vindo(a) de volta!
                </p>
                <h1
                  className="font-bold mb-1"
                  style={{
                    fontSize: "clamp(20px, 3.5vw, 26px)",
                    color: "#fff",
                    fontFamily: "Inter, sans-serif",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {dentista.nome_completo}
                </h1>

                <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                  <Shield size={13} style={{ color: "rgba(255,255,255,0.55)" }} />
                  <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {dentista.cro || "CRO não informado"}
                  </span>
                </div>

                {/* Badge de status do perfil */}
                {dentista.cadastro_completo ? (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                    style={{ background: "rgba(52,199,89,0.20)", color: "#34C759", border: "0.5px solid rgba(52,199,89,0.30)" }}
                  >
                    <Check size={11} />
                    Perfil ativo — visível para pacientes
                  </div>
                ) : (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                    style={{ background: "rgba(255,149,0,0.20)", color: "#FF9500", border: "0.5px solid rgba(255,149,0,0.30)" }}
                  >
                    <AlertCircle size={11} />
                    Cadastro incompleto — perfil oculto
                  </div>
                )}
              </div>
            </div>

            {/* Bio do dentista */}
            {dentista.bio && (
              <div
                className="mt-5"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  borderRadius: "14px",
                  padding: "14px 18px",
                  border: "0.5px solid rgba(255,255,255,0.15)",
                }}
              >
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.80)", lineHeight: 1.6 }}>
                  {dentista.bio}
                </p>
              </div>
            )}

            {/* Aviso de cadastro incompleto */}
            {!dentista.cadastro_completo && (
              <div
                className="mt-4 flex items-start gap-2 p-3 rounded-[12px]"
                style={{ background: "rgba(255,149,0,0.15)", border: "0.5px solid rgba(255,149,0,0.25)" }}
              >
                <AlertCircle size={14} style={{ color: "#FF9500", marginTop: "2px", flexShrink: 0 }} />
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.80)", lineHeight: 1.6 }}>
                  Complete as informações do seu perfil para aparecer na busca de pacientes.{" "}
                  <button
                    onClick={() => navigate("/pro/novo-cadastro")}
                    className="font-bold underline"
                    style={{ color: "#FF9500" }}
                  >
                    Completar agora
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* ── Pontuação e ranking ── */}
          {dentista.avaliacoes.total_avaliacoes > 0 && (
            <div
              style={{
                background: "#fff",
                borderRadius: "20px",
                border: "0.5px solid rgba(60,60,67,0.10)",
                boxShadow: "0 2px 8px rgba(16,24,64,0.06)",
                overflow: "hidden",
              }}
            >
              <div className="flex items-center gap-2 p-5 pb-3">
                <BarChart2 size={16} style={{ color: "#007AFF" }} />
                <h2 className="text-[16px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
                  Sua pontuação
                </h2>
              </div>

              {/* Nota geral + posição */}
              <div
                className="flex items-center justify-between px-5 py-4 mx-5 mb-4 rounded-[16px]"
                style={{ background: "linear-gradient(135deg, rgba(0,122,255,0.06) 0%, rgba(52,199,89,0.06) 100%)", border: "0.5px solid rgba(0,122,255,0.12)" }}
              >
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8E8E93" }}>
                    Avaliação geral
                  </p>
                  <div className="flex items-center gap-2">
                    <Star size={18} fill="#FFCC00" stroke="none" />
                    <span className="text-[26px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
                      {dentista.avaliacoes.media_geral.toFixed(1)}
                    </span>
                    <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                      ({dentista.avaliacoes.total_avaliacoes} avaliações)
                    </span>
                  </div>
                </div>
                {dentista.posicao_geral > 0 && (
                  <div className="flex flex-col items-center">
                    <Trophy size={20} style={{ color: "#FFD700" }} />
                    <span className="text-[22px] font-bold" style={{ color: "#0A2A66" }}>#{dentista.posicao_geral}º</span>
                    <span className="text-[11px]" style={{ color: "#8E8E93" }}>ranking geral</span>
                  </div>
                )}
              </div>

              {/* Avaliações por atividade */}
              <div className="px-5 pb-5">
                <p className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: "#8E8E93" }}>
                  Por especialidade
                </p>
                {dentista.avaliacoes.por_atividade.map((av, idx) => (
                  <BarraAvaliacao
                    key={av.nome_atividade}
                    nome={av.nome_atividade}
                    media={av.media_nota}
                    total={av.total_avaliacoes}
                    posicao={idx + 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Endereços cadastrados ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} style={{ color: "#007AFF" }} />
              <h2 className="text-[16px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
                Locais de atendimento
              </h2>
              <span
                className="ml-auto text-[12px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(0,122,255,0.10)", color: "#007AFF" }}
              >
                {dentista.enderecos.length} {dentista.enderecos.length === 1 ? "endereço" : "endereços"}
              </span>
            </div>

            {dentista.enderecos.length > 0 ? (
              <div className="flex flex-col gap-4">
                {dentista.enderecos.map((end) => (
                  <EnderecoCard
                    key={end.id}
                    endereco={end}
                    isUrgencia={idsComUrgencia.includes(end.id)}
                  />
                ))}
              </div>
            ) : (
              <div
                className="flex flex-col items-center gap-3 py-12 rounded-[20px] text-center"
                style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}
              >
                <Building2 size={32} style={{ color: "rgba(0,122,255,0.30)" }} />
                <p className="text-[15px] font-semibold" style={{ color: "#0A2A66" }}>
                  Nenhum endereço cadastrado
                </p>
                <p className="text-[13px]" style={{ color: "#8E8E93" }}>
                  Adicione seus locais de atendimento para aparecer na busca.
                </p>
                <button
                  onClick={() => navigate("/pro/novo-cadastro")}
                  className="mt-2 px-6 py-3 rounded-[14px] font-semibold text-[14px] text-white min-h-[44px]"
                  style={{ background: "#007AFF" }}
                >
                  Adicionar endereço
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ── Modal de configurações ── */}
      {modalConfig && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-[200] px-0 sm:px-4"
          style={{ background: "rgba(10,42,102,0.40)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalConfig(false); }}
        >
          <div
            className="w-full sm:max-w-[420px] flex flex-col gap-1 p-2"
            style={{
              background: "#fff",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 -16px 48px rgba(10,42,102,0.15)",
            }}
          >
            {/* Indicador de arraste */}
            <div className="flex justify-center pt-2 pb-1">
              <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "rgba(60,60,67,0.20)" }} />
            </div>

            {/* Opções */}
            <button
              onClick={() => { setEditandoBio(true); setModalConfig(false); }}
              className="flex items-center gap-3 px-5 py-4 rounded-[16px] text-left transition-colors min-h-[60px]"
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,122,255,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-full" style={{ background: "rgba(0,122,255,0.10)" }}>
                <Edit3 size={16} style={{ color: "#007AFF" }} />
              </div>
              <div>
                <p className="font-semibold text-[15px]" style={{ color: "#1C1C1E" }}>Editar bio</p>
                <p className="text-[12px]" style={{ color: "#8E8E93" }}>Altere sua apresentação profissional</p>
              </div>
            </button>

            <button
              onClick={() => { setModalConfig(false); setModalExcluir(true); }}
              className="flex items-center gap-3 px-5 py-4 rounded-[16px] text-left transition-colors min-h-[60px]"
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,59,48,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-full" style={{ background: "rgba(255,59,48,0.10)" }}>
                <Trash2 size={16} style={{ color: "#FF3B30" }} />
              </div>
              <div>
                <p className="font-semibold text-[15px]" style={{ color: "#FF3B30" }}>Excluir perfil</p>
                <p className="text-[12px]" style={{ color: "#8E8E93" }}>Remove permanentemente sua conta</p>
              </div>
            </button>

            <button
              onClick={() => setModalConfig(false)}
              className="mx-3 mb-3 py-4 rounded-[16px] font-semibold text-[15px] min-h-[56px] transition-colors"
              style={{ background: "rgba(60,60,67,0.06)", color: "#8E8E93" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de edição de bio ── */}
      {editandoBio && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[200] px-4"
          style={{ background: "rgba(10,42,102,0.40)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-[520px] rounded-[24px] p-6 flex flex-col gap-4"
            style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.20)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-bold" style={{ color: "#0A2A66" }}>Editar bio</h3>
              <button onClick={() => setEditandoBio(false)} style={{ color: "#8E8E93" }}>
                <X size={20} />
              </button>
            </div>
            <textarea
              value={bioEditada}
              onChange={(e) => setBioEditada(e.target.value)}
              rows={6}
              className="w-full p-4 rounded-[14px] text-[14px] outline-none"
              style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E", resize: "vertical", lineHeight: 1.7 }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEditandoBio(false)}
                className="flex-1 py-3 rounded-[14px] font-semibold text-[14px] min-h-[48px]"
                style={{ background: "rgba(60,60,67,0.06)", color: "#8E8E93" }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarBio}
                className="flex-1 py-3 rounded-[14px] font-semibold text-[14px] min-h-[48px] text-white"
                style={{ background: "#007AFF" }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de confirmação de exclusão de perfil ── */}
      {modalExcluir && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[200] px-4"
          style={{ background: "rgba(10,42,102,0.40)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-[400px] rounded-[24px] p-7 flex flex-col gap-5"
            style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.20)" }}
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full mx-auto" style={{ background: "rgba(255,59,48,0.10)" }}>
              <Trash2 size={26} style={{ color: "#FF3B30" }} />
            </div>
            <div className="text-center">
              <h3 className="text-[19px] font-bold mb-2" style={{ color: "#0A2A66" }}>Excluir perfil</h3>
              <p className="text-[14px]" style={{ color: "#3A3A3C", lineHeight: 1.7 }}>
                Esta ação é <strong>irreversível</strong>. Todos os seus dados, endereços e avaliações serão permanentemente removidos.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setModalExcluir(false); fazerLogoff(); navigate("/"); }}
                className="w-full py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] text-white"
                style={{ background: "#FF3B30" }}
              >
                Confirmar exclusão
              </button>
              <button
                onClick={() => setModalExcluir(false)}
                className="w-full py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px]"
                style={{ background: "rgba(60,60,67,0.06)", color: "#8E8E93" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
