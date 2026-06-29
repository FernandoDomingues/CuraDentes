"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// REDEFINIR SENHA — /redefinir-senha (Client Component).
//
// Fica FORA de /pro de propósito: o que protege esta página é a SESSÃO DE
// RECUPERAÇÃO criada pelo /auth/callback (link do e-mail → ?next=/redefinir-senha),
// não o papel do usuário. Se ficasse sob /pro, um dentista com conta em soft-delete
// (papel rebaixado a "paciente") seria expulso pelo guard antes de redefinir a
// senha — bug pego no review de segurança.
//
// Ao salvar a nova senha: updateUser → reativa a conta (se estava soft-deletada,
// paridade com o login) → signOut → manda para / (home, paridade com o k11).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { redefinirSenhaDentista } from "./acoes";
import { forcaSenha, senhaValida } from "@/lib/senha";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [temSessao, setTemSessao] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  // Confere se há sessão (criada pelo callback do link de recuperação) — lê no
  // servidor via /api/me (cookies httpOnly), não mais com o cliente do navegador.
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { user: unknown }) => setTemSessao(!!d.user))
      .catch(() => setTemSessao(false));
  }, []);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (!senhaValida(senha)) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setErro("As senhas não coincidem.");
      return;
    }
    setOcupado(true);
    const res = await redefinirSenhaDentista(senha);
    if (!res.ok) {
      setErro(res.erro || "Não foi possível salvar a nova senha. O link pode ter expirado.");
      setOcupado(false);
      return;
    }
    // Sessão de recuperação já encerrada no servidor; limpa o cache otimista do header.
    try {
      localStorage.removeItem("cd_user");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("curadentes:auth"));
    setOk(true);
    toast.success("Senha alterada com sucesso! Faça login novamente.");
    setTimeout(() => router.replace("/"), 1800);
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

  // ─── Tela de loading inicial (checando sessão) ────────────────────────────
  if (temSessao === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7]">
        <Loader2 className="animate-spin text-[#007AFF]" size={32} />
      </div>
    );
  }

  // ─── Link inválido / expirado / sessão não existe ────────────────────────
  if (!temSessao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] px-4">
        <div className="bg-white p-8 rounded-[20px] shadow-sm border border-gray-200 max-w-md w-full text-center">
          <img src="/logos/logo-pro.png" alt="CuraDentes Pro" className="h-10 mx-auto mb-6" />
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <Lock size={20} className="text-red-500" />
          </div>
          <h1 className="text-[20px] font-bold text-[#0A2A66] mb-2">Link inválido ou expirado</h1>
          <p className="text-[14px] text-gray-600 mb-6">
            O link de redefinição de senha é válido por tempo limitado e só pode ser usado uma vez.
            Solicite um novo link na sua área de perfil.
          </p>
          <button
            onClick={() => router.push("/pro/editar-perfil")}
            className="w-full py-3 rounded-[12px] font-semibold text-[15px] text-white transition-all"
            style={{ background: "#007AFF" }}
          >
            Ir para meu perfil
          </button>
        </div>
      </div>
    );
  }

  // ─── Sucesso ──────────────────────────────────────────────────────────────
  if (ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] px-4">
        <div className="bg-white p-8 rounded-[20px] shadow-sm border border-gray-200 max-w-md w-full text-center">
          <img src="/logos/logo-pro.png" alt="CuraDentes Pro" className="h-10 mx-auto mb-6" />
          <h1 className="text-[20px] font-bold text-[#0A2A66] mb-2">Senha alterada!</h1>
          <p className="text-[14px] text-gray-600">Redirecionando…</p>
        </div>
      </div>
    );
  }

  const forca = forcaSenha(senha);
  // nivel 1..4 (k11 usa forca 0..3); preenche os segmentos i (0..3) onde i < nivel.

  // ─── Formulário de nova senha ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] px-4 py-8">
      <div className="bg-white p-8 rounded-[20px] shadow-sm border border-gray-200 max-w-md w-full">
        <img src="/logos/logo-pro.png" alt="CuraDentes Pro" className="h-10 mx-auto mb-6" />

        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
          <Lock size={20} className="text-[#007AFF]" />
        </div>

        <h1 className="text-[22px] font-bold text-[#0A2A66] text-center mb-2">
          Defina sua nova senha
        </h1>
        <p className="text-[14px] text-gray-600 text-center mb-6">
          Escolha uma senha forte com pelo menos 8 caracteres.
        </p>

        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Nova senha</label>
            <div style={{ position: "relative" }}>
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={inputStyle}
                autoFocus
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%",
                  transform: "translateY(-50%)", background: "none", border: "none",
                  padding: 4, cursor: "pointer", color: "#8E8E93",
                }}
                tabIndex={-1}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Barra de força — 4 segmentos */}
            {senha.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: i < forca.nivel ? forca.cor : "#E5E5EA",
                        transition: "background 0.2s",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px]" style={{ color: forca.cor }}>
                  Força: {forca.rotulo}
                </p>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Confirmar nova senha</label>
            <input
              type={mostrarSenha ? "text" : "password"}
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              placeholder="Repita a senha"
              style={{
                ...inputStyle,
                borderColor: confirma && confirma !== senha ? "#FF3B30" : undefined,
              }}
              autoComplete="new-password"
            />
            {confirma && confirma !== senha && (
              <p className="text-[12px] mt-1" style={{ color: "#FF3B30" }}>
                As senhas não coincidem.
              </p>
            )}
          </div>

          {erro && (
            <p className="text-[12px]" style={{ color: "#FF3B30" }}>
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={ocupado || !senhaValida(senha) || senha !== confirma}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-[12px] font-semibold text-[15px] text-white transition-all disabled:opacity-50"
            style={{ background: "#007AFF" }}
          >
            {ocupado ? (
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
