"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// UserMenu — ilha de autenticação do cabeçalho (lado direito).
//
// Componente Cliente: reage ao login lendo a sessão dos cookies. Mostra:
//   • deslogado  → "Entrar" + "Acesso do Dentista"
//   • logado     → nome + menu (Painel, se dentista/superuser; Sair)
//
// Aceita `variant`:
//   • "desktop" (padrão) → layout horizontal, dropdown de perfil
//   • "mobile"           → botões empilhados full-width / bloco de perfil
//                          (idêntico à gaveta mobile do site antigo)
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { isSuperuserEmail } from "@/lib/superuser";
import { encerrarSessao } from "@/lib/encerrar-sessao";

interface Estado {
  nome: string | null;
  ehPro: boolean; // dentista → "Painel do dentista"
  ehSuper: boolean; // superuser → "Painel administrativo"
}

export default function UserMenu({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const router = useRouter();
  // Começa SEMPRE como "deslogado": isso renderiza os botões Entrar/Acesso já no
  // HTML do servidor, então eles aparecem na hora. Se houver sessão, o efeito
  // abaixo troca para o menu de perfil. (Pequeno "flash" para quem está logado —
  // aceitável, já que a maioria das visitas no cabeçalho público é deslogada.)
  const [estado, setEstado] = useState<Estado>({ nome: null, ehPro: false, ehSuper: false });

  useEffect(() => {
    let ativo = true;

    async function sincronizar() {
      try {
        const supabase = criarClienteNavegador();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!ativo) return;
        if (!user) {
          setEstado({ nome: null, ehPro: false, ehSuper: false });
          return;
        }
        const meta = (user.user_metadata ?? {}) as { full_name?: string };
        if (isSuperuserEmail(user.email)) {
          setEstado({ nome: "SuperDom", ehPro: false, ehSuper: true });
          return;
        }
        const { data: dent } = await supabase
          .from("curadentespro")
          .select("nome")
          .eq("id", user.id)
          .is("deleted_at", null)
          .maybeSingle<{ nome: string | null }>();
        if (!ativo) return;
        setEstado({
          nome: dent?.nome || meta.full_name || user.email || "Minha conta",
          ehPro: !!dent,
          ehSuper: false,
        });
      } catch {
        // Falha ao checar sessão → mantém deslogado (botões continuam visíveis).
        if (ativo) setEstado({ nome: null, ehPro: false, ehSuper: false });
      }
    }

    sincronizar();
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const supabase = criarClienteNavegador();
      subscription = supabase.auth.onAuthStateChange(() => sincronizar()).data.subscription;
    } catch {
      /* sem realtime de auth — tudo bem, o estado inicial já mostra os botões */
    }
    return () => {
      ativo = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function sair() {
    const supabase = criarClienteNavegador();
    await encerrarSessao(supabase);
    setEstado({ nome: null, ehPro: false, ehSuper: false });
    router.replace("/");
    router.refresh();
  }

  const ehMobile = variant === "mobile";

  // ── Deslogado (estado inicial — botões sempre visíveis) ─────────────────────
  if (!estado.nome) {
    if (ehMobile) {
      return (
        <div className="mt-3 flex flex-col gap-2">
          <Link
            href="/entrar"
            className="min-h-[48px] w-full rounded-[14px] border py-3 text-center text-[15px] font-medium"
            style={{ borderColor: "rgba(60,60,67,0.18)", color: "#1C1C1E" }}
          >
            Entrar
          </Link>
          <Link
            href="/entrar?modo=dentista"
            className="min-h-[48px] w-full rounded-[14px] py-3 text-center text-[15px] font-semibold text-white"
            style={{ background: "#E6004C", boxShadow: "0 4px 12px rgba(230,0,76,0.25)" }}
          >
            Acesso do Dentista
          </Link>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/entrar"
          className="min-h-[44px] rounded-xl px-4 py-2 text-[15px] font-medium text-ink transition-colors hover:text-brand-blue"
        >
          Entrar
        </Link>
        <Link
          href="/entrar?modo=dentista"
          className="min-h-[44px] rounded-[14px] bg-brand-magenta px-5 py-3 text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(230,0,76,0.28)] transition-colors hover:bg-brand-magenta-700"
        >
          Acesso do Dentista
        </Link>
      </div>
    );
  }

  // ── Logado ─────────────────────────────────────────────────────────────────
  const primeiroNome = estado.nome.split(" ")[0];

  if (ehMobile) {
    return (
      <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue/10 text-base font-bold text-brand-blue">
            {primeiroNome.charAt(0).toUpperCase()}
          </span>
          <p className="min-w-0 truncate text-[14px] font-bold text-gray-900">{estado.nome}</p>
        </div>
        {estado.ehSuper && (
          <Link href="/pro/dashboard-analytics" className="min-h-[44px] rounded-[12px] bg-white px-3 py-2 text-[14px] font-semibold text-ink">
            Painel administrativo
          </Link>
        )}
        {estado.ehPro && (
          <Link href="/pro/dashboard" className="min-h-[44px] rounded-[12px] bg-white px-3 py-2 text-[14px] font-semibold text-ink">
            Painel do dentista
          </Link>
        )}
        <button
          onClick={sair}
          className="min-h-[44px] w-full rounded-[12px] border border-red-100 bg-red-50 py-2.5 text-center text-[14px] font-semibold text-red-500"
        >
          Sair da Conta
        </button>
      </div>
    );
  }

  return (
    <details className="group relative">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 hover:bg-black/5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/10 text-sm font-bold text-brand-blue">
          {primeiroNome.charAt(0).toUpperCase()}
        </span>
        <span className="text-[15px] font-semibold text-ink">{primeiroNome}</span>
      </summary>
      <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
        <p className="truncate px-3 py-1 text-xs text-ink-muted">{estado.nome}</p>
        <div className="my-1 h-px bg-black/10" />
        {estado.ehSuper && (
          <Link href="/pro/dashboard-analytics" className="flex min-h-[40px] items-center rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-black/5">
            Painel administrativo
          </Link>
        )}
        {estado.ehPro && (
          <Link href="/pro/dashboard" className="flex min-h-[40px] items-center rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-black/5">
            Painel do dentista
          </Link>
        )}
        <button
          onClick={sair}
          className="flex min-h-[40px] w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger/5"
        >
          Sair da conta
        </button>
      </div>
    </details>
  );
}
