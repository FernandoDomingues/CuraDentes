// ═══════════════════════════════════════════════════════════════════════════════
// AVALIAÇÕES — cálculo das médias de um dentista (função pura).
//
// Recebe a lista crua de avaliações do banco e devolve um resumo pronto para a
// página de perfil e para o JSON-LD (nota agregada). Sem rede: só matemática.
// ═══════════════════════════════════════════════════════════════════════════════

/** Avaliação crua como vem da tabela `avaliacoes`. */
export interface AvaliacaoCrua {
  /** Nota de 1 a 5. */
  nota: number;
  /** Atividade avaliada (ex.: "Implante dentário"). Vazio = "Geral". */
  atividade?: string | null;
}

/** Resumo de uma atividade específica. */
export interface ResumoAtividade {
  nome_atividade: string;
  media_nota: number;
  total_avaliacoes: number;
  /**
   * Posição do dentista no ranking da cidade para esta atividade específica.
   * Quando <= 3, a barra exibe um BadgePodio (Top 1/2/3). Igual ao k11.
   * PENDÊNCIA DE BACKEND: ainda não há RPC/view pública que devolva esta
   * posição por dentista — fica `undefined` (badge oculto) até existir o dado.
   */
  posicao_ranking?: number;
}

/** Resumo consolidado das avaliações de um dentista. */
export interface ResumoAvaliacoes {
  media_geral: number;
  total_avaliacoes: number;
  por_atividade: ResumoAtividade[];
}

/** Uma nota é válida se for um número inteiro/fracionário entre 1 e 5. */
function notaValida(nota: unknown): nota is number {
  return typeof nota === "number" && Number.isFinite(nota) && nota >= 1 && nota <= 5;
}

/**
 * Calcula a média geral, o total e a quebra por atividade a partir das
 * avaliações cruas. Notas inválidas (sujeira de dados) são descartadas.
 */
export function calcularAvaliacoes(avaliacoes: AvaliacaoCrua[]): ResumoAvaliacoes {
  const validas = (avaliacoes ?? []).filter((a) => notaValida(a?.nota));

  if (validas.length === 0) {
    return { media_geral: 0, total_avaliacoes: 0, por_atividade: [] };
  }

  // Soma global para a média geral.
  const somaTotal = validas.reduce((acc, a) => acc + a.nota, 0);
  const mediaGeral = somaTotal / validas.length;

  // Agrupa por atividade (vazio -> "Geral").
  const porAtividade = new Map<string, { soma: number; count: number }>();
  for (const a of validas) {
    const chave = a.atividade?.trim() || "Geral";
    const atual = porAtividade.get(chave) ?? { soma: 0, count: 0 };
    atual.soma += a.nota;
    atual.count += 1;
    porAtividade.set(chave, atual);
  }

  return {
    media_geral: mediaGeral,
    total_avaliacoes: validas.length,
    por_atividade: Array.from(porAtividade.entries()).map(([nome, d]) => ({
      nome_atividade: nome,
      media_nota: d.soma / d.count,
      total_avaliacoes: d.count,
    })),
  };
}
