// ═══════════════════════════════════════════════════════════════════════════════
// Detecta a ORIGEM de um login para o analytics (tabela logs_login).
//
// Regra do rótulo `origem` (o que aparece no gráfico):
//   - App nativo (Capacitor)  → "App Android" / "App iOS"
//   - Celular no navegador    → "Android" / "iOS"
//   - Desktop                 → nome do navegador (Chrome, Edge, Firefox, Safari, Opera, Outro)
// ═══════════════════════════════════════════════════════════════════════════════

import { Capacitor } from "@capacitor/core";

export interface OrigemLogin {
  origem: string;
  plataforma: "desktop" | "android" | "ios" | "outro";
  navegador: string;
  is_app: boolean;
  user_agent: string;
}

/** Identifica o navegador a partir do user agent (ordem importa: Edge/Opera antes de Chrome). */
function detectarNavegador(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Outro";
}

export function detectarOrigemLogin(): OrigemLogin {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";

  // App nativo: a plataforma do Capacitor é a fonte confiável.
  if (Capacitor.isNativePlatform()) {
    const p = Capacitor.getPlatform();
    if (p === "android") return { origem: "App Android", plataforma: "android", navegador: "App", is_app: true, user_agent: ua };
    if (p === "ios") return { origem: "App iOS", plataforma: "ios", navegador: "App", is_app: true, user_agent: ua };
    return { origem: "App", plataforma: "outro", navegador: "App", is_app: true, user_agent: ua };
  }

  // Navegador: distingue celular (Android/iOS) de desktop.
  const isAndroid = /Android/i.test(ua);
  const maxTouch = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouch > 1); // iPadOS moderno se passa por Mac

  if (isAndroid) return { origem: "Android", plataforma: "android", navegador: detectarNavegador(ua), is_app: false, user_agent: ua };
  if (isIOS) return { origem: "iOS", plataforma: "ios", navegador: detectarNavegador(ua), is_app: false, user_agent: ua };

  const nav = detectarNavegador(ua);
  return { origem: nav, plataforma: "desktop", navegador: nav, is_app: false, user_agent: ua };
}
