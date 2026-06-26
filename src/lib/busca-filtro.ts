// ═══════════════════════════════════════════════════════════════════════════════
// BUSCA — lógica PURA e testável: sanitização do termo + montagem dos filtros + URL.
//
// Por que existe: a busca textual interpola o termo digitado pelo usuário direto no
// filtro `.or()` do PostgREST. Sem sanitizar, caracteres estruturais (vírgula,
// parênteses) permitem INJETAR condições no filtro — por exemplo, burlar o
// `lgpd_aceito=true` e expor perfis NÃO públicos. Essa lógica vivia inline na
// BuscaCliente sem sanitização (o módulo `busca.ts` que sanitizava era código morto
// e foi removido). Extraída aqui para ser testável e para FECHAR a brecha. Também
// monta a URL `/busca` usada pelos botões "Buscar".
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Remove os caracteres que poderiam QUEBRAR ou INJETAR no filtro `.or()` do PostgREST
 * (vírgula e parênteses) e os curingas do `ilike` (`%`, `*`), além de aspas, chaves e
 * barra invertida. Mantém letras (com acento), números, espaço, hífen, ponto e barra.
 * Colapsa espaços repetidos e apara as pontas.
 */
export function sanitizarTermoBusca(termo: string | null | undefined): string {
  return (termo ?? "")
    .replace(/[,()%*{}"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Campos pesquisados quando o termo tem UMA parte (local OU nome da clínica).
const CAMPOS_ENDERECO = ["bairro", "cidade", "estado", "logradouro", "nome_clinica"];

/**
 * Monta o(s) filtro(s) `.or()` do PostgREST para a busca de endereços por texto.
 * Cada parte é SANITIZADA antes de entrar no filtro. "bairro, cidade" (2+ partes)
 * vira 2 filtros encadeados (que o PostgREST combina com AND): o 1º casa
 * local/clínica e o 2º restringe cidade/estado. Retorna `[]` se o termo ficar vazio
 * após a sanitização (evita devolver tudo e evita filtro inseguro).
 */
export function construirFiltrosEndereco(termo: string | null | undefined): string[] {
  const partes = (termo ?? "")
    .split(",")
    .map((p) => sanitizarTermoBusca(p))
    .filter(Boolean);
  if (partes.length === 0) return [];
  if (partes.length >= 2) {
    const [p1, p2] = partes;
    return [
      `bairro.ilike.%${p1}%,cidade.ilike.%${p1}%,nome_clinica.ilike.%${p1}%,logradouro.ilike.%${p1}%`,
      `cidade.ilike.%${p2}%,estado.ilike.%${p2}%`,
    ];
  }
  const q = partes[0];
  return [CAMPOS_ENDERECO.map((c) => `${c}.ilike.%${q}%`).join(",")];
}

/**
 * Termo sanitizado para a busca por NOME do dentista — usado em `.ilike("nome", X)`.
 * O `ilike` do supabase-js é parametrizado (sem risco de SQL injection), mas ainda
 * sanitizamos curingas/estruturais por consistência e para não trazer matches
 * inesperados. Retorna "" quando não sobra conteúdo (aí a busca por nome é pulada).
 */
export function termoBuscaNome(termo: string | null | undefined): string {
  return sanitizarTermoBusca(termo);
}

/**
 * URL da página de busca a partir do termo digitado e, opcionalmente, do chip de
 * especialidade ativo na home. A codificação (URLSearchParams) já escapa tudo, então
 * é seguro mesmo com caracteres especiais. Sem termo nem chip → "/busca".
 */
export function urlBusca(termo: string | null | undefined, atividade?: string | null): string {
  const params = new URLSearchParams();
  const v = (termo ?? "").trim();
  if (v) params.set("q", v);
  if (atividade) params.set("atividade", atividade);
  const qs = params.toString();
  return qs ? `/busca?${qs}` : "/busca";
}
