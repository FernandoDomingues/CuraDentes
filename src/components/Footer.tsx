// ═══════════════════════════════════════════════════════════════════════════════
// FOOTER (rodapé) — Server Component.
//
// Links institucionais e legais + identidade da marca. Fundo navy da marca.
// O ano é fixo (constante) porque Server Components não devem depender de
// Date.now() para HTML estável/cacheável; atualizamos a constante quando virar o ano.
// ═══════════════════════════════════════════════════════════════════════════════

import Image from "next/image";
import Link from "next/link";
import Container from "./Container";
import { SITE_NOME } from "@/lib/site";

const ANO = 2026;

// Colunas de links. Algumas rotas (cadastro, busca) chegam nas próximas fases;
// já deixamos os caminhos definitivos para não mexer no rodapé depois.
const COLUNAS: Record<string, { label: string; href: string }[]> = {
  Pacientes: [
    { label: "Buscar dentista", href: "/busca" },
    { label: "Urgência odontológica", href: "/urgencia" },
  ],
  Dentistas: [
    { label: "Cadastrar dentista", href: "/cadastro" },
    { label: "Acesso do dentista", href: "/entrar" },
  ],
  Empresa: [{ label: "Sobre nós", href: "/sobre" }],
  Legal: [
    { label: "Termos de uso", href: "/termos" },
    { label: "Privacidade", href: "/privacidade" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-brand-navy pt-16 pb-8 text-white/85">
      <Container>
        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {/* Marca */}
          <div className="sm:col-span-2">
            <Link href="/" className="mb-4 inline-block">
              <Image
                src="/logos/logo-com-nome.png"
                alt="CuraDentes"
                width={2480}
                height={926}
                className="h-9 w-auto brightness-0 invert"
              />
            </Link>
            <p className="max-w-[300px] text-sm leading-relaxed text-white/65">
              A plataforma que aproxima brasileiros de dentistas de qualidade. Busca por
              proximidade e avaliações verificadas.
            </p>
            <a
              href="https://www.instagram.com/curadentes"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-white/80 transition-colors hover:text-white"
            >
              {/* Ícone Instagram (SVG inline) */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              @curadentes
            </a>
          </div>

          {/* Colunas de links */}
          {Object.entries(COLUNAS).map(([titulo, links]) => (
            <div key={titulo}>
              <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-white/50">
                {titulo}
              </h3>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-block py-0.5 text-sm text-white/75 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-white/45">
            © {ANO} {SITE_NOME}. Todos os direitos reservados.
          </p>
          <p className="text-[13px] text-white/35">Feito com 🦷 no Brasil</p>
        </div>
      </Container>
    </footer>
  );
}
