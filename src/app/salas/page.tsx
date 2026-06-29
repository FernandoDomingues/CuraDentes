// ═══════════════════════════════════════════════════════════════════════════════
// /salas — CATÁLOGO de salas (estilo portal imobiliário, identidade CuraDentes).
// Members-only: só dentista com CRO aprovado vê (gate antes de buscar dados).
// Lê a view salas_publicas (anon, só colunas seguras). Busca textual por cidade.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import { Search, DoorOpen, MapPin } from "lucide-react";
import Container from "@/components/Container";
import { supabase } from "@/lib/supabase/public";
import { getUsuario } from "@/lib/auth";
import type { SalaPublica } from "@/lib/salas";
import MuroSalas from "./MuroSalas";
import SalaCard from "./SalaCard";

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
    <>
      {/* Hero com busca */}
      <section
        style={{
          background: "linear-gradient(135deg, #0A2A66 0%, #1a4b99 100%)",
          boxShadow: "0 12px 40px rgba(10,42,102,0.18)",
        }}
      >
        <Container className="py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-[30px] font-bold leading-tight text-white md:text-[36px]">
              Alugue uma sala odontológica
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/75 md:text-[16px]">
              Locação pontual de consultórios equipados para o seu atendimento — por hora, turno ou dia.
              Exclusivo para dentistas verificados.
            </p>

            <form
              action="/salas"
              method="get"
              className="mx-auto mt-7 flex max-w-xl gap-2 rounded-full bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
            >
              <div className="relative flex-1">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  name="cidade"
                  defaultValue={termo}
                  placeholder="Em qual cidade você procura?"
                  className="w-full rounded-full border-0 bg-transparent py-3 pl-11 pr-4 text-[15px] text-ink outline-none placeholder:text-ink-muted"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110"
                style={{ background: "#007aff" }}
              >
                <Search size={17} /> Buscar
              </button>
            </form>
          </div>
        </Container>
      </section>

      {/* Resultados */}
      <Container className="py-10 md:py-12">
        <div className="mb-6 flex items-baseline justify-between gap-3">
          <h2 className="text-[18px] font-bold text-brand-navy">
            {termo ? `Salas em “${termo}”` : "Salas disponíveis"}
          </h2>
          {salas.length > 0 && (
            <span className="text-[13px] font-medium text-ink-muted">
              {salas.length} {salas.length === 1 ? "sala" : "salas"}
            </span>
          )}
        </div>

        {salas.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-[20px] py-16 text-center"
            style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}
          >
            <DoorOpen size={36} style={{ color: "rgba(0,122,255,0.30)" }} />
            <p className="text-[16px] font-semibold text-brand-navy">Nenhuma sala encontrada</p>
            <p className="text-[14px] text-ink-muted">
              {termo ? `Sem salas em “${termo}” por enquanto.` : "Ainda não há salas anunciadas."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {salas.map((s) => (
              <SalaCard key={s.id} sala={s} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
