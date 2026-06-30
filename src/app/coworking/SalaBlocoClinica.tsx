"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// SalaBlocoClinica — uma sala dentro da página da clínica, em card rico: SALA Nº,
// fotos, valor por hora + diária, equipamentos, e o box de solicitar horário.
// ═══════════════════════════════════════════════════════════════════════════════

import { Check, Wrench } from "lucide-react";
import { normalizarBlocos, type SalaPublica, type SlotOcupado } from "@/lib/salas";
import GaleriaSala from "./GaleriaSala";
import SolicitarReserva from "./SolicitarReserva";

export default function SalaBlocoClinica({
  sala,
  ocupados,
}: {
  sala: SalaPublica;
  ocupados: SlotOcupado[];
}) {
  const blocos = normalizarBlocos(sala.disponibilidade ?? []);
  const numero = sala.numero_na_clinica != null ? `Sala ${String(sala.numero_na_clinica).padStart(2, "0")}` : "Sala";
  const rs = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">{numero}</span>
        <h3 className="text-[19px] font-bold text-brand-navy">{sala.titulo}</h3>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <GaleriaSala fotos={sala.fotos ?? []} titulo={sala.titulo} />

          {/* Preços: hora + diária */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[22px] font-bold text-brand-blue">{rs(sala.preco_valor)}</span>
            <span className="text-[14px] text-ink-muted">por hora</span>
            {sala.preco_diaria != null && (
              <span className="text-[14px] text-ink-soft">
                · <strong className="text-brand-navy">{rs(sala.preco_diaria)}</strong> a diária
              </span>
            )}
          </div>

          {/* Equipamentos */}
          {sala.equipamentos.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-brand-navy">
                <Wrench size={15} style={{ color: "#007aff" }} /> Equipamentos e estrutura
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sala.equipamentos.map((e) => (
                  <div key={e} className="flex items-center gap-2 text-[13px] text-ink-soft">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(52,199,89,0.12)" }}>
                      <Check size={11} style={{ color: "#2a8a3e" }} />
                    </span>
                    {e}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Solicitar horário */}
        <div className="lg:pt-1">
          <SolicitarReserva salaId={sala.id} disponibilidade={blocos} ocupados={ocupados} />
        </div>
      </div>
    </section>
  );
}
