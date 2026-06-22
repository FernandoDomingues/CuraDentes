// ═══════════════════════════════════════════════════════════════════════════════
// ESPECIALIDADES — lista canônica, apelidos amigáveis e helpers de slug.
//
// "Canônico" = o nome exato que o dentista cadastra e o banco guarda (ex.:
// "Periodontia"). "Apelido" = o nome que o PACIENTE vê na navegação (ex.:
// "Tratamento de gengiva"). A busca/banco SEMPRE usam o canônico; o apelido é só
// camada de exibição. Ver memória [[apelidos-especialidades]].
//
// O conteúdo de SEO de cada especialidade fica em `especialidades-seo.ts`; aqui
// re-exportamos e oferecemos as funções de navegação (slug <-> especialidade).
// ═══════════════════════════════════════════════════════════════════════════════

import { slugificar } from "./slug";
import { ESPECIALIDADES_SEO, type EspecialidadeSEO, type FAQ } from "./especialidades-seo";

// Re-exporta para quem importa tudo de "especialidades".
export { ESPECIALIDADES_SEO };
export type { EspecialidadeSEO, FAQ };

// ─── Lista canônica ──────────────────────────────────────────────────────────
// Mesma lista usada no cadastro (NovoCadastro/MeuPerfil) e no banco. A ordem aqui
// é a ordem de exibição padrão.
export const ESPECIALIDADES: string[] = [
  "Clínico Geral",
  "Clareamento dental",
  "Lentes de contato dental",
  "Limpeza",
  "Ortodontia (aparelho)",
  "Implante dentário",
  "Tratamento de canal",
  "Prótese dentária",
  "Cirurgia oral",
  "Periodontia",
  "Odontopediatria",
  "Harmonização orofacial",
];

// ─── Apelidos amigáveis (camada de EXIBIÇÃO) ─────────────────────────────────
// chave = nome canônico, valor = nome que o paciente vê.
export const APELIDOS_ESPECIALIDADE: Record<string, string> = {
  Periodontia: "Tratamento de gengiva",
  Odontopediatria: "Dentista infantil",
};

/** Nome amigável (para o paciente) de uma especialidade, ou o próprio canônico se não houver apelido. */
export function nomeAmigavel(nomeCanonico: string): string {
  return APELIDOS_ESPECIALIDADE[nomeCanonico] ?? nomeCanonico;
}

/** Gera o slug de URL de uma especialidade a partir do nome canônico. */
export function slugDaEspecialidade(nomeCanonico: string): string {
  return slugificar(nomeCanonico);
}

/**
 * Encontra o pacote de SEO de uma especialidade pelo slug da URL.
 * Retorna `undefined` se nenhuma especialidade tiver aquele slug (gera 404).
 */
export function especialidadePorSlug(slug: string): EspecialidadeSEO | undefined {
  return Object.values(ESPECIALIDADES_SEO).find((esp) => esp.slug === slug);
}
