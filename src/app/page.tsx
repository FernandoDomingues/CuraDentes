// ═══════════════════════════════════════════════════════════════════════════════
// HOME (/) — Server Component, renderizada no servidor (HTML pronto e indexável).
//
// Seções: herói com busca, grade de especialidades, "como funciona" e chamada
// para dentistas. A busca é um <form> GET para /busca: funciona sem JavaScript e
// é rastreável. Inclui JSON-LD de Organization e WebSite (com SearchAction).
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import Container from "@/components/Container";
import JsonLd from "@/components/JsonLd";
import { ESPECIALIDADES, nomeAmigavel, slugDaEspecialidade } from "@/lib/especialidades";
import { jsonLdOrganizacao, jsonLdWebSite } from "@/lib/jsonld";

export default function Home() {
  return (
    <>
      <JsonLd data={[jsonLdOrganizacao(), jsonLdWebSite()]} />

      {/* ── Herói ── */}
      <section className="bg-gradient-to-b from-brand-soft to-white">
        <Container className="py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold leading-tight text-brand-navy md:text-5xl">
              Encontre o dentista certo perto de você
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Compare por especialidade, convênio e avaliações reais. Perfis verificados
              por CRO e contato direto com o profissional.
            </p>

            {/* Busca — form GET, sem JavaScript necessário */}
            <form
              action="/busca"
              method="get"
              className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_8px_20px_rgba(16,24,64,0.08)]"
            >
              <input
                type="text"
                name="q"
                placeholder="Especialidade, procedimento ou nome do dentista"
                aria-label="O que você procura?"
                className="min-h-[44px] flex-1 rounded-xl px-4 text-[15px] text-ink outline-none placeholder:text-ink-muted"
              />
              <button
                type="submit"
                className="min-h-[44px] rounded-xl bg-brand-blue px-6 font-semibold text-white transition-colors hover:bg-brand-blue-600"
              >
                Buscar
              </button>
            </form>

            <p className="mt-4 text-sm text-ink-muted">
              Com dor agora?{" "}
              <Link href="/urgencia" className="font-semibold text-brand-magenta hover:underline">
                Ver dentistas de urgência
              </Link>
            </p>
          </div>
        </Container>
      </section>

      {/* ── Especialidades ── */}
      <section id="especialidades" className="scroll-mt-20">
        <Container className="py-16 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-brand-navy">Especialidades</h2>
            <p className="mt-3 text-ink-soft">Escolha o tratamento e veja os melhores profissionais.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ESPECIALIDADES.map((esp) => (
              <Link
                key={esp}
                href={`/especialidade/${slugDaEspecialidade(esp)}`}
                className="group flex flex-col rounded-2xl border border-black/8 bg-white p-5 transition-all hover:border-brand-blue/40 hover:shadow-[0_8px_20px_rgba(0,122,255,0.12)]"
              >
                <span className="text-[15px] font-semibold text-ink transition-colors group-hover:text-brand-blue">
                  {nomeAmigavel(esp)}
                </span>
                <span className="mt-1 text-sm text-ink-muted">Ver dentistas →</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="scroll-mt-20 bg-brand-soft/50">
        <Container className="py-16 md:py-20">
          <h2 className="mb-10 text-center text-3xl font-bold text-brand-navy">Como funciona</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { n: "1", t: "Busque", d: "Pesquise por especialidade, procedimento ou pela sua localização." },
              { n: "2", t: "Compare", d: "Veja avaliações reais, convênios aceitos e endereços de atendimento." },
              { n: "3", t: "Fale direto", d: "Entre em contato com o dentista escolhido, sem intermediários." },
            ].map((p) => (
              <div key={p.n} className="rounded-2xl bg-white p-6 shadow-[0_2px_6px_rgba(16,24,64,0.05)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-lg font-bold text-white">
                  {p.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-brand-navy">{p.t}</h3>
                <p className="mt-2 text-ink-soft">{p.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CTA para dentistas ── */}
      <section id="para-dentistas">
        <Container className="py-16 md:py-20">
          <div className="overflow-hidden rounded-3xl bg-brand-navy px-8 py-12 text-center text-white md:py-16">
            <h2 className="text-3xl font-bold text-white">É dentista? Seja encontrado.</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Crie seu perfil verificado por CRO, mostre suas especialidades e receba
              pacientes da sua região.
            </p>
            <Link
              href="/cadastro"
              className="mt-8 inline-flex min-h-[48px] items-center rounded-[14px] bg-brand-magenta px-7 py-3 font-semibold text-white shadow-[0_8px_24px_rgba(230,0,76,0.38)] transition-colors hover:bg-brand-magenta-700"
            >
              Cadastrar meu consultório
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
