import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 5173,
    headers: {
      // Configuramos a Política de Segurança de Conteúdo (CSP) para autorizar:
      // - 'worker-src 'self' blob:': Permite a criação de Web Workers por meio de Blobs (corrige o erro do console)
      // - 'script-src ... https://accounts.google.com': Autoriza o carregamento do script do Google Sign-In
      // - 'frame-src ... https://accounts.google.com': Permite carregar o iframe popup do login do Google
      // - 'img-src ... https://lh3.googleusercontent.com': Autoriza carregar as fotos de avatar das contas do Google
      // - 'style-src ... https://fonts.googleapis.com' e 'font-src ... https://fonts.gstatic.com': Autoriza as fontes do Google Fonts utilizadas no site
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://lh3.googleusercontent.com; connect-src 'self' https:; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; worker-src 'self' blob:; frame-src 'self' https://accounts.google.com;",
      "X-Content-Type-Options": "nosniff"
    }
  },
  plugins: [
    react(),
    legacy({
      targets: ["defaults", "not IE 11"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
