// ═══════════════════════════════════════════════════════════════════════════════
// DENTISTAS — acesso a dados (servidor) + montagem do perfil público.
//
// Aqui ficam:
//   • as funções PURAS (sem rede) que transformam as linhas cruas do banco no
//     formato `DentistaPerfil` que a página usa — fáceis de testar (TDD);
//   • as funções que de fato consultam o Supabase (buscar perfil, listar p/ sitemap).
//
// Tudo roda no SERVIDOR (Server Components / sitemap), então o HTML já sai pronto
// e indexável. Usa a anon key + RLS — só lê o que é público.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase/public";
import { calcularAvaliacoes, type AvaliacaoCrua } from "./avaliacoes";
import type { AgendaDia, DentistaPerfil, EnderecoClinica } from "@/types/dentista";

// ─── Formato cru das linhas do banco ─────────────────────────────────────────
// (só os campos que a página pública usa — CPF e afins ficam de fora por LGPD).

/** Linha crua da tabela `curadentespro`. */
export interface DentistaRow {
  id: string;
  nome: string | null;
  tratamento: string | null;
  cro: string | null;
  cro_verificado: boolean | null;
  foto_url: string | null;
  bio: string | null;
  instagram: string | null;
  lgpd_aceito: boolean | null;
  deleted_at: string | null;
}

/** Item cru da agenda (JSON guardado no endereço). Aceita nomes antigos e novos. */
interface AgendaItemRaw {
  ativo?: boolean;
  dia?: string;
  dia_semana?: string;
  inicio?: string;
  horario_inicio?: string;
  fim?: string;
  horario_fim?: string;
}

/** Linha crua da tabela `curadentespro_enderecos`. */
export interface EnderecoRow {
  id: string;
  nome_clinica: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  whatsapp: string | null;
  atividades: string[] | null;
  convenios: string[] | null;
  formas_pagamento: string[] | null;
  agenda: unknown;
  atende_urgencias: boolean | null;
  estacionamento: boolean | null;
  observacoes: string | null;
}

// ─── Funções puras (testadas) ────────────────────────────────────────────────

/**
 * Normaliza a agenda crua (JSON) numa lista de dias/horários exibíveis.
 * Aceita tanto os nomes novos (dia/inicio/fim) quanto os antigos
 * (dia_semana/horario_inicio/horario_fim) e descarta dias inativos/incompletos.
 */
export function normalizarAgenda(agendaRaw: unknown): AgendaDia[] {
  if (!Array.isArray(agendaRaw)) return [];
  return (agendaRaw as AgendaItemRaw[])
    .filter((item) => item && item.ativo !== false)
    .map((item) => ({
      dia_semana: item.dia || item.dia_semana || "",
      horario_inicio: item.inicio || item.horario_inicio || "",
      horario_fim: item.fim || item.horario_fim || "",
    }))
    .filter((i) => i.dia_semana && i.horario_inicio && i.horario_fim);
}

/** Converte uma linha de endereço crua no tipo `EnderecoClinica`. */
export function montarEndereco(e: EnderecoRow): EnderecoClinica {
  return {
    id: e.id,
    nome_clinica: e.nome_clinica ?? "",
    logradouro: e.logradouro ?? "",
    numero: e.numero ?? "",
    complemento: e.complemento,
    bairro: e.bairro ?? "",
    cidade: e.cidade ?? "",
    estado: e.estado ?? "",
    cep: e.cep ?? "",
    telefone: e.telefone,
    whatsapp: e.whatsapp,
    atividades: e.atividades ?? [],
    convenios: e.convenios ?? [],
    formas_pagamento: e.formas_pagamento ?? [],
    agenda: normalizarAgenda(e.agenda),
    atende_urgencias: !!e.atende_urgencias,
    estacionamento: !!e.estacionamento,
    observacoes: e.observacoes,
  };
}

/**
 * Monta o `DentistaPerfil` público a partir das linhas cruas (perfil, endereços
 * e avaliações). Função pura — o coração testável da página de perfil.
 *
 * A especialidade principal é a primeira atividade do primeiro endereço; se não
 * houver nenhuma, cai em "Clínico Geral" (mesma regra do site-k11).
 */
export function montarPerfilDentista(
  pro: DentistaRow,
  enderecos: EnderecoRow[],
  avaliacoes: AvaliacaoCrua[],
): DentistaPerfil {
  const ends = (enderecos ?? []).map(montarEndereco);

  let especialidade = "Clínico Geral";
  const primeira = ends.find((e) => e.atividades.length > 0);
  if (primeira) especialidade = primeira.atividades[0];

  // Foto inválida (blob: de um upload não salvo) é descartada.
  const foto = pro.foto_url && !pro.foto_url.startsWith("blob:") ? pro.foto_url : "";

  return {
    id: pro.id,
    nome: pro.nome ?? "",
    tratamento: pro.tratamento,
    cro: (pro.cro ?? "").replace(/\s/g, ""),
    cro_verificado: !!pro.cro_verificado,
    foto_url: foto,
    bio: pro.bio,
    instagram: pro.instagram || null,
    especialidade_principal: especialidade,
    enderecos: ends,
    avaliacoes: calcularAvaliacoes(avaliacoes),
  };
}

/** Nome de exibição completo: junta tratamento + nome quando faz sentido. */
export function nomeExibicao(p: Pick<DentistaPerfil, "nome" | "tratamento">): string {
  const t = p.tratamento?.trim();
  if (t && !p.nome.startsWith(t)) return `${t} ${p.nome}`;
  return p.nome;
}

// ─── Acesso ao banco (rede) ──────────────────────────────────────────────────

// Campos públicos do perfil (CPF/e-mail pessoal OMITIDOS de propósito — LGPD).
const CAMPOS_PRO =
  "id, nome, tratamento, cro, cro_verificado, foto_url, bio, instagram, lgpd_aceito, deleted_at";

/**
 * Busca um dentista pelo campo indicado ("id" ou "cro") e monta o perfil público.
 * Retorna `null` quando não existe, está excluído (soft delete) ou tem cadastro
 * incompleto (lgpd_aceito = false) — nesses casos a página responde 404.
 */
async function buscarDentista(
  campo: "id" | "cro",
  valor: string,
): Promise<DentistaPerfil | null> {
  const { data: pro, error } = await supabase
    .from("curadentespro")
    .select(CAMPOS_PRO)
    .eq(campo, valor)
    .is("deleted_at", null)
    .maybeSingle<DentistaRow>();

  if (error || !pro || !pro.lgpd_aceito) return null;

  // Endereços e avaliações em paralelo (dependem do id já conhecido).
  const [endsRes, avsRes] = await Promise.all([
    supabase.from("curadentespro_enderecos").select("*").eq("curadentespro_id", pro.id),
    supabase.from("avaliacoes").select("nota, atividade").eq("dentista_id", pro.id),
  ]);

  return montarPerfilDentista(
    pro,
    (endsRes.data as EnderecoRow[]) ?? [],
    (avsRes.data as AvaliacaoCrua[]) ?? [],
  );
}

/** Busca um dentista público pelo UUID (usado na URL /dentista/[id]). */
export function buscarDentistaPorId(id: string): Promise<DentistaPerfil | null> {
  return buscarDentista("id", id);
}

/** Busca um dentista público pelo CRO. */
export function buscarDentistaPorCro(cro: string): Promise<DentistaPerfil | null> {
  return buscarDentista("cro", cro);
}

/** Item mínimo de um dentista para o sitemap. */
export interface DentistaSitemap {
  id: string;
  /** Última atualização aproximada (não temos timestamp público; usamos cadastro). */
  atualizado_em?: string | null;
}

/**
 * Lista os dentistas PÚBLICOS (cadastro completo e não excluídos) para o sitemap.
 * São essas URLs que fazem cada perfil ser descoberto por buscadores/IAs.
 */
export async function listarDentistasParaSitemap(): Promise<DentistaSitemap[]> {
  const { data, error } = await supabase
    .from("curadentespro")
    .select("id")
    .eq("lgpd_aceito", true)
    .is("deleted_at", null);

  if (error || !data) return [];
  return (data as { id: string }[]).map((d) => ({ id: d.id }));
}
