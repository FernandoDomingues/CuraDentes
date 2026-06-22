// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICAR CRO — fila (/pro/verificar-cro) — Server Component.
//
// Superuser-only (guard no layout). Carrega no servidor TODOS os dentistas com CRO
// + a tabela cro_verificacoes, combina por dentista_id (quem não tem registro fica
// "pendente"), e entrega a lista para o componente cliente filtrar/buscar/navegar.
// ═══════════════════════════════════════════════════════════════════════════════

import { criarClienteServidor } from "@/lib/supabase/server";
import { ufDoCro } from "@/lib/cro";
import VerificarCroLista, { type VerificacaoRow } from "./VerificarCroLista";

export const dynamic = "force-dynamic";

interface DentistaDb {
  id: string;
  nome: string | null;
  email: string | null;
  cro: string | null;
  cro_verificado: boolean | null;
  deleted_at: string | null;
  criado_em?: string | null;
}
interface VerifDb {
  id: string;
  dentista_id: string;
  uf: string | null;
  status: VerificacaoRow["status"];
  erro: string | null;
  observacao: string | null;
  criado_em: string;
}

export default async function VerificarCroFilaPage() {
  const supabase = await criarClienteServidor();

  const [dentistasRes, verifRes] = await Promise.all([
    supabase
      .from("curadentespro")
      .select("id, nome, email, cro, cro_verificado, deleted_at, criado_em")
      .not("cro", "is", null)
      .neq("cro", ""),
    supabase.from("cro_verificacoes").select("*"),
  ]);

  const verifMap = new Map<string, VerifDb>();
  for (const v of ((verifRes.data as VerifDb[]) ?? [])) verifMap.set(v.dentista_id, v);

  const rows: VerificacaoRow[] = ((dentistasRes.data as DentistaDb[]) ?? []).map((pro) => {
    const v = verifMap.get(pro.id);
    return {
      id: v?.id ?? null,
      dentista_id: pro.id,
      cro: pro.cro ?? "",
      uf: v?.uf || ufDoCro(pro.cro ?? ""),
      status: v?.status ?? "pendente",
      erro: v?.erro ?? null,
      criado_em: v?.criado_em || pro.criado_em || "",
      nome: pro.nome ?? "",
      email: pro.email ?? "",
      cro_verificado: !!pro.cro_verificado,
      deleted_at: pro.deleted_at ?? null,
    };
  });

  rows.sort((a, b) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime());

  return <VerificarCroLista rows={rows} />;
}
