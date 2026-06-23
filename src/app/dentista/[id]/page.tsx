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
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { buscarDentistaPorIdOuCro, nomeExibicao } from "@/lib/dentistas";
import { jsonLdDentista, jsonLdBreadcrumb } from "@/lib/jsonld";
import { SITE_NOME } from "@/lib/site";
import PerfilDentistaView from "./PerfilDentistaView";

// Cache da página: regenera no máximo a cada 1 hora (ISR).
export const revalidate = 3600;

// Avatar padrão (Storage do nosso Supabase) quando o dentista não tem foto.
const AVATAR_PADRAO =
  "https://dsnzgxjuqlalysyfiion.supabase.co/storage/v1/object/public/fotos-dentistas/default-avatar.webp";

type Props = { params: Promise<{ id: string }> };

// ─── Metadados por dentista (title/description/OpenGraph) ─────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await buscarDentistaPorIdOuCro(id);
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
  const d = await buscarDentistaPorIdOuCro(id);
  if (!d) notFound();

  const nome = nomeExibicao(d);
  const foto = d.foto_url || AVATAR_PADRAO;

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

      {/* Apresentação (visual portado do site-k11). Recebe o perfil já carregado
          no servidor; é um Client Component só por causa do accordion de horários.
          O SEO (metadata/JSON-LD/ISR) continua 100% nesta page server-side. */}
      <PerfilDentistaView perfil={{ ...d, foto_url: foto }} nome={nome} />
    </>
  );
}
