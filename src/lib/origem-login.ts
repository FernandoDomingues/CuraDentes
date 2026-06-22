// ═══════════════════════════════════════════════════════════════════════════════
// Detecta a ORIGEM de um login para o analytics (tabela logs_login).
//
// Rótulo `origem` (o que aparece no gráfico):
//   - Celular no navegador → "Android" / "iOS"
//   - Desktop              → nome do navegador (Chrome, Edge, Firefox, Safari, Opera, Outro)
//
// Roda no navegador (usa `navigator`). O app nativo (Capacitor → "App Android"/"App iOS")
// entra na Fase 3; por ora `is_app` é sempre false.
// ═══════════════════════════════════════════════════════════════════════════════

export interface OrigemLogin {
  origem: string;
  plataforma: "desktop" | "android" | "ios" | "outro";
  navegador: string;
  is_app: boolean;
  user_agent: string;
}

/** Identifica o navegador (ordem importa: Edge/Opera antes de Chrome). */
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
  const maxTouch = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;

  const isAndroid = /Android/i.test(ua);
  // iPadOS moderno se passa por "Macintosh" com touch.
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouch > 1);

  if (isAndroid) return { origem: "Android", plataforma: "android", navegador: detectarNavegador(ua), is_app: false, user_agent: ua };
  if (isIOS) return { origem: "iOS", plataforma: "ios", navegador: detectarNavegador(ua), is_app: false, user_agent: ua };

  const nav = detectarNavegador(ua);
  return { origem: nav, plataforma: "desktop", navegador: nav, is_app: false, user_agent: ua };
}
