// ═══════════════════════════════════════════════════════════════════════════════
// /coworking — CATÁLOGO por CLÍNICA. A busca mostra clínicas (com fachada + nº de salas
// + preço mínimo); ao entrar numa clínica, o dentista escolhe a sala. Members-only.
// Lê a RPC get_clinicas_publicas (gated por CRO) via cliente autenticado.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import { Search, Building2, MapPin, ArrowLeft } from "lucide-react";
import Container from "@/components/Container";
import { criarClienteServidor } from "@/lib/supabase/server";
import { getUsuario } from "@/lib/auth";
import type { ClinicaPublica } from "@/lib/salas";
import MuroSalas from "./MuroSalas";
import ClinicaCard from "./ClinicaCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Locação de salas | CuraDentes Pro",
  robots: { index: false, follow: false },
};

export default async function SalasPage({
  searchParams,
}: {
  searchParams: Promise<{ cidade?: string }>;
}) {
  const usuario = await getUsuario();
  if (!usuario?.croVerificado) return <MuroSalas modo={usuario ? "sem-cro" : "anonimo"} />;

  const { cidade } = await searchParams;
  const termo = (cidade ?? "").trim();

  const sb = await criarClienteServidor();
  const { data } = await sb.rpc("get_clinicas_publicas", { p_cidade: termo || null });
  const clinicas = ((data as ClinicaPublica[]) ?? []).map((c) => ({
    ...c,
    qtd_salas: Number(c.qtd_salas) || 0,
    preco_min: c.preco_min == null ? null : Number(c.preco_min),
  }));

  return (
    <>
      {/* Hero com busca */}
      <section style={{ background: "linear-gradient(135deg, #0A2A66 0%, #1a4b99 100%)", boxShadow: "0 12px 40px rgba(10,42,102,0.18)" }}>
        <Container className="py-12 md:py-16">
          <Link href="/pro/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/80 transition-colors hover:text-white">
            <ArrowLeft size={15} /> Voltar ao painel
          </Link>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-[30px] font-bold leading-tight text-white md:text-[36px]">Alugue uma sala odontológica</h1>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/75 md:text-[16px]">
              Encontre clínicas perto de você e escolha a sala para o seu atendimento. Exclusivo para dentistas verificados.
            </p>
            <form action="/coworking" method="get" className="mx-auto mt-7 flex max-w-xl gap-2 rounded-full bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
              <div className="relative flex-1">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input name="cidade" defaultValue={termo} placeholder="Em qual cidade você procura?" className="w-full rounded-full border-0 bg-transparent py-3 pl-11 pr-4 text-[15px] text-ink outline-none placeholder:text-ink-muted" />
              </div>
              <button type="submit" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110" style={{ background: "#007aff" }}>
                <Search size={17} /> Buscar
              </button>
            </form>
          </div>
        </Container>
      </section>

      {/* Resultados (clínicas) */}
      <Container className="py-10 md:py-12">
        <div className="mb-6 flex items-baseline justify-between gap-3">
          <h2 className="text-[18px] font-bold text-brand-navy">
            {termo ? `Clínicas em “${termo}”` : "Clínicas com salas"}
          </h2>
          {clinicas.length > 0 && (
            <span className="text-[13px] font-medium text-ink-muted">
              {clinicas.length} {clinicas.length === 1 ? "clínica" : "clínicas"}
            </span>
          )}
        </div>

        {clinicas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[20px] py-16 text-center" style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}>
            <Building2 size={36} style={{ color: "rgba(0,122,255,0.30)" }} />
            <p className="text-[16px] font-semibold text-brand-navy">Nenhuma clínica encontrada</p>
            <p className="text-[14px] text-ink-muted">
              {termo ? `Sem clínicas com salas em “${termo}” por enquanto.` : "Ainda não há clínicas com salas anunciadas."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {clinicas.map((c) => (
              <ClinicaCard key={c.slug} clinica={c} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
