// ═══════════════════════════════════════════════════════════════════════════════
// Tipos e constantes do subprojeto "Locação Pontual de Salas" (B2B).
// Ver docs/salas/00-design-mvp.md. Tabelas: salas, solicitacoes_reserva (Fase 0 SQL).
// ═══════════════════════════════════════════════════════════════════════════════

export type PrecoUnidade = "hora" | "turno" | "dia";
export type SalaStatus = "ativa" | "pausada" | "removida";
export type StatusSolicitacao = "pendente" | "aprovada" | "recusada" | "cancelada";

/** Janela semanal LEGADA (formato antigo do `disponibilidade`). Mantido só para o
 *  normalizador converter dados existentes para o novo modelo de blocos. */
export interface DisponibilidadeDia {
  dia: string;
  inicio: string; // "HH:MM"
  fim: string; // "HH:MM"
  ativo: boolean;
}

/** NOVO modelo de disponibilidade por BLOCOS. diaSemana usa a convenção do
 *  JS Date.getDay(): 0=Domingo … 6=Sábado. */
export interface BlocoSemanal {
  tipo: "semanal";
  diaSemana: number;
  inicio: string; // "HH:MM"
  fim: string;
}
export interface BlocoData {
  tipo: "data";
  data: string; // "YYYY-MM-DD"
  inicio: string;
  fim: string;
}
export type BlocoDisponibilidade = BlocoSemanal | BlocoData;

/** Horário já alocado (reserva aprovada) — devolvido por slots_ocupados_sala. */
export interface SlotOcupado {
  data: string; // "YYYY-MM-DD"
  hora_inicio: string; // "HH:MM[:SS]"
  hora_fim: string;
}

/** Sala como exposta publicamente (view salas_publicas — sem endereco_id/contato). */
export interface SalaPublica {
  id: string;
  titulo: string;
  descricao: string | null;
  equipamentos: string[];
  preco_valor: number;
  preco_unidade: PrecoUnidade;
  preco_diaria: number | null;
  disponibilidade: BlocoDisponibilidade[];
  politica_cancelamento: string | null;
  fotos: string[];
  nome_clinica: string | null;
  cidade: string | null;
  bairro: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  clinica_slug?: string | null;
  numero_na_clinica?: number | null;
  created_at: string;
}

/** Sala do ponto de vista do DONO (tabela base): inclui status, contato e endereço. */
export interface MinhaSala extends SalaPublica {
  endereco_id: string;
  status: SalaStatus;
  contato_whatsapp: string | null;
  contato_email: string | null;
}

/** Clínica no catálogo (RPC get_clinicas_publicas) — card com fachada + agregados. */
export interface ClinicaPublica {
  slug: string;
  nome_clinica: string | null;
  cidade: string | null;
  bairro: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  foto_fachada: string | null;
  qtd_salas: number;
  preco_min: number | null;
}

/** Clínica completa (RPC get_clinica_por_slug) — página da clínica. */
export interface ClinicaDetalhe {
  slug: string;
  nome_clinica: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  telefone: string | null;
  whatsapp: string | null;
  foto_fachada: string | null;
  fotos_recepcao: string[];
}

/** Detalhe members-only (RPC get_sala_detalhe): inclui contato + endereço completo,
 *  visível só para dentista com CRO verificado. Ver docs/salas/05-detalhe-membros.sql. */
export interface SalaDetalhe extends SalaPublica {
  contato_whatsapp: string | null;
  contato_email: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
}

/** Formulário de criação/edição da sala (no cliente). */
export interface SalaForm {
  id?: string; // presente ao editar
  endereco_id: string;
  titulo: string;
  descricao: string;
  equipamentos: string[];
  preco_valor: string; // valor por HORA (string no form; convertido no salvar)
  preco_unidade: PrecoUnidade; // sempre "hora" no modelo atual (hora + diária)
  preco_diaria: string; // valor da DIÁRIA (opcional)
  disponibilidade: BlocoDisponibilidade[];
  politica_cancelamento: string;
  fotos: string[]; // URLs no bucket fotos-salas (1..3, obrigatório)
}

/** Endereço resumido do anfitrião (seletor de "onde fica a sala"). */
export interface EnderecoResumo {
  id: string;
  nome_clinica: string | null;
  cidade: string | null;
  bairro: string | null;
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
  pagamento_resolvido: boolean;
  created_at: string;
  decidida_em: string | null;
}

/** Contato do solicitante visto pelo locador (RPC contato_solicitante). */
export interface ContatoSolicitante {
  nome: string | null;
  telefone: string | null;
  email: string | null;
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

// Dias da semana na convenção getDay() (0=Domingo … 6=Sábado).
export const DIAS_SEMANA_LONGO = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado",
] as const;
export const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

// Mapeia o nome do dia do formato ANTIGO para o índice getDay().
const DIA_ANTIGO_PARA_JS: Record<string, number> = {
  "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
  "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6,
};

/** "YYYY-MM-DD" → Date local (sem deslocamento de fuso). */
export function parseDataLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
/** Date → "YYYY-MM-DD" local. */
export function dataLocalISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
/** Hora inteira → "HH:00". */
export function formatarHora(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

/** Lê o `disponibilidade` cru do banco (novo modelo OU formato antigo) → blocos. */
export function normalizarBlocos(raw: unknown): BlocoDisponibilidade[] {
  if (!Array.isArray(raw)) return [];
  const out: BlocoDisponibilidade[] = [];
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    if (o.tipo === "semanal" && typeof o.diaSemana === "number") {
      out.push({ tipo: "semanal", diaSemana: o.diaSemana, inicio: String(o.inicio ?? ""), fim: String(o.fim ?? "") });
    } else if (o.tipo === "data" && typeof o.data === "string") {
      out.push({ tipo: "data", data: o.data, inicio: String(o.inicio ?? ""), fim: String(o.fim ?? "") });
    } else if (typeof o.dia === "string" && o.ativo === true) {
      // formato antigo (DisponibilidadeDia) → bloco semanal
      const js = DIA_ANTIGO_PARA_JS[o.dia];
      if (js !== undefined) out.push({ tipo: "semanal", diaSemana: js, inicio: String(o.inicio ?? ""), fim: String(o.fim ?? "") });
    }
  }
  return out;
}

/** Blocos que valem para a data ISO dada (por data específica OU dia da semana). */
export function blocosDoDia(blocos: BlocoDisponibilidade[], iso: string): BlocoDisponibilidade[] {
  const js = parseDataLocal(iso).getDay();
  return blocos.filter((b) => (b.tipo === "data" ? b.data === iso : b.diaSemana === js));
}
/** Horas inteiras disponíveis na data (hora a hora, união dos blocos do dia). */
export function horasDoDia(blocos: BlocoDisponibilidade[], iso: string): number[] {
  const set = new Set<number>();
  for (const b of blocosDoDia(blocos, iso)) {
    const a = parseInt(b.inicio, 10);
    const z = parseInt(b.fim, 10);
    if (Number.isFinite(a) && Number.isFinite(z)) for (let h = a; h < z; h++) set.add(h);
  }
  return [...set].sort((x, y) => x - y);
}
export function diaTemDisponibilidade(blocos: BlocoDisponibilidade[], iso: string): boolean {
  return horasDoDia(blocos, iso).length > 0;
}

/** Agrupa horas inteiras selecionadas em FAIXAS contíguas ({inicio,fim} como "HH:00").
 *  Ex.: [14,15,16,19] → [{14:00–17:00},{19:00–20:00}]. Cada faixa vira 1 solicitação. */
export function agruparHorasEmFaixas(horas: number[]): { inicio: string; fim: string }[] {
  const s = [...new Set(horas)].sort((a, b) => a - b);
  const faixas: { inicio: string; fim: string }[] = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    faixas.push({ inicio: formatarHora(s[i]), fim: formatarHora(s[j] + 1) });
    i = j + 1;
  }
  return faixas;
}

/** Descrição humana de um bloco ("Toda sexta-feira · 14:00–19:00"). */
export function descreverBloco(b: BlocoDisponibilidade): string {
  const faixa = `${b.inicio}–${b.fim}`;
  if (b.tipo === "semanal") return `Toda ${DIAS_SEMANA_LONGO[b.diaSemana].toLowerCase()} · ${faixa}`;
  return `${b.data.split("-").reverse().join("/")} · ${faixa}`;
}

/** Disponibilidade padrão de uma nova sala: seg–sex 08:00–18:00 (recorrente). */
export function disponibilidadePadrao(): BlocoDisponibilidade[] {
  return [1, 2, 3, 4, 5].map((d) => ({ tipo: "semanal" as const, diaSemana: d, inicio: "08:00", fim: "18:00" }));
}

/** Formata "R$ 120,00 por hora". */
export function formatarPreco(valor: number, unidade: PrecoUnidade): string {
  const v = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${v} ${PRECO_UNIDADE_LABEL[unidade]}`;
}
