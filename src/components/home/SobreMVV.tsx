"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: SEÇÃO MISSÃO, VISÃO E VALORES (SobreMVV)
//
// Substitui a antiga seção "Nossa Missão" com o conteúdo oficial do CuraDentes.
// Exibe três abas navegáveis (Missão / Visão / Valores) com animação suave.
// Layout responsivo: vertical em mobile, horizontal com destaque em desktop.
//
// É um Client Component porque usa useState (controle da aba ativa) e handlers
// onClick/onMouseEnter. A animação `fadeInUp` já é um keyframe global do projeto.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Target, Eye, Heart, Shield, Zap, Users, Lightbulb } from "lucide-react";

// ─── Dados dos valores institucionais ────────────────────────────────────────
const VALORES = [
  {
    icone: Shield,
    titulo: "Ética e rigor profissional",
    descricao:
      "Respeito absoluto às normas do conselho de classe e valorização do registro profissional (CRO) como garantia de qualidade.",
    cor: "#007AFF",
    fundo: "rgba(0,122,255,0.08)",
  },
  {
    icone: Zap,
    titulo: "Agilidade com propósito",
    descricao:
      "Compromisso em reduzir a distância e o tempo entre a dor do paciente e a solução do dentista — o espírito do botão SOS.",
    cor: "#FF9500",
    fundo: "rgba(255,149,0,0.08)",
  },
  {
    icone: Eye,
    titulo: "Transparência",
    descricao:
      "Relações claras e diretas, utilizando avaliações reais e informações precisas para gerar confiança mútua.",
    cor: "#34C759",
    fundo: "rgba(52,199,89,0.08)",
  },
  {
    icone: Users,
    titulo: "Humanização digital",
    descricao:
      "A tecnologia serve para aproximar pessoas, permitindo que a individualidade de cada profissional e a necessidade de cada paciente sejam respeitadas.",
    cor: "#E6004C",
    fundo: "rgba(230,0,76,0.08)",
  },
  {
    icone: Lightbulb,
    titulo: "Inovação acessível",
    descricao:
      "Criar soluções tecnológicas complexas que sejam simples e intuitivas para qualquer pessoa usar.",
    cor: "#AF52DE",
    fundo: "rgba(175,82,222,0.08)",
  },
];

// ─── Abas de navegação ────────────────────────────────────────────────────────
type Aba = "missao" | "visao" | "valores";

const ABAS: { id: Aba; label: string; icone: typeof Target }[] = [
  { id: "missao", label: "Missão", icone: Target },
  { id: "visao",  label: "Visão",  icone: Eye },
  { id: "valores", label: "Valores", icone: Heart },
];

// ─── Conteúdo textual de cada aba ────────────────────────────────────────────
const CONTEUDO: Record<Aba, string> = {
  missao:
    "Conectar pacientes a dentistas de forma ágil, humanizada e segura, utilizando a tecnologia para democratizar o acesso à saúde bucal e oferecer suporte imediato em momentos de urgência.",
  visao:
    "Ser a plataforma de referência nacional em conexão odontológica, reconhecida por profissionais e pacientes como a ferramenta mais indispensável e confiável para a gestão de cuidados com o sorriso.",
  valores: "",
};

// ─── Componente principal ────────────────────────────────────────────────────
export default function SobreMVV() {
  // Controla qual aba está ativa no momento
  const [abaAtiva, setAbaAtiva] = useState<Aba>("missao");

  return (
    <section
      id="sobre"
      style={{ padding: "80px 0", background: "rgba(227,242,253,0.18)" }}
    >
      <div className="container mx-auto px-5 md:px-8 lg:px-16">
        {/* Cabeçalho da seção */}
        <div className="max-w-[760px] mx-auto text-center mb-10">
          <span
            className="text-[13px] font-semibold uppercase tracking-widest block mb-3"
            style={{ color: "var(--primary-blue)" }}
          >
            Quem somos
          </span>
          <h2
            className="mb-4"
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              fontSize: "clamp(26px, 4vw, 34px)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--brand-navy)",
            }}
          >
            Missão, Visão e Valores
          </h2>
          <p
            style={{
              fontSize: "clamp(15px, 1.8vw, 17px)",
              lineHeight: 1.7,
              color: "var(--text-secondary)",
            }}
          >
            Os princípios que guiam cada decisão do CuraDentes — da tecnologia
            ao atendimento, do dentista ao paciente.
          </p>
        </div>

        {/* Navegação em abas */}
        <div className="flex justify-center mb-8">
          <div
            className="inline-flex rounded-[16px] p-1 gap-1"
            style={{
              background: "rgba(255,255,255,0.70)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "0.5px solid rgba(255,255,255,0.45)",
              boxShadow: "0 2px 8px rgba(16,24,64,0.06)",
            }}
            role="tablist"
            aria-label="Missão, Visão e Valores"
          >
            {ABAS.map((aba) => {
              const Icone = aba.icone;
              const isAtiva = abaAtiva === aba.id;
              return (
                <button
                  key={aba.id}
                  role="tab"
                  aria-selected={isAtiva}
                  onClick={() => setAbaAtiva(aba.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[14px] font-semibold min-h-[44px] transition-all duration-200"
                  style={
                    isAtiva
                      ? {
                          background: "var(--primary-blue)",
                          color: "#fff",
                          boxShadow: "0 4px 12px rgba(0,122,255,0.28)",
                        }
                      : {
                          background: "transparent",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  <Icone size={15} />
                  {aba.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo da aba ativa */}
        <div
          key={abaAtiva}
          style={{
            animation: "fadeInUp 0.25s ease",
          }}
        >
          {/* Abas Missão e Visão — card de texto centralizado */}
          {(abaAtiva === "missao" || abaAtiva === "visao") && (
            <div
              className="max-w-[820px] mx-auto text-center"
              style={{
                background: "rgba(255,255,255,0.80)",
                backdropFilter: "blur(24px) saturate(120%)",
                WebkitBackdropFilter: "blur(24px) saturate(120%)",
                border: "0.5px solid rgba(255,255,255,0.45)",
                borderRadius: "24px",
                padding: "clamp(32px, 5vw, 56px) clamp(24px, 6vw, 64px)",
                boxShadow: "0 8px 32px rgba(16,24,64,0.08)",
              }}
            >
              {/* Ícone decorativo grande */}
              <div
                className="inline-flex items-center justify-center mx-auto mb-6"
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "rgba(0,122,255,0.08)",
                  border: "0.5px solid rgba(0,122,255,0.15)",
                }}
              >
                {abaAtiva === "missao" ? (
                  <Target size={32} style={{ color: "var(--primary-blue)" }} />
                ) : (
                  <Eye size={32} style={{ color: "var(--primary-blue)" }} />
                )}
              </div>

              <h3
                className="mb-5"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(20px, 3vw, 26px)",
                  color: "var(--brand-navy)",
                  letterSpacing: "-0.01em",
                }}
              >
                {abaAtiva === "missao" ? "Nossa Missão" : "Nossa Visão"}
              </h3>

              <p
                style={{
                  fontSize: "clamp(16px, 2vw, 19px)",
                  lineHeight: 1.75,
                  color: "var(--text-secondary)",
                  maxWidth: "640px",
                  margin: "0 auto",
                }}
              >
                {CONTEUDO[abaAtiva]}
              </p>
            </div>
          )}

          {/* Aba Valores — grid de cards */}
          {abaAtiva === "valores" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[960px] mx-auto">
              {VALORES.map((valor, idx) => {
                const Icone = valor.icone;
                // Último item em grid ímpar centralizado em desktop
                const isUltimo = idx === VALORES.length - 1;
                return (
                  <div
                    key={valor.titulo}
                    className={isUltimo ? "sm:col-span-2 lg:col-span-1" : ""}
                    style={{
                      background: "rgba(255,255,255,0.80)",
                      backdropFilter: "blur(24px) saturate(120%)",
                      WebkitBackdropFilter: "blur(24px) saturate(120%)",
                      border: `0.5px solid ${valor.fundo}`,
                      borderRadius: "20px",
                      padding: "28px 24px",
                      boxShadow: "0 4px 16px rgba(16,24,64,0.06)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(16,24,64,0.10)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(16,24,64,0.06)";
                    }}
                  >
                    {/* Ícone do valor */}
                    <div
                      className="inline-flex items-center justify-center w-12 h-12 rounded-[14px] mb-4"
                      style={{ background: valor.fundo }}
                    >
                      <Icone size={22} style={{ color: valor.cor }} />
                    </div>

                    <h3
                      className="mb-2"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 600,
                        fontSize: "16px",
                        color: "var(--brand-navy)",
                        lineHeight: 1.3,
                      }}
                    >
                      {valor.titulo}
                    </h3>

                    <p
                      style={{
                        fontSize: "14px",
                        lineHeight: 1.65,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {valor.descricao}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Animação de entrada das abas */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
