// ═══════════════════════════════════════════════════════════════════════════════
// robots.txt — gerado pelo Next (rota especial /robots.txt).
//
// Objetivo: ser DESCOBERTO por buscadores e IAs. Por isso liberamos todos os bots
// (inclusive os de IA: GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot…),
// que caem na regra "*". Bloqueamos só a área autenticada (/pro/...), que não tem
// valor de indexação e é privada. E apontamos o sitemap.
// ═══════════════════════════════════════════════════════════════════════════════

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/pro/"], // dashboard, cadastro, perfil, analytics — privado
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
