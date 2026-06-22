// ═══════════════════════════════════════════════════════════════════════════════
// sitemap.xml — gerado pelo Next (rota especial /sitemap.xml).
//
// Lista as URLs públicas pra buscadores/IAs descobrirem tudo. Por enquanto só as
// páginas ESTÁTICAS. Na Fase 1, ao criar as páginas dinâmicas, adicionamos aqui
// uma entrada por DENTISTA (/dentista/[id]) e por ESPECIALIDADE (/especialidade/[slug]),
// consultando o Supabase — é isso que faz cada perfil ser indexável.
// ═══════════════════════════════════════════════════════════════════════════════

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  const estaticas = ["", "/busca", "/urgencia", "/sobre", "/termos", "/privacidade"];

  return estaticas.map((rota) => ({
    url: `${SITE_URL}${rota}`,
    lastModified: agora,
    changeFrequency: "weekly",
    priority: rota === "" ? 1 : 0.7,
  }));
}
