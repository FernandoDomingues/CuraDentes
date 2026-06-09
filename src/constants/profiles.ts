// ═══════════════════════════════════════════════════════════════════════════════
// DADOS MOCK DE PERFIS COMPLETOS DE DENTISTAS
//
// Esta constante simula o retorno do banco de dados para a página de perfil.
// Estrutura espelha exatamente o schema previsto:
//   tabela: dentistas_perfis         (1-1 com dentistas)
//   tabela: enderecos_clinica        (1-N com dentistas_perfis)
//   tabela: agenda_endereco          (1-N com enderecos_clinica)
//   tabela: formas_pagamento         (N-N via dentista_forma_pagamento)
//   tabela: convenios                (N-N via dentista_convenio)
//   tabela: resumo_avaliacoes_atividade (view calculada por dentista)
// ═══════════════════════════════════════════════════════════════════════════════

import type { DentistProfile } from "@/types/dentist";

export const DENTIST_PROFILES: DentistProfile[] = [
  {
    dentista_id: 1,
    nome_completo: "Dra. Carolina Mendes",
    foto_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&auto=format&q=80",
    cro: "CRO-SP 123456",
    especialidade_principal: "Estética Dental",
    bio: "Especialista em odontologia estética com mais de 10 anos de experiência. Formada pela USP, com pós-graduação em Harmonização Orofacial pela APCD.",
    // Avaliação geral calculada como média das notas por atividade
    rating: 5.0,
    total_avaliacoes: 312,
    whatsapp_principal: "5511999001001",
    telefone_principal: "(11) 3456-7890",

    // Lista de endereços com atividades e agenda específicas por local
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
        atividades: ["Clareamento dental", "Lentes de contato dental", "Facetas de porcelana", "Limpeza e profilaxia"],
        agenda: [
          { dia_semana: "Segunda-feira", horario_inicio: "08:00", horario_fim: "18:00" },
          { dia_semana: "Terça-feira",   horario_inicio: "08:00", horario_fim: "18:00" },
          { dia_semana: "Quarta-feira",  horario_inicio: "08:00", horario_fim: "18:00" },
          { dia_semana: "Quinta-feira",  horario_inicio: "08:00", horario_fim: "18:00" },
          { dia_semana: "Sexta-feira",   horario_inicio: "08:00", horario_fim: "17:00" },
        ],
        // Formas de pagamento aceitas NESTE endereço (Clínica Sorriso & Estética)
        formas_pagamento: [
          { id: "fp-1a", nome: "Dinheiro",          tipo: "dinheiro" },
          { id: "fp-2a", nome: "PIX",               tipo: "pix" },
          { id: "fp-3a", nome: "Cartão de débito",  tipo: "cartao_debito" },
          { id: "fp-4a", nome: "Cartão de crédito", tipo: "cartao_credito", parcelas_ate: 12 },
        ],
        // Convênios aceitos NESTE endereço
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
        atividades: ["Botox odontológico",         "Preenchimento labial"],
        agenda: [
          { dia_semana: "Sábado", horario_inicio: "09:00", horario_fim: "14:00" },
        ],
        // Endereço secundário: apenas PIX e dinheiro, sem convênios
        formas_pagamento: [
          { id: "fp-1b", nome: "Dinheiro", tipo: "dinheiro" },
          { id: "fp-2b", nome: "PIX",      tipo: "pix" },
          { id: "fp-3b", nome: "Cartão de crédito", tipo: "cartao_credito", parcelas_ate: 6 },
        ],
        convenios: [],
      },
    ],

    // Posição geral da Dra. Carolina no ranking da cidade — 1ª colocada
    posicao_cidade: 1,

    // Sistema de avaliações por atividade — mock do retorno da view do banco
    // A média geral é calculada somando todas as médias e dividindo pelo número de atividades
    // posicao_ranking = colocação do dentista naquela atividade específica entre todos da cidade
    avaliacoes: {
      media_geral: 5.0,
      total_avaliacoes: 312,
      por_atividade: [
        { nome_atividade: "Lentes de contato dental", media_nota: 5.0, total_avaliacoes: 98,  posicao_ranking: 1 },
        { nome_atividade: "Clareamento dental",       media_nota: 5.0, total_avaliacoes: 87,  posicao_ranking: 1 },
        { nome_atividade: "Facetas de porcelana",     media_nota: 4.9, total_avaliacoes: 76,  posicao_ranking: 2 },
        { nome_atividade: "Limpeza e profilaxia",     media_nota: 5.0, total_avaliacoes: 51,  posicao_ranking: 3 },
      ],
    },
  },
  {
    dentista_id: 2,
    nome_completo: "Dra. Patrícia Ferreira",
    foto_url: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&auto=format&q=80",
    cro: "CRO-SP 234567",
    especialidade_principal: "Odontopediatria",
    bio: "Odontopediatra dedicada ao atendimento infantil com ambiente lúdico e humanizado. Especialização em Odontopediatria pelo IADES.",
    rating: 4.9,
    total_avaliacoes: 289,
    whatsapp_principal: "5511999002001",
    telefone_principal: "(11) 3567-8901",

    enderecos: [
      {
        id: "end-2-a",
        nome_clinica: "Clínica Sorridentes Kids",
        logradouro: "Rua Oscar Freire",
        numero: "540",
        bairro: "Jardins",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01426-001",
        telefone: "(11) 3567-8901",
        whatsapp: "5511999002001",
        maps_url: "https://maps.google.com",
        atividades: ["Consulta infantil", "Selante de fissura", "Limpeza e profilaxia", "Restauração de dente de leite"],
        agenda: [
          { dia_semana: "Segunda-feira", horario_inicio: "08:00", horario_fim: "17:00" },
          { dia_semana: "Quarta-feira",  horario_inicio: "08:00", horario_fim: "17:00" },
          { dia_semana: "Sexta-feira",   horario_inicio: "08:00", horario_fim: "17:00" },
        ],
        // Formas de pagamento aceitas na clínica particular
        formas_pagamento: [
          { id: "fp-1a", nome: "Dinheiro",          tipo: "dinheiro" },
          { id: "fp-2a", nome: "PIX",               tipo: "pix" },
          { id: "fp-3a", nome: "Cartão de crédito", tipo: "cartao_credito", parcelas_ate: 6 },
          { id: "fp-4a", nome: "Cartão de débito",  tipo: "cartao_debito" },
        ],
        // Convênios aceitos na clínica particular
        convenios: [
          { id: "conv-1a", nome: "Amil Dental" },
          { id: "conv-2a", nome: "Hapvida Odonto" },
          { id: "conv-3a", nome: "Odontoprev" },
        ],
      },
      {
        id: "end-2-b",
        nome_clinica: "UBS Jardins — Atend. Convênio",
        logradouro: "Alameda Santos",
        numero: "200",
        bairro: "Jardins",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01418-000",
        telefone: "(11) 3456-1122",
        maps_url: "https://maps.google.com",
        atividades: ["Tratamento de canal infantil", "Aparelho ortodôntico infantil", "Urgência odontológica"],
        agenda: [
          { dia_semana: "Terça-feira",  horario_inicio: "09:00", horario_fim: "15:00" },
          { dia_semana: "Quinta-feira", horario_inicio: "09:00", horario_fim: "15:00" },
        ],
        // Atendimento via convênio: sem pagamento particular neste endereço
        formas_pagamento: [],
        // Convênios distintos aceitos na UBS
        convenios: [
          { id: "conv-1b", nome: "Hapvida Odonto" },
          { id: "conv-2b", nome: "NotreDame Intermédica" },
          { id: "conv-3b", nome: "Odontoprev" },
        ],
      },
    ],

    // Posição geral da Dra. Patrícia no ranking da cidade — 2ª colocada
    posicao_cidade: 2,

    // Avaliações por atividade — note que "Urgência odontológica" tem nota mais baixa,
    // o que derruba a média geral do dentista (regra de negócio implementada)
    // posicao_ranking = colocação no ranking da cidade para cada procedimento
    avaliacoes: {
      media_geral: 4.9,
      total_avaliacoes: 289,
      por_atividade: [
        { nome_atividade: "Consulta infantil",             media_nota: 5.0, total_avaliacoes: 102, posicao_ranking: 2 },
        { nome_atividade: "Restauração de dente de leite", media_nota: 4.9, total_avaliacoes: 78,  posicao_ranking: 1 },
        { nome_atividade: "Selante de fissura",            media_nota: 4.9, total_avaliacoes: 54,  posicao_ranking: 1 },
        { nome_atividade: "Aparelho ortodôntico infantil", media_nota: 4.8, total_avaliacoes: 33,  posicao_ranking: 2 },
        { nome_atividade: "Tratamento de canal infantil",  media_nota: 4.7, total_avaliacoes: 22,  posicao_ranking: 3 },
      ],
    },
  },
];
