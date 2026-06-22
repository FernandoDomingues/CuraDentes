// ═══════════════════════════════════════════════════════════════════════════════
// HEADER (cabeçalho) — versão pública do site-R0.
//
// É um Server Component (sem JavaScript no cliente): o menu mobile usa <details>,
// que abre/fecha por conta do próprio HTML. Isso mantém o cabeçalho leve e 100%
// renderizado no servidor — ótimo para o objetivo orgânico desta fase.
//
// A área autenticada (login com modal, "Acesso do Dentista" inteligente) é da
// Fase 2; aqui o botão só aponta para /entrar (a ser criada).
// ═══════════════════════════════════════════════════════════════════════════════

import Image from "next/image";
import Link from "next/link";
import Container from "./Container";
import UserMenu from "./UserMenu";

// Links de navegação pública.
const NAV_LINKS = [
  { label: "Especialidades", href: "/#especialidades" },
  { label: "Urgência", href: "/urgencia" },
  { label: "Sobre", href: "/sobre" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/90 backdrop-blur-xl">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo — desktop: marca completa; mobile: ícone + wordmark */}
          <Link href="/" className="flex flex-shrink-0 items-center gap-2" aria-label="CuraDentes — início">
            <Image
              src="/logos/logo-com-nome.png"
              alt="CuraDentes"
              width={2480}
              height={926}
              priority
              className="hidden h-8 w-auto lg:block"
            />
            <span className="flex items-center gap-2 lg:hidden">
              <Image src="/logos/logo-icon.png" alt="" width={500} height={500} className="h-8 w-8" />
              <span className="font-brand text-lg text-brand-navy">
                <span className="font-bold">Cura</span>
                <span className="font-light">Dentes</span>
              </span>
            </span>
          </Link>

          {/* Navegação — desktop */}
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[15px] font-medium text-ink-soft transition-colors hover:text-brand-blue"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Ações — desktop (ilha de auth reativa ao login) */}
          <div className="hidden lg:flex">
            <UserMenu />
          </div>

          {/* Menu mobile — disclosure nativo (<details>), sem JavaScript */}
          <details className="group relative lg:hidden">
            <summary
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl text-ink-soft [&::-webkit-details-marker]:hidden"
              aria-label="Abrir menu"
            >
              {/* Ícone hambúrguer (SVG inline para não depender de JS/lib) */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </summary>

            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-[44px] items-center rounded-xl px-3 py-2 text-[15px] font-medium text-ink hover:bg-black/5"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-black/10" />
              {/* Ilha de auth reativa (igual ao desktop): reflete o login no mobile */}
              <UserMenu />
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}
