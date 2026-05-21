import type { Dentist } from "@/types/dentist";
import { MapPin, Star, DollarSign, Heart, Clock, CheckCircle } from "lucide-react";

interface DentistCardProps {
  dentist: Dentist;
}

export default function DentistCard({ dentist }: DentistCardProps) {
  return (
    <>
      {/* ── MOBILE list row (< lg) ─────────────────────────────────────── */}
      <div className="lg:hidden">
        <div
          className="flex flex-col px-4 pt-4 pb-0"
          style={{ background: "#fff" }}
        >
          {/* Top row: avatar + info + heart */}
          <div className="flex items-start gap-3 mb-3">
            {/* Circular avatar */}
            <div
              className="flex-shrink-0 overflow-hidden"
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#E5EAF2",
              }}
            >
              <img
                src={dentist.photo}
                alt={dentist.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name + rating + location */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3
                  className="font-bold text-[17px] leading-tight"
                  style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}
                >
                  {dentist.name}
                </h3>
                <button
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 -mt-0.5"
                  aria-label="Favoritar"
                >
                  <Heart size={20} style={{ color: "#C7C7CC" }} />
                </button>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={14} fill="#FFCC00" stroke="none" />
                <span className="text-[14px] font-semibold" style={{ color: "#FFCC00" }}>
                  {dentist.rating.toFixed(1)}
                </span>
                <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                  ({dentist.reviews})
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={12} style={{ color: "#8E8E93", flexShrink: 0 }} />
                <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                  {dentist.neighborhood ?? dentist.city} · {dentist.distance}
                </span>
              </div>
            </div>
          </div>

          {/* Specialty tags */}
          {dentist.tags && dentist.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {dentist.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-[13px] font-medium"
                  style={{
                    background: "rgba(0,122,255,0.08)",
                    color: "#007AFF",
                    border: "1px solid rgba(0,122,255,0.15)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer row: hours + convenios */}
          <div
            className="flex items-center justify-between py-3"
            style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)" }}
          >
            <div className="flex items-center gap-1.5">
              <Clock size={13} style={{ color: "#8E8E93" }} />
              <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                {dentist.hours ?? "Seg-Sex 8h-18h"}
              </span>
            </div>
            {dentist.convenios != null && dentist.convenios > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle size={14} style={{ color: "#34C759" }} />
                <span className="text-[13px] font-semibold" style={{ color: "#34C759" }}>
                  {dentist.convenios} convênios
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DESKTOP card (≥ lg) ────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col"
        style={{
          background: "var(--glass-fill-strong)",
          backdropFilter: "blur(24px) saturate(120%)",
          WebkitBackdropFilter: "blur(24px) saturate(120%)",
          border: "0.5px solid rgba(255,255,255,0.40)",
          borderRadius: "20px",
          padding: "16px",
          boxShadow: "0 12px 32px rgba(16,24,64,0.08)",
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(16,24,64,0.08)";
        }}
      >
        {/* Photo */}
        <div className="relative mb-4 overflow-hidden" style={{ aspectRatio: "16/10", borderRadius: "16px", background: "linear-gradient(135deg, #E3F2FD 0%, #cfe5fa 100%)" }}>
          <img src={dentist.photo} alt={dentist.name} className="w-full h-full object-cover" />
          <span className="absolute top-3 right-3 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: dentist.available ? "var(--success)" : "var(--warning)", letterSpacing: "0.02em" }}>
            {dentist.availabilityLabel}
          </span>
        </div>

        <div className="flex-1 flex flex-col">
          <h3 className="mb-0.5" style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "20px", color: "var(--brand-navy)", lineHeight: 1.3 }}>
            {dentist.name}
          </h3>
          <p className="text-[13px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>{dentist.cro}</p>
          <p className="text-[13px] font-semibold mb-4" style={{ color: "var(--brand-magenta)" }}>{dentist.specialty}</p>

          <div className="flex flex-wrap gap-3 mb-5 text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
            <span className="inline-flex items-center gap-1"><MapPin size={13} />{dentist.distance}</span>
            <span className="inline-flex items-center gap-1"><Star size={13} fill="var(--warning)" stroke="none" />{dentist.rating} ({dentist.reviews})</span>
            <span className="inline-flex items-center gap-1"><DollarSign size={13} />{dentist.price}</span>
          </div>

          <button
            className="w-full mt-auto py-3 rounded-[14px] text-white font-semibold text-[15px] min-h-[48px] transition-all duration-200"
            style={{ background: "var(--primary-blue)", boxShadow: "var(--shadow-cta)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-blue-hover)"; e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,122,255,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary-blue)"; e.currentTarget.style.boxShadow = "var(--shadow-cta)"; }}
          >
            Agendar consulta
          </button>
        </div>
      </div>
    </>
  );
}
