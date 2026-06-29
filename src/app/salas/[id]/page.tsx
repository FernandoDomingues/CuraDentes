// ═══════════════════════════════════════════════════════════════════════════════
// /salas/[id] — DETALHE da sala (estilo portal imobiliário, identidade CuraDentes).
// Members-only: gate de CRO antes de buscar. Detalhe completo (contato + endereço)
// vem da RPC get_sala_detalhe (porteiro de CRO); fallback p/ a view pública enquanto
// o SQL 05-detalhe-membros.sql não estiver aplicado. Mapa exato via lat/lng.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, MapPin, Clock, BadgeCheck, Check, CalendarDays, Layers,
  MessageCircle, Mail, ExternalLink, Wrench,
} from "lucide-react";
import Container from "@/components/Container";
import { supabase as supabasePublic } from "@/lib/supabase/public";
import { criarClienteServidor } from "@/lib/supabase/server";
import { getUsuario } from "@/lib/auth";
import {
  PRECO_UNIDADE_LABEL, normalizarBlocos, descreverBloco,
  type SalaPublica, type SalaDetalhe,
} from "@/lib/salas";
import SolicitarReserva from "../SolicitarReserva";
import MuroSalas from "../MuroSalas";
import GaleriaSala from "../GaleriaSala";
import MapaSala from "../MapaSala";
import SalaCard from "../SalaCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sala odontológica | CuraDentes Pro",
  robots: { index: false, follow: false },
};

export default async function SalaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  // Gate members-only ANTES de buscar dados.
  const usuario = await getUsuario();
  if (!usuario?.croVerificado) return <MuroSalas modo={usuario ? "sem-cro" : "anonimo"} />;

  const { id } = await params;
  const sb = await criarClienteServidor();

  // Detalhe completo (contato + endereço) via RPC gated; fallback p/ a view pública.
  let sala: SalaDetalhe | null = null;
  const { data: rpcData, error: rpcErr } = await sb.rpc("get_sala_detalhe", { p_id: id });
  if (!rpcErr && Array.isArray(rpcData) && rpcData[0]) {
    sala = rpcData[0] as SalaDetalhe;
  } else {
    const { data } = await supabasePublic.from("salas_publicas").select("*").eq("id", id).maybeSingle();
    if (data) {
      sala = {
        ...(data as SalaPublica),
        contato_whatsapp: null, contato_email: null,
        logradouro: null, numero: null, complemento: null, cep: null,
      };
    }
  }
  if (!sala) notFound();

  // Veja também: outras salas ativas (qualquer uma menos esta).
  const { data: outrasData } = await supabasePublic
    .from("salas_publicas").select("*").neq("id", id)
    .order("created_at", { ascending: false }).limit(3);
  const outras = (outrasData as SalaPublica[]) ?? [];

  const blocos = normalizarBlocos(sala.disponibilidade ?? []);
  const nDiasDisp = new Set(blocos.map((b) => (b.tipo === "semanal" ? `s${b.diaSemana}` : `d${b.data}`))).size;
  const temContato = !!(sala.contato_whatsapp || sala.contato_email);
  const temMapa = sala.latitude != null && sala.longitude != null;
  const mapsUrl = temMapa ? `https://www.google.com/maps/search/?api=1&query=${sala.latitude},${sala.longitude}` : null;
  const enderecoLinha = [
    sala.logradouro ? `${sala.logradouro}${sala.numero ? `, ${sala.numero}` : ""}` : null,
    sala.complemento,
    sala.bairro,
    sala.cidade ? `${sala.cidade}${sala.estado ? `/${sala.estado}` : ""}` : null,
  ].filter(Boolean).join(" — ");

  const secao = "rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm md:p-6";

  return (
    <Container className="py-8 md:py-10">
      <Link
        href="/salas"
        className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> Todas as salas
      </Link>

      {/* Galeria */}
      <GaleriaSala fotos={sala.fotos ?? []} titulo={sala.titulo} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Conteúdo */}
        <div className="flex flex-col gap-6">
          {/* Cabeçalho */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="text-[26px] font-bold leading-tight text-brand-navy md:text-[30px]">
                {sala.titulo}
              </h1>
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[12px] font-bold text-white"
                style={{ background: "rgba(10,42,102,0.88)" }}
              >
                <BadgeCheck size={13} /> Verificado
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-ink-muted">
              <MapPin size={15} />
              {[sala.bairro, sala.cidade, sala.estado].filter(Boolean).join(", ") || sala.nome_clinica}
            </p>
            <p className="mt-3">
              <span className="text-[26px] font-bold text-brand-blue">
                {sala.preco_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              <span className="text-[15px] font-medium text-ink-muted"> {PRECO_UNIDADE_LABEL[sala.preco_unidade]}</span>
            </p>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Spec icone={<Clock size={18} />} valor={sala.preco_unidade === "hora" ? "Por hora" : sala.preco_unidade === "turno" ? "Por turno" : "Por dia"} rotulo="Cobrança" />
            <Spec icone={<Layers size={18} />} valor={String(sala.equipamentos.length)} rotulo={sala.equipamentos.length === 1 ? "Equipamento" : "Equipamentos"} />
            <Spec icone={<CalendarDays size={18} />} valor={String(nDiasDisp)} rotulo={nDiasDisp === 1 ? "Dia com horário" : "Dias com horário"} />
            <Spec icone={<MapPin size={18} />} valor={sala.cidade ?? "—"} rotulo="Cidade" />
          </div>

          {/* Descrição */}
          {sala.descricao && (
            <section className={secao}>
              <h2 className="mb-2 text-[16px] font-bold text-brand-navy">Sobre a sala</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{sala.descricao}</p>
            </section>
          )}

          {/* Comodidades */}
          {sala.equipamentos.length > 0 && (
            <section className={secao}>
              <h2 className="mb-4 flex items-center gap-2 text-[16px] font-bold text-brand-navy">
                <Wrench size={17} style={{ color: "#007aff" }} /> Equipamentos e estrutura
              </h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {sala.equipamentos.map((e) => (
                  <div key={e} className="flex items-center gap-2.5 text-[14px] text-ink-soft">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(52,199,89,0.12)" }}>
                      <Check size={13} style={{ color: "#2a8a3e" }} />
                    </span>
                    {e}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Disponibilidade (resumo dos blocos; o calendário fica no box de solicitar) */}
          {blocos.length > 0 && (
            <section className={secao}>
              <h2 className="mb-3 flex items-center gap-2 text-[16px] font-bold text-brand-navy">
                <Clock size={17} style={{ color: "#007aff" }} /> Disponibilidade
              </h2>
              <ul className="flex flex-col gap-1.5">
                {blocos.map((b, i) => (
                  <li key={i} className="text-[14px] text-ink-soft">{descreverBloco(b)}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Localização (mapa exato) */}
          {temMapa && (
            <section className={secao}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[16px] font-bold text-brand-navy">
                  <MapPin size={17} style={{ color: "#007aff" }} /> Localização
                </h2>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold"
                    style={{ background: "rgba(0,122,255,0.08)", color: "#007aff", border: "0.5px solid rgba(0,122,255,0.18)" }}
                  >
                    <ExternalLink size={12} /> Abrir no Google Maps
                  </a>
                )}
              </div>
              {enderecoLinha && (
                <p className="mb-3 text-[14px] text-ink-soft">
                  {sala.nome_clinica && <span className="font-semibold text-ink">{sala.nome_clinica}</span>}
                  {sala.nome_clinica && enderecoLinha && " · "}
                  {enderecoLinha}
                  {sala.cep ? ` · CEP ${sala.cep}` : ""}
                </p>
              )}
              <div className="h-[280px] w-full overflow-hidden rounded-[14px]">
                <MapaSala lat={sala.latitude as number} lng={sala.longitude as number} titulo={sala.titulo} />
              </div>
            </section>
          )}

          {/* Contato da clínica (members-only; aparece após rodar a RPC) */}
          {temContato && (
            <section className={secao}>
              <h2 className="mb-3 text-[16px] font-bold text-brand-navy">Contato da clínica</h2>
              <div className="flex flex-col gap-2.5">
                {sala.contato_whatsapp && (
                  <a
                    href={`https://wa.me/55${sala.contato_whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[15px] font-semibold text-brand-blue"
                  >
                    <MessageCircle size={16} /> {sala.contato_whatsapp}
                  </a>
                )}
                {sala.contato_email && (
                  <a href={`mailto:${sala.contato_email}`} className="inline-flex items-center gap-2 break-all text-[15px] font-semibold text-brand-blue">
                    <Mail size={16} /> {sala.contato_email}
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Política */}
          {sala.politica_cancelamento && (
            <section className={secao}>
              <h2 className="mb-2 text-[16px] font-bold text-brand-navy">Política de cancelamento</h2>
              <p className="text-[14px] text-ink-soft">{sala.politica_cancelamento}</p>
            </section>
          )}
        </div>

        {/* Solicitar (sticky no desktop) */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SolicitarReserva salaId={sala.id} disponibilidade={blocos} />
        </aside>
      </div>

      {/* Veja também */}
      {outras.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 text-[18px] font-bold text-brand-navy">Veja também</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {outras.map((s) => (
              <SalaCard key={s.id} sala={s} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}

function Spec({ icone, valor, rotulo }: { icone: React.ReactNode; valor: string; rotulo: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[14px] border border-gray-100 bg-white p-3 text-center shadow-sm">
      <span style={{ color: "#007aff" }}>{icone}</span>
      <span className="truncate text-[14px] font-bold text-brand-navy" title={valor}>{valor}</span>
      <span className="text-[11px] text-ink-muted">{rotulo}</span>
    </div>
  );
}
