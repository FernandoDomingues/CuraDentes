"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DO EDITOR DE PERFIL (servidor) — salva dados + prefs de e-mail + CRUD de
// endereços, tudo com o id da SESSÃO (nunca do cliente). A geocodificação fica no
// cliente (passada em latitude/longitude). Refactor do C1 (httpOnly).
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";
import type { EnderecoForm } from "@/components/pro/EnderecosEditor";

type EnderecoComCoord = EnderecoForm & { latitude: number | null; longitude: number | null };

export async function salvarPerfil(input: {
  nome: string;
  tratamento: string | null;
  telefone: string;
  anoFormacao: number | null;
  especialidade: string;
  bio: string;
  instagramUrl: string | null;
  googleReviewUrl: string | null;
  prefs: { desempenho: boolean; novidades: boolean; parceiros: boolean };
  enderecos: EnderecoComCoord[];
  removidos: string[];
}): Promise<{ ok: boolean; erro?: string; novosIds?: { tempId: string; id: string }[] }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const uid = user.id;

  // 1) Dados do perfil.
  const { error: pErr } = await supabase
    .from("curadentespro")
    .update({
      nome: input.nome,
      tratamento: input.tratamento,
      telefone: input.telefone,
      ano_formacao: input.anoFormacao,
      especialidade: input.especialidade,
      bio: input.bio,
      instagram: input.instagramUrl,
      google_review_url: input.googleReviewUrl,
    })
    .eq("id", uid);
  if (pErr) return { ok: false, erro: pErr.message || "Erro ao salvar o perfil." };

  // 2) Preferências de e-mail (best-effort — não derruba o save).
  const { error: prefErr } = await supabase
    .from("curadentespro_email")
    .upsert({ curadentespro_id: uid, prefs: input.prefs }, { onConflict: "curadentespro_id" });
  if (prefErr) console.warn("[salvarPerfil] prefs e-mail:", prefErr.message);

  // 3) Remove endereços apagados (ignora ids temporários "end-").
  const idsRem = input.removidos.filter((id) => !id.startsWith("end-"));
  if (idsRem.length > 0) {
    const { error: delErr } = await supabase.from("curadentespro_enderecos").delete().in("id", idsRem);
    if (delErr) return { ok: false, erro: delErr.message || "Erro ao remover endereço." };
  }

  // 4) Insere/atualiza cada endereço (curadentespro_id da sessão).
  const novosIds: { tempId: string; id: string }[] = [];
  const pendentes: string[] = []; // endereços que viraram adesão pendente (e-mail ao dono — passo 5)
  // Endereços em que sou MEMBRO (não-dono) de uma clínica: NÃO posso alterar os dados que
  // a definem (nome/endereço/fotos/estrutura) — são do dono. Defesa server-side da trava.
  const { data: membroData } = await supabase.rpc("enderecos_membro");
  const membros = new Set(((membroData as { endereco_id: string }[] | null) ?? []).map((r) => r.endereco_id));
  for (const end of input.enderecos) {
    const payload = {
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
    };
    let endId: string | null = null;
    if (end._isNew) {
      const { data: novo, error } = await supabase
        .from("curadentespro_enderecos")
        .insert(payload)
        .select("id")
        .single();
      if (error) return { ok: false, erro: error.message || "Erro ao salvar endereço." };
      if (novo) { novosIds.push({ tempId: end.id, id: novo.id as string }); endId = novo.id as string; }
    } else {
      // Membro: grava só os campos que são DELE; os que definem a clínica ficam intactos
      // (permanecem com o valor do banco, do dono), mesmo que o cliente tenha sido burlado.
      const dadosUpdate = membros.has(end.id)
        ? {
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
          }
        : payload;
      const { error } = await supabase.from("curadentespro_enderecos").update(dadosUpdate).eq("id", end.id);
      if (error) return { ok: false, erro: error.message || "Erro ao salvar endereço." };
      endId = end.id;
    }
    // Define o dono da clínica (1º a registrar a chave) OU cria adesão pendente.
    // Best-effort: nunca derruba o save. O e-mail ao dono (quando 'pendente') entra depois.
    if (endId) {
      const { data: st } = await supabase.rpc("sincronizar_clinica", { p_endereco_id: endId });
      if (st === "pendente") pendentes.push(endId);
    }
  }

  // E-mail ao DONO de cada clínica que ganhou adesão pendente (best-effort).
  // Edge Function `notificar-adesao-clinica` (publicada no Supabase; resolve o e-mail
  // do dono e chama o Resend). Falha engolida: nunca derruba o save. Ver passo 5.
  for (const endId of pendentes) {
    try {
      await supabase.functions.invoke("notificar-adesao-clinica", { body: { endereco_id: endId } });
    } catch (e) {
      console.warn("[salvarPerfil] notificar adesão:", e);
    }
  }

  return { ok: true, novosIds };
}
