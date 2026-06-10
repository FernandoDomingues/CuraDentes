const INSTAGRAM_BASE = "https://www.instagram.com/";

/** Extrai apenas o nome de usuário de uma URL ou handle do Instagram.
 *  Ex: "https://instagram.com/user" → "user"
 *      "https://www.instagram.com/user/" → "user"
 *      "@user" → "user"
 *      "user" → "user"
 */
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
    } catch { return ""; }
  }
  if (v.includes("instagram.com")) {
    const m = v.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)/);
    return m ? m[1] : "";
  }
  if (/^[a-zA-Z0-9_.-]+$/.test(v)) return v;
  return "";
}

/** Concatena o username com a base e valida, ou retorna null se inválido. */
export function formatarInstagram(user: string): string | null {
  if (!user) return null;
  const u = extrairUserInstagram(user);
  if (!u) return null;
  return INSTAGRAM_BASE + u;
}

export { INSTAGRAM_BASE };
