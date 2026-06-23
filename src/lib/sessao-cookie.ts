// ═══════════════════════════════════════════════════════════════════════════════
// LEITURA DE SESSÃO PELO COOKIE (sem supabase-js)
//
// O supabase-js do navegador estava TRAVANDO em getSession()/getUser() (deadlock
// interno de lock — confirmado em /diag: getSession dá TIMEOUT, mas ler o cookie
// e o fetch cru ao Supabase funcionam). Então lemos a sessão direto do cookie
// (@supabase/ssr grava a sessão em `sb-<ref>-auth-token`, possivelmente em pedaços
// `.0`, `.1`, e às vezes prefixada com `base64-`). 100% local, não trava.
// ═══════════════════════════════════════════════════════════════════════════════

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export interface SessaoCookie {
  accessToken: string;
  userId: string;
  email: string | null;
  nome: string | null;
  foto: string | null;
}

function refDoProjeto(): string {
  return new URL(URL_SB).hostname.split(".")[0];
}

/** Lê e decodifica a sessão do cookie. Retorna null se não houver/for inválida. */
export function lerSessaoDoCookie(): SessaoCookie | null {
  if (typeof document === "undefined") return null;
  try {
    const base = `sb-${refDoProjeto()}-auth-token`;
    const all = document.cookie.split("; ");
    const get = (n: string) => {
      const c = all.find((x) => x.startsWith(n + "="));
      return c ? decodeURIComponent(c.slice(n.length + 1)) : null;
    };
    // Junta os pedaços (.0, .1, …) ou o cookie único.
    let val = get(base);
    if (!val) {
      let s = "";
      for (let i = 0; ; i++) {
        const p = get(`${base}.${i}`);
        if (p == null) break;
        s += p;
      }
      val = s || null;
    }
    if (!val) return null;
    if (val.startsWith("base64-")) val = atob(val.slice(7));
    const sess = JSON.parse(val) as {
      access_token?: string;
      user?: { id?: string; email?: string; user_metadata?: { full_name?: string; avatar_url?: string; picture?: string } };
    };
    const u = sess.user;
    if (!u?.id || !sess.access_token) return null;
    const meta = u.user_metadata ?? {};
    return {
      accessToken: sess.access_token,
      userId: u.id,
      email: u.email ?? null,
      nome: meta.full_name ?? u.email ?? null,
      foto: meta.avatar_url ?? meta.picture ?? null,
    };
  } catch {
    return null;
  }
}

/** Apaga os cookies de sessão no navegador (logout local, não trava). */
export function limparCookiesSessao(): void {
  if (typeof document === "undefined") return;
  const base = `sb-${refDoProjeto()}-auth-token`;
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0];
    if (name === base || name.startsWith(base + ".")) {
      document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
    }
  }
}
