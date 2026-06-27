"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// AÇÕES DO PERFIL PÚBLICO (servidor) — mutações autenticadas do paciente que antes
// rodavam no cliente. Cada ação valida getUser() e usa o id da SESSÃO (viewer/paciente)
// — nunca um id vindo do cliente. RLS como proteção final. Refactor do C1 (httpOnly).
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Registra o clique de contato (whatsapp/telefone) do paciente logado — métrica do
 * funil (1x/dia/tipo, upsert idempotente). viewer_id vem da sessão. Best-effort:
 * nunca lança (não pode atrapalhar a abertura do link).
 */
export async function registrarContato(
  dentistaId: string,
  tipo: "whatsapp" | "telefone",
): Promise<void> {
  try {
    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("perfil_contatos").upsert(
      { dentista_id: dentistaId, viewer_id: user.id, tipo },
      { onConflict: "dentista_id,viewer_id,tipo,data_visita", ignoreDuplicates: true },
    );
  } catch {
    /* best-effort */
  }
}

/**
 * Registra a visualização do perfil pelo paciente logado — 1x/dia por conta; o
 * próprio dentista não conta a si mesmo. viewer_id da sessão. Best-effort.
 */
export async function registrarVisualizacao(dentistaId: string): Promise<void> {
  try {
    const supabase = await criarClienteServidor();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id === dentistaId) return;
    await supabase.from("perfil_visualizacoes").upsert(
      { dentista_id: dentistaId, viewer_id: user.id },
      { onConflict: "dentista_id,viewer_id,data_visita", ignoreDuplicates: true },
    );
  } catch {
    /* best-effort */
  }
}

/**
 * Paciente logado envia uma avaliação (paciente_id da SESSÃO) e notifica o dentista
 * por e-mail (best-effort, via Edge Function). Valida a nota no servidor.
 */
export async function enviarAvaliacao(args: {
  dentistaId: string;
  nota: number;
  atividade: string | null;
  comentario: string | null;
  nomeDentista: string;
}): Promise<{ ok: boolean; erro?: string; precisaLogin?: boolean }> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, precisaLogin: true, erro: "Você precisa entrar com sua conta Google para avaliar." };
  }

  const nota = Math.round(args.nota);
  if (!(nota >= 1 && nota <= 5)) return { ok: false, erro: "Por favor, selecione as estrelas." };

  const { error } = await supabase.from("avaliacoes").insert({
    paciente_id: user.id,
    dentista_id: args.dentistaId,
    nota,
    atividade: args.atividade || null,
    comentario: (args.comentario || "").trim().slice(0, 300) || null,
  });
  if (error) return { ok: false, erro: "Falha ao salvar a avaliação. Tente novamente." };

  // Notifica o dentista (best-effort; a Edge Function resolve o e-mail pelo dentista_id).
  try {
    const patientName =
      (user.user_metadata as { full_name?: string } | undefined)?.full_name || user.email || null;
    await supabase.functions.invoke("send-rating-notification", {
      body: { dentistId: args.dentistaId, dentistName: args.nomeDentista, specialty: args.atividade || null, patientName },
    });
  } catch {
    /* best-effort */
  }

  return { ok: true };
}

/**
 * Lê as avaliações individuais de uma atividade + nome/foto dos pacientes (clientes
 * não excluídos), no formato exibido pelo modal "Ver". Retorna [] em qualquer falha.
 */
export async function lerAvaliacoesAtividade(
  dentistaId: string,
  atividade: string,
): Promise<
  { nota: number; paciente_nome: string; paciente_foto: string; comentario: string | null; criado_em: string }[]
> {
  try {
    const supabase = await criarClienteServidor();
    const { data: avaliacoes, error } = await supabase
      .from("avaliacoes")
      .select("paciente_id, nota, comentario, criado_em")
      .eq("dentista_id", dentistaId)
      .eq("atividade", atividade)
      .order("criado_em", { ascending: false });
    if (error) throw error;

    const lista = (avaliacoes ?? []) as {
      paciente_id: string;
      nota: number;
      comentario: string | null;
      criado_em: string;
    }[];

    const ids = [...new Set(lista.map((a) => a.paciente_id))];
    let mapa: Record<string, { nome: string; foto: string }> = {};
    if (ids.length > 0) {
      const { data: pacientes } = await supabase
        .from("clientes")
        .select("id, nome, foto")
        .in("id", ids)
        .is("deleted_at", null);
      mapa = Object.fromEntries(
        ((pacientes ?? []) as { id: string; nome: string; foto: string }[]).map((p) => [
          p.id,
          { nome: p.nome, foto: p.foto },
        ]),
      );
    }

    return lista.map((r) => ({
      nota: r.nota,
      paciente_nome: mapa[r.paciente_id]?.nome || "Anônimo",
      paciente_foto: mapa[r.paciente_id]?.foto || "",
      comentario: r.comentario,
      criado_em: r.criado_em,
    }));
  } catch {
    return [];
  }
}
