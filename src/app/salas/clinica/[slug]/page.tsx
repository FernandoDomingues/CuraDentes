// ═══════════════════════════════════════════════════════════════════════════════
// /salas/clinica/[slug] — página da CLÍNICA. Ordem (desktop, margens reduzidas p/
// mais campo de visão): H1 nome → endereço escrito → fachada → mapa → as SALAS
// (cards ricos com fotos, hora+diária, equipamentos e solicitar). Members-only.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle, Phone, ExternalLink } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { supabase as supabasePublic } from "@/lib/supabase/public";
import { getUsuario } from "@/lib/auth";
import type { ClinicaDetalhe, SalaPublica, SlotOcupado } from "@/lib/salas";
import MuroSalas from "../../MuroSalas";
import MapaSala from "../../MapaSala";
import SalaBlocoClinica from "../../SalaBlocoClinica";

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

  // Horários ocupados por sala (para a agenda pintar/bloquear).
  const ocupadosPorSala = new Map<string, SlotOcupado[]>();
  await Promise.all(
    salas.map(async (s) => {
      const { data } = await sb.rpc("slots_ocupados_sala", { p_sala_id: s.id });
      ocupadosPorSala.set(s.id, (data as SlotOcupado[]) ?? []);
    }),
  );

  const temMapa = clinica.latitude != null && clinica.longitude != null;
  const mapsUrl = temMapa ? `https://www.google.com/maps/search/?api=1&query=${clinica.latitude},${clinica.longitude}` : null;
  const enderecoLinha = [
    clinica.logradouro ? `${clinica.logradouro}${clinica.numero ? `, ${clinica.numero}` : ""}` : null,
    clinica.complemento,
    clinica.bairro,
    clinica.cidade ? `${clinica.cidade}${clinica.estado ? `/${clinica.estado}` : ""}` : null,
    clinica.cep ? `CEP ${clinica.cep}` : null,
  ].filter(Boolean).join(" — ");

  return (
    // Margens laterais reduzidas (~30%) no desktop → mais campo de visão.
    <div className="mx-auto w-full max-w-[1380px] px-5 py-8 md:px-8 md:py-10">
      <Link href="/salas" className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft size={16} /> Todas as clínicas
      </Link>

      {/* 1) Nome */}
      <h1 className="text-[28px] font-bold leading-tight text-brand-navy md:text-[34px]">
        {clinica.nome_clinica ?? "Clínica"}
      </h1>

      {/* 2) Endereço por escrito (+ contato compacto) */}
      <p className="mt-2 flex items-start gap-1.5 text-[15px] text-ink-soft">
        <MapPin size={17} className="mt-0.5 shrink-0 text-ink-muted" />
        {enderecoLinha || [clinica.bairro, clinica.cidade].filter(Boolean).join(", ")}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
        {clinica.whatsapp && (
          <a href={`https://wa.me/55${clinica.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-blue">
            <MessageCircle size={15} /> {clinica.whatsapp}
          </a>
        )}
        {clinica.telefone && (
          <a href={`tel:${clinica.telefone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1.5 font-semibold text-brand-blue">
            <Phone size={15} /> {clinica.telefone}
          </a>
        )}
      </div>

      {/* 3) Fachada (+ recepção em miniaturas) */}
      {clinica.foto_fachada ? (
        <div className="mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={clinica.foto_fachada} alt={`Fachada — ${clinica.nome_clinica ?? "clínica"}`} referrerPolicy="no-referrer" className="aspect-[16/9] w-full rounded-[20px] object-cover" />
          {clinica.fotos_recepcao?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2.5">
              {clinica.fotos_recepcao.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt={`Recepção ${i + 1}`} referrerPolicy="no-referrer" className="h-24 w-32 rounded-[12px] object-cover" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 flex aspect-[16/9] w-full items-center justify-center rounded-[20px]" style={{ background: "linear-gradient(135deg, #e3f2fd 0%, #f5f9ff 100%)" }}>
          <span className="text-[13px] font-medium" style={{ color: "rgba(10,42,102,0.40)" }}>Foto da fachada em breve</span>
        </div>
      )}

      {/* 4) Mapa */}
      {temMapa && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-brand-navy"><MapPin size={17} style={{ color: "#007aff" }} /> Onde fica</h2>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: "rgba(0,122,255,0.08)", color: "#007aff", border: "0.5px solid rgba(0,122,255,0.18)" }}>
                <ExternalLink size={12} /> Google Maps
              </a>
            )}
          </div>
          <div className="h-[300px] w-full overflow-hidden rounded-[18px]">
            <MapaSala lat={clinica.latitude as number} lng={clinica.longitude as number} titulo={clinica.nome_clinica ?? "Clínica"} />
          </div>
        </div>
      )}

      {/* 5) Salas */}
      <div className="mt-10">
        <h2 className="mb-5 text-[20px] font-bold text-brand-navy">
          Salas disponíveis {salas.length > 0 && <span className="text-[15px] font-medium text-ink-muted">({salas.length})</span>}
        </h2>
        {salas.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-black/15 bg-white py-12 text-center text-[14px] text-ink-muted">
            Esta clínica não tem salas ativas no momento.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {salas.map((s) => (
              <SalaBlocoClinica key={s.id} sala={s} ocupados={ocupadosPorSala.get(s.id) ?? []} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
