"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// FORMULÁRIO DE LOGIN (cliente).
//
// Três modos num card só:
//   • paciente  → "Entrar com Google" (OAuth → /auth/callback)
//   • dentista  → e-mail + senha (signInWithPassword; aceita "SuperDom")
//   • recuperar → envia e-mail de redefinição (resetPasswordForEmail)
//
// Usa o cliente do NAVEGADOR (@supabase/ssr) para a sessão viver em cookies. Após
// o login por senha, o servidor já enxerga a sessão; mandamos para /pro/dashboard.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { resolveLoginEmail, isSuperuserEmail } from "@/lib/superuser";

type Modo = "paciente" | "dentista" | "recuperar";

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

export default function EntrarForm() {
  const router = useRouter();
  const supabase = criarClienteNavegador();

  const [modo, setModo] = useState<Modo>("paciente");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function entrarComGoogle() {
    setErro("");
    setOcupado(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErro("Não foi possível entrar com o Google. Tente novamente.");
      setOcupado(false);
    }
    // Sucesso: o navegador é redirecionado para o Google.
  }

  async function entrarComEmail(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (!email.trim() || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    setOcupado(true);
    const emailResolvido = resolveLoginEmail(email);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailResolvido,
      password: senha,
    });
    if (error) {
      setErro("E-mail ou senha incorretos.");
      setOcupado(false);
      return;
    }
    // Reativa a conta se estava em soft-delete (parity com o site-k11).
    // O supabase-js NÃO lança em erro de RPC — devolve { error }; por isso
    // inspecionamos o retorno e só logamos (o login segue de qualquer forma).
    if (!isSuperuserEmail(emailResolvido)) {
      try {
        const { error: rErr } = await supabase.rpc("restaurar_minha_conta_dentista");
        if (rErr) console.warn("[entrar] restaurar conta:", rErr.message);
      } catch (err) {
        console.warn("[entrar] restaurar conta (exceção):", err);
      }
    }
    // Sessão gravada nos cookies → o servidor já reconhece. Vai para o painel.
    router.replace("/pro/dashboard");
    router.refresh();
  }

  async function enviarRecuperacao(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setAviso("");
    if (!email.trim()) {
      setErro("Informe seu e-mail.");
      return;
    }
    setOcupado(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resolveLoginEmail(email), {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    setOcupado(false);
    if (error) {
      setErro("Não foi possível enviar o e-mail. Verifique o endereço e tente de novo.");
      return;
    }
    setAviso("Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.");
  }

  const ehDentista = modo === "dentista" || modo === "recuperar";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gradient-to-b from-brand-soft to-white px-5 py-10">
      <div className="flex w-full max-w-[380px] flex-col items-center rounded-3xl border border-black/8 bg-white p-7 shadow-[0_16px_48px_rgba(10,42,102,0.10)]">
        <Image
          src={ehDentista ? "/logos/logo-pro.png" : "/logos/logo-com-nome.png"}
          alt={ehDentista ? "CuraDentes Pro" : "CuraDentes"}
          width={2480}
          height={926}
          priority
          className="mb-5 h-12 w-auto"
        />

        {modo === "paciente" && (
          <>
            <h1 className="text-xl font-bold text-brand-navy">Bem-vindo</h1>
            <p className="mt-1 mb-6 text-center text-sm leading-relaxed text-ink-soft">
              Entre para encontrar e avaliar os melhores dentistas perto de você.
            </p>
            {erro && <p className="mb-3 w-full rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">{erro}</p>}
            <button
              onClick={entrarComGoogle}
              disabled={ocupado}
              className="flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-black/15 bg-white py-3 text-[15px] font-semibold text-ink-soft transition-colors hover:bg-black/3 disabled:opacity-60"
            >
              <GoogleIcon />
              Entrar com Google
            </button>
            <button
              onClick={() => { setModo("dentista"); setErro(""); }}
              className="mt-6 text-sm font-semibold text-brand-blue hover:underline"
            >
              Acesso para dentistas
            </button>
          </>
        )}

        {modo === "dentista" && (
          <>
            <h1 className="text-xl font-bold text-brand-navy">Acesso do Dentista</h1>
            <p className="mt-1 mb-6 text-center text-sm leading-relaxed text-ink-soft">
              Entre com o e-mail e a senha cadastrados no CuraDentes Pro.
            </p>
            {erro && <p className="mb-3 w-full rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">{erro}</p>}
            <form onSubmit={entrarComEmail} className="flex w-full flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full rounded-[14px] border border-black/15 px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
              />
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className="w-full rounded-[14px] border border-black/15 px-4 py-3 pr-11 text-[15px] outline-none focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted"
                >
                  {mostrarSenha ? "ocultar" : "ver"}
                </button>
              </div>
              <button
                type="submit"
                disabled={ocupado}
                className="mt-1 w-full rounded-[14px] bg-brand-blue py-3 text-[15px] font-bold text-white transition-colors hover:bg-brand-blue-600 disabled:opacity-60"
              >
                {ocupado ? "Entrando…" : "Entrar"}
              </button>
            </form>
            <div className="mt-5 flex w-full items-center justify-between text-sm">
              <button onClick={() => { setModo("paciente"); setErro(""); }} className="font-semibold text-ink-muted hover:text-ink">
                ← Voltar
              </button>
              <button onClick={() => { setModo("recuperar"); setErro(""); }} className="font-semibold text-brand-blue hover:underline">
                Esqueci a senha
              </button>
            </div>
          </>
        )}

        {modo === "recuperar" && (
          <>
            <h1 className="text-xl font-bold text-brand-navy">Redefinir senha</h1>
            <p className="mt-1 mb-6 text-center text-sm leading-relaxed text-ink-soft">
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
            {erro && <p className="mb-3 w-full rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">{erro}</p>}
            {aviso && <p className="mb-3 w-full rounded-lg bg-success/10 px-3 py-2 text-center text-sm text-success">{aviso}</p>}
            <form onSubmit={enviarRecuperacao} className="flex w-full flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full rounded-[14px] border border-black/15 px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
              />
              <button
                type="submit"
                disabled={ocupado}
                className="mt-1 w-full rounded-[14px] bg-brand-navy py-3 text-[15px] font-bold text-white transition-colors hover:bg-brand-navy-700 disabled:opacity-60"
              >
                {ocupado ? "Enviando…" : "Enviar link de recuperação"}
              </button>
            </form>
            <button onClick={() => { setModo("dentista"); setErro(""); setAviso(""); }} className="mt-5 text-sm font-semibold text-ink-muted hover:text-ink">
              ← Voltar para o login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
