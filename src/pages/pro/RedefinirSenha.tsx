// ═══════════════════════════════════════════════════════════════════════════════
// REDEFINIÇÃO DE SENHA — CURADENTES PRO
//
// Página acessada quando o dentista clica no link enviado por email pelo
// fluxo de "Esqueci/Trocar senha". O Supabase redireciona para cá com
// tokens de recovery no hash da URL (detectSessionInUrl = true no client).
//
// Fluxo:
//   1. Usuario clica "Trocar senha" no MeuPerfil
//   2. resetPasswordForEmail dispara o template "Password recovery"
//   3. Supabase envia email com link que aponta para `${SiteURL}/pro/redefinir-senha#type=recovery&access_token=...`
//   4. Usuario clica no link → esta pagina carrega com sessao de recovery
//   5. Supabase client dispara o evento PASSWORD_RECOVERY (onAuthStateChange)
//   6. Mostramos o formulario de nova senha
//   7. updateUser({ password }) salva o novo hash no auth.users
//   8. signOut() e redirect para home com toast de sucesso
//
// Caso o usuario acesse esta rota sem ter clicado no link (sessao invalida
// ou expirada), mostramos erro e link de retorno.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Lock, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import logoProUrl from "@/assets/logos/logo-pro.png";

// ─── Calcula a força da senha (0=fraca, 1=regular, 2=boa, 3=forte) ───────────
function calcularForcaSenha(senha: string): number {
  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (/[A-Z]/.test(senha)) pontos++;
  if (/[0-9]/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;
  return pontos - 1; // 0..3 (ja que o length >= 8 da +1)
}

const FORCA_LABEL = ["Fraca", "Regular", "Boa", "Forte"];
const FORCA_COR = ["#FF3B30", "#FF9500", "#FFCC00", "#34C759"];

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(true);
  const [temSessaoRecovery, setTemSessaoRecovery] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const forca = calcularForcaSenha(novaSenha);

  // ─────────────────────────────────────────────────────────────────────────
  // Detecta a sessão de recovery. O Supabase client (com detectSessionInUrl)
  // já parseou o hash da URL e disparou PASSWORD_RECOVERY. Aqui esperamos
  // pelo evento OU checamos a sessão atual (caso o evento já tenha
  // acontecido antes do useEffect rodar).
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let resolved = false;

    function checkSession() {
      if (resolved) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (resolved) return;
        if (session?.user) {
          resolved = true;
          setTemSessaoRecovery(true);
          setVerificando(false);
        }
      });
    }

    // Checagem inicial
    checkSession();

    // Listener para o evento PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        resolved = true;
        setTemSessaoRecovery(true);
        setVerificando(false);
      }
    });

    // Timeout: se depois de 5s nao tivermos sessao, mostramos erro
    const timeoutId = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setVerificando(false);
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Submete a nova senha
  // ─────────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (novaSenha.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmaSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSalvando(true);
    const toastId = toast.loading("Salvando nova senha...");

    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;

      // Encerra a sessao de recovery (criada em outro browser/contexto)
      // e força o dentista a logar com a nova senha.
      await supabase.auth.signOut();

      toast.success("Senha alterada com sucesso! Faça login novamente.", { id: toastId });
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar a nova senha.";
      toast.error(message, { id: toastId });
    } finally {
      setSalvando(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 44px 12px 14px",
    border: "1px solid rgba(60,60,67,0.18)",
    borderRadius: "12px",
    fontSize: "15px",
    outline: "none",
    background: "#fff",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#3A3A3C",
    marginBottom: "6px",
  };

  // ─── Tela de loading inicial (checando sessao) ────────────────────────────
  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7]">
        <Loader2 className="animate-spin text-[#007AFF]" size={32} />
      </div>
    );
  }

  // ─── Link invalido / expirado / sessao nao existe ────────────────────────
  if (!temSessaoRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] px-4">
        <div className="bg-white p-8 rounded-[20px] shadow-sm border border-gray-200 max-w-md w-full text-center">
          <img src={logoProUrl} alt="CuraDentes Pro" className="h-10 mx-auto mb-6" />
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <Lock size={20} className="text-red-500" />
          </div>
          <h1 className="text-[20px] font-bold text-[#0A2A66] mb-2">Link inválido ou expirado</h1>
          <p className="text-[14px] text-gray-600 mb-6">
            O link de redefinição de senha é válido por tempo limitado e só pode ser usado uma vez.
            Solicite um novo link na sua área de perfil.
          </p>
          <button
            onClick={() => navigate("/pro/perfil")}
            className="w-full py-3 rounded-[12px] font-semibold text-[15px] text-white transition-all"
            style={{ background: "#007AFF" }}
          >
            Ir para meu perfil
          </button>
        </div>
      </div>
    );
  }

  // ─── Formulario de nova senha ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] px-4 py-8">
      <div className="bg-white p-8 rounded-[20px] shadow-sm border border-gray-200 max-w-md w-full">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Voltar
        </button>

        <img src={logoProUrl} alt="CuraDentes Pro" className="h-10 mx-auto mb-6" />

        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
          <Lock size={20} className="text-[#007AFF]" />
        </div>

        <h1 className="text-[22px] font-bold text-[#0A2A66] text-center mb-2">
          Defina sua nova senha
        </h1>
        <p className="text-[14px] text-gray-600 text-center mb-6">
          Escolha uma senha forte com pelo menos 8 caracteres.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Nova senha</label>
            <div style={{ position: "relative" }}>
              <input
                type={mostrarSenha ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={inputStyle}
                autoFocus
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                style={{
                  position: "absolute", right: 12, top: "50%",
                  transform: "translateY(-50%)", background: "none", border: "none",
                  padding: 4, cursor: "pointer", color: "#8E8E93"
                }}
                tabIndex={-1}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Barra de força */}
            {novaSenha.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: i <= forca ? FORCA_COR[forca] : "#E5E5EA",
                        transition: "background 0.2s",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px]" style={{ color: FORCA_COR[forca] }}>
                  Força: {FORCA_LABEL[forca]}
                </p>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Confirmar nova senha</label>
            <input
              type={mostrarSenha ? "text" : "password"}
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              placeholder="Repita a senha"
              style={{
                ...inputStyle,
                borderColor:
                  confirmaSenha && confirmaSenha !== novaSenha ? "#FF3B30" : undefined,
              }}
              autoComplete="new-password"
            />
            {confirmaSenha && confirmaSenha !== novaSenha && (
              <p className="text-[12px] mt-1" style={{ color: "#FF3B30" }}>
                As senhas não coincidem.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={salvando || novaSenha.length < 8 || novaSenha !== confirmaSenha}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-[12px] font-semibold text-[15px] text-white transition-all disabled:opacity-50"
            style={{ background: "#007AFF" }}
          >
            {salvando ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar nova senha"
            )}
          </button>
        </form>

        <p className="text-[12px] text-gray-500 text-center mt-6">
          Após salvar, você será deslogado e poderá entrar com a nova senha.
        </p>
      </div>
    </div>
  );
}
