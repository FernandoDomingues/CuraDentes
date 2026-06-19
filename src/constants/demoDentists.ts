// ═══════════════════════════════════════════════════════════════════════════════
// DADOS DE DEMONSTRAÇÃO — DENTISTAS PRO
//
// Dois usuários de demonstração para o fluxo do painel do dentista:
//   - demo1: cadastro completo, exibido para pacientes
//   - demo2: cadastro incompleto, pendente de informações obrigatórias
//
// Em produção: substituir por autenticação real e query ao banco Supabase.
// ═══════════════════════════════════════════════════════════════════════════════

import type { EnderecoClinica } from "@/types/dentist";

// ─── Interface do usuário dentista (sessão de login) ─────────────────────────

/** Representa o dentista autenticado no painel Pro */
export interface DentistaPro {
  /** ID interno (Supabase UUID) ou mock */
  id: string | number;
  /** Login para acesso demo */
  usuario: string;
  /** Senha para acesso demo */
  senha: string;
  /** Pronome de tratamento exibido antes do nome (ex.: "Dr." / "Dra.") */
  tratamento?: string | null;
  /** Nome completo do profissional */
  nome_completo: string;
  /** Email de cadastro */
  email: string;
  /** Telefone no formato E.164 */
  telefone: string;
  /** URL da foto de perfil */
  foto_url: string;
  /** Número CRO com estado */
  cro: string;
  /** CPF (apenas para uso interno — não exibir para paciente) */
  cpf: string;
  /** Ano de formação */
  ano_formacao: number;
  /** Bio do profissional */
  bio: string;
  /** Link do perfil do Instagram */
  instagram?: string;
  /** Cadastro completo: true = visível para pacientes */
  cadastro_completo: boolean;
  /** Lista de endereços de atendimento */
  enderecos: EnderecoClinica[];
  /** Avaliações por especialidade (mock) */
  avaliacoes: {
    media_geral: number;
    total_avaliacoes: number;
    por_atividade: { nome_atividade: string; media_nota: number; total_avaliacoes: number; posicao?: number }[];
  };
  /** Colocação geral no ranking */
  posicao_geral: number;
}

// ─── Usuário 1 — Cadastro completo ───────────────────────────────────────────

const DEMO_USER_1: DentistaPro = {
  id: 101,
  usuario: "Usuário1",
  senha: "Senha1!",
  nome_completo: "Dra. Carolina Mendes",
  email: "carolina.mendes@demo.curadentes.com.br",
  telefone: "+5511999001001",
  foto_url:
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&auto=format&q=80",
  cro: "CRO-SP 123456",
  cpf: "123.456.789-00",
  ano_formacao: 2014,
  bio: "Especialista em odontologia estética com mais de 10 anos de experiência. Formada pela USP, com pós-graduação em Harmonização Orofacial pela APCD.",
  instagram: "https://www.instagram.com/carolinamendesdentista",
  cadastro_completo: true,
  posicao_geral: 1,
  enderecos: [
    {
      id: "end-1-a",
      nome_clinica: "Clínica Sorriso & Estética",
      logradouro: "Rua Augusta",
      numero: "1200",
      complemento: "Sala 42",
      bairro: "Consolação",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01305-100",
      telefone: "(11) 3456-7890",
      whatsapp: "5511999001001",
      maps_url: "https://maps.google.com",
      // Atividades realizadas neste endereço
      atividades: [
        "Clareamento dental",
        "Lentes de contato dental",
        "Facetas de porcelana",
        "Limpeza",
      ],
      agenda: [
        { dia_semana: "Segunda-feira", horario_inicio: "08:00", horario_fim: "18:00" },
        { dia_semana: "Terça-feira",   horario_inicio: "08:00", horario_fim: "18:00" },
        { dia_semana: "Quarta-feira",  horario_inicio: "08:00", horario_fim: "18:00" },
        { dia_semana: "Quinta-feira",  horario_inicio: "08:00", horario_fim: "18:00" },
        { dia_semana: "Sexta-feira",   horario_inicio: "08:00", horario_fim: "17:00" },
      ],
      formas_pagamento: [
        { id: "fp-1a", nome: "Dinheiro",          tipo: "dinheiro" },
        { id: "fp-2a", nome: "PIX",               tipo: "pix" },
        { id: "fp-3a", nome: "Cartão de débito",  tipo: "cartao_debito" },
        { id: "fp-4a", nome: "Cartão de crédito", tipo: "cartao_credito", parcelas_ate: 12 },
      ],
      convenios: [
        { id: "conv-1a", nome: "Amil Dental" },
        { id: "conv-2a", nome: "Bradesco Dental" },
        { id: "conv-3a", nome: "SulAmérica Odonto" },
        { id: "conv-4a", nome: "Porto Seguro Saúde" },
        { id: "conv-5a", nome: "Unimed Odonto" },
      ],
    },
    {
      id: "end-1-b",
      nome_clinica: "OdontoCentro Paulista",
      logradouro: "Av. Paulista",
      numero: "2000",
      complemento: "Cj. 51",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01310-200",
      telefone: "(11) 3321-9900",
      whatsapp: "5511999001002",
      maps_url: "https://maps.google.com",
      atividades: [
        "Harmonização orofacial",
        "Preenchimento labial",
      ],
      agenda: [
        { dia_semana: "Sábado", horario_inicio: "09:00", horario_fim: "14:00" },
      ],
      formas_pagamento: [
        { id: "fp-1b", nome: "Dinheiro", tipo: "dinheiro" },
        { id: "fp-2b", nome: "PIX",      tipo: "pix" },
        { id: "fp-3b", nome: "Cartão de crédito", tipo: "cartao_credito", parcelas_ate: 6 },
      ],
      convenios: [],
    },
  ],
  avaliacoes: {
    media_geral: 5.0,
    total_avaliacoes: 312,
    por_atividade: [
      { nome_atividade: "Lentes de contato dental", media_nota: 5.0, total_avaliacoes: 98 },
      { nome_atividade: "Clareamento dental",       media_nota: 5.0, total_avaliacoes: 87 },
      { nome_atividade: "Facetas de porcelana",     media_nota: 4.9, total_avaliacoes: 76 },
      { nome_atividade: "Limpeza",     media_nota: 5.0, total_avaliacoes: 51 },
    ],
  },
};

// ─── Usuário 2 — Cadastro incompleto ─────────────────────────────────────────

const DEMO_USER_2: DentistaPro = {
  id: 102,
  usuario: "Usuário2",
  senha: "Senha2!",
  nome_completo: "Dr. Rafael Souza",
  email: "rafael.souza@demo.curadentes.com.br",
  telefone: "+5511988002002",
  foto_url:
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&auto=format&q=80",
  cro: "",           // CRO não preenchido → cadastro incompleto
  cpf: "",           // CPF não preenchido
  ano_formacao: 0,
  bio: "",           // Bio não preenchida
  cadastro_completo: false,
  posicao_geral: 0,  // Não ranqueado por estar oculto
  enderecos: [],     // Nenhum endereço cadastrado
  avaliacoes: {
    media_geral: 0,
    total_avaliacoes: 0,
    por_atividade: [],
  },
};

// ─── Lista de dentistas demo disponíveis para login ──────────────────────────
export const DEMO_DENTISTAS: DentistaPro[] = [DEMO_USER_1, DEMO_USER_2];

/**
 * Autentica um dentista demo pelo usuário e senha.
 * Em produção: substituir por chamada à API de autenticação do Supabase.
 */
export function autenticarDemo(
  usuario: string,
  senha: string
): DentistaPro | null {
  return (
    DEMO_DENTISTAS.find(
      (d) => d.usuario === usuario && d.senha === senha
    ) ?? null
  );
}
