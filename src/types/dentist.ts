// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS BASE DO SISTEMA CURADENTES
// Todas as interfaces aqui espelham o schema do banco de dados.
// Nomes de campos seguem o padrão snake_case para facilitar o mapeamento com SQL.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Entidade base — listagem de dentistas ──────────────────────────────────

/** Dentista como exibido nas listas e cards de resultado */
export interface Dentist {
  id: string | number;
  name: string;
  cro: string;
  cro_verificado?: boolean;
  specialty: string;
  rating: number;
  reviews: number;
  distance: string;
  price: string;
  available: boolean;
  availabilityLabel: string;
  photo: string;
  city: string;
  neighborhood?: string;
  hours?: string;
  convenios?: number;
  tags?: string[];
}

// ─── Sistema de avaliações por atividade ─────────────────────────────────────

/**
 * Avaliação de um paciente para uma atividade específica realizada pelo dentista.
 * tabela: avaliacoes_atividade
 */
export interface AvaliacaoAtividade {
  /** Identificador único da avaliação */
  id: string;
  /** FK para dentistas_perfis.dentista_id */
  dentista_id: string | number;
  /** Nome exato da atividade avaliada (deve existir na lista de atividades do endereço) */
  nome_atividade: string;
  /** Nota de 1 a 5 */
  nota: number;
  /** Comentário opcional do paciente */
  comentario?: string;
  /** Data da avaliação no formato ISO 8601 */
  data_avaliacao: string;
  /** Nome do paciente (pode ser anonimizado) */
  nome_paciente?: string;
}

/**
 * Resumo consolidado das avaliações de uma atividade específica.
 * Calculado em tempo real ou cacheado no banco.
 * tabela: resumo_avaliacoes_atividade (view ou tabela materializada)
 */
export interface ResumoAvaliacaoAtividade {
  /** Nome da atividade (ex: "Lentes de contato dental") */
  nome_atividade: string;
  /** Média das notas para esta atividade */
  media_nota: number;
  /** Total de avaliações recebidas para esta atividade */
  total_avaliacoes: number;
  /**
   * Posição do dentista no ranking da cidade para esta atividade específica.
   * Calculado comparando a media_nota com os demais dentistas que realizam o mesmo procedimento.
   * undefined = não há dados suficientes para ranquear.
   * Em produção: calculado via query à view ranking_por_atividade.
   */
  posicao_ranking?: number;
}

/** Avaliação individual de um paciente com dados do perfil Google */
export interface AvaliacaoIndividual {
  nota: number;
  paciente_nome: string;
  paciente_foto: string;
  criado_em: string;
}

/**
 * Avaliação geral do dentista — calculada como média ponderada
 * de todas as ResumoAvaliacaoAtividade.
 *
 * REGRA DE NEGÓCIO: Se o dentista afirma fazer uma atividade
 * mas a executa mal (nota baixa), isso derruba sua média geral.
 * Isso incentiva honestidade no cadastro de especialidades.
 *
 * tabela: resumo_avaliacao_geral (view ou campo calculado em dentistas_perfis)
 */
export interface AvaliacaoGeral {
  /** Média ponderada de todas as atividades */
  media_geral: number;
  /** Soma total de todas as avaliações de todas as atividades */
  total_avaliacoes: number;
  /** Detalhamento por atividade */
  por_atividade: ResumoAvaliacaoAtividade[];
}

// ─── Perfil completo do dentista (página de perfil) ──────────────────────────

/** Horário de atendimento em um endereço específico */
export interface HorarioAtendimento {
  /** Ex: "Segunda-feira", "Terça-feira" */
  dia_semana: string;
  /** Formato HH:MM — ex: "08:00" */
  horario_inicio: string;
  /** Formato HH:MM — ex: "18:00" */
  horario_fim: string;
}

/** Endereço de atendimento com atividades, agenda, pagamentos e convênios próprios */
export interface EnderecoClinica {
  /** Identificador único do endereço */
  id: string;
  /** Nome fantasia da clínica ou consultório */
  nome_clinica: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  /** Telefone fixo formatado — ex: "(11) 3456-7890" */
  telefone: string;
  /** Número WhatsApp apenas dígitos — ex: "5511998765432" */
  whatsapp?: string;
  /** Lista de procedimentos realizados neste endereço */
  atividades: string[];
  /** Horários disponíveis neste endereço */
  agenda: HorarioAtendimento[];
  /** Link externo do Google Maps ou equivalente */
  maps_url?: string;
  /**
   * Formas de pagamento aceitas NESTE endereço.
   * Cada clínica/consultório pode ter políticas financeiras distintas.
   * tabela: formas_pagamento_endereco (N-N via endereco_forma_pagamento)
   */
  formas_pagamento: FormaPagamento[];
  /**
   * Convênios aceitos NESTE endereço.
   * Um dentista pode credenciar planos diferentes em cada local.
   * tabela: convenios_endereco (N-N via endereco_convenio)
   */
  convenios: Convenio[];
}

/** Forma de pagamento aceita pelo dentista */
export interface FormaPagamento {
  id: string;
  nome: string;
  /** Categoria para agrupamento e exibição de ícone */
  tipo: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "boleto" | "transferencia";
  /** Parcelamento máximo — aplicável apenas a cartão de crédito */
  parcelas_ate?: number;
}

/** Convênio aceito pelo dentista */
export interface Convenio {
  id: string;
  nome: string;
  logo_url?: string;
}

/**
 * Perfil completo do dentista — agrupa todas as informações
 * exibidas na página de perfil individual.
 * tabela: dentistas_perfis
 */
export interface DentistProfile {
  /** FK para Dentist.id / tabela: dentistas */
  dentista_id: string | number;
  nome_completo: string;
  nome_legal?: string;
  foto_url: string;
  cro: string;
  cro_verificado?: boolean;
  /** Email do dentista (para notificações) */
  email?: string;
  /** Especialidade principal autodeclarada */
  especialidade_principal: string;
  /** Breve bio exibida no topo do perfil */
  bio?: string;
  /** Avaliação geral calculada — média de todas as atividades */
  rating: number;
  total_avaliacoes: number;
  /**
   * Lista de endereços com atividades, agenda, formas de pagamento e convênios.
   * Cada endereço carrega suas próprias regras financeiras e de planos aceitos.
   */
  enderecos: EnderecoClinica[];
  /** Avaliação consolidada por atividade (preenchida via query ao banco) */
  avaliacoes?: AvaliacaoGeral;
  /** Link do perfil do Instagram */
  instagram?: string;
  /** WhatsApp principal para contato rápido */
  whatsapp_principal?: string;
  /** Telefone principal para ligação */
  telefone_principal?: string;
  /**
   * Posição geral do dentista no ranking da cidade (considerando a media_geral).
   * 1 = melhor avaliado, undefined = sem dados suficientes.
   * Em produção: calculado via view ranking_geral_cidade ORDER BY media_geral DESC.
   */
  posicao_cidade?: number;
}

// ─── Catálogo e filtros ───────────────────────────────────────────────────────

/** Especialidade exibida na seção de categorias */
export interface Specialty {
  id: string;
  label: string;
  icon: string;
  count: number;
}

/** Chip de filtro rápido na barra de busca */
export interface FilterChip {
  id: string;
  label: string;
  icon: string;
}

// ─── Ranking Top 10 ──────────────────────────────────────────────────────────

/**
 * Tipo de ordenação disponível para o ranking.
 * - avaliacao_geral: ordena pela média geral de todas as atividades
 * - especialidade:   filtra e ordena pelo rating de uma especialidade específica
 * - convenio:        filtra dentistas que aceitam um convênio específico
 */
export type TipoFiltroRanking = "avaliacao_geral" | "especialidade" | "convenio";

// ─── FEATURE INATIVA — Sistema de recompensa Top 1 ───────────────────────────
/**
 * FEATURE INATIVA — NÃO ATIVAR SEM REVISÃO DE NEGÓCIO
 *
 * Lógica planejada:
 * - A cada ciclo mensal, verifica qual dentista ficou mais tempo no Top 1
 *   de cada especialidade naquele mês.
 * - O dentista vencedor recebe isenção de 100% no plano do mês seguinte,
 *   entregue via cupom (forma de envio do cupom a definir).
 * - Também registra o histórico de Top 1 para análises futuras.
 *
 * Tabelas previstas:
 *   - historico_top1_mensal (dentista_id, especialidade, mes_referencia, dias_em_top1)
 *   - cupons_desconto (id, dentista_id, percentual, mes_referencia, status)
 *
 * Para ativar: remova este bloco de comentário e implemente a Edge Function
 * de apuração mensal agendada (cron job via Supabase Scheduled Functions).
 */

// export interface HistoricoTop1Mensal {
//   dentista_id: number;
//   especialidade: string;
//   mes_referencia: string; // formato: "YYYY-MM"
//   dias_em_top1: number;
//   recebeu_cupom: boolean;
//   cupom_codigo?: string;
// }
