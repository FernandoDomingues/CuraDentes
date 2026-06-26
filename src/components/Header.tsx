"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// HEADER (cabeçalho) — porte fiel do site antigo (k11).
//
// Barra fixa glass: logo, 4 links de navegação e as ações de conta. A sessão e os
// MODAIS de login moram no <SessaoProvider> (useSessao): aqui só disparamos
// `pedirLoginPaciente()` (botão Entrar) e `abrirModalDentista()` (Acesso do Dentista),
// e mostramos o perfil quando logado. Em mobile, hambúrguer ☰↔✕ abre gaveta full-width.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, User, LogOut, BarChart2 } from "lucide-react";
import { useSessao } from "./SessaoProvider";
import { AVATAR_PADRAO } from "@/lib/site";

// Fallback de avatar quebrado: troca a foto remota que falhou (404/Storage fora)
// pelo avatar padrão, uma única vez (data-fb evita laço se o padrão também falhar).
function aoFalharAvatar(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fb) return;
  img.dataset.fb = "1";
  img.src = AVATAR_PADRAO;
}

const NAV_LINKS = [
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Especialidades", href: "/#especialidades" },
  { label: "Para Dentistas", href: "/#para-dentistas" },
  { label: "Sobre", href: "/sobre" },
];

export default function Header() {
  const { user, pedirLoginPaciente, abrirModalDentista, sair } = useSessao();
  const [menuOpen, setMenuOpen] = useState(false);
  const primeiroNome = user?.nome ? user.nome.split(" ")[0] : "";
  const pathname = usePathname();

  // ── Cabeçalho da ÁREA PRO (logado) — porte do header do dashboard do k11:
  // logo Pro à esquerda; à direita Home / Meu Perfil / Sair (texto some no mobile).
  if (pathname && pathname.startsWith("/pro")) {
    const proBtn =
      "inline-flex items-center gap-2 min-h-[40px] rounded-[12px] bg-black/5 px-3 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-brand-blue/10 hover:text-brand-blue";
    return (
      <header
        style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderBottom: "0.5px solid rgba(60,60,67,0.10)",
        }}
      >
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex h-[60px] items-center justify-between">
            <Link href="/" aria-label="CuraDentes Pro — início">
              <Image src="/logos/logo-pro.png" alt="CuraDentes Pro" width={2480} height={926} priority className="h-7 w-auto" />
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/" className={proBtn}><Home size={16} /><span className="hidden sm:inline">Home</span></Link>
              {user?.ehSuper && (
                <Link href="/pro/dashboard-analytics" className={proBtn}><BarChart2 size={16} /><span className="hidden sm:inline">Analytics</span></Link>
              )}
              {user?.ehPro && (
                <Link href="/pro/perfil" className={proBtn}><User size={16} /><span className="hidden sm:inline">Meu Perfil</span></Link>
              )}
              <button
                onClick={sair}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] bg-danger/5 px-3 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10"
              >
                <LogOut size={16} /><span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(24px) saturate(120%)",
        WebkitBackdropFilter: "blur(24px) saturate(120%)",
        borderBottom: "0.5px solid rgba(60,60,67,0.10)",
      }}
    >
      <div className="container mx-auto px-5 md:px-8 lg:px-16">
        <div className="flex h-[64px] items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex flex-shrink-0 items-center gap-2" aria-label="CuraDentes — início">
            <Image src="/logos/logo-com-nome.png" alt="CuraDentes" width={2480} height={926} priority className="hidden h-8 w-auto lg:block" />
            <span className="flex items-center gap-2 lg:hidden">
              <Image src="/logos/logo-icon.png" alt="" width={500} height={500} className="h-8 w-8" />
              <span style={{ fontFamily: "var(--font-brand)", fontSize: "18px", color: "#0A2A66", letterSpacing: "-0.01em" }}>
                <span style={{ fontWeight: 700 }}>Cura</span><span style={{ fontWeight: 300 }}>Dentes</span>
              </span>
            </span>
          </Link>

          {/* Nav — desktop */}
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-[15px] font-medium text-ink-soft transition-colors duration-200 hover:text-brand-blue">{link.label}</Link>
            ))}
          </nav>

          {/* Ações — desktop */}
          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <details className="group relative">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-black/5 [&::-webkit-details-marker]:hidden">
                  {user.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.foto} alt={user.nome ?? ""} referrerPolicy="no-referrer" onError={aoFalharAvatar} className="h-8 w-8 rounded-full border border-gray-200 object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/10 text-sm font-bold text-brand-blue">{primeiroNome.charAt(0).toUpperCase()}</span>
                  )}
                  <span className="text-[15px] font-semibold text-ink">{primeiroNome}</span>
                </summary>
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
                  <p className="truncate px-3 py-1 text-xs text-ink-muted">{user.nome}</p>
                  <div className="my-2 h-px bg-black/10" />
                  {user.ehSuper && <Link href="/pro/dashboard-analytics" className="flex min-h-[40px] items-center rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-black/5">Painel administrativo</Link>}
                  {user.ehPro && <Link href="/pro/dashboard" className="flex min-h-[40px] items-center rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-black/5">Painel do dentista</Link>}
                  <button onClick={sair} className="flex min-h-[40px] w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger/5">Sair da Conta</button>
                </div>
              </details>
            ) : (
              <>
                <button onClick={() => pedirLoginPaciente()} className="min-h-[44px] rounded-xl px-4 py-2 text-[15px] font-medium transition-colors" style={{ color: "#1C1C1E" }}>Entrar</button>
                <button onClick={abrirModalDentista} className="min-h-[44px] rounded-[14px] px-5 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110" style={{ background: "#E6004C", boxShadow: "0 4px 16px rgba(230,0,76,0.28)" }}>Acesso do Dentista</button>
              </>
            )}
          </div>

          {/* Hambúrguer — mobile */}
          <button className="flex h-10 w-10 items-center justify-center rounded-xl lg:hidden" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} style={{ color: "#3A3A3C" }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Gaveta mobile */}
      {menuOpen && (
        <div className="flex flex-col gap-1 px-5 pb-6 pt-2 lg:hidden" style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)", background: "rgba(255,255,255,0.98)" }}>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="flex min-h-[48px] items-center rounded-xl px-3 py-3 text-[16px] font-medium" style={{ color: "#1C1C1E" }}>{link.label}</Link>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            {user ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-left">
                <div className="flex items-center gap-3">
                  {user.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.foto} alt={user.nome ?? ""} referrerPolicy="no-referrer" onError={aoFalharAvatar} className="h-10 w-10 rounded-full border border-gray-200 object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue/10 text-base font-bold text-brand-blue">{primeiroNome.charAt(0).toUpperCase()}</span>
                  )}
                  <p className="min-w-0 truncate text-[14px] font-bold text-gray-900">{user.nome}</p>
                </div>
                {user.ehSuper && <Link href="/pro/dashboard-analytics" onClick={() => setMenuOpen(false)} className="min-h-[44px] rounded-[12px] bg-white px-3 py-2 text-[14px] font-semibold text-ink">Painel administrativo</Link>}
                {user.ehPro && <Link href="/pro/dashboard" onClick={() => setMenuOpen(false)} className="min-h-[44px] rounded-[12px] bg-white px-3 py-2 text-[14px] font-semibold text-ink">Painel do dentista</Link>}
                <button onClick={() => { setMenuOpen(false); sair(); }} className="min-h-[44px] w-full rounded-[12px] border border-red-100 bg-red-50 py-2.5 text-center text-[14px] font-semibold text-red-500">Sair da Conta</button>
              </div>
            ) : (
              <>
                <button onClick={() => { setMenuOpen(false); pedirLoginPaciente(); }} className="min-h-[48px] w-full rounded-[14px] border py-3 text-center text-[15px] font-medium" style={{ borderColor: "rgba(60,60,67,0.18)", color: "#1C1C1E" }}>Entrar</button>
                <button onClick={() => { setMenuOpen(false); abrirModalDentista(); }} className="min-h-[48px] w-full rounded-[14px] py-3 text-center text-[15px] font-semibold text-white" style={{ background: "#E6004C", boxShadow: "0 4px 12px rgba(230,0,76,0.25)" }}>Acesso do Dentista</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
