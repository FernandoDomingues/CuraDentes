// ═══════════════════════════════════════════════════════════════════════════════
// FOOTER (rodapé) — Server Component.
//
// Links institucionais e legais + identidade da marca. Fundo navy da marca.
// Visual portado 1:1 do site antigo (k11). O ano é fixo (constante) porque Server
// Components não devem depender de Date.now() para HTML estável/cacheável;
// atualizamos a constante quando virar o ano.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import Container from "./Container";
import FooterAcessoDentista from "./FooterAcessoDentista";
import { SITE_NOME } from "@/lib/site";

const ANO = 2026;

const LOGO_FULL = "/logos/logo-com-nome.png";

// Colunas de links. Destinos ajustados às rotas do R0.
// `acessoDentista: true` marca o item que abre o MODAL de login do dentista
// (renderizado pelo Client Component FooterAcessoDentista), em vez de navegar.
const FOOTER_LINKS: Record<string, { label: string; href: string; acessoDentista?: boolean }[]> = {
  Pacientes: [
    { label: "Buscar dentista", href: "/busca" },
    { label: "Como funciona", href: "/#como-funciona" },
    { label: "Suporte", href: "mailto:suporte@curadentes.com.br" },
  ],
  Dentistas: [
    { label: "Cadastrar dentista", href: "/cadastro" },
    { label: "Acesso do dentista", href: "#", acessoDentista: true },
    { label: "Suporte", href: "mailto:suporte@curadentes.com.br" },
  ],
  Empresa: [{ label: "Sobre nós", href: "/sobre" }],
  Legal: [
    { label: "Termos de uso", href: "/termos" },
    { label: "Privacidade", href: "/privacidade" },
    { label: "Cookies", href: "/privacidade#cookies" },
  ],
};

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--brand-navy)",
        color: "rgba(255,255,255,0.85)",
        paddingTop: "64px",
        paddingBottom: "32px",
      }}
    >
      <Container>
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 mb-10">
          {/* Marca */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <img
                src={LOGO_FULL}
                alt="CuraDentes"
                className="h-9 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </Link>
            <p
              className="text-[14px] leading-relaxed max-w-[300px]"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              A plataforma que aproxima brasileiros de dentistas de qualidade. Busca por proximidade,
              agendamento online e avaliações verificadas.
            </p>
            <div className="flex gap-3 mt-5">
              <a
                href="https://www.instagram.com/curadentes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-white hover:opacity-80"
                aria-label="Instagram do CuraDentes"
              >
                {/* Ícone Instagram (SVG inline) */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>
          </div>

          {/* Colunas de links */}
          {Object.entries(FOOTER_LINKS).map(([titulo, links]) => (
            <div key={titulo}>
              <h3
                className="text-[13px] font-semibold uppercase tracking-wider mb-4"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                {titulo}
              </h3>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.acessoDentista ? (
                      <FooterAcessoDentista />
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[14px] text-white/[0.72] transition-colors duration-200 inline-block min-h-[32px] py-0.5 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Rodapé inferior */}
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.13)" }}
        >
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.72)" }}>
            © {ANO} {SITE_NOME}. Todos os direitos reservados.
          </p>
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.72)" }}>
            Feito com 🦷 no Brasil
          </p>
        </div>
      </Container>
    </footer>
  );
}
