import type { NextConfig } from "next";

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
};

export default nextConfig;
