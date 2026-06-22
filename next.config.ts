import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do projeto. Sem isso, o Next "sobe" procurando lockfiles e pode
  // pegar uma raiz errada (ex.: um package-lock.json perdido em C:\Users\Lenovo),
  // o que atrapalha o rastreamento de arquivos no build de produção.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
