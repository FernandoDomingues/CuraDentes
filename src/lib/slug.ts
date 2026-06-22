// ═══════════════════════════════════════════════════════════════════════════════
// Utilitário: slugificar
//
// Converte um texto (ex.: nome de especialidade) num "slug" seguro para URL:
// minúsculo, sem acentos, só letras/números, separado por hífens.
// Ex.: "Harmonização Orofacial" -> "harmonizacao-orofacial".
//
// É usado nas URLs de especialidade (/especialidade/<slug>), que precisam ser
// estáveis e legíveis para o SEO/AEO (mecanismos de busca e IAs).
// ═══════════════════════════════════════════════════════════════════════════════

export function slugificar(texto: string): string {
  return texto
    .normalize("NFD") // separa letra e acento (ex.: "ç" -> "c" + sinal)
    .replace(/[̀-ͯ]/g, "") // remove os sinais de acento (faixa combinante Unicode)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // tudo que não for letra/número vira hífen
    .replace(/^-+|-+$/g, ""); // tira hífens sobrando no início/fim
}
