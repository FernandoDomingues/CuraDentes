"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// MapaSalaInner — mapa Leaflet com UM pino na localização da sala. Leaflet puro
// (igual HeatMapLayer). Pino via divIcon (SVG inline) p/ evitar o bug de ícone
// default do Leaflet com bundler. Carregado só no cliente (ssr:false em MapaSala).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PINO_SVG = `
<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
  <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="#007aff"/>
  <circle cx="17" cy="17" r="7" fill="#fff"/>
</svg>`;

export default function MapaSalaInner({
  lat,
  lng,
  titulo,
}: {
  lat: number;
  lng: number;
  titulo: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    const icon = L.divIcon({
      html: PINO_SVG,
      className: "",
      iconSize: [34, 44],
      iconAnchor: [17, 44],
    });
    L.marker([lat, lng], { icon, title: titulo }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, titulo]);

  // isolation:isolate → cria um stacking context próprio, prendendo os z-index
  // internos do Leaflet (panes/controles vão até ~1000) dentro do mapa. Sem isto,
  // eles "escapam" e aparecem ACIMA de modais (ex.: a agenda) abertos na página.
  return <div ref={elRef} className="h-full w-full" style={{ isolation: "isolate" }} />;
}
