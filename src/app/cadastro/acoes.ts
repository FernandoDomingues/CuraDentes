"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DO CADASTRO (servidor) — retomada + gravações de cada etapa. Tudo com o id
// da SESSÃO (nunca do cliente). A geocodificação fica no cliente (lat/lng no payload).
// A verificação do OTP (que estabelece a sessão) é a route /auth/cadastro-otp, não
// aqui. Refactor do C1 (httpOnly).
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";
import { isSuperuserEmail } from "@/lib/superuser";
import type { EnderecoRow } from "@/lib/dentistas";
import type { EnderecoForm } from "@/components/pro/EnderecosEditor";

type EnderecoComCoord = EnderecoForm & { latitude: number | null; longitude: number | null };

// Helper interno (não exportado): sessão + id do usuário logado.
async function sessao() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, uid: (user?.id ?? null) as string | null, email: user?.email ?? null };
}

interface PerfilCadastro {
  nome: string;
  tratamento: string;
  nome_completo: string;
  cro: string;
  ano_formacao: number | null;
  foto_url: string;
  bio: string;
  instagram: string;
  especialidade: string;
  google_review_url: string;
}

/** Retomada: lê o que já existe (perfil + telefone/cpf via RPC + endereços + prefs). */
export async function carregarCadastro(): Promise<{
  ok: boolean;
  semSessao?: boolean;
  ehSuper?: boolean;
  jaCompleto?: boolean;
  temPerfil?: boolean;
  email?: string;
  userId?: string;
  perfil?: PerfilCadastro;
  telefone?: string;
  cpf?: string;
  enderecos?: EnderecoRow[];
  prefs?: { desempenho: boolean; novidades: boolean; parceiros: boolean };
}> {
  const { supabase, uid, email } = await sessao();
  if (!uid) return { ok: true, semSessao: true };
  if (isSuperuserEmail(email)) return { ok: true, ehSuper: true };

  const { data: pro } = await supabase
    .from("curadentespro")
    .select("nome, tratamento, nome_completo, cro, ano_formacao, foto_url, bio, instagram, especialidade, google_review_url, lgpd_aceito")
    .eq("id", uid)
    .is("deleted_at", null)
    .maybeSingle();

  if (!pro) return { ok: true, temPerfil: false, email: email ?? "", userId: uid };
  if (pro.lgpd_aceito) return { ok: true, jaCompleto: true };

  const { data: tel } = await supabase.rpc("meu_telefone");
  const { data: cpfData } = await supabase.rpc("meu_cpf");
  const { data: ends } = await supabase.from("curadentespro_enderecos").select("*").eq("curadentespro_id", uid);
  const { data: prefRow } = await supabase
    .from("curadentespro_email")
    .select("prefs")
    .eq("curadentespro_id", uid)
    .maybeSingle();
  const prefs = (prefRow?.prefs ?? {}) as { desempenho?: boolean; novidades?: boolean; parceiros?: boolean };

  return {
    ok: true,
    temPerfil: true,
    email: email ?? "",
    userId: uid,
    perfil: {
      nome: pro.nome ?? "",
      tratamento: pro.tratamento ?? "",
      nome_completo: pro.nome_completo ?? "",
      cro: pro.cro ?? "",
      ano_formacao: pro.ano_formacao ?? null,
      foto_url: pro.foto_url ?? "",
      bio: pro.bio ?? "",
      instagram: pro.instagram ?? "",
      especialidade: pro.especialidade ?? "",
      google_review_url: pro.google_review_url ?? "",
    },
    telefone: typeof tel === "string" ? tel : "",
    cpf: typeof cpfData === "string" ? cpfData : "",
    enderecos: (ends as EnderecoRow[]) ?? [],
    prefs: { desempenho: !!prefs.desempenho, novidades: !!prefs.novidades, parceiros: !!prefs.parceiros },
  };
}

/** Etapa 1: cria/atualiza o registro do dentista (NÃO grava email — coluna PII protegida). */
export async function salvarEtapaConta(d: {
  nome: string;
  tratamento: string | null;
  nomeCompleto: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada. Verifique seu e-mail novamente." };
  const { error } = await supabase.from("curadentespro").upsert(
    { id: uid, user_id: uid, nome: d.nome, tratamento: d.tratamento, nome_completo: d.nomeCompleto },
    { onConflict: "id" },
  );
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

/** Define/atualiza a senha do dentista logado (auth.updateUser). */
export async function definirSenha(senha: string): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada. Verifique seu e-mail novamente." };
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

/** Update genérico de campos do perfil (telefone, bio/instagram, ...). */
export async function salvarCampos(campos: Record<string, unknown>): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada." };
  const { error } = await supabase.from("curadentespro").update(campos).eq("id", uid);
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

/** Etapa 3: identidade — CRO/ano/especialidade + CPF (tabela protegida). */
export async function salvarIdentidade(d: {
  cro: string;
  anoFormacao: number | null;
  especialidade: string | null;
  cpf: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada." };
  const { error } = await supabase
    .from("curadentespro")
    .update({ cro: d.cro, ano_formacao: d.anoFormacao, especialidade: d.especialidade })
    .eq("id", uid);
  if (error) return { ok: false, erro: error.message };
  const { error: cpfErr } = await supabase
    .from("curadentespro_cpf")
    .upsert({ curadentespro_id: uid, cpf: d.cpf.replace(/\D/g, "") }, { onConflict: "curadentespro_id" });
  if (cpfErr) return { ok: false, erro: cpfErr.message };
  return { ok: true };
}

/** Endereços do cadastro: apaga todos e reinsere (geocoding feito no cliente → lat/lng). */
export async function salvarEnderecosCadastro(enderecos: EnderecoComCoord[]): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada." };
  const { error: delErr } = await supabase.from("curadentespro_enderecos").delete().eq("curadentespro_id", uid);
  if (delErr) return { ok: false, erro: delErr.message };
  for (const end of enderecos) {
    const { error } = await supabase.from("curadentespro_enderecos").insert({
      curadentespro_id: uid,
      nome_clinica: end.nome_clinica,
      logradouro: end.logradouro,
      numero: end.numero,
      complemento: end.complemento,
      bairro: end.bairro,
      cidade: end.cidade,
      estado: end.estado,
      cep: end.cep,
      telefone: end.telefone,
      whatsapp: end.whatsapp,
      atende_urgencias: end.atende_urgencias,
      aceita_urgencia_termo: end.aceita_urgencia_termo,
      estacionamento: end.estacionamento,
      atividades: end.atividades,
      convenios: end.convenios,
      formas_pagamento: end.formas_pagamento,
      politica_cancelamento: end.politica_cancelamento,
      observacoes: end.observacoes,
      agenda: end.agenda,
      latitude: end.latitude,
      longitude: end.longitude,
      foto_fachada: end.foto_fachada || null,
      fotos_recepcao: end.fotos_recepcao ?? [],
      estrutura: end.estrutura ?? [],
      estrutura_extra: end.estrutura_extra?.trim() || null,
    });
    if (error) return { ok: false, erro: error.message };
  }
  return { ok: true };
}

/** Etapa final: prefs de e-mail + marca o cadastro como completo (perfil público). */
export async function finalizarCadastro(prefs: {
  desempenho: boolean;
  novidades: boolean;
  parceiros: boolean;
}): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, uid } = await sessao();
  if (!uid) return { ok: false, erro: "Sessão expirada." };
  const { error: prefErr } = await supabase
    .from("curadentespro_email")
    .upsert({ curadentespro_id: uid, prefs }, { onConflict: "curadentespro_id" });
  if (prefErr) console.warn("[finalizarCadastro] prefs e-mail:", prefErr.message);
  const { error } = await supabase
    .from("curadentespro")
    .update({ lgpd_aceito: true, cobranca_aviso_aceita: true, cobranca_aviso_aceita_em: new Date().toISOString() })
    .eq("id", uid);
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}
