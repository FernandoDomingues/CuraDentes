// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: CtaDentistas — Banner de call-to-action para dentistas
//
// Exibe na home um card com gradiente convidando dentistas a se cadastrarem no
// CuraDentes Pro. Mostra a logo Pro, o selo "PARA DENTISTAS", título, descrição
// e uma grade de benefícios com ícones lucide. Dois botões-link: "Cadastrar
// Dentista" (/cadastro) e "Saber mais" (/sobre).
//
// Porte do k11 (CtaBanner): o modal de login e todo o estado dele foram REMOVIDOS;
// sobrou só o banner visual, então é um Server Component (sem "use client").
// ═══════════════════════════════════════════════════════════════════════════════

import { TrendingUp, Users, CheckCircle } from "lucide-react";
import Link from "next/link";

// Benefícios listados na grade (cada um vira um item com ícone + texto).
const BENEFITS = [
  { icon: Users, text: "Acesso a milhares de pacientes próximos" },
  { icon: TrendingUp, text: "Aumente sua visibilidade online" },
  { icon: CheckCircle, text: "Perfil verificado com CRO" },
];

export default function CtaDentistas() {
  return (
    <section id="para-dentistas" style={{ padding: "80px 0" }}>
      <div className="container mx-auto px-5 md:px-8 lg:px-16">
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
          style={{
            padding: "clamp(32px, 5vw, 56px)",
            background: "linear-gradient(135deg, rgba(0,122,255,0.09) 0%, rgba(10,42,102,0.05) 100%)",
            border: "0.5px solid rgba(255,255,255,0.45)",
            borderRadius: "28px",
            boxShadow: "var(--shadow-lg)",
            backdropFilter: "blur(24px) saturate(120%)",
            WebkitBackdropFilter: "blur(24px) saturate(120%)",
          }}
        >
          {/* Logo CuraDentesPro */}
          <div className="flex justify-center md:justify-center">
            <img src="/logos/logo-pro-alt.png" alt="CuraDentes Pro" style={{ width: "140px", height: "140px", objectFit: "contain" }} />
          </div>

          {/* Content */}
          <div>
            <span
              className="text-[13px] font-semibold uppercase tracking-widest block mb-3"
              style={{ color: "var(--brand-magenta)" }}
            >
              Para Dentistas
            </span>
            <h2
              className="mb-4"
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: "clamp(24px, 3.5vw, 32px)",
                color: "var(--brand-navy)",
                lineHeight: 1.2,
              }}
            >
              Ganhe visibilidade e atraia mais pacientes
            </h2>
            <p className="mb-6" style={{ fontSize: "16px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
              Cadastre seu perfil gratuitamente e apareça para pacientes próximos que buscam exatamente a sua especialidade. Agenda digital, avaliações verificadas e destaque no ranking.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {BENEFITS.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.text} className="flex items-start gap-2.5">
                    <Icon size={16} style={{ color: "var(--primary-blue)", flexShrink: 0, marginTop: "2px" }} />
                    <span className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                      {benefit.text}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Botão primário: hover trocava bg/sombra via JS no k11; aqui usamos Tailwind hover */}
              <Link
                href="/cadastro"
                className="flex-1 sm:flex-none py-3 px-7 rounded-[14px] text-white font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center transition-all duration-200 bg-[#E6004C] shadow-[0_4px_16px_rgba(230,0,76,0.28)] hover:bg-[#c4003e] hover:shadow-[0_8px_24px_rgba(230,0,76,0.38)]"
              >
                Cadastrar Dentista
              </Link>
              <Link
                href="/sobre"
                className="flex-1 sm:flex-none py-3 px-7 rounded-[14px] font-semibold text-[15px] min-h-[48px] inline-flex items-center justify-center transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.65)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  border: "0.5px solid rgba(255,255,255,0.45)",
                  color: "var(--text-primary)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                Saber mais
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
