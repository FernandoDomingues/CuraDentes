// ═══════════════════════════════════════════════════════════════════════════════
// /salas/clinica/[slug] — página da CLÍNICA: fachada/recepção + contato + mapa, e as
// SALAS daquela clínica para o dentista escolher. Members-only (gate de CRO).
// Lê get_clinica_por_slug (gated) + salas_publicas filtrando clinica_slug.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle, Phone, ExternalLink } from "lucide-react";
import Container from "@/components/Container";
import { criarClienteServidor } from "@/lib/supabase/server";
import { supabase as supabasePublic } from "@/lib/supabase/public";
import { getUsuario } from "@/lib/auth";
import type { ClinicaDetalhe, SalaPublica } from "@/lib/salas";
import MuroSalas from "../../MuroSalas";
import GaleriaSala from "../../GaleriaSala";
import MapaSala from "../../MapaSala";
import SalaCard from "../../SalaCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clínica | CuraDentes Pro",
  robots: { index: false, follow: false },
};

export default async function ClinicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const usuario = await getUsuario();
  if (!usuario?.croVerificado) return <MuroSalas modo={usuario ? "sem-cro" : "anonimo"} />;

  const { slug } = await params;
  const sb = await criarClienteServidor();
  const { data: cData } = await sb.rpc("get_clinica_por_slug", { p_slug: slug });
  const clinica = (Array.isArray(cData) ? cData[0] : null) as ClinicaDetalhe | null;
  if (!clinica) notFound();

  const { data: sData } = await supabasePublic
    .from("salas_publicas")
    .select("*")
    .eq("clinica_slug", slug)
    .order("numero_na_clinica", { ascending: true });
  const salas = (sData as SalaPublica[]) ?? [];

  const fotos = [clinica.foto_fachada, ...(clinica.fotos_recepcao ?? [])].filter(Boolean) as string[];
  const temMapa = clinica.latitude != null && clinica.longitude != null;
  const mapsUrl = temMapa ? `https://www.google.com/maps/search/?api=1&query=${clinica.latitude},${clinica.longitude}` : null;
  const enderecoLinha = [
    clinica.logradouro ? `${clinica.logradouro}${clinica.numero ? `, ${clinica.numero}` : ""}` : null,
    clinica.complemento,
    clinica.bairro,
    clinica.cidade ? `${clinica.cidade}${clinica.estado ? `/${clinica.estado}` : ""}` : null,
  ].filter(Boolean).join(" — ");
  const wpp = clinica.whatsapp || clinica.telefone;

  const secao = "rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm md:p-6";

  return (
    <Container className="py-8 md:py-10">
      <Link href="/salas" className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft size={16} /> Todas as clínicas
      </Link>

      <GaleriaSala fotos={fotos} titulo={clinica.nome_clinica ?? "Clínica"} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Esquerda: clínica + salas */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-brand-navy md:text-[30px]">{clinica.nome_clinica ?? "Clínica"}</h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-ink-muted">
              <MapPin size={15} /> {enderecoLinha || [clinica.bairro, clinica.cidade].filter(Boolean).join(", ")}
              {clinica.cep ? ` · CEP ${clinica.cep}` : ""}
            </p>
          </div>

          <section>
            <h2 className="mb-4 text-[18px] font-bold text-brand-navy">
              Salas disponíveis {salas.length > 0 && <span className="text-[14px] font-medium text-ink-muted">({salas.length})</span>}
            </h2>
            {salas.length === 0 ? (
              <p className="rounded-[16px] border border-dashed border-black/15 bg-white py-10 text-center text-[14px] text-ink-muted">
                Esta clínica não tem salas ativas no momento.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {salas.map((s) => (
                  <SalaCard key={s.id} sala={s} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Direita: contato + mapa */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {wpp && (
            <div className={secao}>
              <h2 className="mb-3 text-[16px] font-bold text-brand-navy">Contato da clínica</h2>
              <div className="flex flex-col gap-2.5">
                {clinica.whatsapp && (
                  <a href={`https://wa.me/55${clinica.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[15px] font-semibold text-brand-blue">
                    <MessageCircle size={16} /> {clinica.whatsapp}
                  </a>
                )}
                {clinica.telefone && (
                  <a href={`tel:${clinica.telefone.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 text-[15px] font-semibold text-brand-blue">
                    <Phone size={16} /> {clinica.telefone}
                  </a>
                )}
              </div>
            </div>
          )}

          {temMapa && (
            <div className={secao}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[16px] font-bold text-brand-navy"><MapPin size={17} style={{ color: "#007aff" }} /> Onde fica</h2>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: "rgba(0,122,255,0.08)", color: "#007aff", border: "0.5px solid rgba(0,122,255,0.18)" }}>
                    <ExternalLink size={12} /> Google Maps
                  </a>
                )}
              </div>
              <div className="h-[240px] w-full overflow-hidden rounded-[14px]">
                <MapaSala lat={clinica.latitude as number} lng={clinica.longitude as number} titulo={clinica.nome_clinica ?? "Clínica"} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </Container>
  );
}
