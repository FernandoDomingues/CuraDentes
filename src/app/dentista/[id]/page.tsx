// ═══════════════════════════════════════════════════════════════════════════════
// PERFIL DO DENTISTA — /dentista/[id]
//
// Esta é a página mais importante para o orgânico: cada dentista vira uma página
// de HTML real (renderizada no servidor), com metadados próprios e JSON-LD do tipo
// Dentist. É o que faz o profissional ser encontrado e CITADO por Google e IAs.
//
// Renderização: SSR com cache (revalidate 1h) — fresca o suficiente e indexável.
// Dados: lib/dentistas.ts (Supabase, anon key + RLS, só leitura pública).
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import Estrelas from "@/components/Estrelas";
import JsonLd from "@/components/JsonLd";
import { buscarDentistaPorId, nomeExibicao } from "@/lib/dentistas";
import { jsonLdDentista, jsonLdBreadcrumb } from "@/lib/jsonld";
import { urlWhatsapp, telLimpo, urlInstagram, urlMapsEndereco } from "@/lib/contato";
import { SITE_NOME } from "@/lib/site";
import type { EnderecoClinica } from "@/types/dentista";

// Cache da página: regenera no máximo a cada 1 hora (ISR).
export const revalidate = 3600;

// Avatar padrão (Storage do nosso Supabase) quando o dentista não tem foto.
const AVATAR_PADRAO =
  "https://dsnzgxjuqlalysyfiion.supabase.co/storage/v1/object/public/fotos-dentistas/default-avatar.webp";

type Props = { params: Promise<{ id: string }> };

// ─── Metadados por dentista (title/description/OpenGraph) ─────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await buscarDentistaPorId(id);
  if (!d) return { title: "Dentista não encontrado", robots: { index: false } };

  const nome = nomeExibicao(d);
  const cidade = d.enderecos[0]?.cidade;
  const titulo = `${nome} — ${d.especialidade_principal}${cidade ? ` em ${cidade}` : ""}`;
  const descricao =
    d.bio?.trim() ||
    `${nome}, ${d.especialidade_principal}${cidade ? ` em ${cidade}` : ""}. Veja avaliações, especialidades, convênios e contato no ${SITE_NOME}.`;

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/dentista/${d.id}` },
    openGraph: {
      type: "profile",
      title: titulo,
      description: descricao,
      images: [d.foto_url || AVATAR_PADRAO],
    },
  };
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default async function PerfilDentista({ params }: Props) {
  const { id } = await params;
  const d = await buscarDentistaPorId(id);
  if (!d) notFound();

  const nome = nomeExibicao(d);
  const foto = d.foto_url || AVATAR_PADRAO;
  const temAvaliacoes = d.avaliacoes.total_avaliacoes > 0;

  return (
    <>
      {/* Dados estruturados: o dentista + a trilha de navegação */}
      <JsonLd
        data={[
          jsonLdDentista(d),
          jsonLdBreadcrumb([
            { nome: "Início", url: "/" },
            { nome: d.especialidade_principal, url: `/busca?q=${encodeURIComponent(d.especialidade_principal)}` },
            { nome, url: `/dentista/${d.id}` },
          ]),
        ]}
      />

      {/* Cabeçalho do perfil */}
      <section className="bg-gradient-to-b from-brand-soft to-white">
        <Container className="py-10 md:py-14">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <Image
              src={foto}
              alt={`Foto de ${nome}`}
              width={128}
              height={128}
              className="h-32 w-32 flex-shrink-0 rounded-2xl border border-black/10 bg-white object-cover"
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-3xl font-bold text-brand-navy">{nome}</h1>
                {d.cro_verificado && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-3 py-1 text-sm font-semibold text-brand-blue">
                    {/* selo de verificado */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    CRO verificado
                  </span>
                )}
              </div>

              <p className="mt-1 text-lg text-ink-soft">{d.especialidade_principal}</p>
              {d.cro && <p className="mt-0.5 text-sm text-ink-muted">{d.cro}</p>}

              <div className="mt-3 flex justify-center sm:justify-start">
                {temAvaliacoes ? (
                  <Estrelas nota={d.avaliacoes.media_geral} total={d.avaliacoes.total_avaliacoes} />
                ) : (
                  <span className="text-sm text-ink-muted">Ainda sem avaliações</span>
                )}
              </div>

              {d.instagram && (
                <a
                  href={urlInstagram(d.instagram)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-magenta hover:underline"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  @{d.instagram.replace(/^@/, "")}
                </a>
              )}
            </div>
          </div>

          {/* Bio — só aparece se existir (sem texto padrão; ver [[bio-dentista-sem-padrao]]) */}
          {d.bio?.trim() && (
            <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-ink-soft">{d.bio}</p>
          )}
        </Container>
      </section>

      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_320px]">
        {/* Coluna principal: endereços */}
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-brand-navy">Onde {nome.split(" ")[0]} atende</h2>
          {d.enderecos.length === 0 && (
            <p className="text-ink-muted">Este profissional ainda não cadastrou endereços de atendimento.</p>
          )}
          {d.enderecos.map((e) => (
            <CardEndereco key={e.id} e={e} />
          ))}
        </div>

        {/* Coluna lateral: avaliações por atividade */}
        <aside className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-brand-navy">Avaliações</h2>
          {temAvaliacoes ? (
            <div className="rounded-2xl border border-black/8 bg-white p-5">
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-brand-navy">
                  {d.avaliacoes.media_geral.toFixed(1)}
                </span>
                <span className="text-sm text-ink-muted">
                  / 5 · {d.avaliacoes.total_avaliacoes} avaliações
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {d.avaliacoes.por_atividade
                  .slice()
                  .sort((a, b) => b.media_nota - a.media_nota)
                  .map((a) => (
                    <div key={a.nome_atividade}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-ink-soft">{a.nome_atividade}</span>
                        <span className="font-semibold text-ink">{a.media_nota.toFixed(1)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/8">
                        <div
                          className="h-full rounded-full bg-brand-blue"
                          style={{ width: `${(a.media_nota / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-black/8 bg-white p-5 text-sm text-ink-muted">
              Este dentista ainda não recebeu avaliações.
            </div>
          )}
        </aside>
      </Container>
    </>
  );
}

// ─── Subcomponente: card de um endereço de atendimento ───────────────────────
function CardEndereco({ e }: { e: EnderecoClinica }) {
  const wpp = urlWhatsapp(e.whatsapp);
  const tel = telLimpo(e.telefone);
  const maps = urlMapsEndereco(e);
  const linhaEndereco = [
    [e.logradouro, e.numero].filter(Boolean).join(", "),
    e.complemento,
    e.bairro,
    [e.cidade, e.estado].filter(Boolean).join(" - "),
    e.cep,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_2px_6px_rgba(16,24,64,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {e.nome_clinica && <h3 className="text-lg font-semibold text-brand-navy">{e.nome_clinica}</h3>}
          <a href={maps} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-brand-blue hover:underline">
            {linhaEndereco || "Ver no mapa"}
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          {e.atende_urgencias && (
            <span className="rounded-full bg-brand-magenta/10 px-3 py-1 text-xs font-semibold text-brand-magenta">
              Atende urgências
            </span>
          )}
          {e.estacionamento && (
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-ink-soft">
              Estacionamento
            </span>
          )}
        </div>
      </div>

      {/* Atividades */}
      {e.atividades.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Atividades</p>
          <div className="flex flex-wrap gap-2">
            {e.atividades.map((a) => (
              <span key={a} className="rounded-lg bg-brand-soft px-3 py-1 text-sm text-brand-navy">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Convênios + formas de pagamento */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {e.convenios.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">Convênios</p>
            <p className="text-sm text-ink-soft">{e.convenios.join(", ")}</p>
          </div>
        )}
        {e.formas_pagamento.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">Pagamento</p>
            <p className="text-sm text-ink-soft">{e.formas_pagamento.join(", ")}</p>
          </div>
        )}
      </div>

      {/* Agenda */}
      {e.agenda.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Horários</p>
          <ul className="grid gap-1 text-sm text-ink-soft sm:grid-cols-2">
            {e.agenda.map((h, i) => (
              <li key={i} className="flex justify-between gap-3 sm:max-w-[260px]">
                <span>{h.dia_semana}</span>
                <span className="text-ink-muted">
                  {h.horario_inicio} – {h.horario_fim}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Observações */}
      {e.observacoes?.trim() && (
        <p className="mt-4 rounded-xl bg-black/3 p-3 text-sm text-ink-soft">{e.observacoes}</p>
      )}

      {/* Contato */}
      {(wpp || tel) && (
        <div className="mt-5 flex flex-wrap gap-3">
          {wpp && (
            <a
              href={wpp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[14px] bg-[#25D366] px-5 font-semibold text-white transition-opacity hover:opacity-90"
            >
              WhatsApp
            </a>
          )}
          {tel && (
            <a
              href={tel}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[14px] border border-brand-blue/30 px-5 font-semibold text-brand-blue transition-colors hover:bg-brand-blue/5"
            >
              Ligar
            </a>
          )}
        </div>
      )}
    </article>
  );
}
