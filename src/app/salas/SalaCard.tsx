"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// SalaCard — card do catálogo (estilo portal imobiliário, identidade CuraDentes).
// Liderado por foto (capa 16:10) com placeholder de marca quando ainda não há foto.
// Usado em /salas (grid) e no "Veja também" do detalhe.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";
import { MapPin, DoorOpen, BadgeCheck } from "lucide-react";
import { PRECO_UNIDADE_LABEL, type SalaPublica } from "@/lib/salas";

export default function SalaCard({ sala }: { sala: SalaPublica }) {
  const [imgOk, setImgOk] = useState(true);
  const capa = sala.fotos?.[0];
  const local = [sala.bairro, sala.cidade].filter(Boolean).join(", ") || sala.nome_clinica || "—";

  return (
    <Link
      href={`/salas/${sala.id}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(10,42,102,0.14)]"
    >
      {/* Capa */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-soft">
        {capa && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capa}
            alt={sala.titulo}
            referrerPolicy="no-referrer"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #e3f2fd 0%, #f5f9ff 100%)" }}
          >
            <DoorOpen size={34} style={{ color: "rgba(0,122,255,0.32)" }} />
            <span className="text-[12px] font-medium" style={{ color: "rgba(10,42,102,0.40)" }}>
              Foto em breve
            </span>
          </div>
        )}
        {/* Badge de verificado (todas as salas públicas são de anfitrião com CRO ok) */}
        <span
          className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur"
          style={{ background: "rgba(10,42,102,0.82)" }}
        >
          <BadgeCheck size={12} /> Verificado
        </span>
      </div>

      {/* Corpo */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="flex items-center gap-1 text-[12px] text-ink-muted">
          <MapPin size={12} /> {local}
        </p>
        <h2 className="line-clamp-2 text-[16px] font-bold leading-snug text-brand-navy">{sala.titulo}</h2>

        <p className="mt-auto pt-1">
          <span className="text-[18px] font-bold text-brand-blue">
            {sala.preco_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <span className="text-[13px] font-medium text-ink-muted"> {PRECO_UNIDADE_LABEL[sala.preco_unidade]}</span>
        </p>

        {sala.equipamentos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-gray-100 pt-2.5">
            {sala.equipamentos.slice(0, 3).map((e) => (
              <span key={e} className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand-navy">
                {e}
              </span>
            ))}
            {sala.equipamentos.length > 3 && (
              <span className="px-1 py-1 text-[11px] font-medium text-ink-muted">
                +{sala.equipamentos.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
