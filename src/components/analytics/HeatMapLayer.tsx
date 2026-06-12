// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: HeatMapLayer
//
// Renderiza um mapa Leaflet com camada de calor (leaflet.heat) sobre as
// coordenadas dos dentistas cadastrados.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

interface HeatMapLayerProps {
  points: [number, number, number][];
  center?: [number, number];
  zoom?: number;
}

export default function HeatMapLayer({
  points,
  center = [-23.5, -47.5],
  zoom = 8,
}: HeatMapLayerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      if (heatLayerRef.current) {
        mapInstanceRef.current.removeLayer(heatLayerRef.current);
      }

      if (points.length > 0) {
        const maxIntensidade = Math.max(...points.map((p) => p[2]), 1);
        const normalizados = points.map(
          (p) => [p[0], p[1], p[2] / maxIntensidade] as [number, number, number]
        );

        heatLayerRef.current = L.heatLayer(normalizados, {
          radius: 25,
          blur: 15,
          maxZoom: 10,
          max: 1.0,
          gradient: {
            0.4: "#34C759",
            0.6: "#FF9500",
            0.8: "#FF3B30",
            1.0: "#FF3B30",
          },
        });
        heatLayerRef.current.addTo(mapInstanceRef.current);
      }
    }
  }, [points]);

  return <div ref={mapRef} className="w-full h-full" />;
}
