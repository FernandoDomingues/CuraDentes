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
// paridade com o login) → signOut → manda para /entrar.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { forcaSenha, senhaValida } from "@/lib/senha";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [temSessao, setTemSessao] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  // Confere se há sessão (criada pelo callback do link de recuperação).
  useEffect(() => {
    const supabase = criarClienteNavegador();
    supabase.auth.getUser().then(({ data: { user } }) => setTemSessao(!!user));
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
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setErro("Não foi possível salvar a nova senha. O link pode ter expirado.");
      setOcupado(false);
      return;
    }
    // Reativa a conta se estava em soft-delete (paridade com o login por senha).
    const { error: rErr } = await supabase.rpc("restaurar_minha_conta_dentista");
    if (rErr) console.warn("[redefinir-senha] restaurar conta:", rErr.message);

    // Encerra a sessão de recuperação (com fallback local) e vai para o login.
    try {
      const { error: sErr } = await supabase.auth.signOut();
      if (sErr) await supabase.auth.signOut({ scope: "local" });
    } catch {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* ignora — a sessão será descartada na navegação */
      }
    }
    setOk(true);
    setTimeout(() => router.replace("/entrar"), 1800);
  }

  const forca = forcaSenha(senha);

  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-12">
      <div className="w-full max-w-[380px] rounded-3xl border border-black/8 bg-white p-7 shadow-[0_16px_48px_rgba(10,42,102,0.10)]">
        <h1 className="text-xl font-bold text-brand-navy">Criar nova senha</h1>

        {temSessao === false && (
          <p className="mt-3 text-sm text-ink-soft">
            Este link é inválido ou expirou. Volte ao login e peça um novo e-mail de
            redefinição.
          </p>
        )}

        {temSessao && !ok && (
          <form onSubmit={salvar} className="mt-5 flex flex-col gap-3">
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Nova senha (mín. 8 caracteres)"
              autoComplete="new-password"
              className="w-full rounded-[14px] border border-black/15 px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
            />
            {senha && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(forca.nivel / 4) * 100}%`, background: forca.cor }} />
                </div>
                <span className="text-xs text-ink-muted">{forca.rotulo}</span>
              </div>
            )}
            <input
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              placeholder="Confirmar nova senha"
              autoComplete="new-password"
              className="w-full rounded-[14px] border border-black/15 px-4 py-3 text-[15px] outline-none focus:border-brand-blue"
            />
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <button
              type="submit"
              disabled={ocupado || !senhaValida(senha) || senha !== confirma}
              className="mt-1 w-full rounded-[14px] bg-brand-blue py-3 text-[15px] font-bold text-white transition-colors hover:bg-brand-blue-600 disabled:opacity-50"
            >
              {ocupado ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        )}

        {ok && (
          <p className="mt-4 rounded-lg bg-success/10 px-3 py-3 text-sm text-success">
            Senha alterada! Redirecionando para o login…
          </p>
        )}

        {temSessao === null && <p className="mt-4 text-sm text-ink-muted">Carregando…</p>}
      </div>
    </Container>
  );
}
