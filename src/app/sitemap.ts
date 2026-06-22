// ═══════════════════════════════════════════════════════════════════════════════
// sitemap.xml — mapa do site para buscadores/IAs (rota especial /sitemap.xml).
//
// Lista TODAS as URLs públicas: páginas estáticas + uma entrada por ESPECIALIDADE
// + uma entrada por DENTISTA (consultando o Supabase). São as entradas de dentista
// e especialidade que fazem cada perfil/página ser descoberto e indexado.
//
// É regenerado periodicamente (revalidate 1h) para refletir novos cadastros.
// ═══════════════════════════════════════════════════════════════════════════════

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { ESPECIALIDADES_SEO } from "@/lib/especialidades";
import { listarDentistasParaSitemap } from "@/lib/dentistas";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agora = new Date();

  // 1) Páginas estáticas.
  const estaticas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/busca`, lastModified: agora, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/urgencia`, lastModified: agora, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/sobre`, lastModified: agora, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/termos`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
  ];

  // 2) Uma página por especialidade.
  const especialidades: MetadataRoute.Sitemap = Object.values(ESPECIALIDADES_SEO).map((e) => ({
    url: `${SITE_URL}/especialidade/${e.slug}`,
    lastModified: agora,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 3) Uma página por dentista público (cadastro completo, não excluído).
  const dentistas: MetadataRoute.Sitemap = (await listarDentistasParaSitemap()).map((d) => ({
    url: `${SITE_URL}/dentista/${d.id}`,
    lastModified: agora,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [...estaticas, ...especialidades, ...dentistas];
}
