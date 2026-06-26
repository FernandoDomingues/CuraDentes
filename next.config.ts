import type { NextConfig } from "next";

// ─── Segurança: cabeçalhos HTTP (achados A1/C1) ──────────────────────────────
// Headers "simples" (HSTS, nosniff, etc.) + uma Content-Security-Policy em ENFORCE.
// A allowlist da CSP foi derivada de TODAS as chamadas externas do app (Supabase,
// ViaCEP, Nominatim, awesomeapi, tiles do OSM, avatar Google, iframe do CFO).
// Ver auditoria/02-plano-seguranca-c1-a1.md
const SUPABASE = "https://dsnzgxjuqlalysyfiion.supabase.co";

// Allowlist derivada do código real:
//  • Supabase (REST/Auth/Storage/Realtime)            → connect/img
//  • nominatim.openstreetmap.org (geocoding)          → connect
//  • viacep.com.br + cep.awesomeapi.com.br (CEP)       → connect
//  • *.tile.openstreetmap.org (tiles do mapa Leaflet)  → img
//  • *.googleusercontent.com (avatar do Google)        → img
//  • busca-profissionais.cfo.org.br (iframe verificar-CRO) → frame
// O Vercel Live (barra de feedback/comentários) é injetado SÓ em deployments de
// PREVIEW, nunca em produção. Liberamos seus domínios apenas no preview, para o
// smoke-test não acusar falso-positivo — sem afrouxar a CSP de produção (tight).
const ehPreview = process.env.VERCEL_ENV === "preview";
const live = {
  script: ehPreview ? " https://vercel.live" : "",
  connect: ehPreview ? " https://vercel.live https://*.pusher.com wss://*.pusher.com" : "",
  frame: ehPreview ? " https://vercel.live" : "",
  img: ehPreview ? " https://vercel.live https://vercel.com" : "",
};

const csp = [
  "default-src 'self'",
  // Next injeta scripts inline (hidratação) → 'unsafe-inline'. O runtime do
  // bundler (Turbopack) usa eval/Function → 'unsafe-eval'. Não enfraquece a
  // mitigação do C1 (que é o connect-src); com 'unsafe-inline' já presente, o
  // 'unsafe-eval' não adiciona risco prático. Evoluir para nonce numa fase futura.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'${live.script}`,
  // O código usa muito style={{…}} inline.
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE} https://*.googleusercontent.com https://*.tile.openstreetmap.org${live.img}`,
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE} wss://dsnzgxjuqlalysyfiion.supabase.co https://nominatim.openstreetmap.org https://viacep.com.br https://cep.awesomeapi.com.br${live.connect}`,
  `frame-src https://busca-profissionais.cfo.org.br${live.frame}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  // HSTS conservador (1 ano, só o host exato — sem includeSubDomains/preload por
  // ora, para não afetar subdomínios sem querer; dá para reforçar depois).
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // CSP em Report-Only POR ORA (não bloqueia; só observa). A allowlist já foi
  // validada no smoke-test; falta só re-testar o enforce no Preview (mapa/iframe/
  // upload) antes de bloquear de verdade em produção. Trocar a chave por
  // "Content-Security-Policy" liga o enforce.
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  // Fixa a raiz do projeto. Sem isso, o Next "sobe" procurando lockfiles e pode
  // pegar uma raiz errada (ex.: um package-lock.json perdido em C:\Users\Lenovo),
  // o que atrapalha o rastreamento de arquivos no build de produção.
  turbopack: {
    root: import.meta.dirname,
  },
  // Permite que o <Image> do Next otimize as fotos hospedadas no Storage do
  // nosso Supabase (fotos de dentistas e imagens de especialidades). É o nosso
  // back-end, não um domínio de terceiros (ver memória [[imagens-locais-sempre]]).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dsnzgxjuqlalysyfiion.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Cabeçalhos de segurança aplicados a TODAS as rotas.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
