// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: Urgência (/urgencia)
//
// Fluxo enxuto para quem precisa de dentista AGORA: pega a localização (opt-in,
// disparada pelo clique no botão "URGÊNCIA!" da Hero ou pelo botão desta página),
// chama a RPC get_dentistas_urgencia_proximos e mostra os 10 dentistas que ATENDEM
// URGÊNCIA mais próximos — com WhatsApp/Ligar em 1 toque.
//
// UI minimalista: branco predominante + toques do dark pink da marca (#E6004C).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { MapPin, Phone, MessageCircle, Loader2, ArrowLeft, Navigation } from "lucide-react";

const PINK = "#E6004C";
const AVATAR_FALLBACK =
  "https://dsnzgxjuqlalysyfiion.supabase.co/storage/v1/object/public/fotos-dentistas/default-avatar.webp";

interface DentistaUrgencia {
  dentista_id: string;
  dentista_nome: string;
  dentista_tratamento: string | null;
  dentista_foto: string | null;
  endereco_id: string;
  nome_clinica: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  whatsapp: string | null;
  telefone: string | null;
  distancia_km: number;
}

type Estado = "precisa-localizacao" | "carregando" | "ok" | "vazio" | "erro";

export default function Urgencia() {
  const navigate = useNavigate();
  const location = useLocation();
  const coords = (location.state as { lat?: number; lng?: number } | null) || null;

  const [estado, setEstado] = useState<Estado>(
    coords?.lat != null ? "carregando" : "precisa-localizacao",
  );
  const [dentistas, setDentistas] = useState<DentistaUrgencia[]>([]);
  const [erroMsg, setErroMsg] = useState("");

  const buscar = useCallback(async (lat: number, lng: number) => {
    setEstado("carregando");
    const { data, error } = await supabase.rpc("get_dentistas_urgencia_proximos", { lat, lng });
    if (error) {
      setErroMsg("Não foi possível buscar agora. Tente novamente.");
      setEstado("erro");
      return;
    }
    const lista = (data as DentistaUrgencia[]) || [];
    setDentistas(lista);
    setEstado(lista.length ? "ok" : "vazio");
  }, []);

  // Se chegou com coordenadas (do clique no botão da Hero), já busca.
  useEffect(() => {
    if (coords?.lat != null && coords?.lng != null) {
      buscar(coords.lat, coords.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geolocalização sob demanda — LGPD: só no clique do usuário.
  const usarLocalizacao = () => {
    if (!navigator.geolocation) {
      setErroMsg("Seu navegador não suporta localização. Tente por outro dispositivo.");
      setEstado("erro");
      return;
    }
    setEstado("carregando");
    navigator.geolocation.getCurrentPosition(
      (pos) => buscar(pos.coords.latitude, pos.coords.longitude),
      () => {
        setErroMsg("Precisamos da sua localização para achar o dentista mais perto. Permita o acesso e tente de novo.");
        setEstado("erro");
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Top bar minimalista */}
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "14px 20px" }}>
        <Link to="/" style={{ color: "#8E8E93", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, textDecoration: "none" }}>
          <ArrowLeft size={16} /> Início
        </Link>
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: 560, margin: "0 auto", padding: "28px 20px 56px" }}>
        {/* Título */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: PINK, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <img src="/icons/emergencia.svg" width={32} height={32} alt="" />
          </div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", color: "#0A2A66", margin: 0 }}>
            Urgência odontológica
          </h1>
          <p style={{ color: "#5c6b7a", fontSize: 15, marginTop: 6, lineHeight: 1.5 }}>
            Os dentistas que atendem urgência mais perto de você.
          </p>
        </div>

        {estado === "precisa-localizacao" && (
          <div style={{ textAlign: "center" }}>
            <button onClick={usarLocalizacao} style={btnPink}>
              <Navigation size={18} /> Usar minha localização
            </button>
            <p style={{ color: "#8E8E93", fontSize: 12, marginTop: 12 }}>
              Usamos sua localização apenas para encontrar o dentista mais próximo.
            </p>
          </div>
        )}

        {estado === "carregando" && (
          <div style={{ textAlign: "center", padding: "44px 0" }}>
            <Loader2 size={34} color={PINK} className="animate-spin" style={{ margin: "0 auto" }} />
            <p style={{ color: "#5c6b7a", marginTop: 14, fontSize: 14 }}>Procurando dentistas perto de você…</p>
          </div>
        )}

        {estado === "erro" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#5c6b7a", fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>{erroMsg}</p>
            <button onClick={usarLocalizacao} style={btnPink}>
              <Navigation size={18} /> Tentar de novo
            </button>
          </div>
        )}

        {estado === "vazio" && (
          <div style={{ textAlign: "center", color: "#5c6b7a", fontSize: 14, lineHeight: 1.6 }}>
            <p>Ainda não encontramos dentistas de urgência perto de você. Tente a busca normal:</p>
            <Link to="/" style={{ color: PINK, fontWeight: 700, textDecoration: "none" }}>Voltar ao início</Link>
          </div>
        )}

        {estado === "ok" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dentistas.map((d) => {
              const nome =
                d.dentista_tratamento && !d.dentista_nome.startsWith(d.dentista_tratamento)
                  ? `${d.dentista_tratamento} ${d.dentista_nome}`
                  : d.dentista_nome;
              const wpp = (d.whatsapp || "").replace(/\D/g, "");
              const tel = (d.telefone || "").replace(/\D/g, "");
              return (
                <div key={d.endereco_id} style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={d.dentista_foto || AVATAR_FALLBACK}
                      alt={nome}
                      style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      loading="lazy"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button
                        onClick={() => navigate(`/dentista/${d.dentista_id}`)}
                        style={{ all: "unset", cursor: "pointer", fontWeight: 700, color: "#0A2A66", fontSize: 15, display: "block", lineHeight: 1.2 }}
                      >
                        {nome}
                      </button>
                      <div style={{ color: "#8E8E93", fontSize: 12.5, display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                        <MapPin size={12} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.bairro ? `${d.bairro}, ` : ""}{d.cidade}{d.estado ? `/${d.estado}` : ""}
                        </span>
                      </div>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: PINK, background: `${PINK}12`, borderRadius: 999, padding: "4px 10px" }}>
                      {d.distancia_km.toFixed(1)} km
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {wpp && (
                      <a
                        href={`https://wa.me/${wpp}?text=${encodeURIComponent("Olá! Preciso de um atendimento odontológico de urgência.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={ctaPink}
                      >
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                    )}
                    {tel && (
                      <a href={`tel:${tel}`} style={wpp ? ctaOutline : ctaPink}>
                        <Phone size={16} /> Ligar
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            <p style={{ textAlign: "center", color: "#8E8E93", fontSize: 12, marginTop: 8 }}>
              Mostrando os {dentistas.length} mais próximos que atendem urgência.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

const btnPink: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, background: PINK, color: "#fff",
  border: "none", borderRadius: 14, padding: "14px 24px", fontSize: 16, fontWeight: 700,
  cursor: "pointer", minHeight: 52, boxShadow: "0 8px 20px rgba(230,0,76,0.28)",
};
const cardStyle: CSSProperties = {
  background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 18, padding: 16,
  boxShadow: "0 2px 8px rgba(16,24,64,0.05)",
};
const ctaPink: CSSProperties = {
  flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  background: PINK, color: "#fff", borderRadius: 12, padding: "11px 12px", fontWeight: 700,
  fontSize: 14, textDecoration: "none", minHeight: 46,
};
const ctaOutline: CSSProperties = {
  flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  background: "#fff", color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 12,
  padding: "11px 12px", fontWeight: 700, fontSize: 14, textDecoration: "none", minHeight: 46,
};
