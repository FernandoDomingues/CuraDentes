// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DO DENTISTA (lado do front do site-R0)
//
// Espelham o que a página pública de perfil precisa exibir. Os nomes seguem o
// banco (snake_case) para facilitar o mapeamento. Dados sensíveis (CPF, e-mail
// pessoal) NÃO entram aqui — a página pública não os usa.
// ═══════════════════════════════════════════════════════════════════════════════

import type { ResumoAvaliacoes } from "@/lib/avaliacoes";

/** Um dia/horário de atendimento já normalizado para exibição. */
export interface AgendaDia {
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
}

/** Um endereço (clínica/consultório) onde o dentista atende. */
export interface EnderecoClinica {
  id: string;
  nome_clinica: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone?: string | null;
  /** WhatsApp só dígitos (ex.: "5515999998888"). */
  whatsapp?: string | null;
  /** Procedimentos realizados neste endereço (nomes canônicos). */
  atividades: string[];
  /** Convênios aceitos (nomes). */
  convenios: string[];
  /** Formas de pagamento aceitas (nomes). */
  formas_pagamento: string[];
  /** Horários de atendimento normalizados. */
  agenda: AgendaDia[];
  /** Marca de destaque: atende urgências. */
  atende_urgencias: boolean;
  /** Tem estacionamento. */
  estacionamento: boolean;
  /** Texto livre com informações ao paciente. */
  observacoes?: string | null;
}

/**
 * Perfil público completo de um dentista — tudo que a página /dentista/[id]
 * renderiza no servidor (SSR) e usa para montar o JSON-LD.
 */
export interface DentistaPerfil {
  /** UUID no banco (usado na URL e como chave). */
  id: string;
  /** Nome de exibição (sem o pronome de tratamento). */
  nome: string;
  /** Pronome de tratamento ("Dr." / "Dra."), opcional. */
  tratamento?: string | null;
  /** CRO já sem espaços (ex.: "CROSP12345"). */
  cro: string;
  /** CRO verificado pela equipe (selo). */
  cro_verificado: boolean;
  /** URL da foto (WebP no Storage) — string vazia se não houver. */
  foto_url: string;
  /** Bio livre; vazia = não exibe nada (sem texto padrão — ver [[bio-dentista-sem-padrao]]). */
  bio?: string | null;
  /** @usuario do Instagram, sem o "@". */
  instagram?: string | null;
  /** Especialidade principal (primeira atividade do primeiro endereço). */
  especialidade_principal: string;
  /** Endereços de atendimento. */
  enderecos: EnderecoClinica[];
  /** Resumo de avaliações (média geral, total, por atividade). */
  avaliacoes: ResumoAvaliacoes;
  /**
   * Posição geral do dentista no ranking da cidade (pela média geral).
   * Quando <= 3, o hero exibe um BadgePodio (Top 1/2/3). Igual ao k11.
   * PENDÊNCIA DE BACKEND: ainda não há RPC/view pública que devolva esta
   * posição por dentista — fica `undefined` (badge oculto) até existir o dado.
   */
  posicao_cidade?: number;
}
