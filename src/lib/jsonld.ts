// ═══════════════════════════════════════════════════════════════════════════════
// JSON-LD — geradores de dados estruturados (schema.org).
//
// Cada gerador devolve um OBJETO JS puro; a página injeta esse objeto num
// <script type="application/ld+json">. É o que faz Google mostrar estrelas e
// ajuda IAs a entender/citar o conteúdo. Tudo PURO e testável.
//
// Referências de tipos: Dentist, FAQPage, BreadcrumbList, AggregateRating,
// PostalAddress (https://schema.org).
// ═══════════════════════════════════════════════════════════════════════════════

import { SITE_URL, SITE_NOME } from "./site";
import { nomeExibicao } from "./dentistas";
import type { DentistaPerfil } from "@/types/dentista";
import type { FAQ } from "./especialidades-seo";

/** Objeto JSON-LD genérico (sempre tem @context e @type). */
export type JsonLd = Record<string, unknown> & {
  "@context": string;
  "@type": string;
};

const CONTEXT = "https://schema.org";

/**
 * Dados estruturados de um dentista (schema.org/Dentist).
 * Inclui nome, foto, especialidade, endereço e nota agregada (quando há).
 */
export function jsonLdDentista(p: DentistaPerfil): JsonLd {
  const url = `${SITE_URL}/dentista/${p.id}`;
  const endereco = p.enderecos[0];

  const ld: JsonLd = {
    "@context": CONTEXT,
    "@type": "Dentist",
    name: nomeExibicao(p),
    url,
    medicalSpecialty: p.especialidade_principal,
  };

  if (p.foto_url) ld.image = p.foto_url;
  if (p.bio) ld.description = p.bio;
  if (endereco?.telefone) ld.telephone = endereco.telefone;

  // Endereço postal (a partir do primeiro endereço de atendimento).
  if (endereco) {
    ld.address = {
      "@type": "PostalAddress",
      streetAddress: [endereco.logradouro, endereco.numero].filter(Boolean).join(", "),
      addressLocality: endereco.cidade,
      addressRegion: endereco.estado,
      postalCode: endereco.cep,
      addressCountry: "BR",
    };
  }

  // Nota agregada — só quando existe pelo menos uma avaliação (senão o Google
  // marca como erro de dados estruturados).
  if (p.avaliacoes.total_avaliacoes > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.avaliacoes.media_geral.toFixed(1),
      reviewCount: p.avaliacoes.total_avaliacoes,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return ld;
}

/** Página de perguntas frequentes (schema.org/FAQPage). */
export function jsonLdFaq(faq: FAQ[]): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.pergunta,
      acceptedAnswer: { "@type": "Answer", text: f.resposta },
    })),
  };
}

/** Um degrau da trilha de navegação. `url` pode ser caminho relativo ("/x") ou absoluto. */
export interface BreadcrumbItem {
  nome: string;
  url: string;
}

/** Trilha de navegação (schema.org/BreadcrumbList). */
export function jsonLdBreadcrumb(itens: BreadcrumbItem[]): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: itens.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.nome,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/** Organização (schema.org/Organization) — para a home / identidade do site. */
export function jsonLdOrganizacao(): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    name: SITE_NOME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
  };
}

/**
 * WebSite com SearchAction (schema.org/WebSite) — habilita a "caixa de busca"
 * do Google e diz às IAs como pesquisar no site.
 */
export function jsonLdWebSite(): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: SITE_NOME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/busca?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
