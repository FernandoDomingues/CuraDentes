"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// ClinicaCard — card de CLÍNICA no catálogo (a busca mostra clínicas; ao entrar,
// o dentista escolhe a sala). Capa = fachada (placeholder de marca se não houver).
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";
import { MapPin, Building2, BadgeCheck, DoorOpen } from "lucide-react";
import type { ClinicaPublica } from "@/lib/salas";

export default function ClinicaCard({ clinica }: { clinica: ClinicaPublica }) {
  const [imgOk, setImgOk] = useState(true);
  const capa = clinica.foto_fachada;
  const local = [clinica.bairro, clinica.cidade].filter(Boolean).join(", ") || "—";

  return (
    <Link
      href={`/coworking/clinica/${clinica.clinica_key}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(10,42,102,0.14)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-soft">
        {capa && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capa}
            alt={clinica.nome_clinica ?? "Clínica"}
            referrerPolicy="no-referrer"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #e3f2fd 0%, #f5f9ff 100%)" }}>
            <Building2 size={34} style={{ color: "rgba(0,122,255,0.32)" }} />
            <span className="text-[12px] font-medium" style={{ color: "rgba(10,42,102,0.40)" }}>Foto em breve</span>
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur" style={{ background: "rgba(10,42,102,0.82)" }}>
          <BadgeCheck size={12} /> Verificada
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="flex items-center gap-1 text-[12px] text-ink-muted">
          <MapPin size={12} /> {local}
        </p>
        <h2 className="line-clamp-2 text-[16px] font-bold leading-snug text-brand-navy">{clinica.nome_clinica ?? "Clínica"}</h2>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-navy">
            <DoorOpen size={14} style={{ color: "#007aff" }} />
            {clinica.qtd_salas} {clinica.qtd_salas === 1 ? "sala" : "salas"}
          </span>
          {clinica.preco_min != null && (
            <span className="text-[13px] text-ink-muted">
              a partir de{" "}
              <strong className="text-brand-blue">
                {clinica.preco_min.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </strong>
              /hora
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
