// ═══════════════════════════════════════════════════════════════════════════════
// INSTAGRAM — extrai o username e monta a URL canônica.
// Guardamos a URL completa no banco; o usuário só vê/edita o @usuário.
// Portado do site-k11, sem mudança de comportamento.
// ═══════════════════════════════════════════════════════════════════════════════

const INSTAGRAM_BASE = "https://www.instagram.com/";

/** Extrai só o username de uma URL ou handle ("@user", "instagram.com/user", "user"). */
export function extrairUserInstagram(input: string): string {
  if (!input) return "";
  let v = input.trim();
  if (!v) return "";
  if (v.startsWith("@")) v = v.slice(1);
  if (v.startsWith("http://") || v.startsWith("https://")) {
    try {
      const url = new URL(v);
      if (!url.hostname.replace("www.", "").startsWith("instagram.com")) return "";
      return url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    } catch {
      return "";
    }
  }
  if (v.includes("instagram.com")) {
    const m = v.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)/);
    return m ? m[1] : "";
  }
  if (/^[a-zA-Z0-9_.-]+$/.test(v)) return v;
  return "";
}

/** URL canônica a partir do username, ou null se inválido. */
export function formatarInstagram(user: string): string | null {
  if (!user) return null;
  const u = extrairUserInstagram(user);
  if (!u) return null;
  return INSTAGRAM_BASE + u;
}

export { INSTAGRAM_BASE };
