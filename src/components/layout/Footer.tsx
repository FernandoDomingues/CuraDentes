import { Instagram } from "lucide-react";
import logoComNome from "@/assets/logos/logo-com-nome.png";

const LOGO_FULL = logoComNome;

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Pacientes: [
    { label: "Buscar dentista", href: "/pesquisa" },
    { label: "Como funciona", href: "#como-funciona" },
  ],
  Dentistas: [
    { label: "Cadastrar dentista", href: "/pro/novo-cadastro" },
    { label: "Acesso do dentista", href: "#" },
  ],
  Empresa: [
    { label: "Sobre nós", href: "#" },
  ],
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
      <div className="container mx-auto px-5 md:px-8 lg:px-16">
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="/" className="inline-block mb-4">
              <img
                src={LOGO_FULL}
                alt="CuraDentes"
                className="h-9 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </a>
            <p
              className="text-[14px] leading-relaxed max-w-[300px]"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              A plataforma que aproxima brasileiros de dentistas de qualidade. Busca por proximidade,
              agendamento online e avaliações verificadas.
            </p>
            <div className="flex gap-3 mt-5">
              <a href="https://www.instagram.com/curadentes" target="_blank" rel="noopener noreferrer" className="flex items-center text-white hover:opacity-80">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3
                className="text-[13px] font-semibold uppercase tracking-wider mb-4"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {title}
              </h3>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[14px] transition-colors duration-200 inline-block min-h-[32px] py-0.5"
                      style={{ color: "rgba(255,255,255,0.72)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.72)"; }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.13)" }}
        >
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            © {new Date().getFullYear()} CuraDentes. Todos os direitos reservados.
          </p>
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Feito com 🦷 no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
