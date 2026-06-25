// ═══════════════════════════════════════════════════════════════════════════════
// SOBRE — /sobre (Server Component, estática).
// Página institucional: missão, quem somos, como funciona e valores.
// Conteúdo portado VERBATIM do site-k11 (sem Header/Footer, que vêm do layout).
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import { Search, Shield, Sparkles, MapPin, Star, HeartHandshake, Target, Lightbulb } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre nós",
  description:
    "O CuraDentes facilita o acesso à saúde odontológica no Brasil: encontre dentistas de confiança perto de você, com avaliações reais e contato direto.",
  alternates: { canonical: "/sobre" },
};

const VALORES = [
  {
    icon: Target,
    titulo: "Transparência",
    desc: "Acreditamos que a escolha de um dentista deve ser feita com informações claras: preços, avaliações reais e localização."
  },
  {
    icon: HeartHandshake,
    titulo: "Confiança",
    desc: "Cada perfil de dentista passa por verificação profissional via CRO para garantir que você está em boas mãos."
  },
  {
    icon: Lightbulb,
    titulo: "Inovação",
    desc: "Usamos tecnologia para simplificar o que é complexo: buscar, comparar e agendar consultas odontológicas."
  },
  {
    icon: Star,
    titulo: "Qualidade",
    desc: "Valorizamos o atendimento de excelência e damos voz aos pacientes por meio de avaliações verificadas."
  },
];

export default function Sobre() {
  return (
    <div style={{ background: "#F2F2F7" }}>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(48px, 8vw, 96px) 0" }}>
        <div className="container mx-auto px-5 md:px-8 lg:px-16">
          <div className="max-w-[720px] mx-auto text-center">
            <div className="mb-3">
              <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: "#007AFF" }}>
                Sobre Nós
              </span>
            </div>
            <h1 className="text-[clamp(28px,5vw,48px)] font-bold leading-[1.1] tracking-[-0.03em] mb-5" style={{ color: "#0A2A66" }}>
              Facilitando o acesso a saúde odontológica no Brasil
            </h1>
            <p className="text-[clamp(15px,2vw,17px)] leading-relaxed" style={{ color: "#3A3A3C" }}>
              O CuraDentes nasceu para resolver um problema simples mas que afeta milhões de brasileiros:
              encontrar um dentista de confiança perto de você, com preços acessíveis e agendamento prático.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Quem Somos ────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 80px" }}>
        <div className="container mx-auto px-5 md:px-8 lg:px-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-3">
                <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: "#007AFF" }}>
                  Quem Somos
                </span>
              </div>
              <h2 className="text-[clamp(24px,3.5vw,34px)] font-bold leading-[1.15] tracking-[-0.02em] mb-5" style={{ color: "#0A2A66" }}>
                Uma plataforma que conecta pacientes aos melhores dentistas
              </h2>
              <p className="text-[15px] leading-relaxed mb-4" style={{ color: "#3A3A3C" }}>
                O CuraDentes é uma plataforma brasileira que está começando sua jornada com um objetivo claro:
                tornar a busca por atendimento odontológico mais simples, transparente e acessível para todos.
              </p>
              <p className="text-[15px] leading-relaxed" style={{ color: "#3A3A3C" }}>
                Acreditamos que tecnologia e saúde caminham juntas. Por isso, criamos uma ferramenta que permite
                buscar dentistas por proximidade, conferir avaliações de pacientes reais, visualizar preços e
                entrar em contato diretamente — tudo em poucos cliques.
              </p>
            </div>
            <div
              className="rounded-[24px] p-8"
              style={{
                background: "linear-gradient(135deg, rgba(0,122,255,0.08) 0%, rgba(10,42,102,0.04) 100%)",
                backdropFilter: "blur(24px) saturate(120%)",
                border: "0.5px solid rgba(255,255,255,0.40)",
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-5 h-5" style={{ color: "#007AFF" }} />
                <span className="text-[15px] font-semibold" style={{ color: "#0A2A66" }}>Nosso propósito</span>
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: "#3A3A3C" }}>
                &quot;Democratizar o acesso à saúde odontológica de qualidade no Brasil, conectando pacientes
                a dentistas verificados de forma simples, transparente e digital.&quot;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Como funciona ──────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 80px" }}>
        <div className="container mx-auto px-5 md:px-8 lg:px-16">
          <div className="text-center mb-3">
            <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: "#007AFF" }}>
              Como funciona
            </span>
          </div>
          <h2 className="text-center text-[clamp(24px,3.5vw,34px)] font-bold leading-[1.15] tracking-[-0.02em] mb-12" style={{ color: "#0A2A66" }}>
            Buscar um dentista nunca foi tão fácil
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Search, passo: "1", titulo: "Busque", desc: "Digite sua cidade ou especialidade desejada." },
              { icon: MapPin, passo: "2", titulo: "Compare", desc: "Veja avaliações, preços e a distância até o consultório." },
              { icon: Shield, passo: "3", titulo: "Escolha", desc: "Profissionais verificados pelo CRO, com fotos e bio." },
              { icon: Sparkles, passo: "4", titulo: "Agende", desc: "Entre em contato direto com o dentista pelo Whatsapp." },
            ].map((item) => (
              <div
                key={item.passo}
                className="rounded-[20px] p-6 text-center transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "rgba(255,255,255,0.70)",
                  backdropFilter: "blur(24px) saturate(120%)",
                  border: "0.5px solid rgba(255,255,255,0.40)",
                  boxShadow: "0 8px 20px rgba(16,24,64,0.06)",
                }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,122,255,0.10)" }}>
                  <item.icon className="w-5 h-5" style={{ color: "#007AFF" }} />
                </div>
                <div className="text-[13px] font-bold mb-1" style={{ color: "#007AFF" }}>PASSO {item.passo}</div>
                <h3 className="text-[16px] font-bold mb-2" style={{ color: "#0A2A66" }}>{item.titulo}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "#8E8E93" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Valores ──────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 80px" }}>
        <div className="container mx-auto px-5 md:px-8 lg:px-16">
          <div className="text-center mb-3">
            <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: "#007AFF" }}>
              Nossos valores
            </span>
          </div>
          <h2 className="text-center text-[clamp(24px,3.5vw,34px)] font-bold leading-[1.15] tracking-[-0.02em] mb-12" style={{ color: "#0A2A66" }}>
            O que nos move
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALORES.map((v) => (
              <div
                key={v.titulo}
                className="rounded-[20px] p-6 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "rgba(255,255,255,0.70)",
                  backdropFilter: "blur(24px) saturate(120%)",
                  border: "0.5px solid rgba(255,255,255,0.40)",
                  boxShadow: "0 8px 20px rgba(16,24,64,0.06)",
                }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(0,122,255,0.10)" }}>
                  <v.icon className="w-5 h-5" style={{ color: "#007AFF" }} />
                </div>
                <h3 className="text-[16px] font-bold mb-2" style={{ color: "#0A2A66" }}>{v.titulo}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "#8E8E93" }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 80px" }}>
        <div className="container mx-auto px-5 md:px-8 lg:px-16">
          <div
            className="rounded-[28px] p-[clamp(32px,5vw,56px)] text-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,122,255,0.09) 0%, rgba(10,42,102,0.05) 100%)",
              backdropFilter: "blur(24px) saturate(120%)",
              border: "0.5px solid rgba(255,255,255,0.40)",
            }}
          >
            <h2 className="text-[clamp(24px,3.5vw,32px)] font-bold leading-[1.15] tracking-[-0.02em] mb-4" style={{ color: "#0A2A66" }}>
              Faça parte dessa história
            </h2>
            <p className="text-[15px] leading-relaxed mb-8 max-w-[520px] mx-auto" style={{ color: "#3A3A3C" }}>
              Comece agora a encontrar o dentista ideal para você ou cadastre seu consultório e alcance novos pacientes.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/busca"
                className="sobre-cta sobre-cta--azul inline-flex items-center px-7 py-3 rounded-[14px] text-white text-[15px] font-semibold transition-all duration-300"
                style={{
                  background: "#007AFF",
                  boxShadow: "0 8px 20px rgba(0,122,255,0.25)",
                }}
              >
                Buscar dentista
              </a>
              <a
                href="/cadastro"
                className="sobre-cta sobre-cta--magenta inline-flex items-center px-7 py-3 rounded-[14px] text-white text-[15px] font-semibold transition-all duration-300"
                style={{
                  background: "#E6004C",
                  boxShadow: "0 8px 20px rgba(230,0,76,0.28)",
                }}
              >
                Cadastrar consultório
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Hover dos CTAs (era JS no k11; aqui em CSS p/ manter Server Component) */}
      <style>{`
        .sobre-cta--azul:hover { background: #1a8aff !important; box-shadow: 0 8px 24px rgba(0,122,255,0.35) !important; }
        .sobre-cta--magenta:hover { background: #c4003e !important; box-shadow: 0 8px 24px rgba(230,0,76,0.35) !important; }
      `}</style>
    </div>
  );
}
