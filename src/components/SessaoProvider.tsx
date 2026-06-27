"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// SessaoProvider — sessão do paciente/dentista + MURO DE LOGIN (igual ao site k11).
//
// Centraliza:
//   • o estado de quem está logado (user + papel pro/superuser);
//   • os MODAIS de login (paciente Google / dentista e-mail-senha / recuperação);
//   • o "muro de login": qualquer componente pode chamar `pedirLoginPaciente()` para,
//     se o usuário NÃO estiver logado, capturar a geolocalização (best-effort) e abrir
//     o login com Google — exatamente como o k11 faz na busca, localização, CTA de
//     especialidade e contato do perfil.
//
// Uso: `const { user, carregando, pedirLoginPaciente, abrirModalDentista } = useSessao();`
// ═══════════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff, ChevronRight } from "lucide-react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { resolveLoginEmail } from "@/lib/superuser";
import { sairConta } from "@/lib/conta-acoes";

interface UsuarioSessao {
  id: string;
  email: string | null;
  nome: string | null;
  foto: string | null; // foto do Google (avatar) quando disponível
  ehPro: boolean;
  ehSuper: boolean;
}

interface SessaoCtx {
  user: UsuarioSessao | null;
  carregando: boolean;
  /** Se logado, retorna true (siga a ação). Se não, captura geoloc + abre login Google e retorna false. */
  pedirLoginPaciente: () => boolean;
  abrirModalDentista: () => void;
  sair: () => Promise<void>;
}

const Ctx = createContext<SessaoCtx | null>(null);

export function useSessao() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSessao precisa estar dentro de <SessaoProvider>");
  return c;
}

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

export default function SessaoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [modal, setModal] = useState<null | "paciente" | "dentista">(null);
  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modoRecovery, setModoRecovery] = useState(false);
  const [emailRecovery, setEmailRecovery] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  // Página onde o usuário estava ao pedir login (para voltar exatamente pra ela
  // após o Google). Capturada no clique; usada no redirectTo do OAuth.
  const proximaUrlRef = useRef<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── Estado de login VINDO DO SERVIDOR (/api/me) ─────────────────────────────
  // Antes líamos o cookie de sessão direto no cliente (exigia httpOnly:false) e
  // checávamos "é dentista?" por REST cru com o token. Agora pedimos ao servidor
  // via /api/me, que lê a sessão httpOnly (cookies()) e devolve {nome,foto,ehPro,
  // ehSuper} já resolvido — sem token no cliente e compatível com httpOnly:true.
  useEffect(() => {
    let ativo = true;
    // Otimista: mostra o último login conhecido (só nome/foto/papel — NUNCA o token)
    // para não piscar "Entrar" enquanto /api/me responde; /api/me confirma/corrige.
    try {
      const cache = localStorage.getItem("cd_user");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (cache) setUser(JSON.parse(cache) as UsuarioSessao);
    } catch { /* ignore */ }

    async function sincronizar() {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const data = (await r.json()) as { user: UsuarioSessao | null };
        if (!ativo) return;
        setUser(data.user ?? null);
        try {
          if (data.user) localStorage.setItem("cd_user", JSON.stringify(data.user));
          else localStorage.removeItem("cd_user");
        } catch { /* ignore */ }
      } catch {
        if (ativo) setUser(null);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    sincronizar();
    // Re-checa ao voltar o foco e quando login/logout dispara o evento.
    const onAuth = () => sincronizar();
    window.addEventListener("focus", onAuth);
    window.addEventListener("curadentes:auth", onAuth);
    return () => {
      ativo = false;
      window.removeEventListener("focus", onAuth);
      window.removeEventListener("curadentes:auth", onAuth);
    };
  }, []);

  function fecharModal() {
    setModal(null); setEmailLogin(""); setSenhaLogin(""); setMostrarSenha(false);
    setModoRecovery(false); setEmailRecovery(""); setErro(""); setAviso("");
    setOcupado(false);
  }

  // Reset à PROVA DE FLUXO: sempre que um modal ABRE, garante o botão clicável. Resetar
  // só em cada handler (fecharModal/abrir/pedir) era frágil — um login bem-sucedido
  // chama fecharModal e em seguida navega (router.replace+refresh); como o
  // SessaoProvider fica no layout raiz e NÃO remonta entre navegações, o `ocupado=true`
  // conseguia ficar pendurado e o botão reabria preso em "Entrando…" (logout → reabrir).
  // Reload (Ctrl+Shift+R) limpava porque remontava o provider. Zerar na ABERTURA cobre
  // qualquer caminho. Keyed em `modal`: não dispara durante um login em andamento (o
  // modal não muda enquanto está aberto). erro/aviso já são limpos pelos handlers.
  useEffect(() => {
    if (!modal) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset síncrono na abertura é intencional (1 render extra, só ao abrir o modal)
    setOcupado(false);
  }, [modal]);

  // Acessibilidade dos modais de login: ao abrir, foca o diálogo; fecha no Esc;
  // aprisiona o Tab dentro do modal (não vaza para a página de trás); e devolve o
  // foco ao elemento que estava ativo antes (WCAG 2.1.2 / 2.4.3 / 4.1.2).
  useEffect(() => {
    if (!modal) return;
    const node = modalRef.current;
    const anterior = document.activeElement as HTMLElement | null;
    node?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { fecharModal(); return; }
      if (e.key !== "Tab" || !node) return;
      const foco = node.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (foco.length === 0) return;
      const primeiro = foco[0];
      const ultimo = foco[foco.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      anterior?.focus?.();
    };
    // Deps só [modal]: re-rodar a cada render re-focaria o diálogo. fecharModal só
    // chama setters (estáveis), então o closure capturado na abertura é suficiente.
  }, [modal]);

  // Captura a geolocalização (best-effort) ANTES de abrir o Google, igual ao k11 —
  // guarda em sessionStorage para o AuthListener salvar no perfil após o login.
  function capturarCoordsEntao(cb: () => void) {
    if (!navigator.geolocation) { cb(); return; }
    // Best-effort: NUNCA pode bloquear o login. No Chrome o `timeout` do
    // getCurrentPosition NÃO conta enquanto o prompt de permissão está aberto —
    // se o usuário ignora/demora no prompt, o callback nunca dispara e o login
    // travava (botão "Continuar com Google" preso em disabled). Por isso
    // garantimos que `cb()` SEMPRE roda dentro de ~3,5s, com ou sem coordenadas.
    let feito = false;
    const seguir = () => { if (!feito) { feito = true; cb(); } };
    const limite = setTimeout(seguir, 3500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          sessionStorage.setItem("curadentes_login_coords", JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        } catch { /* ignore */ }
        clearTimeout(limite); seguir();
      },
      () => { clearTimeout(limite); seguir(); },
      { timeout: 3000, enableHighAccuracy: false },
    );
  }

  function entrarComGoogle() {
    setErro(""); setOcupado(true);
    // Captura a geolocalização (best-effort, igual k11) e SÓ ENTÃO abre o Google.
    capturarCoordsEntao(async () => {
      try {
        const supabase = criarClienteNavegador();
        // Volta para a página onde o usuário estava — via COOKIE (não query), para
        // a redirectTo ser EXATAMENTE a URL registrada na allow-list do Supabase.
        const destino = proximaUrlRef.current;
        if (destino) {
          document.cookie = `cd_next=${encodeURIComponent(destino)}; path=/; max-age=600; samesite=lax`;
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) { setErro("Não foi possível entrar com o Google. Tente novamente."); setOcupado(false); }
      } catch { setErro("Não foi possível entrar com o Google. Tente novamente."); setOcupado(false); }
    });
  }

  // API pública do muro de login.
  function pedirLoginPaciente(): boolean {
    if (user) return true;
    // Guarda a página atual (com query) para voltar pra ela depois do Google.
    if (typeof window !== "undefined") {
      proximaUrlRef.current = window.location.pathname + window.location.search;
    }
    setErro("");
    setOcupado(false); // garante o botão clicável ao (re)abrir o modal
    setModal("paciente");
    return false;
  }
  function abrirModalDentista() {
    if (user?.ehSuper) { router.push("/pro/dashboard-analytics"); return; }
    if (user?.ehPro) { router.push("/pro/dashboard"); return; }
    setErro(""); setOcupado(false); setModal("dentista"); // ocupado=false: botão sempre clicável ao abrir
  }

  async function loginDentista(e?: FormEvent) {
    e?.preventDefault();
    setErro("");
    if (!emailLogin.trim() || !senhaLogin) { setErro("Preencha email e senha."); return; }
    setOcupado(true);
    try {
      // Login no SERVIDOR (o signInWithPassword do navegador trava). A rota grava
      // os cookies de sessão; aqui só navegamos para o painel.
      const r = await fetch("/auth/login-dentista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailLogin, password: senhaLogin }),
      });
      const data = (await r.json().catch(() => ({}))) as { ok?: boolean; redirect?: string; erro?: string };
      if (!r.ok || !data.ok) { setErro(data.erro || "Email ou senha incorretos."); setOcupado(false); return; }
      fecharModal();
      window.dispatchEvent(new Event("curadentes:auth"));
      router.replace(data.redirect || "/pro/dashboard");
      router.refresh();
    } catch { setErro("Não foi possível entrar agora. Tente novamente."); setOcupado(false); }
  }

  async function recuperarSenha(e?: FormEvent) {
    e?.preventDefault();
    setErro(""); setAviso("");
    if (!emailRecovery.trim()) { setErro("Informe seu e-mail."); return; }
    setOcupado(true);
    try {
      const supabase = criarClienteNavegador();
      const { error } = await supabase.auth.resetPasswordForEmail(resolveLoginEmail(emailRecovery), {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
      setOcupado(false);
      if (error) { setErro("Não foi possível enviar o e-mail. Verifique o endereço e tente de novo."); return; }
      setAviso("Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.");
    } catch { setOcupado(false); setErro("Não foi possível enviar o e-mail. Tente novamente."); }
  }

  async function sair() {
    // Logout NO SERVIDOR: o signOut limpa os cookies de sessão server-side, o que passa
    // a funcionar com httpOnly:true (o cliente não consegue mais apagar o cookie).
    await sairConta();
    setUser(null);
    try {
      localStorage.removeItem("cd_user");
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") window.dispatchEvent(new Event("curadentes:auth"));
    router.replace("/");
    router.refresh();
  }

  return (
    <Ctx.Provider value={{ user, carregando, pedirLoginPaciente, abrirModalDentista, sair }}>
      {children}

      {/* ── Modal paciente (Google) ── */}
      {modal === "paciente" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(6px)" }} onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-paciente-titulo" className="flex w-full max-w-[400px] flex-col gap-5 rounded-[24px] p-7 outline-none" style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.20)" }}>
            <div className="flex items-center justify-between">
              <h2 id="modal-paciente-titulo" className="text-[20px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>Entrar</h2>
              <button onClick={fecharModal} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5" style={{ color: "#8E8E93" }} aria-label="Fechar"><X size={18} /></button>
            </div>
            <p className="text-[14px]" style={{ color: "#8E8E93", lineHeight: 1.6 }}>Acesse sua conta para buscar, favoritar e avaliar dentistas perto de você.</p>
            {erro && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-center text-[13px] text-danger">{erro}</p>}
            <button onClick={entrarComGoogle} disabled={ocupado} className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-[14px] py-3.5 text-[15px] font-semibold transition-colors hover:bg-black/[0.03] disabled:opacity-60" style={{ background: "#fff", border: "1.5px solid rgba(60,60,67,0.18)", color: "#1C1C1E", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <GoogleIcon /> Continuar com Google
            </button>
            <p className="text-center text-[12px]" style={{ color: "#8E8E93", lineHeight: 1.6 }}>
              Ao entrar, você concorda com nossos <Link href="/termos" className="underline" style={{ color: "#007AFF" }}>Termos de Uso</Link> e <Link href="/privacidade" className="underline" style={{ color: "#007AFF" }}>Política de Privacidade</Link>.
            </p>
          </div>
        </div>
      )}

      {/* ── Modal dentista ── */}
      {modal === "dentista" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(6px)" }} onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Acesso do dentista" className="flex w-full max-w-[420px] flex-col gap-5 rounded-[24px] p-7 outline-none" style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.20)" }}>
            <div className="flex items-center justify-between">
              <Image src="/logos/logo-pro.png" alt="CuraDentes Pro" width={2480} height={926} className="h-7 w-auto" />
              <button onClick={fecharModal} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5" style={{ color: "#8E8E93" }} aria-label="Fechar"><X size={18} /></button>
            </div>
            {erro && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-center text-[13px] text-danger">{erro}</p>}
            {aviso && <p role="alert" className="rounded-lg bg-success/10 px-3 py-2 text-center text-[13px] text-success">{aviso}</p>}
            {modoRecovery ? (
              <form onSubmit={recuperarSenha} className="flex flex-col gap-3">
                <p className="text-[14px]" style={{ color: "#8E8E93" }}>Digite seu e-mail cadastrado para receber um link de redefinição de senha.</p>
                <div>
                  <label htmlFor="recuperar-email" className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#3A3A3C" }}>E-mail</label>
                  <input id="recuperar-email" type="email" value={emailRecovery} onChange={(e) => setEmailRecovery(e.target.value)} placeholder="seu@email.com.br" className="w-full rounded-[12px] px-4 py-3 text-[15px] outline-none" style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E" }} />
                </div>
                <button type="submit" disabled={ocupado} className="min-h-[48px] w-full rounded-[14px] py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50" style={{ background: "#0A2A66", boxShadow: "0 4px 16px rgba(10,42,102,0.25)" }}>{ocupado ? "Enviando…" : "Enviar Link de Recuperação"}</button>
                <button type="button" onClick={() => { setModoRecovery(false); setEmailRecovery(""); setErro(""); setAviso(""); }} className="mt-1 text-center text-[13px] font-semibold" style={{ color: "#007AFF" }}>Voltar para o Login</button>
              </form>
            ) : (
              <form onSubmit={loginDentista} className="flex flex-col gap-3">
                <p className="text-[14px]" style={{ color: "#8E8E93" }}>Acesse o painel exclusivo para profissionais.</p>
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#3A3A3C" }}>E-mail</label>
                  <input id="login-email" type="email" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} placeholder="seu@email.com.br" autoComplete="email" className="w-full rounded-[12px] px-4 py-3 text-[15px] outline-none" style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E" }} />
                </div>
                <div>
                  <label htmlFor="login-senha" className="mb-1.5 block text-[13px] font-semibold" style={{ color: "#3A3A3C" }}>Senha</label>
                  <div className="relative">
                    <input id="login-senha" type={mostrarSenha ? "text" : "password"} value={senhaLogin} onChange={(e) => setSenhaLogin(e.target.value)} placeholder="Sua senha" autoComplete="current-password" className="w-full rounded-[12px] px-4 py-3 text-[15px] outline-none" style={{ border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E", paddingRight: "48px" }} />
                    <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8E8E93" }} aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>{mostrarSenha ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </div>
                </div>
                <button type="submit" disabled={ocupado} className="min-h-[48px] w-full rounded-[14px] py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50" style={{ background: "#0A2A66", boxShadow: "0 4px 16px rgba(10,42,102,0.25)" }}>{ocupado ? "Entrando…" : "Entrar no Painel"}</button>
                <button type="button" onClick={() => { setModoRecovery(true); setErro(""); setAviso(""); }} className="min-h-[48px] w-full rounded-[14px] py-3 text-[15px] font-semibold transition-colors" style={{ background: "rgba(10,42,102,0.06)", color: "#0A2A66", border: "1px solid rgba(10,42,102,0.15)" }}>Esqueci a senha</button>
              </form>
            )}
            <div className="flex items-center gap-3">
              <div style={{ flex: 1, height: "0.5px", background: "rgba(60,60,67,0.15)" }} />
              <span className="text-[12px]" style={{ color: "#8E8E93" }}>ou</span>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(60,60,67,0.15)" }} />
            </div>
            <button onClick={() => { fecharModal(); router.push("/cadastro"); }} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] py-3 text-[15px] font-semibold transition-colors" style={{ background: "rgba(230,0,76,0.06)", color: "#E6004C", border: "1px solid rgba(230,0,76,0.20)" }}>Criar conta <ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
