// ═══════════════════════════════════════════════════════════════════════════════
// Tipos e constantes do subprojeto "Locação Pontual de Salas" (B2B).
// Ver docs/salas/00-design-mvp.md. Tabelas: salas, solicitacoes_reserva (Fase 0 SQL).
// ═══════════════════════════════════════════════════════════════════════════════

export type PrecoUnidade = "hora" | "turno" | "dia";
export type SalaStatus = "ativa" | "pausada" | "removida";
export type StatusSolicitacao = "pendente" | "aprovada" | "recusada" | "cancelada";

/** Janela semanal de disponibilidade (mesmo shape da `agenda` dos endereços). */
export interface DisponibilidadeDia {
  dia: string;
  inicio: string; // "HH:MM"
  fim: string; // "HH:MM"
  ativo: boolean;
}

/** Sala como exposta publicamente (view salas_publicas — sem endereco_id/contato). */
export interface SalaPublica {
  id: string;
  titulo: string;
  descricao: string | null;
  equipamentos: string[];
  preco_valor: number;
  preco_unidade: PrecoUnidade;
  disponibilidade: DisponibilidadeDia[];
  politica_cancelamento: string | null;
  fotos: string[];
  nome_clinica: string | null;
  cidade: string | null;
  bairro: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

/** Sala do ponto de vista do DONO (tabela base): inclui status, contato e endereço. */
export interface MinhaSala extends SalaPublica {
  endereco_id: string;
  status: SalaStatus;
  contato_whatsapp: string | null;
  contato_email: string | null;
}

/** Formulário de criação/edição da sala (no cliente). */
export interface SalaForm {
  id?: string; // presente ao editar
  endereco_id: string;
  titulo: string;
  descricao: string;
  equipamentos: string[];
  preco_valor: string; // string no form; convertido no salvar
  preco_unidade: PrecoUnidade;
  disponibilidade: DisponibilidadeDia[];
  politica_cancelamento: string;
  contato_whatsapp: string;
  contato_email: string;
}

/** Solicitação de reserva (tabela solicitacoes_reserva). */
export interface SolicitacaoReserva {
  id: string;
  sala_id: string;
  anfitriao_id: string;
  locatario_id: string;
  data: string; // ISO date
  hora_inicio: string; // "HH:MM"
  hora_fim: string;
  mensagem: string | null;
  status: StatusSolicitacao;
  observacao_anfitriao: string | null;
  contato_liberado: boolean;
  created_at: string;
  decidida_em: string | null;
}

/** Contato liberado após aprovação (retorno da RPC contato_da_reserva). */
export interface ContatoReserva {
  papel: "anfitriao" | "locatario";
  nome: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
}

// ─── Constantes (vocabulário de infraestrutura da sala) ──────────────────────────
export const EQUIPAMENTOS_OPCOES = [
  "Cadeira odontológica",
  "Raio-X",
  "Autoclave",
  "Compressor",
  "Sugador",
  "Fotopolimerizador",
  "Recepção compartilhada",
  "Sala de espera",
  "Estacionamento",
  "Acesso para cadeirante",
  "Wi-Fi",
  "Ar-condicionado",
] as const;

export const PRECO_UNIDADE_LABEL: Record<PrecoUnidade, string> = {
  hora: "por hora",
  turno: "por turno",
  dia: "por dia",
};

export const DIAS_SEMANA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
] as const;

/** Disponibilidade padrão: seg–sex 08:00–18:00 ativos; fim de semana fechado. */
export function disponibilidadePadrao(): DisponibilidadeDia[] {
  return DIAS_SEMANA.map((dia, i) => ({
    dia,
    inicio: "08:00",
    fim: "18:00",
    ativo: i < 5,
  }));
}

/** Formata "R$ 120,00 por hora". */
export function formatarPreco(valor: number, unidade: PrecoUnidade): string {
  const v = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${v} ${PRECO_UNIDADE_LABEL[unidade]}`;
}
