// ═══════════════════════════════════════════════════════════════════════════════
// BUSCA — procura dentistas por texto (nome, atividade ou cidade/bairro).
//
// Roda no NAVEGADOR (componente cliente da página /busca), usando o mesmo cliente
// Supabase (anon key + RLS). Versão da Fase 1: busca textual + enriquecimento de
// avaliações. A busca geográfica por raio (RPC get_dentistas_proximos) e os filtros
// avançados do site-k11 entram numa evolução posterior.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase/public";
import { nomeExibicao } from "./dentistas";

/** Um resultado de busca (um card por dentista). */
export interface ResultadoBusca {
  dentista_id: string;
  nome: string;
  foto: string;
  cro: string;
  cro_verificado: boolean;
  bio: string;
  cidade: string;
  bairro: string;
  nome_clinica: string;
  atividades: string[];
  avaliacao: number;
  total_avaliacoes: number;
}

// Forma das linhas vindas do join endereço -> dentista.
interface ProEmbutido {
  id: string;
  nome: string | null;
  tratamento: string | null;
  foto_url: string | null;
  bio: string | null;
  cro: string | null;
  cro_verificado: boolean | null;
  lgpd_aceito: boolean | null;
  deleted_at: string | null;
}
interface EnderecoJoin {
  id: string;
  nome_clinica: string | null;
  cidade: string | null;
  bairro: string | null;
  atividades: string[] | null;
  curadentespro: ProEmbutido | ProEmbutido[] | null;
}

const SELECT_JOIN = `
  id, nome_clinica, cidade, bairro, atividades,
  curadentespro!inner ( id, nome, tratamento, foto_url, bio, cro, cro_verificado, lgpd_aceito, deleted_at )
`;

/** Normaliza o `curadentespro` embutido (às vezes vem como array). */
function pro(e: EnderecoJoin): ProEmbutido | null {
  const p = Array.isArray(e.curadentespro) ? e.curadentespro[0] : e.curadentespro;
  return p && p.lgpd_aceito && !p.deleted_at ? p : null;
}

/**
 * Busca dentistas por um termo livre. Combina três caminhos (atividade exata,
 * cidade/bairro e nome do dentista), junta sem duplicar (um card por dentista) e
 * enriquece com a média de avaliações. Retorna [] se o termo for vazio.
 */
export async function buscarDentistasPorTexto(termo: string): Promise<ResultadoBusca[]> {
  const q = termo.trim();
  if (!q) return [];

  // O termo entra numa string de filtro do PostgREST (.or). Vírgula/parênteses/
  // chaves/aspas são estruturais ali e quebrariam a query (HTTP 400). Para o ilike
  // de cidade/bairro, neutralizamos esses caracteres (viram espaço).
  const qLike = q.replace(/[,()%{}"]/g, " ").trim() || q;

  // 1a) Endereços por cidade/bairro contendo o termo.
  const porLocal = supabase
    .from("curadentespro_enderecos")
    .select(SELECT_JOIN)
    .or(`cidade.ilike.%${qLike}%,bairro.ilike.%${qLike}%`)
    .limit(60);

  // 1b) Endereços por ATIVIDADE exata (ex.: vindo da página de especialidade). O
  // termo vai como VALOR (supabase-js codifica), sem interpolar em string de filtro.
  const porAtividade = supabase
    .from("curadentespro_enderecos")
    .select(SELECT_JOIN)
    .contains("atividades", [q])
    .limit(60);

  // 2) Dentistas cujo NOME casa com o termo -> seus endereços.
  const porNome = (async () => {
    const { data: nomes } = await supabase
      .from("curadentespro")
      .select("id")
      .ilike("nome", `%${qLike}%`)
      .eq("lgpd_aceito", true)
      .is("deleted_at", null)
      .limit(40);
    const ids = (nomes ?? []).map((d: { id: string }) => d.id);
    if (ids.length === 0) return { data: [] as EnderecoJoin[], error: null };
    return supabase.from("curadentespro_enderecos").select(SELECT_JOIN).in("curadentespro_id", ids).limit(60);
  })();

  const [r1, r2, r3] = await Promise.all([porLocal, porAtividade, porNome]);
  for (const [nome, r] of [["local", r1], ["atividade", r2], ["nome", r3]] as const) {
    if (r.error) console.warn(`[busca] erro na consulta (${nome}):`, r.error.message);
  }
  const linhas: EnderecoJoin[] = [
    ...((r1.data as EnderecoJoin[]) ?? []),
    ...((r2.data as EnderecoJoin[]) ?? []),
    ...((r3.data as EnderecoJoin[]) ?? []),
  ];

  // Junta por dentista (1 card por profissional; fica com o 1º endereço visto).
  const porDentista = new Map<string, ResultadoBusca>();
  for (const e of linhas) {
    const p = pro(e);
    if (!p || porDentista.has(p.id)) continue;
    porDentista.set(p.id, {
      dentista_id: p.id,
      nome: nomeExibicao({ nome: p.nome ?? "", tratamento: p.tratamento }),
      foto: p.foto_url && !p.foto_url.startsWith("blob:") ? p.foto_url : "",
      cro: (p.cro ?? "").replace(/\s/g, ""),
      cro_verificado: !!p.cro_verificado,
      bio: p.bio ?? "",
      cidade: e.cidade ?? "",
      bairro: e.bairro ?? "",
      nome_clinica: e.nome_clinica ?? "",
      atividades: e.atividades ?? [],
      avaliacao: 0,
      total_avaliacoes: 0,
    });
  }

  const resultados = Array.from(porDentista.values());
  await enriquecerAvaliacoes(resultados);
  return resultados;
}

/** Preenche média e total de avaliações de cada resultado (em lote). */
async function enriquecerAvaliacoes(resultados: ResultadoBusca[]): Promise<void> {
  const ids = resultados.map((r) => r.dentista_id);
  if (ids.length === 0) return;
  const { data } = await supabase.from("avaliacoes").select("dentista_id, nota").in("dentista_id", ids);
  if (!data) return;

  const acc: Record<string, { soma: number; n: number }> = {};
  for (const row of data as { dentista_id: string; nota: number }[]) {
    if (typeof row.nota !== "number") continue;
    (acc[row.dentista_id] ??= { soma: 0, n: 0 }).soma += row.nota;
    acc[row.dentista_id].n += 1;
  }
  for (const r of resultados) {
    const a = acc[r.dentista_id];
    if (a) {
      r.avaliacao = a.soma / a.n;
      r.total_avaliacoes = a.n;
    }
  }
}
