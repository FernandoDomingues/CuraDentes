"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// AuthListener — registra a ORIGEM do login (1x por aba) e salva a localização do
// paciente quando ele aparece logado. NÃO lê mais a sessão no cliente: observa o
// `user` do SessaoProvider (que vem de /api/me) e dispara Server Actions (login-acoes)
// que usam o id da sessão. Refactor do C1 (httpOnly). Não renderiza nada.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from "react";
import { useSessao } from "./SessaoProvider";
import { detectarOrigemLogin } from "@/lib/origem-login";
import { reverseGeocodeCidadeBairro } from "@/lib/geocoding";
import { registrarOrigemLogin, salvarLocalizacaoLogin } from "@/lib/login-acoes";

const FLAG_LOGIN = "curadentes_login_logged";

export default function AuthListener() {
  const { user } = useSessao();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      // Logout: limpa o flag para que o próximo login volte a registrar a origem.
      try {
        sessionStorage.removeItem(FLAG_LOGIN);
      } catch {
        /* sessionStorage indisponível */
      }
      return;
    }

    // Logado: registra a origem do login 1x por aba (dedup via sessionStorage).
    try {
      if (!sessionStorage.getItem(FLAG_LOGIN)) {
        sessionStorage.setItem(FLAG_LOGIN, "1");
        void registrarOrigemLogin(detectarOrigemLogin());
      }
    } catch {
      /* sessionStorage indisponível */
    }

    // Se o muro de login capturou as coordenadas (sessionStorage), salva no perfil
    // (best-effort) e guarda a cidade p/ os CTAs "perto de você". Igual ao site k11.
    void (async () => {
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
        void salvarLocalizacaoLogin(latitude, longitude);
      } catch {
        /* best-effort */
      }
    })();
  }, [userId]);

  return null;
}
