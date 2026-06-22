"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// HeatMapLayer — mapa Leaflet com camada de calor (leaflet.heat) sobre coordenadas.
// Usa Leaflet puro (não react-leaflet). Importar via next/dynamic { ssr:false } —
// toca window/DOM. Portado do site-k11. points = [lat, lng, intensidade].
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

export default function HeatMapLayer({
  points,
  center = [-23.5, -47.5],
  zoom = 8,
}: {
  points: [number, number, number][];
  center?: [number, number];
  zoom?: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  // Cria o mapa uma única vez.
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, { center, zoom, zoomControl: true, attributionControl: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(mapInstanceRef.current);
    }
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza a camada de calor quando os pontos mudam.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    if (points.length > 0) {
      const maxIntensidade = Math.max(...points.map((p) => p[2]), 1);
      const normalizados = points.map((p) => [p[0], p[1], p[2] / maxIntensidade] as [number, number, number]);
      heatLayerRef.current = L.heatLayer(normalizados, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        max: 1.0,
        gradient: { 0.4: "#34C759", 0.6: "#FF9500", 0.8: "#FF3B30", 1.0: "#FF3B30" },
      });
      heatLayerRef.current.addTo(map);
    }
    // Cleanup: remove a camada e zera a ref (evita referência órfã em remontagem).
    return () => {
      if (heatLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(heatLayerRef.current);
      }
      heatLayerRef.current = null;
    };
  }, [points]);

  return <div ref={mapRef} className="h-full w-full" />;
}
