// ═══════════════════════════════════════════════════════════════════════════════
// /salas/[id] — detalhe público de uma sala + solicitar reserva. Lê salas_publicas
// (sem endereco_id/contato). O contato só é revelado após aprovação (RPC).
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Wrench } from "lucide-react";
import Container from "@/components/Container";
import { supabase } from "@/lib/supabase/public";
import { getUsuario } from "@/lib/auth";
import { formatarPreco, type SalaPublica, type DisponibilidadeDia } from "@/lib/salas";
import SolicitarReserva from "../SolicitarReserva";
import MuroSalas from "../MuroSalas";

export const dynamic = "force-dynamic";

// Members-only (regra de produto) → noindex.
export const metadata: Metadata = {
  title: "Sala odontológica | CuraDentes Pro",
  robots: { index: false, follow: false },
};

export default async function SalaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  // Gate members-only ANTES de buscar dados.
  const usuario = await getUsuario();
  if (!usuario?.croVerificado) return <MuroSalas modo={usuario ? "sem-cro" : "anonimo"} />;

  const { id } = await params;
  const { data } = await supabase.from("salas_publicas").select("*").eq("id", id).maybeSingle();
  const sala = data as SalaPublica | null;
  if (!sala) notFound();

  const dias = (sala.disponibilidade ?? []).filter((d: DisponibilidadeDia) => d.ativo);

  return (
    <Container className="py-10 md:py-12">
      <Link
        href="/salas"
        className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> Todas as salas
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Detalhe */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-[26px] font-bold text-brand-navy">{sala.titulo}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-[14px] text-ink-muted">
              <MapPin size={15} />
              {[sala.bairro, sala.cidade, sala.estado].filter(Boolean).join(", ") || sala.nome_clinica}
            </p>
            <p className="mt-3 text-[20px] font-bold text-brand-blue">
              {formatarPreco(sala.preco_valor, sala.preco_unidade)}
            </p>
          </div>

          {sala.descricao && (
            <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm">
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
                {sala.descricao}
              </p>
            </section>
          )}

          {sala.equipamentos.length > 0 && (
            <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
                <Wrench size={16} style={{ color: "#007aff" }} /> Equipamentos e estrutura
              </h2>
              <div className="flex flex-wrap gap-2">
                {sala.equipamentos.map((e) => (
                  <span
                    key={e}
                    className="rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-medium text-brand-navy"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </section>
          )}

          {dias.length > 0 && (
            <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
                <Clock size={16} style={{ color: "#007aff" }} /> Disponibilidade
              </h2>
              <ul className="flex flex-col gap-1.5">
                {dias.map((d) => (
                  <li key={d.dia} className="flex justify-between text-[14px] text-ink-soft">
                    <span>{d.dia}</span>
                    <span className="font-medium text-ink">
                      {d.inicio} – {d.fim}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sala.politica_cancelamento && (
            <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-[15px] font-bold text-brand-navy">Política de cancelamento</h2>
              <p className="text-[14px] text-ink-soft">{sala.politica_cancelamento}</p>
            </section>
          )}
        </div>

        {/* Solicitar (sticky no desktop) */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SolicitarReserva salaId={sala.id} />
        </aside>
      </div>
    </Container>
  );
}
