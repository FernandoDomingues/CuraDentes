// ═══════════════════════════════════════════════════════════════════════════════
// CONTATO — montagem de links de WhatsApp, Instagram, telefone e mapa.
// Tudo PURO (sem rede). Reutilizado no perfil, na urgência e na busca.
// ═══════════════════════════════════════════════════════════════════════════════

/** Mantém só os dígitos de um texto. */
function digitos(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Link do WhatsApp (wa.me) a partir de um número brasileiro.
 * Garante o DDI 55 na frente (sem duplicar). Retorna null se vazio.
 */
export function urlWhatsapp(numero: string | null | undefined): string | null {
  if (!numero) return null;
  let d = digitos(numero);
  if (!d) return null;
  if (!d.startsWith("55")) d = "55" + d;
  return `https://wa.me/${d}`;
}

/** href `tel:` só com dígitos. Retorna null se vazio. */
export function telLimpo(numero: string | null | undefined): string | null {
  if (!numero) return null;
  const d = digitos(numero);
  return d ? `tel:${d}` : null;
}

/** URL do perfil de Instagram a partir do handle (com ou sem @) ou URL pronta. */
export function urlInstagram(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const h = handle.trim();
  if (!h) return null;
  if (h.startsWith("http")) return h;
  return `https://instagram.com/${h.replace(/^@/, "")}`;
}

/** Partes do endereço usadas para montar a busca no mapa. */
export interface PartesEndereco {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

/** URL de busca no Google Maps a partir do endereço (abre o local no mapa). */
export function urlMapsEndereco(e: PartesEndereco): string {
  const linha1 = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const consulta = [linha1, e.bairro, e.cidade, e.estado].filter(Boolean).join(" - ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

/**
 * Link para o paciente AVALIAR o dentista no Google. Aceita o que o dentista
 * cadastrar: um LINK pronto (formulário de avaliação do Google / g.page / maps)
 * → usado como está; ou um PLACE ID → monta o deep link de "escrever avaliação".
 * Retorna null se vazio/inválido.
 */
export function urlAvaliarGoogle(entrada: string | null | undefined): string | null {
  const v = (entrada || "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[A-Za-z0-9_-]{10,}$/.test(v)) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(v)}`;
  }
  return null;
}
