"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// FooterLogo — logo do rodapé ciente da rota. Em /salas (ambiente CuraDentes Pro)
// usa a logo Pro branca; no resto, a consumer (branca via filtro invert). Island
// client porque o Footer é Server Component e precisa de usePathname.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FooterLogo() {
  const pathname = usePathname();
  const ehSalas = !!pathname && pathname.startsWith("/salas");

  return (
    <Link href={ehSalas ? "/salas" : "/"} className="mb-4 inline-block">
      {ehSalas ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logos/logo-pro-nome-branco.png" alt="CuraDentes Pro" className="h-9 w-auto" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logos/logo-com-nome.png"
          alt="CuraDentes"
          className="h-9 w-auto"
          style={{ filter: "brightness(0) invert(1)" }}
        />
      )}
    </Link>
  );
}
