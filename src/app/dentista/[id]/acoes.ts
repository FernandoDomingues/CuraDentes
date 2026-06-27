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
