"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// MapaSala — wrapper cliente que carrega o mapa Leaflet só no navegador (ssr:false).
// O detalhe (Server Component) importa ESTE arquivo; o Leaflet de verdade fica no
// MapaSalaInner (toca window/DOM, não pode renderizar no servidor).
// ═══════════════════════════════════════════════════════════════════════════════

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./MapaSalaInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-brand-soft" />,
});

export default function MapaSala(props: { lat: number; lng: number; titulo: string }) {
  return <Inner {...props} />;
}
