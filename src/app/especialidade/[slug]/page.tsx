// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA DE ESPECIALIDADE — /especialidade/[slug]
//
// Conteúdo rico e 100% ESTÁTICO (SSG): introdução, tópicos, benefícios, FAQ e
// links de referência. É material pensado para SEO/AEO — responde dúvidas reais
// do paciente, então buscadores e IAs têm o que indexar e citar.
//
// JSON-LD: FAQPage (perguntas frequentes) + Breadcrumb. Todas as especialidades
// conhecidas são pré-geradas no build (generateStaticParams).
//
// Visual portado do site-k11 (src/pages/Especialidade.tsx): hero azul-marinho,
// cards de tópicos/FAQ, sidebar de benefícios/links, CTA "encontre perto de você"
// e grade "outras especialidades". O fluxo de dados/SEO permanece o do R0.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Star, CheckCircle, ExternalLink } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import TopDentistas from "./TopDentistas";
import CtaEspecialidade from "./CtaEspecialidade";
import {
  ESPECIALIDADES,
  ESPECIALIDADES_SEO,
  especialidadePorSlug,
  nomeAmigavel,
  slugDaEspecialidade,
} from "@/lib/especialidades";
import { jsonLdFaq, jsonLdBreadcrumb } from "@/lib/jsonld";

type Props = { params: Promise<{ slug: string }> };

// Pré-gera uma página para cada especialidade conhecida (SSG).
export function generateStaticParams() {
  return Object.values(ESPECIALIDADES_SEO).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const esp = especialidadePorSlug(slug);
  if (!esp) return { title: "Especialidade não encontrada", robots: { index: false } };

  return {
    // `absolute` evita o sufixo " | CuraDentes" do layout — o título de SEO da
    // especialidade já traz a marca embutida (senão ficaria duplicado).
    title: { absolute: esp.title },
    description: esp.description,
    keywords: esp.keywords,
    alternates: { canonical: `/especialidade/${esp.slug}` },
    openGraph: {
      title: esp.title,
      description: esp.description,
      images: [esp.heroImage],
    },
  };
}

export default async function PaginaEspecialidade({ params }: Props) {
  const { slug } = await params;
  const esp = especialidadePorSlug(slug);
  if (!esp) notFound();

  const nome = esp.nome;                 // nome canônico (SEO, busca, navegação)
  const nomeExibicao = nomeAmigavel(nome); // nome amigável exibido ao paciente

  return (
    <>
      <JsonLd
        data={[
          jsonLdFaq(esp.faq),
          jsonLdBreadcrumb([
            { nome: "Início", url: "/" },
            { nome: "Especialidades", url: "/#especialidades" },
            { nome: nomeExibicao, url: `/especialidade/${esp.slug}` },
          ]),
        ]}
      />

      <main>
        {/* Breadcrumb */}
        <nav className="container mx-auto px-5 md:px-8 lg:px-16 py-3" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[13px]" style={{ color: "#8E8E93" }}>
            <li><Link href="/" className="hover:text-[#007AFF] transition-colors">Home</Link></li>
            <ChevronRight size={12} />
            <li><Link href="/#especialidades" className="hover:text-[#007AFF] transition-colors">Especialidades</Link></li>
            <ChevronRight size={12} />
            <li aria-current="page" style={{ color: "#0A2A66", fontWeight: 600 }}>{nomeExibicao}</li>
          </ol>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A2A66] to-[#1a4b99] opacity-90" />
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
            <div style={{ background: "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)", width: "100%", height: "100%" }} />
          </div>
          <div className="container mx-auto px-5 md:px-8 lg:px-16 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-8 py-12 lg:py-16">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[12px] font-semibold" style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}>
                  <Star size={12} fill="#FFCC00" stroke="none" />
                  Especialidade
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight" style={{ color: "#fff", fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>
                  {nomeExibicao}
                </h1>
                <p className="text-[16px] lg:text-[17px] leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.80)" }}>
                  {esp.introducao}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  {/* CTA gated: exige login Google (igual k11 → handleSearchNearby). */}
                  <CtaEspecialidade nome={nome} nomeExibicao={nomeExibicao} variant="hero" />
                </div>
              </div>
              <div className="flex-shrink-0 w-full max-w-[400px] lg:max-w-[360px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={esp.heroImage}
                  alt={nomeExibicao}
                  className="w-full aspect-[2/1] object-cover rounded-2xl shadow-2xl"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Conteúdo principal */}
        <section className="py-12 lg:py-16" style={{ background: "#F2F2F7" }}>
          <div className="container mx-auto px-5 md:px-8 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Coluna principal */}
              <div className="lg:col-span-2 flex flex-col gap-8">

                {/* Tópicos detalhados */}
                {esp.topicos.map((topico, i) => (
                  <article key={i} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                    <h2 className="text-xl lg:text-2xl font-bold mb-4" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
                      {topico.titulo}
                    </h2>
                    <p className="text-[15px] leading-relaxed" style={{ color: "#3A3A3C" }}>
                      {topico.texto}
                    </p>
                  </article>
                ))}

                {/* FAQ com Schema */}
                <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                  <h2 className="text-xl lg:text-2xl font-bold mb-6" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
                    Perguntas frequentes sobre {nomeExibicao.toLowerCase()}
                  </h2>
                  <div className="flex flex-col gap-4" itemScope itemType="https://schema.org/FAQPage">
                    {esp.faq.map((item, i) => (
                      <details key={i} className="group rounded-xl overflow-hidden" style={{ border: "0.5px solid rgba(60,60,67,0.12)" }} itemScope itemType="https://schema.org/Question" itemProp="mainEntity">
                        <summary
                          className="flex items-center justify-between px-5 py-4 text-[14px] font-semibold cursor-pointer list-none transition-colors"
                          style={{ color: "#0A2A66" }}
                        >
                          <span itemProp="name">{item.pergunta}</span>
                          <ChevronRight size={16} className="transition-transform group-open:rotate-90" style={{ color: "#8E8E93", flexShrink: 0 }} />
                        </summary>
                        <div className="px-5 pb-4" itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                          <p className="text-[14px] leading-relaxed" style={{ color: "#3A3A3C" }} itemProp="text">{item.resposta}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <aside className="flex flex-col gap-6">

                {/* Benefícios */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-[16px] font-bold mb-4" style={{ color: "#0A2A66" }}>Benefícios</h3>
                  <ul className="flex flex-col gap-3">
                    {esp.beneficios.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14px]" style={{ color: "#3A3A3C" }}>
                        <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#34C759" }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Links externos — sempre renderizado (igual k11). */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-[16px] font-bold mb-4" style={{ color: "#0A2A66" }}>Links úteis</h3>
                  <ul className="flex flex-col gap-2.5">
                    {esp.linksExternos.map((link, i) => (
                      <li key={i}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors hover:underline"
                          style={{ color: "#007AFF" }}
                        >
                          <ExternalLink size={14} />
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Top dentistas (lista dinâmica) + CTA gated + opt-in "ver perto de mim" */}
                <TopDentistas especialidade={nome} />
              </aside>
            </div>
          </div>
        </section>

        {/* Outras especialidades */}
        <section className="py-12 lg:py-16 bg-white">
          <div className="container mx-auto px-5 md:px-8 lg:px-16">
            <h2 className="text-xl lg:text-2xl font-bold text-center mb-8" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}>
              Outras especialidades
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {ESPECIALIDADES.filter((e) => e !== nome).slice(0, 8).map((label) => {
                const seo = ESPECIALIDADES_SEO[label];
                return (
                  <Link
                    key={label}
                    href={`/especialidade/${seo?.slug || slugDaEspecialidade(label)}`}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[14px] font-medium transition-all min-h-[48px]"
                    style={{ background: "rgba(60,60,67,0.04)", color: "#3A3A3C" }}
                  >
                    <ChevronRight size={14} style={{ color: "#007AFF" }} />
                    {nomeAmigavel(label)}
                  </Link>
                );
              })}
            </div>
            <div className="text-center mt-6">
              <Link
                href="/#especialidades"
                className="inline-flex items-center gap-1 text-[14px] font-semibold transition-colors"
                style={{ color: "#007AFF" }}
              >
                Ver todas as especialidades
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
