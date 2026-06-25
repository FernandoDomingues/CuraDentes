import type { MetadataRoute } from "next";
import { SITE_NOME, SITE_DESCRICAO } from "@/lib/site";

// Web App Manifest (PWA). Permite "Adicionar à tela inicial" com nome/ícone/cor
// da marca. A cor combina com o theme-color do viewport (layout.tsx).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NOME} — Encontre Dentistas Perto de Você`,
    short_name: SITE_NOME,
    description: SITE_DESCRICAO,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0A2A66",
    lang: "pt-BR",
    icons: [{ src: "/icon.png", sizes: "any", type: "image/png" }],
  };
}
