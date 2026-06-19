// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: SEÇÃO APP MOBILE
//
// Apresenta o aplicativo CuraDentes para iOS e Android com mockup do celular.
// A imagem do celular é exibida APENAS na versão desktop (≥ md).
// Em mobile, apenas o conteúdo textual e os botões são exibidos.
// ═══════════════════════════════════════════════════════════════════════════════

import { Smartphone, Bell, MapPin } from "lucide-react";

import appPreviewUrl from "@/assets/images/celular-ref2.png";

// Importa o print da tela mobile carregado pelo usuário
const APP_PREVIEW_URL = appPreviewUrl;

// ─── Benefícios listados abaixo do texto principal ───────────────────────────
const BENEFICIOS = [
  { icone: Bell,       texto: "Lembretes automáticos de consulta" },
  { icone: MapPin,     texto: "Mapa em tempo real com disponibilidade" },
  { icone: Smartphone, texto: "Histórico de consultas no app" },
];

// ─── Componente principal ────────────────────────────────────────────────────
export default function AppSection() {
  return (
    <section
      style={{
        padding: "80px 0",
        background: "linear-gradient(160deg, rgba(0,122,255,0.07) 0%, rgba(227,242,253,0.35) 100%)",
      }}
    >
      <div className="container mx-auto px-5 md:px-8 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

          {/* ── Coluna de conteúdo (texto + botões) ── */}
          <div className="text-center md:text-left order-2 md:order-1">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <span
                className="text-[13px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--primary-blue)" }}
              >
                App Mobile
              </span>
              <span
                className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: "rgba(0,122,255,0.12)", color: "var(--primary-blue)" }}
              >
                Em breve
              </span>
            </div>

            <h2
              className="mb-4"
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: "clamp(26px, 4vw, 36px)",
                color: "var(--brand-navy)",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              Leve o CuraDentes no seu bolso
            </h2>

            <p
              className="mb-6"
              style={{ fontSize: "17px", lineHeight: 1.6, color: "var(--text-secondary)" }}
            >
              Receba notificações de confirmação de consulta, acompanhe seus
              agendamentos e descubra dentistas enquanto você se move. Disponível
              em breve para iOS e Android.
            </p>

            {/* Lista de benefícios */}
            <div className="flex flex-col gap-3 mb-8 text-left">
              {BENEFICIOS.map((item) => {
                const Icone = item.icone;
                return (
                  <div key={item.texto} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(0,122,255,0.10)" }}
                    >
                      <Icone size={16} style={{ color: "var(--primary-blue)" }} />
                    </div>
                    <span className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
                      {item.texto}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Botões App Store / Google Play */}
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {["App Store", "Google Play"].map((loja) => (
                <button
                  key={loja}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-[14px] font-semibold text-[14px] min-h-[48px] transition-all duration-200"
                  style={{
                    background: "var(--brand-navy)",
                    color: "#fff",
                    boxShadow: "var(--shadow-md)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#0d3480"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand-navy)"; }}
                >
                  <Smartphone size={16} />
                  {loja}
                  <span
                    className="text-[10px] font-normal ml-1 px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                  >
                    Em breve
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Mockup do celular — VISÍVEL APENAS EM DESKTOP (≥ md) ── */}
          {/*
           * A imagem é ocultada em mobile com a classe "hidden md:flex"
           * para não consumir espaço desnecessário em telas pequenas.
           * Em desktop, aparece centralizada com bordas arredondadas e sombra.
           */}
          <div className="hidden md:flex justify-center order-1 md:order-2">
            <div
              style={{
                width: "100%",
                maxWidth: "280px",
                position: "relative",
              }}
            >
              <img
                src={APP_PREVIEW_URL}
                alt="CuraDentes — versão mobile"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: "36px",
                  boxShadow: "0 32px 80px rgba(10,42,102,0.22)",
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
