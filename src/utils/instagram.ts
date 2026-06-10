/** Aceita qualquer formato que o usuário digitar e retorna a URL limpa do Instagram,
 *  ou null se o link não for válido.
 *
 *  Formatos aceitos:
 *    - "https://instagram.com/usuario"
 *    - "https://www.instagram.com/usuario"
 *    - "http://instagram.com/usuario"
 *    - "instagram.com/usuario"
 *    - "@usuario"
 *    - "usuario" (apenas letras, números, underscore e ponto)
 */
export function formatarInstagram(input: string): string | null {
  if (!input) return null;

  let valor = input.trim();

  if (!valor) return null;

  // Remove @ do início se tiver
  if (valor.startsWith("@")) {
    valor = valor.slice(1);
  }

  // Se já é uma URL, extrai o username
  if (valor.startsWith("http://") || valor.startsWith("https://")) {
    try {
      const url = new URL(valor);
      if (!url.hostname.replace("www.", "").startsWith("instagram.com")) {
        return null;
      }
      const username = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      if (!username || /[^a-zA-Z0-9_.-]/.test(username)) return null;
      return `https://instagram.com/${username}`;
    } catch {
      return null;
    }
  }

  if (valor.includes("instagram.com")) {
    const match = valor.match(
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)/
    );
    if (match) {
      return `https://instagram.com/${match[1]}`;
    }
    return null;
  }

  // username puro
  if (/^[a-zA-Z0-9_.-]+$/.test(valor)) {
    return `https://instagram.com/${valor}`;
  }

  return null;
}
