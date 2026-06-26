// ═══════════════════════════════════════════════════════════════════════════════
// SUGESTÕES — núcleo PURO e testável do autocomplete da busca.
//
// Aqui vive TODA a lógica que não depende de rede nem de React: normalização de
// texto, distância de edição, scorer fuzzy, montagem dos candidatos (cidade,
// bairro, clínica e NOME do dentista) e o filtro/ordenação final. O hook em
// `sugestoes.ts` só cuida do Supabase (cache + fetch) e do estado React, e delega
// a parte algorítmica para cá. Separado para poder testar sem env do Supabase
// (o cliente público lança erro na importação se faltarem as variáveis).
// ═══════════════════════════════════════════════════════════════════════════════

export type SuggestionType = "cidade" | "bairro" | "clinica" | "dentista";

export interface AddressSuggestion {
  label: string;        // Texto exibido: "Sorocaba, SP" ou "Dr. Fulano de Tal"
  value: string;        // Valor preenchido no input: "Sorocaba" / "Fulano de Tal"
  type: SuggestionType;
  score: number;        // Relevância (maior = mais relevante)
}

export interface RawLocation {
  cidade: string;
  estado: string;
  bairro: string;
  nome_clinica: string;
}

// Dados crus carregados uma vez do banco: endereços + nomes de dentistas públicos.
export interface SuggestionData {
  locations: RawLocation[];
  dentistas: string[]; // nomes (curadentespro.nome) dos perfis públicos
}

// ─── Normalização de string ───────────────────────────────────────────────────
// Remove acentos, caixa e pontuação para comparação robusta.

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Remove diacríticos (combining marks)
    .replace(/[^a-z0-9 ]/g, " ")      // Remove pontuação
    .replace(/\s+/g, " ")             // Normaliza espaços
    .trim();
}

// ─── Distância de Levenshtein (custo mínimo de edição) ───────────────────────

export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[a.length][b.length];
}

// ─── Scorer fuzzy principal ───────────────────────────────────────────────────
// Retorna um score de 0-100 (0 = irrelevante, 100 = correspondência exata).

export function fuzzyScore(query: string, candidate: string): number {
  const q = normalizar(query);
  const c = normalizar(candidate);

  if (!q || !c) return 0;

  // Exato
  if (c === q) return 100;

  // Começa com a query
  if (c.startsWith(q)) return 90 - Math.max(0, c.length - q.length) * 0.5;

  // Contém a query como substring
  const idx = c.indexOf(q);
  if (idx !== -1) return 80 - idx * 0.5 - Math.max(0, c.length - q.length) * 0.3;

  // Verifica por palavras individuais da query (ex: "bela vis" → "Bela Vista",
  // ou "fulano" → "Dr. Fulano de Tal").
  const palavrasQuery = q.split(" ").filter(Boolean);
  const palavrasCandidate = c.split(" ").filter(Boolean);
  const palavrasMatch = palavrasQuery.filter(pq =>
    palavrasCandidate.some(pc => pc.startsWith(pq) || pc.includes(pq))
  );
  if (palavrasMatch.length === palavrasQuery.length) return 70;
  if (palavrasMatch.length > 0) return 50 + (palavrasMatch.length / palavrasQuery.length) * 15;

  // Tolerância por Levenshtein (máx 2 erros para strings curtas, 3 para longas).
  const maxErros = q.length <= 5 ? 2 : 3;
  for (const palavra of palavrasCandidate) {
    const dist = levenshtein(q, palavra.slice(0, Math.min(palavra.length, q.length + 2)));
    if (dist <= maxErros) return 40 - dist * 10;
  }

  return 0;
}

// ─── Constrói a lista de sugestões únicas ─────────────────────────────────────

export function buildCandidates(data: SuggestionData): AddressSuggestion[] {
  const seen = new Set<string>();
  const candidates: AddressSuggestion[] = [];

  for (const loc of data.locations) {
    // Cidade + Estado
    if (loc.cidade) {
      const key = `cidade:${loc.cidade}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          label: loc.estado ? `${loc.cidade}, ${loc.estado}` : loc.cidade,
          value: loc.cidade,
          type: "cidade",
          score: 0,
        });
      }
    }

    // Bairro
    if (loc.bairro) {
      const key = `bairro:${loc.bairro}:${loc.cidade}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          label: loc.cidade ? `${loc.bairro}, ${loc.cidade}` : loc.bairro,
          value: loc.bairro,
          type: "bairro",
          score: 0,
        });
      }
    }

    // Nome da Clínica
    if (loc.nome_clinica) {
      const key = `clinica:${loc.nome_clinica}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          label: loc.nome_clinica,
          value: loc.nome_clinica,
          type: "clinica",
          score: 0,
        });
      }
    }
  }

  // Nome do dentista — o valor preenchido é o próprio nome, que a busca por nome
  // (ilike em curadentespro.nome) reencontra. Dedup por nome normalizado.
  for (const nomeRaw of data.dentistas) {
    const nome = (nomeRaw ?? "").trim();
    if (!nome) continue;
    const key = `dentista:${normalizar(nome)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ label: nome, value: nome, type: "dentista", score: 0 });
  }

  return candidates;
}

// ─── Filtro + ordenação final ─────────────────────────────────────────────────
// Pontua cada candidato contra a query, descarta os irrelevantes, ordena por
// relevância e corta em `maxResults`. Abaixo de 2 caracteres não sugere nada
// (evita um dropdown gigante e inútil já na primeira letra).

export function filtrarSugestoes(
  candidates: AddressSuggestion[],
  query: string,
  maxResults = 6,
): AddressSuggestion[] {
  if (!query || query.trim().length < 2) return [];
  return candidates
    .map((c) => ({ ...c, score: fuzzyScore(query, c.label) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
