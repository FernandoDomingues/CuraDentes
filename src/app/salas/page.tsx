// ═══════════════════════════════════════════════════════════════════════════════
// /salas — lista PÚBLICA de salas para alugar (Fase 1, sem geo). Lê a view
// salas_publicas (anon) — sem endereco_id/contato. Busca textual por cidade.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import { Search, MapPin, DoorOpen } from "lucide-react";
import Container from "@/components/Container";
import { supabase } from "@/lib/supabase/public";
import { getUsuario } from "@/lib/auth";
import { formatarPreco, type SalaPublica } from "@/lib/salas";
import MuroSalas from "./MuroSalas";

export const dynamic = "force-dynamic";

// Members-only (regra de produto): área só para dentista com CRO aprovado → noindex.
export const metadata: Metadata = {
  title: "Locação de salas | CuraDentes Pro",
  robots: { index: false, follow: false },
};

export default async function SalasPage({
  searchParams,
}: {
  searchParams: Promise<{ cidade?: string }>;
}) {
  // Gate members-only ANTES de buscar dados: só dentista com CRO aprovado vê a vitrine.
  const usuario = await getUsuario();
  if (!usuario?.croVerificado) return <MuroSalas modo={usuario ? "sem-cro" : "anonimo"} />;

  const { cidade } = await searchParams;
  const termo = (cidade ?? "").trim();

  let query = supabase
    .from("salas_publicas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  if (termo) query = query.ilike("cidade", `%${termo}%`);
  const { data } = await query;
  const salas = (data as SalaPublica[]) ?? [];

  return (
    <Container className="py-10 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-bold text-brand-navy">Alugue uma sala odontológica</h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          Locação pontual de consultórios para o seu atendimento — por hora, turno ou dia.
        </p>
      </div>

      {/* Busca por cidade (GET, sem JS) */}
      <form action="/salas" method="get" className="mx-auto mb-8 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            name="cidade"
            defaultValue={termo}
            placeholder="Cidade (ex.: Sorocaba)"
            className="w-full rounded-full border border-black/15 py-3 pl-10 pr-4 text-[15px] outline-none focus:border-brand-blue"
          />
        </div>
        <button
          type="submit"
          className="rounded-full px-5 py-3 text-[15px] font-semibold text-white"
          style={{ background: "#007aff" }}
        >
          Buscar
        </button>
      </form>

      {salas.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-[20px] py-14 text-center"
          style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}
        >
          <DoorOpen size={34} style={{ color: "rgba(0,122,255,0.30)" }} />
          <p className="text-[16px] font-semibold text-brand-navy">Nenhuma sala encontrada</p>
          <p className="text-[14px] text-ink-muted">
            {termo ? `Sem salas em “${termo}” por enquanto.` : "Ainda não há salas anunciadas."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {salas.map((s) => (
            <Link
              key={s.id}
              href={`/salas/${s.id}`}
              className="flex flex-col gap-3 rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div>
                <h2 className="line-clamp-2 text-[16px] font-bold text-brand-navy">{s.titulo}</h2>
                <p className="mt-1 flex items-center gap-1 text-[13px] text-ink-muted">
                  <MapPin size={13} />
                  {[s.bairro, s.cidade].filter(Boolean).join(", ") || s.nome_clinica || "—"}
                </p>
              </div>
              <p className="text-[15px] font-bold text-brand-blue">
                {formatarPreco(s.preco_valor, s.preco_unidade)}
              </p>
              {s.equipamentos.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {s.equipamentos.slice(0, 3).map((e) => (
                    <span
                      key={e}
                      className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand-navy"
                    >
                      {e}
                    </span>
                  ))}
                  {s.equipamentos.length > 3 && (
                    <span className="px-1 text-[11px] text-ink-muted">+{s.equipamentos.length - 3}</span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
