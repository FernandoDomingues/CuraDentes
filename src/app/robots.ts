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

// Áreas privadas/de fluxo, sem valor de indexação.
const AREAS_PRIVADAS = ["/pro/", "/entrar", "/cadastro", "/redefinir-senha", "/auth/"];

// Bots de IA que queremos DESCOBRINDO o site (busca/respostas por IA = aquisição
// barata). Já cairiam na regra "*", mas declaramos explicitamente para deixar a
// intenção legível por máquina (alguns respeitam melhor a regra específica do UA).
const BOTS_IA = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web",
  "anthropic-ai", "PerplexityBot", "Google-Extended", "CCBot", "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: AREAS_PRIVADAS },
      ...BOTS_IA.map((ua) => ({ userAgent: ua, allow: "/", disallow: AREAS_PRIVADAS })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
