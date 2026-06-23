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
import { reverseGeocodeCidadeBairro } from "@/lib/geocoding";

const FLAG_LOGIN = "curadentes_login_logged";

// Após o login, se o muro de login (SessaoProvider) capturou as coordenadas do
// usuário em sessionStorage ("curadentes_login_coords"), salva no perfil do cliente
// (best-effort) e guarda a cidade ("curadentes_user_city") para os CTAs que buscam
// "perto de você" (ex.: página de especialidade) — igual ao site k11.
async function salvarLocalizacaoLogin(userId: string | null) {
  try {
    const raw = sessionStorage.getItem("curadentes_login_coords");
    if (!raw) return;
    const { latitude, longitude } = JSON.parse(raw) as { latitude?: number; longitude?: number };
    if (typeof latitude !== "number" || typeof longitude !== "number") return;
    try {
      const { cidade } = await reverseGeocodeCidadeBairro(latitude, longitude);
      if (cidade) sessionStorage.setItem("curadentes_user_city", cidade);
    } catch {
      /* reverse-geocode best-effort */
    }
    if (userId) {
      const supabase = criarClienteNavegador();
      void supabase
        .from("clientes")
        .update({ latitude, longitude })
        .eq("id", userId)
        .then(({ error }) => {
          if (error) console.warn("[AuthListener] não salvou localização do login:", error.message);
        });
    }
  } catch (err) {
    console.warn("[AuthListener] salvarLocalizacaoLogin falhou:", err);
  }
}

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
        void salvarLocalizacaoLogin(session?.user.id ?? null);
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
