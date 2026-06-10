// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: CtaBanner — Banner de call-to-action para dentistas
//
// Exibe na landing page um banner convidando dentistas a se cadastrarem
// no CuraDentes Pro. Mostra benefícios como número de pacientes, alcance, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import { TrendingUp, Users, Clock, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Eye, EyeOff, ChevronRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import logoProUrl from "@/assets/logos/logo-pro.png";
import logoProAltUrl from "@/assets/logos/logo-pro-alt.png";

const LOGO_PRO = logoProUrl;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const BENEFITS = [
  { icon: Users, text: "Acesso a milhares de pacientes próximos" },
  { icon: TrendingUp, text: "Aumente sua visibilidade online" },
  { icon: Clock, text: "Agenda online integrada, 24 horas" },
  { icon: CheckCircle, text: "Perfil verificado com CRO" },
];

export default function CtaBanner() {
  const navigate = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);
  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  function fecharModal() {
    setModalAberto(false);
    setEmailLogin("");
    setSenhaLogin("");
    setMostrarSenha(false);
  }

  function loginDentista() {
    fecharModal();
    navigate("/pro/perfil");
  }

  function irParaCadastro() {
    fecharModal();
    navigate("/pro/novo-cadastro");
  }

  return (
    <>
      <section id="para-dentistas" style={{ padding: "80px 0" }}>
        <div className="container mx-auto px-5 md:px-8 lg:px-16">
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
            style={{
              padding: "clamp(32px, 5vw, 56px)",
              background: "linear-gradient(135deg, rgba(0,122,255,0.09) 0%, rgba(10,42,102,0.05) 100%)",
              border: "0.5px solid rgba(255,255,255,0.45)",
              borderRadius: "28px",
              boxShadow: "var(--shadow-lg)",
              backdropFilter: "blur(24px) saturate(120%)",
              WebkitBackdropFilter: "blur(24px) saturate(120%)",
            }}
          >
            {/* Logo CuraDentesPro */}
            <div className="flex justify-center md:justify-center">
              <img src={logoProAltUrl} alt="CuraDentes Pro" style={{ width: "140px", height: "140px", objectFit: "contain" }} />
            </div>

            {/* Content */}
            <div>
              <span
                className="text-[13px] font-semibold uppercase tracking-widest block mb-3"
                style={{ color: "var(--brand-magenta)" }}
              >
                Para Dentistas
              </span>
              <h2
                className="mb-4"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(24px, 3.5vw, 32px)",
                  color: "var(--brand-navy)",
                  lineHeight: 1.2,
                }}
              >
                Ganhe visibilidade e atraia mais pacientes
              </h2>
              <p className="mb-6" style={{ fontSize: "16px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                Cadastre seu perfil gratuitamente e apareça para pacientes próximos que buscam exatamente a sua especialidade. Agenda digital, avaliações verificadas e destaque no ranking.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {BENEFITS.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={benefit.text} className="flex items-start gap-2.5">
                      <Icon size={16} style={{ color: "var(--primary-blue)", flexShrink: 0, marginTop: "2px" }} />
                      <span className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                        {benefit.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/pro/novo-cadastro")}
                  className="flex-1 sm:flex-none py-3 px-7 rounded-[14px] text-white font-semibold text-[15px] min-h-[48px] transition-all duration-200"
                  style={{
                    background: "#E6004C",
                    boxShadow: "0 4px 16px rgba(230,0,76,0.28)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#c4003e"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(230,0,76,0.38)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#E6004C"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(230,0,76,0.28)"; }}
                >
                  Cadastrar Dentista
                </button>
                <button
                  className="flex-1 sm:flex-none py-3 px-7 rounded-[14px] font-semibold text-[15px] min-h-[48px] transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.65)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "0.5px solid rgba(255,255,255,0.45)",
                    color: "var(--text-primary)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  Saber mais
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {modalAberto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[200] px-4"
          style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}
        >
          <div
            className="w-full max-w-[420px] rounded-[24px] p-7 flex flex-col gap-5"
            style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.20)" }}
          >
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
            <p className="text-[14px]" style={{ color: "#8E8E93" }}>Acesse o painel exclusivo para profissionais.</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#3A3A3C" }}>E-mail</label>
                <input type="email" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} placeholder="seu@email.com.br" className="w-full px-4 py-3 rounded-[12px] text-[15px] outline-none" style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E" }} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: "#3A3A3C" }}>Senha</label>
                <div className="relative">
                  <input type={mostrarSenha ? "text" : "password"} value={senhaLogin} onChange={(e) => setSenhaLogin(e.target.value)} placeholder="Sua senha" className="w-full px-4 py-3 rounded-[12px] text-[15px] outline-none" style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E", paddingRight: "48px" }} onKeyDown={(e) => { if (e.key === "Enter") loginDentista(); }} />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8E8E93" }}>
                    {mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <button onClick={loginDentista} className="w-full py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] text-white transition-all duration-200" style={{ background: "#0A2A66", boxShadow: "0 4px 16px rgba(10,42,102,0.25)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#0d3480"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#0A2A66"; }}>Entrar no painel</button>
            </div>
            <div className="flex items-center gap-3">
              <div style={{ flex: 1, height: "0.5px", background: "rgba(60,60,67,0.15)" }} />
              <span className="text-[12px]" style={{ color: "#8E8E93" }}>ou</span>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(60,60,67,0.15)" }} />
            </div>
            <button className="w-full flex items-center justify-center gap-3 py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] transition-all duration-200" style={{ background: "#fff", border: "1.5px solid rgba(60,60,67,0.18)", color: "#1C1C1E" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(60,60,67,0.04)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}><GoogleIcon />Entrar com Google</button>
            <button onClick={irParaCadastro} className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] transition-all duration-200" style={{ background: "rgba(230,0,76,0.06)", color: "#E6004C", border: "1px solid rgba(230,0,76,0.20)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(230,0,76,0.10)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(230,0,76,0.06)"; }}>Criar conta<ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}
