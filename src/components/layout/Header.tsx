// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: HEADER PRINCIPAL
//
// Navegação superior com:
//   - Logo (desktop: full, mobile: icon + wordmark)
//   - Links de navegação (desktop)
//   - Botão "Entrar" → abre modal de login com Google (paciente)
//   - Botão "Acesso do Dentista" → abre modal com opções de login/cadastro Pro
//   - Menu hamburger em mobile com as mesmas ações
//
// Modais:
//   - modalPaciente: login do paciente via Google
//   - modalDentista: login por email/senha, Google, ou "Criar conta" (redireciona)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Menu, X, Eye, EyeOff, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
// ============================================================================
// IMPORTAÇÕES PARA A AUTENTICAÇÃO COM O GOOGLE
// ============================================================================
import { useAuth } from "@/hooks/useAuth"; // Hook global que controla quem está logado
import { toast } from "sonner"; // Notificações amigáveis na tela
import { supabase } from "@/lib/supabase";

import logoComNome from "@/assets/logos/logo-com-nome.png";
import logoIcon from "@/assets/logos/logo-icon.png";
import logoPro from "@/assets/logos/logo-pro.png";

// ─── URLs dos logos ───────────────────────────────────────────────────────────
const LOGO_FULL  = logoComNome;
const LOGO_ICON  = logoIcon;
const LOGO_PRO   = logoPro;

// ─── Links de navegação ───────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Especialidades", href: "#especialidades" },
  { label: "Para Dentistas", href: "#para-dentistas" },
  { label: "Sobre",          href: "/sobre" },
];

// ─── SVG do logotipo do Google para os botões de login ───────────────────────
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

// ─── Componente principal ────────────────────────────────────────────────────
export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleNavClick(e: React.MouseEvent, href: string) {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const sectionId = href.slice(1);
    if (location.pathname === "/") {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/", { state: { scrollTo: sectionId } });
    }
  }

  // Importamos os estados de login: "user" (usuário ativo), "signInWithGoogle" (entrar) e "logout" (sair)
  const { user, signInWithGoogle, logout } = useAuth();

  // ============================================================================
  // FLUXO DE LOGIN COM GOOGLE UNIFICADO NO HEADER + GEOLOCALIZAÇÃO
  // ============================================================================
  // Permite que o usuário faça o login diretamente clicando no botão "Entrar"
  // do topo da página ou dentro dos modais de login.
  // AGORA, também captura as coordenadas de localização atuais!
  const handleGoogleLogin = async () => {
    const loadingToast = toast.loading("Redirecionando para o Google...");
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await signInWithGoogle(latitude, longitude);
            toast.dismiss(loadingToast);
          },
          async (error) => {
            console.warn("Permissão de geolocalização recusada no login:", error.message);
            await signInWithGoogle(null, null);
            toast.dismiss(loadingToast);
          },
          { timeout: 5000 }
        );
      } else {
        await signInWithGoogle(null, null);
        toast.dismiss(loadingToast);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Falha ao inicializar login com o Google.");
      console.error(error);
    }
  };

  // Controla abertura do menu mobile
  const [menuOpen, setMenuOpen] = useState(false);

  // Controla qual modal está aberto: null | "paciente" | "dentista"
  const [modalAberto, setModalAberto] = useState<null | "paciente" | "dentista">(null);

  // Estado do formulário de login (usado no modal do dentista)
  const [emailLogin, setEmailLogin]   = useState("");
  const [senhaLogin, setSenhaLogin]   = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Estados para fluxo de recuperação de senha (Esqueci a senha)
  const [modoRecovery, setModoRecovery] = useState(false);
  const [emailRecovery, setEmailRecovery] = useState("");
  const [enviandoRecovery, setEnviandoRecovery] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Fecha o modal ativo e limpa o formulário
  // ─────────────────────────────────────────────────────────────────────────
  function fecharModal() {
    setModalAberto(null);
    setEmailLogin("");
    setSenhaLogin("");
    setMostrarSenha(false);
    setModoRecovery(false);
    setEmailRecovery("");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Redireciona para o painel do dentista
  // Em produção: validar credenciais antes via Supabase Auth
  // ─────────────────────────────────────────────────────────────────────────
  async function loginDentista() {
    if (!emailLogin || !senhaLogin) {
      toast.error("Por favor, preencha e-mail e senha.");
      return;
    }

    const toastId = toast.loading("Verificando credenciais...");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailLogin,
        password: senhaLogin,
      });

      if (error) {
        throw new Error("E-mail ou senha incorretos.");
      }

      toast.success("Login realizado com sucesso!", { id: toastId });
      fecharModal();
      navigate("/pro/perfil");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido ao fazer login.";
      toast.error(message, { id: toastId });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Dispara email de recuperação de senha via Supabase Auth
  // ─────────────────────────────────────────────────────────────────────────
  async function recuperarSenha() {
    if (!emailRecovery.trim()) {
      toast.error("Por favor, informe seu e-mail.");
      return;
    }

    setEnviandoRecovery(true);
    const toastId = toast.loading("Enviando e-mail de recuperação...");

    try {
      const redirectTo = window.location.origin + "/pro/redefinir-senha";
      const { error } = await supabase.auth.resetPasswordForEmail(emailRecovery.trim(), {
        redirectTo,
      });

      if (error) throw error;

      toast.success("E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada.", { id: toastId });
      setModoRecovery(false);
      setEmailRecovery("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar e-mail de recuperação.";
      toast.error(message, { id: toastId });
    } finally {
      setEnviandoRecovery(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Redireciona para a página de novo cadastro Pro
  // ─────────────────────────────────────────────────────────────────────────
  function irParaCadastro() {
    fecharModal();
    navigate("/pro/novo-cadastro");
  }

  // ─── Modal do Paciente: login com Google ──────────────────────────────────
  const renderModalPaciente = () => (
    <div
      className="fixed inset-0 flex items-center justify-center z-[200] px-4"
      style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}
    >
      <div
        className="w-full max-w-[400px] rounded-[24px] p-7 flex flex-col gap-5"
        style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.20)" }}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
            Entrar
          </h2>
          <button
            onClick={fecharModal}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: "#8E8E93" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(60,60,67,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-[14px]" style={{ color: "#8E8E93", lineHeight: 1.6 }}>
          Acesse sua conta para acompanhar consultas, favoritos e avaliações.
        </p>

        {/* Botão de login com Google */}
        <button
          onClick={() => handleGoogleLogin()}
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
  );

  // ─── Modal do Dentista: login por email/senha ou criar conta ───────────────
  const renderModalDentista = () => (
    <div
      className="fixed inset-0 flex items-center justify-center z-[200] px-4"
      style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}
    >
      <div
        className="w-full max-w-[420px] rounded-[24px] p-7 flex flex-col gap-5"
        style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.20)" }}
      >
        {/* Cabeçalho com logo Pro */}
        <div className="flex items-center justify-between">
          <img src={LOGO_PRO} alt="CuraDentes Pro" className="h-7 w-auto" />
          <button
            onClick={fecharModal}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: "#8E8E93" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(60,60,67,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X size={18} />
          </button>
        </div>

        {modoRecovery ? (
          <>
            <p className="text-[14px]" style={{ color: "#8E8E93" }}>
              Digite seu e-mail cadastrado para receber um link de redefinição de senha.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#3A3A3C" }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={emailRecovery}
                  onChange={(e) => setEmailRecovery(e.target.value)}
                  placeholder="seu@email.com.br"
                  className="w-full px-4 py-3 rounded-[12px] text-[15px] outline-none"
                  style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E" }}
                  onKeyDown={(e) => { if (e.key === "Enter") recuperarSenha(); }}
                />
              </div>

              <button
                onClick={recuperarSenha}
                disabled={enviandoRecovery}
                className="w-full py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] text-white transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "#0A2A66",
                  boxShadow: "0 4px 16px rgba(10,42,102,0.25)",
                }}
                onMouseEnter={(e) => { if(!enviandoRecovery) e.currentTarget.style.background = "#0d3480"; }}
                onMouseLeave={(e) => { if(!enviandoRecovery) e.currentTarget.style.background = "#0A2A66"; }}
              >
                Enviar Link de Recuperação
              </button>

              <button
                onClick={() => { setModoRecovery(false); setEmailRecovery(""); }}
                className="text-[13px] font-semibold text-center mt-1 transition-colors"
                style={{ color: "#007AFF" }}
              >
                Voltar para o Login
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[14px]" style={{ color: "#8E8E93" }}>
              Acesse o painel exclusivo para profissionais.
            </p>

            {/* Formulário de email e senha */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#3A3A3C" }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  placeholder="seu@email.com.br"
                  className="w-full px-4 py-3 rounded-[12px] text-[15px] outline-none"
                  style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E" }}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#3A3A3C" }}>
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senhaLogin}
                    onChange={(e) => setSenhaLogin(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full px-4 py-3 rounded-[12px] text-[15px] outline-none"
                    style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E", paddingRight: "48px" }}
                    onKeyDown={(e) => { if (e.key === "Enter") loginDentista(); }}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "#8E8E93" }}
                  >
                    {mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Botão de login por email */}
              <button
                onClick={loginDentista}
                className="w-full py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] text-white transition-all duration-200"
                style={{
                  background: "#0A2A66",
                  boxShadow: "0 4px 16px rgba(10,42,102,0.25)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#0d3480"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#0A2A66"; }}
              >
                Entrar no Painel
              </button>

              <button
                type="button"
                onClick={() => setModoRecovery(true)}
                className="w-full py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] transition-all duration-200"
                style={{
                  background: "rgba(10,42,102,0.06)",
                  color: "#0A2A66",
                  border: "1px solid rgba(10,42,102,0.15)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(10,42,102,0.10)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(10,42,102,0.06)"; }}
              >
                Esqueci a senha
              </button>
            </div>
          </>
        )}

        {/* Separador */}
        <div className="flex items-center gap-3">
          <div style={{ flex: 1, height: "0.5px", background: "rgba(60,60,67,0.15)" }} />
          <span className="text-[12px]" style={{ color: "#8E8E93" }}>ou</span>
          <div style={{ flex: 1, height: "0.5px", background: "rgba(60,60,67,0.15)" }} />
        </div>

        {/* Criar conta */}
        <button
          onClick={irParaCadastro}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] transition-all duration-200"
          style={{
            background: "rgba(230,0,76,0.06)",
            color: "#E6004C",
            border: "1px solid rgba(230,0,76,0.20)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(230,0,76,0.10)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(230,0,76,0.06)"; }}
        >
          Criar conta
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <>
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
        <div className="container mx-auto px-5 md:px-8 lg:px-16">
          <div className="flex items-center justify-between h-[64px] gap-4">

            {/* Logo — Mobile: ícone + nome, Desktop: logo completo */}
            <a href="/" className="flex items-center gap-2 flex-shrink-0">
              <img src={LOGO_FULL}  alt="CuraDentes" className="h-8 w-auto hidden lg:block" />
              <div className="flex items-center gap-2 lg:hidden">
                <img src={LOGO_ICON} alt="CuraDentes" className="h-8 w-8" />
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "18px", color: "#0A2A66", letterSpacing: "-0.01em" }}>
                  CuraDentes
                </span>
              </div>
            </a>

            {/* Links de navegação — apenas desktop */}
            <nav className="hidden lg:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-[15px] font-medium transition-colors duration-200"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary-blue)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Ações — desktop */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Botão Entrar — abre modal de login do paciente (Google) */}
              {user ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-black/5 transition-all duration-200">
                    <img 
                      src={user.picture} 
                      alt={user.name} 
                      className="w-8 h-8 rounded-full border border-gray-200 object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[14px] font-semibold text-gray-700 hidden xl:inline">{user.name.split(" ")[0]}</span>
                  </button>
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl p-4 shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="mb-2 text-left">
                      <p className="text-[14px] font-bold text-gray-900 truncate">{user.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    </div>
                    <div style={{ height: "0.5px", background: "rgba(60,60,67,0.10)", margin: "8px 0" }} />
                    <button 
                      onClick={() => {
                        logout();
                        toast.success("Sessão encerrada.");
                      }}
                      className="w-full text-left text-[13px] font-medium text-red-500 hover:text-red-700 transition-colors"
                    >
                      Sair da Conta
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setModalAberto("paciente")}
                  className="text-[15px] font-medium px-4 py-2 rounded-xl transition-colors duration-200 min-h-[44px]"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary-blue)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                >
                  Entrar
                </button>
              )}

              {/* Botão Acesso do Dentista — abre modal de login/cadastro Pro */}
              <button
                onClick={() => setModalAberto("dentista")}
                className="text-[15px] font-semibold px-5 py-3 rounded-[14px] text-white min-h-[44px] transition-all duration-200"
                style={{ background: "#E6004C", boxShadow: "0 4px 16px rgba(230,0,76,0.28)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#c4003e";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(230,0,76,0.38)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#E6004C";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(230,0,76,0.28)";
                }}
              >
                Acesso do Dentista
              </button>
            </div>

            {/* Botão menu hamburger — mobile */}
            <button
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ color: "#3A3A3C" }}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Menu drawer mobile */}
        {menuOpen && (
          <div
            className="lg:hidden flex flex-col gap-1 px-5 pb-6 pt-2"
            style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)", background: "rgba(255,255,255,0.98)" }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { handleNavClick(e, link.href); setMenuOpen(false); }}
                className="flex items-center px-3 py-3 rounded-xl text-[16px] font-medium min-h-[48px] transition-colors duration-200"
                style={{ color: "#1C1C1E" }}
              >
                {link.label}
              </a>
            ))}

            <div className="flex flex-col gap-2 mt-3">
              {/* Entrar (mobile) */}
              {user ? (
                <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.picture} 
                      alt={user.name} 
                      className="w-10 h-10 rounded-full border border-gray-200 object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-gray-900 truncate">{user.name}</p>
                      <p className="text-[12px] text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      toast.success("Sessão encerrada.");
                    }}
                    className="w-full text-[14px] font-semibold py-2.5 rounded-[12px] text-red-500 bg-red-50 border border-red-100 text-center transition-colors"
                  >
                    Sair da Conta
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setMenuOpen(false); setModalAberto("paciente"); }}
                  className="w-full text-[15px] font-medium py-3 rounded-[14px] min-h-[48px] border transition-colors"
                  style={{ borderColor: "rgba(60,60,67,0.18)", color: "#1C1C1E" }}
                >
                  Entrar
                </button>
              )}

              {/* Acesso do Dentista (mobile) */}
              <button
                onClick={() => { setMenuOpen(false); setModalAberto("dentista"); }}
                className="w-full text-[15px] font-semibold py-3 rounded-[14px] text-white min-h-[48px]"
                style={{ background: "#E6004C", boxShadow: "0 4px 12px rgba(230,0,76,0.25)" }}
              >
                Acesso do Dentista
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Modais fora do <header> para o overlay cobrir toda a tela */}
      {modalAberto === "paciente"  && renderModalPaciente()}
      {modalAberto === "dentista"  && renderModalDentista()}
    </>
  );
}
