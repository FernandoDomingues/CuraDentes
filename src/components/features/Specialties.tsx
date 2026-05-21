// Custom SVG dental icons
const BracesIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6 C4 4 6 3 8 3 C10 3 11 4 12 5 C13 4 14 3 16 3 C18 3 20 4 20 6 L20 18 C20 20 18 21 16 21 C14 21 13 20 12 19 C11 20 10 21 8 21 C6 21 4 20 4 18 Z" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <circle cx="8" cy="12" r="1.5" fill={color} stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
    <circle cx="16" cy="12" r="1.5" fill={color} stroke="none" />
  </svg>
);

const ToothbrushIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="21" x2="12" y2="10" />
    <path d="M12 10 L12 7 C12 5.3 13.3 4 15 4 L19 4 C19.6 4 20 4.4 20 5 L20 7 C20 7.6 19.6 8 19 8 L12 8" />
    <line x1="15" y1="5.5" x2="15" y2="8" />
    <line x1="17" y1="5.5" x2="17" y2="8" />
    <path d="M10 13 C10 13 8 14 8 16 C8 18 10 19 12 21 C14 19 16 18 16 16 C16 14 14 13 14 13" />
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

import {
  Siren,
  Zap,
  Sparkles,
  Star,
  Baby,
} from "lucide-react";

type IconComponent = ({ size, color }: { size?: number; color?: string }) => JSX.Element;

interface SpecialtyItem {
  id: string;
  label: string;
  Icon: IconComponent;
  count: number;
  color: string;
}

const SPECIALTIES: SpecialtyItem[] = [
  { id: "urgencia",     label: "Urgência",     Icon: Siren as unknown as IconComponent,       count: 76,  color: "#E6004C" },
  { id: "dor",         label: "Dor de Dente", Icon: Zap as unknown as IconComponent,         count: 134, color: "#FF9500" },
  { id: "aparelho",    label: "Aparelho",     Icon: BracesIcon,     count: 142, color: "#007AFF" },
  { id: "clareamento", label: "Clareamento",  Icon: Sparkles as unknown as IconComponent,    count: 201, color: "#007AFF" },
  { id: "limpeza",     label: "Limpeza",      Icon: ToothbrushIcon, count: 389, color: "#34C759" },
  { id: "implante",    label: "Implante",     Icon: SmileImplantIcon, count: 89, color: "#0A2A66" },
  { id: "canal",       label: "Canal",        Icon: DrillToothIcon, count: 67,  color: "#FF3B30" },
  { id: "protese",     label: "Prótese",      Icon: ImplantScrewIcon, count: 54, color: "#0A2A66" },
  { id: "estetica",    label: "Estética",     Icon: Star as unknown as IconComponent,        count: 201, color: "#E6004C" },
  { id: "infantil",    label: "Infantil",     Icon: Baby as unknown as IconComponent,        count: 118, color: "#34C759" },
  { id: "cirurgia",    label: "Cirurgia",     Icon: DoctorMaskIcon, count: 43,  color: "#FF9500" },
];

export default function Specialties() {
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
          {SPECIALTIES.map((spec) => {
            const { Icon } = spec;
            return (
              <button
                key={spec.id}
                className="flex flex-col items-start gap-3 text-left"
                style={{
                  padding: "20px",
                  minHeight: "120px",
                  background: "rgba(255,255,255,0.70)",
                  backdropFilter: "blur(24px) saturate(120%)",
                  WebkitBackdropFilter: "blur(24px) saturate(120%)",
                  border: "0.5px solid rgba(255,255,255,0.40)",
                  borderRadius: "20px",
                  boxShadow: "0 2px 6px rgba(16,24,64,0.05)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = "translateY(-3px)";
                  el.style.boxShadow = "0 8px 20px rgba(16,24,64,0.08)";
                  el.style.background = "rgba(255,255,255,0.90)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 2px 6px rgba(16,24,64,0.05)";
                  el.style.background = "rgba(255,255,255,0.70)";
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${spec.color}14` }}
                >
                  <Icon size={22} color={spec.color} />
                </div>
                <div>
                  <div
                    className="font-semibold text-[15px] leading-tight mb-1"
                    style={{ color: "#0A2A66" }}
                  >
                    {spec.label}
                  </div>
                  <div className="text-[12px] font-medium" style={{ color: "#8E8E93" }}>
                    {spec.count} profissionais
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
