import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SITE_URL, SITE_NOME, SITE_DESCRICAO } from "@/lib/site";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthListener from "@/components/AuthListener";
import SessaoProvider from "@/components/SessaoProvider";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

// Inter é a fonte do corpo/UI (mesma do site-k11). Exposta como variável CSS
// (--font-inter), consumida em globals.css pelos tokens --font-sans/--font-brand.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Metadados padrão do site (Next Metadata API). Cada página pode sobrescrever
// title/description; o `template` adiciona " | CuraDentes" automaticamente.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NOME} — Encontre Dentistas Perto de Você`,
    template: `%s | ${SITE_NOME}`,
  },
  description: SITE_DESCRICAO,
  applicationName: SITE_NOME,
  icons: { icon: "/icon.png", apple: "/icon.png" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: SITE_NOME,
    title: `${SITE_NOME} — Encontre Dentistas Perto de Você`,
    description: SITE_DESCRICAO,
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NOME} — Encontre Dentistas Perto de Você`,
    description: SITE_DESCRICAO,
    images: ["/og-image.png"],
  },
};

// Cor da barra do navegador (mobile/PWA) + viewportFit para habilitar as
// safe-areas do iOS (notch). Sem viewportFit:"cover", o env(safe-area-*) não atua.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A2A66",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col text-ink">
        {/* Preload da fonte da marca (CuraDentes Bold) — peso dos títulos h1/h2/h3
            acima da dobra (ex.: o H1 do Hero). Reduz o "flash" antes do swap, sem
            mexer no @font-face do globals.css. crossOrigin é obrigatório p/ fontes.
            React 19 eleva este <link> para o <head>. */}
        <link
          rel="preload"
          href="/fonts/curadentes/CuraDentes-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Pular para o conteúdo — acessibilidade (WCAG 2.4.1). Fica oculto até
            receber foco por teclado (Tab), quando aparece no topo. */}
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-[15px] focus:font-semibold focus:shadow-lg"
          style={{ color: "#0A2A66" }}
        >
          Pular para o conteúdo
        </a>
        <SessaoProvider>
          <AuthListener />
          <Header />
          <main id="conteudo" className="flex-1">{children}</main>
          <Footer />
          <CookieConsent />
          {/* Notificações (toasts) — mesma lib do site antigo (sonner). */}
          <Toaster position="top-center" richColors />
        </SessaoProvider>
      </body>
    </html>
  );
}
