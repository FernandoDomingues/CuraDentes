// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: Entrar (/entrar)
//
// Porta de entrada do app: login obrigatório.
//   - Paciente: "Entrar com Google".
//   - "Acesso para dentistas": a logo troca para a CuraDentes Pro e libera o
//     login por email e senha do dentista.
//
// Pós-login (via onAuthStateChange do useAuth):
//   - dentista / superuser → /pro/dashboard
//   - paciente             → /
//
// OBS (app nativo): o Google bloqueia OAuth dentro de WebView. No navegador o
// fluxo abaixo funciona; no app, o botão Google usa o Google Sign-In NATIVO
// (ligado quando os client IDs do Google Cloud estiverem configurados — ver MOBILE.md).
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";

import logoUrl from "@/assets/logos/logo-com-nome.png";
import logoProUrl from "@/assets/logos/logo-pro.png";

const NAVY = "#0A2A66";
const BLUE = "#007AFF";

/** Ícone "G" colorido do Google (mesmo usado no resto do site). */
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

export default function Entrar() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);

  const [modoDentista, setModoDentista] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [entrando, setEntrando] = useState(false);

  // Já autenticado? Encaminha pelo papel (também cobre o retorno do OAuth do Google).
  useEffect(() => {
    if (!user) return;
    if (user.role === "dentista" || user.role === "superuser") {
      navigate("/pro/dashboard", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const entrarComGoogle = async () => {
    // No app nativo, OAuth em WebView é bloqueado pelo Google → usar Google Sign-In nativo.
    if (Capacitor.isNativePlatform()) {
      toast.error("Login com Google no app estará disponível em breve. Use o acesso por email enquanto isso.");
      return;
    }
    try {
      setEntrando(true);
      await signInWithGoogle(); // redireciona para o Google (fluxo web)
    } catch {
      toast.error("Não foi possível entrar com o Google. Tente novamente.");
      setEntrando(false);
    }
  };

  const entrarComEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha) {
      toast.error("Preencha email e senha.");
      return;
    }
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (error) {
      toast.error("Email ou senha incorretos.");
      setEntrando(false);
      return;
    }
    // Sucesso: onAuthStateChange popula o usuário e o useEffect acima redireciona.
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: "linear-gradient(170deg, #ffffff 0%, #eef4ff 100%)" }}
    >
      <div
        className="w-full max-w-[380px] flex flex-col items-center bg-white rounded-[24px] p-7"
        style={{ boxShadow: "0 16px 48px rgba(10,42,102,0.10)", border: "0.5px solid rgba(60,60,67,0.08)" }}
      >
        {/* Logo — troca entre CuraDentes e CuraDentes Pro */}
        <img
          src={modoDentista ? logoProUrl : logoUrl}
          alt={modoDentista ? "CuraDentes Pro" : "CuraDentes"}
          className="h-12 w-auto mb-5"
        />

        {!modoDentista ? (
          /* ───── Visão do paciente: login com Google ───── */
          <>
            <h1 className="text-[20px] font-bold text-center" style={{ color: NAVY }}>
              Bem-vindo
            </h1>
            <p className="text-[14px] text-center mt-1 mb-6" style={{ color: "#5c6b7a", lineHeight: 1.5 }}>
              Entre para encontrar e agendar com os melhores dentistas perto de você.
            </p>

            <button
              onClick={entrarComGoogle}
              disabled={entrando}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-[14px] font-semibold text-[15px] transition-all disabled:opacity-60"
              style={{ background: "#fff", color: "#3A3A3C", border: "1px solid rgba(60,60,67,0.20)" }}
            >
              {entrando ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
              Entrar com Google
            </button>

            <button
              onClick={() => setModoDentista(true)}
              className="mt-6 text-[14px] font-semibold transition-colors"
              style={{ color: BLUE }}
            >
              Acesso para dentistas
            </button>
          </>
        ) : (
          /* ───── Visão do dentista: login com email e senha ───── */
          <>
            <h1 className="text-[20px] font-bold text-center" style={{ color: NAVY }}>
              Acesso do Dentista
            </h1>
            <p className="text-[14px] text-center mt-1 mb-6" style={{ color: "#5c6b7a", lineHeight: 1.5 }}>
              Entre com o email e a senha cadastrados no CuraDentes Pro.
            </p>

            <form onSubmit={entrarComEmail} className="w-full flex flex-col gap-3">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#8E8E93" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 rounded-[14px] text-[15px] outline-none"
                  style={{ border: "1px solid rgba(60,60,67,0.20)" }}
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#8E8E93" }} />
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 rounded-[14px] text-[15px] outline-none"
                  style={{ border: "1px solid rgba(60,60,67,0.20)" }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#8E8E93" }}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={entrando}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] font-bold text-[15px] text-white transition-all disabled:opacity-60 mt-1"
                style={{ background: BLUE }}
              >
                {entrando && <Loader2 size={18} className="animate-spin" />}
                Entrar
              </button>
            </form>

            <button
              onClick={() => setModoDentista(false)}
              className="mt-6 flex items-center gap-1.5 text-[14px] font-semibold transition-colors"
              style={{ color: "#8E8E93" }}
            >
              <ArrowLeft size={15} /> Voltar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
