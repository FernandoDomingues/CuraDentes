// ═══════════════════════════════════════════════════════════════════════════════
// MEU PERFIL — /pro/perfil (Server Component → carrega os dados + casca).
//
// O acesso já foi garantido pelo layout /pro. Aqui carregamos no SERVIDOR (cliente
// autenticado por cookies) os dados do dentista, o CPF (RPC protegida meu_cpf) e os
// endereços, e passamos tudo para o editor interativo (Client Component).
// ═══════════════════════════════════════════════════════════════════════════════

import { redirect } from "next/navigation";
import { getUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { extrairUserInstagram } from "@/lib/instagram";
import type { EnderecoRow } from "@/lib/dentistas";
import PerfilEditor, { type EnderecoForm, type PerfilForm } from "./PerfilEditor";

export const dynamic = "force-dynamic";

const POLITICA_PADRAO =
  "Cancelamentos devem ser feitos com no mínimo 24 horas de antecedência. Faltas sem aviso prévio poderão ser cobradas uma taxa administrativa.";

const DIAS = [
  "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
  "Sexta-feira", "Sábado", "Domingo",
];

interface AgendaItem {
  dia: string;
  inicio: string;
  fim: string;
  ativo: boolean;
}

// Normaliza a agenda do banco (aceita os dois formatos de chave) para 7 dias fixos.
function normalizarAgenda(raw: unknown): AgendaItem[] {
  const arr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  return DIAS.map((dia) => {
    const achou = arr.find((a) => (a.dia ?? a.dia_semana) === dia);
    return {
      dia,
      inicio: (achou?.inicio as string) || (achou?.horario_inicio as string) || "08:00",
      fim: (achou?.fim as string) || (achou?.horario_fim as string) || "18:00",
      ativo: achou ? achou.ativo !== false : false,
    };
  });
}

export default async function MeuPerfilPage() {
  const usuario = await getUsuario();
  if (usuario?.papel === "superuser") redirect("/pro/dashboard");

  const supabase = await criarClienteServidor();
  const id = usuario!.id;

  const [perfilRes, cpfRes, endsRes, prefsRes] = await Promise.all([
    supabase
      .from("curadentespro")
      .select("id, nome, tratamento, nome_completo, email, telefone, cro, ano_formacao, foto_url, bio, instagram, especialidade, lgpd_aceito")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle<{
        id: string; nome: string | null; tratamento: string | null; nome_completo: string | null;
        email: string | null; telefone: string | null; cro: string | null; ano_formacao: number | null;
        foto_url: string | null; bio: string | null; instagram: string | null; especialidade: string | null; lgpd_aceito: boolean | null;
      }>(),
    supabase.rpc("meu_cpf"),
    supabase.from("curadentespro_enderecos").select("*").eq("curadentespro_id", id),
    supabase.from("curadentespro_email").select("prefs").eq("curadentespro_id", id).maybeSingle<{ prefs: { desempenho?: boolean; novidades?: boolean; parceiros?: boolean } | null }>(),
  ]);

  const pro = perfilRes.data;
  if (!pro) redirect("/pro/dashboard");

  const perfil: PerfilForm = {
    id: pro!.id,
    nome: pro!.nome ?? "",
    tratamento: pro!.tratamento ?? "",
    nomeCompleto: pro!.nome_completo ?? "",
    email: pro!.email ?? usuario!.email,
    telefone: pro!.telefone ?? "",
    cpf: typeof cpfRes.data === "string" ? cpfRes.data : "",
    cro: pro!.cro ?? "",
    anoFormacao: pro!.ano_formacao ? String(pro!.ano_formacao) : "",
    especialidade: pro!.especialidade ?? "",
    bio: pro!.bio ?? "",
    instagram: extrairUserInstagram(pro!.instagram ?? ""),
    fotoUrl: pro!.foto_url ?? "",
    lgpdAceito: !!pro!.lgpd_aceito,
    prefsEmail: {
      desempenho: !!prefsRes.data?.prefs?.desempenho,
      novidades: !!prefsRes.data?.prefs?.novidades,
      parceiros: !!prefsRes.data?.prefs?.parceiros,
    },
  };

  const enderecos: EnderecoForm[] = ((endsRes.data as EnderecoRow[]) ?? []).map((e) => ({
    id: e.id,
    nome_clinica: e.nome_clinica ?? "",
    logradouro: e.logradouro ?? "",
    numero: e.numero ?? "",
    complemento: e.complemento ?? "",
    bairro: e.bairro ?? "",
    cidade: e.cidade ?? "",
    estado: e.estado ?? "",
    cep: e.cep ?? "",
    telefone: e.telefone ?? "",
    whatsapp: e.whatsapp ?? "",
    atende_urgencias: !!e.atende_urgencias,
    aceita_urgencia_termo: !!(e as { aceita_urgencia_termo?: boolean }).aceita_urgencia_termo,
    estacionamento: !!e.estacionamento,
    atividades: e.atividades ?? [],
    convenios: e.convenios ?? [],
    formas_pagamento: e.formas_pagamento ?? [],
    politica_cancelamento: (e as { politica_cancelamento?: string }).politica_cancelamento ?? POLITICA_PADRAO,
    observacoes: e.observacoes ?? "",
    agenda: normalizarAgenda(e.agenda),
  }));

  return <PerfilEditor perfil={perfil} enderecosIniciais={enderecos} />;
}
