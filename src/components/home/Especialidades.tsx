// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Especialidades — Grid de especialidades odontológicas
//
// Exibe na home um grid com todas as especialidades disponíveis. Cada card é um
// link que leva para a página de detalhes da especialidade (/especialidade/:slug).
//
// Server Component (sem "use client"): a navegação é feita com <Link> do Next em
// vez de onClick/useNavigate, e o efeito de hover do k11 (que era inline via
// onMouseEnter/Leave) virou classes utilitárias do Tailwind (transition + lift +
// sombra mais forte). O visual permanece fiel ao site antigo.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ESPECIALIDADES, nomeAmigavel, slugDaEspecialidade } from "@/lib/especialidades";
import {
  Sparkles,
  Star,
  Baby,
  type LucideIcon,
} from "lucide-react";

// ── Custom SVG dental icons ──────────────────────────────────────────────────
const BracesIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6 C4 4 6 3 8 3 C10 3 11 4 12 5 C13 4 14 3 16 3 C18 3 20 4 20 6 L20 18 C20 20 18 21 16 21 C14 21 13 20 12 19 C11 20 10 21 8 21 C6 21 4 20 4 18 Z" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <circle cx="8" cy="12" r="1.5" fill={color} stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
    <circle cx="16" cy="12" r="1.5" fill={color} stroke="none" />
  </svg>
);

// Escova de dente — ícone "toothbrush" do Material Design Icons (Pictogrammers),
// licença Apache 2.0 (livre, sem exigência de atribuição). Preenchido com a cor
// da especialidade, igual aos demais ícones que recolorem. Escolhido pelo usuário.
const ToothbrushIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="m12.91 6.43l2.12 2.12l1.06-1.05l-1.06-1.07l2.83-2.83l1.06 1.06L20 3.6l-2.14-2.1M3 20.57L4.43 22L14.5 11.9l2.13-.71l4.77-4.76c.78-.78.78-2.05 0-2.83l-5.85 5.84l-2.12.71Z" />
  </svg>
);

const SmileImplantIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 13.5 C8 13.5 9.5 16.5 12 16.5 C14.5 16.5 16 13.5 16 13.5" />
    <rect x="7.5" y="9" width="2" height="3" rx="0.5" fill={color} stroke="none" />
    <rect x="11" y="9" width="2" height="3" rx="0.5" fill={color} stroke="none" />
    <rect x="14.5" y="9" width="2" height="3" rx="0.5" fill={color} stroke="none" />
  </svg>
);

const DrillToothIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3.5 C6 3.5 7.5 4.5 9 5 C9 5 9.5 8 8.5 11 C7.5 14 7.5 17 9.5 19 C11 20.5 13 20.5 13 20.5 C13 20.5 13 17 12 14 C11 11 11 8 13 5 C14.5 4.5 16 3.5 16 3.5" />
    <line x1="6" y1="3.5" x2="16" y2="3.5" />
    <line x1="17" y1="5.5" x2="21" y2="3" />
    <line x1="17.5" y1="7.5" x2="21.5" y2="6" />
    <line x1="17" y1="9.5" x2="21" y2="9" />
  </svg>
);

const ImplantScrewIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3 C8 3 9.5 4.5 12 4.5 C14.5 4.5 16 3 16 3 C16 3 17 5 17 7.5 C17 10 15.5 12 12 12 C8.5 12 7 10 7 7.5 C7 5 8 3 8 3Z" />
    <line x1="12" y1="12" x2="12" y2="14.5" />
    <rect x="10.5" y="14.5" width="3" height="1.5" rx="0.4" />
    <line x1="9.5" y1="17" x2="14.5" y2="17" />
    <line x1="9.5" y1="18.5" x2="14.5" y2="18.5" />
    <line x1="10" y1="20" x2="14" y2="20" />
    <line x1="10.5" y1="21.5" x2="13.5" y2="21.5" />
  </svg>
);

const DoctorMaskIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="6" r="3" />
    <path d="M7 10.5 C7 10.5 5 11.5 5 14.5 L5 21 L19 21 L19 14.5 C19 11.5 17 10.5 17 10.5" />
    <path d="M9 13.5 L15 13.5 C15 13.5 15.5 14.5 15.5 16 C15.5 17.5 14.5 18.5 12 18.5 C9.5 18.5 8.5 17.5 8.5 16 C8.5 14.5 9 13.5 9 13.5Z" />
    <line x1="9" y1="13.5" x2="7.5" y2="11.5" />
    <line x1="15" y1="13.5" x2="16.5" y2="11.5" />
    <line x1="10" y1="16" x2="14" y2="16" />
  </svg>
);

const FaceSmileIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 3 4 3 4-3 4-3" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

// Ícone próprio de "Clínico Geral" (heart-pulse no rosa da marca) — arquivo em public/icons/.
// É um SVG já colorido (#d70050), então ignora a prop `color` (diferente dos ícones de traço acima).
const ClinicoGeralIcon = ({ size = 22 }: { size?: number; color?: string }) => (
  <img src="/icons/clinico-geral.svg" width={size} height={size} alt="" aria-hidden="true" />
);

type IconComponent = ({ size, color }: { size?: number; color?: string }) => React.JSX.Element;
type AnyIcon = LucideIcon | IconComponent;

const ICON_MAP: Record<string, AnyIcon> = {
  "Clínico Geral": ClinicoGeralIcon,
  "Clareamento dental": Sparkles,
  "Lentes de contato dental": Sparkles,
  "Limpeza": ToothbrushIcon,
  "Ortodontia (aparelho)": BracesIcon,
  "Implante dentário": SmileImplantIcon,
  "Tratamento de canal": DrillToothIcon,
  "Prótese dentária": ImplantScrewIcon,
  "Cirurgia oral": DoctorMaskIcon,
  "Periodontia": ToothbrushIcon,
  "Odontopediatria": Baby,
  "Harmonização orofacial": FaceSmileIcon,
};

const COLOR_MAP: Record<string, string> = {
  "Clínico Geral": "#d70050",
  "Clareamento dental": "#007AFF",
  "Lentes de contato dental": "#FF9500",
  "Limpeza": "#34C759",
  "Ortodontia (aparelho)": "#007AFF",
  "Implante dentário": "#0A2A66",
  "Tratamento de canal": "#FF3B30",
  "Prótese dentária": "#0A2A66",
  "Cirurgia oral": "#FF9500",
  "Periodontia": "#34C759",
  "Odontopediatria": "#34C759",
  "Harmonização orofacial": "#E6004C",
};

export default function Especialidades() {
  return (
    <section id="especialidades" style={{ padding: "80px 0" }}>
      <div className="container mx-auto px-5 md:px-8 lg:px-16">
        <div className="text-center mb-2">
          <span
            className="text-[13px] font-semibold uppercase tracking-widest"
            style={{ color: "#007AFF" }}
          >
            Especialidades
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
            color: "#0A2A66",
          }}
        >
          Encontre o especialista certo
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
          {ESPECIALIDADES.map((label) => {
            const Icon = (ICON_MAP[label] || Star) as IconComponent;
            const color = COLOR_MAP[label] || "#007AFF";
            const slug = slugDaEspecialidade(label);
            return (
              <Link
                key={label}
                href={`/especialidade/${slug}`}
                className="flex flex-col items-start gap-3 text-left transition-[transform,box-shadow,background] duration-200 ease-out hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(16,24,64,0.08)] hover:bg-white/90"
                style={{
                  padding: "20px",
                  minHeight: "120px",
                  background: "rgba(255,255,255,0.70)",
                  backdropFilter: "blur(24px) saturate(120%)",
                  WebkitBackdropFilter: "blur(24px) saturate(120%)",
                  border: "0.5px solid rgba(255,255,255,0.40)",
                  borderRadius: "20px",
                  boxShadow: "0 2px 6px rgba(16,24,64,0.05)",
                  cursor: "pointer",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}14` }}
                >
                  <Icon size={22} color={color} />
                </div>
                <div>
                  <div
                    className="font-semibold text-[15px] leading-tight mb-1"
                    style={{ color: "#0A2A66" }}
                  >
                    {nomeAmigavel(label)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
