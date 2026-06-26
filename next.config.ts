import type { NextConfig } from "next";

// ─── Segurança: cabeçalhos HTTP (achados A1/C1) ──────────────────────────────
// Passo 1: headers "simples" (sem allowlist) — risco baixo, valem para tudo.
// Passo 2: CSP em modo **Report-Only** — NÃO bloqueia nada; apenas registra no
// console do navegador o que *bloquearia*. Serve para descobrirmos a allowlist
// real antes de "ligar" o bloqueio (Fase 2). Ver auditoria/02-plano-seguranca-c1-a1.md
const SUPABASE = "https://dsnzgxjuqlalysyfiion.supabase.co";

// Allowlist derivada do código real:
//  • Supabase (REST/Auth/Storage/Realtime)            → connect/img
//  • nominatim.openstreetmap.org (geocoding)          → connect
//  • viacep.com.br + cep.awesomeapi.com.br (CEP)       → connect
//  • *.tile.openstreetmap.org (tiles do mapa Leaflet)  → img
//  • *.googleusercontent.com (avatar do Google)        → img
//  • busca-profissionais.cfo.org.br (iframe verificar-CRO) → frame
const cspReportOnly = [
  "default-src 'self'",
  // Next injeta scripts inline (hidratação) → 'unsafe-inline' por ora; evoluir
  // para nonce numa fase seguinte (CSP de script mais forte).
  "script-src 'self' 'unsafe-inline'",
  // O código usa muito style={{…}} inline.
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE} https://*.googleusercontent.com https://*.tile.openstreetmap.org`,
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE} wss://dsnzgxjuqlalysyfiion.supabase.co https://nominatim.openstreetmap.org https://viacep.com.br https://cep.awesomeapi.com.br`,
  "frame-src https://busca-profissionais.cfo.org.br",
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
  // CSP só observa (não bloqueia) — Passo 2 / Fase 1.
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
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
