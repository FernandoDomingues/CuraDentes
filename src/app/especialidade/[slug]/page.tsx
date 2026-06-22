// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA DE ESPECIALIDADE — /especialidade/[slug]
//
// Conteúdo rico e 100% ESTÁTICO (SSG): introdução, tópicos, benefícios, FAQ e
// links de referência. É material pensado para SEO/AEO — responde dúvidas reais
// do paciente, então buscadores e IAs têm o que indexar e citar.
//
// JSON-LD: FAQPage (perguntas frequentes) + Breadcrumb. Todas as especialidades
// conhecidas são pré-geradas no build (generateStaticParams).
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import JsonLd from "@/components/JsonLd";
import { ESPECIALIDADES_SEO, especialidadePorSlug, nomeAmigavel } from "@/lib/especialidades";
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

  const amigavel = nomeAmigavel(esp.nome);

  return (
    <>
      <JsonLd
        data={[
          jsonLdFaq(esp.faq),
          jsonLdBreadcrumb([
            { nome: "Início", url: "/" },
            { nome: "Especialidades", url: "/#especialidades" },
            { nome: amigavel, url: `/especialidade/${esp.slug}` },
          ]),
        ]}
      />

      {/* Herói */}
      <section className="bg-gradient-to-b from-brand-soft to-white">
        <Container className="grid items-center gap-8 py-12 md:grid-cols-2 md:py-16">
          <div>
            <nav className="mb-3 text-sm text-ink-muted">
              <Link href="/" className="hover:text-brand-blue">Início</Link>
              <span className="mx-2">/</span>
              <Link href="/#especialidades" className="hover:text-brand-blue">Especialidades</Link>
            </nav>
            <h1 className="text-4xl font-bold leading-tight text-brand-navy">{amigavel}</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">{esp.introducao}</p>
            <Link
              href={`/busca?q=${encodeURIComponent(esp.nome)}`}
              className="mt-6 inline-flex min-h-[48px] items-center rounded-[14px] bg-brand-blue px-7 font-semibold text-white transition-colors hover:bg-brand-blue-600"
            >
              Ver dentistas de {amigavel.toLowerCase()}
            </Link>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-black/8 bg-white">
            <Image
              src={esp.heroImage}
              alt={amigavel}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 py-14 lg:grid-cols-[1fr_320px]">
        {/* Conteúdo principal */}
        <div className="flex flex-col gap-10">
          {/* Tópicos */}
          <div className="flex flex-col gap-6">
            {esp.topicos.map((t) => (
              <div key={t.titulo}>
                <h2 className="text-2xl font-bold text-brand-navy">{t.titulo}</h2>
                <p className="mt-2 leading-relaxed text-ink-soft">{t.texto}</p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div>
            <h2 className="mb-4 text-2xl font-bold text-brand-navy">Perguntas frequentes</h2>
            <div className="flex flex-col gap-3">
              {esp.faq.map((f) => (
                <details
                  key={f.pergunta}
                  className="group rounded-2xl border border-black/8 bg-white p-5"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-brand-navy [&::-webkit-details-marker]:hidden">
                    {f.pergunta}
                    <span className="text-brand-blue transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-ink-soft">{f.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* Barra lateral: benefícios + links */}
        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl border border-black/8 bg-white p-5">
            <h2 className="mb-3 text-lg font-bold text-brand-navy">Benefícios</h2>
            <ul className="flex flex-col gap-2">
              {esp.beneficios.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-ink-soft">
                  <span className="mt-0.5 text-brand-blue">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {esp.linksExternos.length > 0 && (
            <div className="rounded-2xl border border-black/8 bg-white p-5">
              <h2 className="mb-3 text-lg font-bold text-brand-navy">Saiba mais</h2>
              <ul className="flex flex-col gap-2">
                {esp.linksExternos.map((l) => (
                  <li key={l.url}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-blue hover:underline"
                    >
                      {l.label} →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </Container>
    </>
  );
}
