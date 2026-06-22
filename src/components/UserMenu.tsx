"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// UserMenu — ilha de autenticação do cabeçalho (lado direito).
//
// É um Componente Cliente para NÃO tornar as páginas públicas dinâmicas: o resto
// do Header continua estático/SSR, e só este pedacinho reage ao login (lendo a
// sessão dos cookies via cliente do navegador). Mostra:
//   • deslogado  → "Entrar" + "Acesso do Dentista"
//   • logado     → nome + menu (Painel, se dentista/superuser; Sair)
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { isSuperuserEmail } from "@/lib/superuser";
import { encerrarSessao } from "@/lib/encerrar-sessao";

interface Estado {
  carregando: boolean;
  nome: string | null;
  ehPro: boolean; // dentista → "Painel do dentista"
  ehSuper: boolean; // superuser → "Painel administrativo"
}

export default function UserMenu() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ carregando: true, nome: null, ehPro: false, ehSuper: false });

  useEffect(() => {
    const supabase = criarClienteNavegador();
    let ativo = true;

    async function sincronizar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!ativo) return;
      if (!user) {
        setEstado({ carregando: false, nome: null, ehPro: false, ehSuper: false });
        return;
      }
      const meta = (user.user_metadata ?? {}) as { full_name?: string };
      if (isSuperuserEmail(user.email)) {
        setEstado({ carregando: false, nome: "SuperDom", ehPro: false, ehSuper: true });
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
        carregando: false,
        nome: dent?.nome || meta.full_name || user.email || "Minha conta",
        ehPro: !!dent,
        ehSuper: false,
      });
    }

    sincronizar();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => sincronizar());
    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function sair() {
    const supabase = criarClienteNavegador();
    await encerrarSessao(supabase);
    setEstado({ carregando: false, nome: null, ehPro: false, ehSuper: false });
    router.replace("/");
    router.refresh();
  }

  // Enquanto carrega, não pisca botão nenhum (evita "flash" de Entrar→logado).
  if (estado.carregando) {
    return <div className="h-[44px] w-[120px]" aria-hidden="true" />;
  }

  if (!estado.nome) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/entrar"
          className="min-h-[44px] rounded-xl px-4 py-2 text-[15px] font-medium text-ink transition-colors hover:text-brand-blue"
        >
          Entrar
        </Link>
        <Link
          href="/entrar"
          className="min-h-[44px] rounded-[14px] bg-brand-magenta px-5 py-3 text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(230,0,76,0.28)] transition-colors hover:bg-brand-magenta-700"
        >
          Acesso do Dentista
        </Link>
      </div>
    );
  }

  const primeiroNome = estado.nome.split(" ")[0];
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
