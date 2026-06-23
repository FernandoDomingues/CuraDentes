"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: ComoFunciona — Seção "Como funciona"
//
// Exibe na landing page os passos de como o paciente encontra um dentista:
//   1. Busque por localização
//   2. Filtre por especialidade
//   3. Agende em segundos
//
// Tem dois layouts distintos:
//   - MOBILE (< lg): coluna vertical de cards compactos com linha conectora
//     em gradiente entre os círculos de ícone.
//   - DESKTOP (≥ lg): grid de 3 colunas com cards "glass" que sobem levemente
//     no hover.
//
// Observação: embora os dados sejam estáticos, os cards do desktop usam
// onMouseEnter/onMouseLeave manipulando o DOM (e.currentTarget.style) para o
// efeito de hover — por isso o componente precisa ser Client Component ("use client").
// ═══════════════════════════════════════════════════════════════════════════════

import { MapPin, SlidersHorizontal, CalendarCheck } from "lucide-react";

const STEPS = [
  {
    number: "1",
    icon: MapPin,
    title: "Busque por localização",
    text: "Ative sua localização ou informe o endereço. Exibimos dentistas ordenados pela distância real.",
  },
  {
    number: "2",
    icon: SlidersHorizontal,
    title: "Filtre por especialidade",
    text: "Ortodontia, implantes, estética ou clínico geral — escolha o profissional certo.",
  },
  {
    number: "3",
    icon: CalendarCheck,
    title: "Agende em segundos",
    text: "Veja horários disponíveis em tempo real e confirme sua consulta diretamente pelo CuraDentes.",
  },
];

export default function ComoFunciona() {
  return (
    <section id="como-funciona">
      {/* ── MOBILE layout (< lg) ─────────────────────────────────────────── */}
      <div
        className="lg:hidden px-4 py-6"
        style={{ background: "#F2F2F7" }}
      >
        {/* Section label */}
        <p
          className="text-[12px] font-semibold uppercase tracking-widest mb-4 px-1"
          style={{ color: "#8E8E93" }}
        >
          Como funciona
        </p>

        {/* Steps as compact vertical cards */}
        <div className="flex flex-col gap-3">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === STEPS.length - 1;
            return (
              <div key={step.number} className="relative flex items-start gap-4">
                {/* Step connector line */}
                {!isLast && (
                  <div
                    style={{
                      position: "absolute",
                      left: "22px",
                      top: "52px",
                      width: "2px",
                      height: "calc(100% + 4px)",
                      background: "linear-gradient(to bottom, rgba(0,122,255,0.25), transparent)",
                      borderRadius: "1px",
                    }}
                  />
                )}

                {/* Icon circle */}
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#007AFF",
                    boxShadow: "0 4px 12px rgba(0,122,255,0.30)",
                    zIndex: 1,
                  }}
                >
                  <Icon size={20} color="#fff" />
                </div>

                {/* Text content */}
                <div
                  className="flex-1"
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    padding: "14px 16px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: "#007AFF" }}
                    >
                      PASSO {step.number}
                    </span>
                  </div>
                  <h3
                    className="font-semibold text-[15px] leading-snug mb-1"
                    style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "#6C6C70" }}
                  >
                    {step.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DESKTOP layout (≥ lg) ─────────────────────────────────────────── */}
      <div className="hidden lg:block" style={{ padding: "80px 0" }}>
        <div className="container mx-auto px-5 md:px-8 lg:px-16">
          <div className="text-center mb-2">
            <span
              className="text-[13px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--primary-blue)" }}
            >
              Como funciona
            </span>
          </div>
          <h2
            className="text-center mb-10"
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              fontSize: "clamp(26px, 4vw, 34px)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--brand-navy)",
            }}
          >
            Seu dentista ideal em 3 passos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="group"
                  style={{
                    background: "var(--glass-fill-strong)",
                    backdropFilter: "blur(24px) saturate(120%)",
                    WebkitBackdropFilter: "blur(24px) saturate(120%)",
                    border: "0.5px solid rgba(255,255,255,0.40)",
                    borderRadius: "20px",
                    padding: "32px 24px",
                    boxShadow: "var(--shadow-md)",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
                  }}
                >
                  <div
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-5"
                    style={{
                      background: "var(--primary-blue)",
                      boxShadow: "var(--shadow-cta)",
                    }}
                  >
                    <Icon size={22} color="#fff" />
                  </div>
                  <h3
                    className="mb-3"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      fontSize: "20px",
                      color: "var(--brand-navy)",
                      lineHeight: 1.3,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
