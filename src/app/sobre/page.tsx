// ═══════════════════════════════════════════════════════════════════════════════
// SOBRE — /sobre (Server Component, estática).
// Página institucional: missão, quem somos, como funciona e valores.
// Conteúdo portado do site-k11, no novo visual.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Sobre nós",
  description:
    "O CuraDentes facilita o acesso à saúde odontológica no Brasil: encontre dentistas de confiança perto de você, com avaliações reais e contato direto.",
  alternates: { canonical: "/sobre" },
};

const VALORES = [
  { titulo: "Transparência", desc: "A escolha de um dentista deve ser feita com informações claras: avaliações reais e localização." },
  { titulo: "Confiança", desc: "Cada perfil passa por verificação profissional via CRO para garantir que você está em boas mãos." },
  { titulo: "Inovação", desc: "Usamos tecnologia para simplificar o que é complexo: buscar, comparar e contatar dentistas." },
  { titulo: "Qualidade", desc: "Valorizamos o atendimento de excelência e damos voz aos pacientes por meio de avaliações verificadas." },
];

const PASSOS = [
  { passo: "1", titulo: "Busque", desc: "Digite sua cidade ou a especialidade desejada." },
  { passo: "2", titulo: "Compare", desc: "Veja avaliações, convênios e a distância até o consultório." },
  { passo: "3", titulo: "Escolha", desc: "Profissionais verificados pelo CRO, com foto e bio." },
  { passo: "4", titulo: "Contate", desc: "Fale direto com o dentista pelo WhatsApp." },
];

export default function Sobre() {
  return (
    <>
      {/* Herói */}
      <section className="bg-gradient-to-b from-brand-soft to-white">
        <Container className="py-16 text-center md:py-24">
          <span className="text-[13px] font-semibold uppercase tracking-widest text-brand-blue">Sobre nós</span>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold leading-tight text-brand-navy md:text-5xl">
            Facilitando o acesso à saúde odontológica no Brasil
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            O CuraDentes nasceu para resolver um problema simples, mas que afeta milhões de
            brasileiros: encontrar um dentista de confiança perto de você, com avaliações reais e
            contato prático.
          </p>
        </Container>
      </section>

      {/* Quem somos */}
      <Container className="grid items-center gap-12 py-16 md:grid-cols-2">
        <div>
          <span className="text-[13px] font-semibold uppercase tracking-widest text-brand-blue">Quem somos</span>
          <h2 className="mt-3 text-3xl font-bold leading-snug text-brand-navy">
            Uma plataforma que conecta pacientes aos melhores dentistas
          </h2>
          <p className="mt-5 leading-relaxed text-ink-soft">
            O CuraDentes é uma plataforma brasileira com um objetivo claro: tornar a busca por
            atendimento odontológico mais simples, transparente e acessível para todos.
          </p>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Acreditamos que tecnologia e saúde caminham juntas. Por isso criamos uma ferramenta para
            buscar dentistas por proximidade, conferir avaliações de pacientes reais e entrar em
            contato diretamente — em poucos cliques.
          </p>
        </div>
        <div className="rounded-3xl border border-brand-blue/15 bg-brand-soft/60 p-8">
          <p className="text-sm font-semibold text-brand-navy">Nosso propósito</p>
          <p className="mt-4 leading-relaxed text-ink-soft">
            “Democratizar o acesso à saúde odontológica de qualidade no Brasil, conectando pacientes
            a dentistas verificados de forma simples, transparente e digital.”
          </p>
        </div>
      </Container>

      {/* Como funciona */}
      <section className="bg-brand-soft/50">
        <Container className="py-16">
          <div className="mb-12 text-center">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-brand-blue">Como funciona</span>
            <h2 className="mt-3 text-3xl font-bold text-brand-navy">Buscar um dentista nunca foi tão fácil</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map((p) => (
              <div key={p.passo} className="rounded-2xl bg-white p-6 text-center shadow-[0_8px_20px_rgba(16,24,64,0.06)]">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-blue text-lg font-bold text-white">
                  {p.passo}
                </div>
                <h3 className="mt-4 text-lg font-bold text-brand-navy">{p.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Valores */}
      <Container className="py-16">
        <div className="mb-12 text-center">
          <span className="text-[13px] font-semibold uppercase tracking-widest text-brand-blue">Nossos valores</span>
          <h2 className="mt-3 text-3xl font-bold text-brand-navy">O que nos move</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALORES.map((v) => (
            <div key={v.titulo} className="rounded-2xl border border-black/8 bg-white p-6">
              <h3 className="text-lg font-bold text-brand-navy">{v.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{v.desc}</p>
            </div>
          ))}
        </div>
      </Container>

      {/* CTA */}
      <Container className="pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-brand-blue/10 to-brand-navy/5 p-10 text-center md:p-14">
          <h2 className="text-3xl font-bold text-brand-navy">Faça parte dessa história</h2>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-ink-soft">
            Comece a encontrar o dentista ideal para você ou cadastre seu consultório e alcance novos
            pacientes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/busca" className="inline-flex min-h-[48px] items-center rounded-[14px] bg-brand-blue px-7 font-semibold text-white transition-colors hover:bg-brand-blue-600">
              Buscar dentista
            </Link>
            <Link href="/entrar" className="inline-flex min-h-[48px] items-center rounded-[14px] bg-brand-magenta px-7 font-semibold text-white transition-colors hover:bg-brand-magenta-700">
              Cadastrar consultório
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
