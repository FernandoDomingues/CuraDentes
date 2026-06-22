"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// AuthListener — mantém o SERVIDOR em sincronia com o login do navegador.
//
// Montado no layout raiz. Escuta os eventos do Supabase Auth (no cliente) e:
//   • em SIGNED_IN / SIGNED_OUT → router.refresh() para o servidor re-ler a sessão
//     dos cookies e atualizar o header/áreas protegidas (sem F5);
//   • em SIGNED_IN → registra a ORIGEM do login em logs_login, UMA vez por aba
//     (dedup via sessionStorage), igual ao site-k11.
//
// Não renderiza nada (return null).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { detectarOrigemLogin } from "@/lib/origem-login";

const FLAG_LOGIN = "curadentes_login_logged";

function registrarLogin(userId: string | null) {
  try {
    if (sessionStorage.getItem(FLAG_LOGIN)) return;
    sessionStorage.setItem(FLAG_LOGIN, "1");
    const o = detectarOrigemLogin();
    const supabase = criarClienteNavegador();
    // fire-and-forget: não bloqueia nada.
    void supabase
      .from("logs_login")
      .insert({
        origem: o.origem,
        plataforma: o.plataforma,
        navegador: o.navegador,
        is_app: o.is_app,
        user_agent: o.user_agent,
        user_id: userId,
      })
      .then(({ error }) => {
        if (error) console.warn("[AuthListener] falha ao registrar origem do login:", error.message);
      });
  } catch (err) {
    console.warn("[AuthListener] registrarLogin falhou:", err);
  }
}

export default function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = criarClienteNavegador();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        registrarLogin(session?.user.id ?? null);
        router.refresh();
      } else if (event === "SIGNED_OUT") {
        try {
          sessionStorage.removeItem(FLAG_LOGIN);
        } catch {
          /* sessionStorage indisponível */
        }
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
