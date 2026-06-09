import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Siren,
  Zap,
  Sparkles,
  Star,
  Baby,
  Building2,
  Stethoscope,
  Smile,
  type LucideIcon,
} from "lucide-react";
import { FILTER_CHIPS } from "@/constants/data";
// ============================================================================
// IMPORTAÇÕES PARA A AUTENTICAÇÃO COM O GOOGLE
// ============================================================================
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useAddressSuggestions } from "@/hooks/useAddressSuggestions";
import type { AddressSuggestion } from "@/hooks/useAddressSuggestions";
import { getEnderecoFromCoordenadas } from "@/lib/geocoding";

// ── Custom SVG icons ────────────────────────────────────────────────────────
const BracesIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6 C4 4 6 3 8 3 C10 3 11 4 12 5 C13 4 14 3 16 3 C18 3 20 4 20 6 L20 18 C20 20 18 21 16 21 C14 21 13 20 12 19 C11 20 10 21 8 21 C6 21 4 20 4 18 Z" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <circle cx="8" cy="12" r="1.5" fill={color} stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
    <circle cx="16" cy="12" r="1.5" fill={color} stroke="none" />
  </svg>
);

const ToothbrushIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="21" x2="12" y2="10" />
    <path d="M12 10 L12 7 C12 5.3 13.3 4 15 4 L19 4 C19.6 4 20 4.4 20 5 L20 7 C20 7.6 19.6 8 19 8 L12 8" />
    <line x1="15" y1="6" x2="15" y2="8" />
    <line x1="17" y1="6" x2="17" y2="8" />
    <path d="M10 13 C10 13 8 14 8 16 C8 18 10 19 12 21 C14 19 16 18 16 16 C16 14 14 13 14 13" />
  </svg>
);

const SmileIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 13 C8 13 9.5 16 12 16 C14.5 16 16 13 16 13" />
    <rect x="8" y="9.5" width="2" height="2.5" rx="0.5" fill={color} stroke="none" />
    <rect x="11" y="9.5" width="2" height="2.5" rx="0.5" fill={color} stroke="none" />
    <rect x="14" y="9.5" width="2" height="2.5" rx="0.5" fill={color} stroke="none" />
  </svg>
);

const DrillToothIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3 C6 3 8 4 10 5 C10 5 10 8 9 11 C8 14 8 17 10 19 C12 21 14 21 14 21 C14 21 14 17 13 14 C12 11 12 8 14 5 C16 4 18 3 18 3" />
    <line x1="6" y1="3" x2="18" y2="3" />
    <line x1="19" y1="6" x2="22" y2="3" />
    <line x1="20" y1="8" x2="23" y2="6" />
    <line x1="19" y1="10" x2="22" y2="9" />
  </svg>
);

const ImplantToothIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3 C8 3 9.5 4.5 12 4.5 C14.5 4.5 16 3 16 3 C16 3 17 5 17 7.5 C17 10 15.5 12 12 12 C8.5 12 7 10 7 7.5 C7 5 8 3 8 3Z" />
    <line x1="12" y1="12" x2="12" y2="14" />
    <rect x="10.5" y="14" width="3" height="1.5" rx="0.3" />
    <line x1="10.5" y1="16.5" x2="13.5" y2="16.5" />
    <line x1="10" y1="18" x2="14" y2="18" />
    <line x1="10.5" y1="19.5" x2="13.5" y2="19.5" />
    <line x1="11" y1="21" x2="13" y2="21" />
  </svg>
);

const DoctorMaskIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="6" r="3" />
    <path d="M7 10 C7 10 5 11 5 14 L5 21 L19 21 L19 14 C19 11 17 10 17 10" />
    <path d="M9 13 L15 13 C15 13 16 14 16 15.5 C16 17 15 18 12 18 C9 18 8 17 8 15.5 C8 14 9 13 9 13Z" />
    <line x1="9" y1="13" x2="7.5" y2="11.5" />
    <line x1="15" y1="13" x2="16.5" y2="11.5" />
  </svg>
);

type CustomIconComponent = ({ size, color }: { size?: number; color?: string }) => JSX.Element;
type AnyIcon = LucideIcon | CustomIconComponent;

const ICON_MAP: Record<string, AnyIcon> = {
  Siren,
  Zap,
  AlignCenter: BracesIcon,
  Sparkles,
  Droplets: ToothbrushIcon,
  Wrench: SmileIcon,
  Activity: DrillToothIcon,
  Layers: ImplantToothIcon,
  Star,
  Baby,
  Scissors: DoctorMaskIcon,
  Stethoscope,
  Smile,
};

// ─── Subcomponente: Item de Sugestão do Autocomplete ──────────────────────────

/** Destaca a parte da string que corresponde à query com negrito */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: "#007AFF", fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

const TYPE_LABELS: Record<string, string> = {
  cidade: "Cidade",
  bairro: "Bairro",
  clinica: "Clínica",
};

function SuggestionItem({
  suggestion,
  highlighted,
  query,
  onSelect,
}: {
  suggestion: import("@/hooks/useAddressSuggestions").AddressSuggestion;
  highlighted: boolean;
  query: string;
  onSelect: (s: import("@/hooks/useAddressSuggestions").AddressSuggestion) => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onSelect(suggestion); }}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{
        background: highlighted ? "rgba(0,122,255,0.07)" : "transparent",
        borderBottom: "0.5px solid rgba(60,60,67,0.06)",
        cursor: "pointer",
      }}
    >
      {/* Ícone de tipo */}
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "10px",
          background: suggestion.type === "cidade"
            ? "rgba(0,122,255,0.10)"
            : suggestion.type === "bairro"
            ? "rgba(52,199,89,0.10)"
            : "rgba(255,149,0,0.10)",
        }}
      >
        {suggestion.type === "clinica" ? (
          <Building2 size={15} style={{ color: "#FF9500" }} />
        ) : (
          <MapPin size={15} style={{ color: suggestion.type === "cidade" ? "#007AFF" : "#34C759" }} />
        )}
      </div>

      {/* Texto e badge de tipo */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium truncate" style={{ color: "#1C1C1E" }}>
          <HighlightMatch text={suggestion.label} query={query} />
        </p>
      </div>

      {/* Badge de tipo */}
      <span
        className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{
          background: suggestion.type === "cidade"
            ? "rgba(0,122,255,0.08)"
            : suggestion.type === "bairro"
            ? "rgba(52,199,89,0.08)"
            : "rgba(255,149,0,0.08)",
          color: suggestion.type === "cidade" ? "#007AFF" : suggestion.type === "bairro" ? "#34C759" : "#FF9500",
        }}
      >
        {TYPE_LABELS[suggestion.type]}
      </span>
    </button>
  );
}

export default function HeroSection() {
  const [searchValue, setSearchValue] = useState("");
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [totalDentists, setTotalDentists] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Hook de sugestões fuzzy
  const { suggestions } = useAddressSuggestions(showSuggestions ? searchValue : "");

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIdx(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reseta o índice destacado quando as sugestões mudam
  useEffect(() => { setHighlightedIdx(-1); }, [suggestions]);

  const handleSuggestionSelect = useCallback((suggestion: AddressSuggestion) => {
    setSearchValue(suggestion.value);
    setShowSuggestions(false);
    setHighlightedIdx(-1);
    const selectedChipObj = FILTER_CHIPS.find(c => c.id === activeChip);
    const atividadesList = selectedChipObj ? [selectedChipObj.label] : [];
    const payload = { q: suggestion.value, atividades: atividadesList };
    sessionStorage.setItem("curadentes_search_state", JSON.stringify(payload));
    navigate("/pesquisa", { state: payload });
  }, [navigate, activeChip]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && highlightedIdx >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[highlightedIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIdx(-1);
    }
  };

  
  useEffect(() => {
    async function fetchStats() {
      const CACHE_KEY = "curadentes_hero_stats_cache";
      const CACHE_VERSION = "v3";
      const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 horas

      // Tenta ler do cache primeiro
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const isValidVersion = parsed.version === CACHE_VERSION;
          const isNotExpired = parsed.timestamp && (Date.now() - parsed.timestamp < EXPIRATION_TIME);
          const hasData = parsed.totalDentists && parsed.totalDentists > 0;
          
          if (isValidVersion && isNotExpired && hasData) {
            // Cache válido
            setTotalDentists(parsed.totalDentists);
            return;
          }
        } catch (e) {
          console.error("Erro ao ler cache do Hero:", e);
        }
      }

      // Se não tem cache válido, busca no banco
      try {
        const { count, error } = await supabase
          .from("curadentespro")
          .select("*", { count: "exact", head: true })
          .eq("lgpd_aceito", true);
          
        if (!error && count !== null && count > 0) {
          setTotalDentists(count);
          // Salva no cache com o timestamp e versão
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            totalDentists: count,
            timestamp: Date.now(),
            version: CACHE_VERSION
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar total de dentistas:", err);
      }
    }
    fetchStats();
  }, []);
  
  // Puxamos os estados globais: "user" (usuário logado) e "signInWithGoogle" (função para entrar/cadastrar)
  const { user, signInWithGoogle } = useAuth();

  // Geolocalização OPT-IN: só dispara prompt quando o usuário clica no botão.
  const {
    latitude: userLat,
    longitude: userLng,
    carregando: locationLoading,
    erro: locationError,
    statusPermissao: locationStatus,
    requestLocation,
  } = useUserLocation();

  // ============================================================================
  // ARMAZENAMENTO TEMPORÁRIO DA LOCALIZAÇÃO (useRef)
  // ============================================================================
  // Usamos um "useRef" (uma variável persistente que não reinicia o componente)
  // para guardar as coordenadas capturadas ANTES de abrir o popup do Google.
  // Isso é necessário porque o popup do Google pode demorar e a localização
  // precisa estar pronta para ser salva quando o login finalizar.
  const coordenadasRef = useRef<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });

  // ============================================================================
  // CONFIGURAÇÃO DO FLUXO DE LOGIN COM O GOOGLE
  // ============================================================================
  const handleGoogleLogin = async () => {
    const loadingToast = toast.loading("Redirecionando para o Google...");
    try {
      const { latitude, longitude } = coordenadasRef.current;
      await signInWithGoogle(latitude, longitude);
      toast.dismiss(loadingToast);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Falha ao inicializar login com o Google.");
      console.error(error);
    }
  };

  // ============================================================================
  // FUNÇÃO PRINCIPAL: CAPTURA LOCALIZAÇÃO ANTES DE ABRIR O POPUP DO GOOGLE
  // ============================================================================
  // Esta é a função que os overlays de bloqueio chamam quando o usuário clica na busca.
  // Ela PRIMEIRO pede a localização ao navegador (enquanto a janela ainda está aberta),
  // DEPOIS abre o popup do Google. Assim as coordenadas ficam prontas.
  const iniciarLoginComLocalizacao = () => {
    if (!navigator.geolocation) {
      // Navegador sem suporte a geolocalização: inicia login direto sem coordenadas
      coordenadasRef.current = { latitude: null, longitude: null };
      handleGoogleLogin();
      return;
    }

    // Tenta obter a localização. O navegador perguntará ao usuário se pode compartilhá-la.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Sucesso: salva as coordenadas no ref para uso posterior no onSuccess
        coordenadasRef.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        handleGoogleLogin(); // Abre o popup do Google com coordenadas já prontas
      },
      (error) => {
        // Permissão negada ou erro: registra e inicia login sem localização
        console.warn("[CuraDentes] Localização não obtida antes do login:", error.message);
        coordenadasRef.current = { latitude: null, longitude: null };
        handleGoogleLogin(); // Inicia login mesmo assim, sem coordenadas
      },
      { timeout: 6000, enableHighAccuracy: false } // Aguarda até 6 segundos
    );
  };

  const handleChipClick = (id: string) => {
    setActiveChip(activeChip === id ? null : id);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (highlightedIdx >= 0 && suggestions[highlightedIdx]) {
      handleSuggestionSelect(suggestions[highlightedIdx]);
      return;
    }
    if (searchValue.trim() || activeChip) {
      const selectedChipObj = FILTER_CHIPS.find(c => c.id === activeChip);
      const atividadesList = selectedChipObj ? [selectedChipObj.label] : [];
      const payload = { q: searchValue.trim() || null, atividades: atividadesList };
      sessionStorage.setItem("curadentes_search_state", JSON.stringify(payload));
      navigate("/pesquisa", { state: payload });
    }
  };

  const processarBuscaPorCoordenadas = async (lat: number, lng: number, toastIdToDismiss?: string) => {
    let loaderToastId = toastIdToDismiss || toast.loading("Identificando seu bairro...");
    try {
      const enderecoTexto = await getEnderecoFromCoordenadas(lat, lng);
      toast.dismiss(loaderToastId);
      
      const latStr = lat.toFixed(4);
      const lngStr = lng.toFixed(4);
      
      const selectedChipObj = FILTER_CHIPS.find(c => c.id === activeChip);
      const atividadesList = selectedChipObj ? [selectedChipObj.label] : [];
      
      const payload = enderecoTexto
        ? { q: enderecoTexto, lat: latStr, lng: lngStr, atividades: atividadesList }
        : { lat: latStr, lng: lngStr, atividades: atividadesList };
        
      sessionStorage.setItem("curadentes_search_state", JSON.stringify(payload));
      navigate("/pesquisa", { state: payload });
    } catch (err) {
      toast.dismiss(loaderToastId);
      console.error(err);
      const selectedChipObj = FILTER_CHIPS.find(c => c.id === activeChip);
      const atividadesList = selectedChipObj ? [selectedChipObj.label] : [];
      const payload = { lat: lat.toFixed(4), lng: lng.toFixed(4), atividades: atividadesList };
      sessionStorage.setItem("curadentes_search_state", JSON.stringify(payload));
      navigate("/pesquisa", { state: payload });
    }
  };

  const handleUseMyLocation = () => {
    if (locationStatus === "autorizado" && userLat !== null && userLng !== null) {
      processarBuscaPorCoordenadas(userLat, userLng);
      return;
    }

    if (locationError) {
      toast.error(locationError);
      return;
    }

    const toastId = toast.loading("Buscando sua localização...");
    requestLocation();
    sessionStorage.setItem("curadentes_location_toast_id", String(toastId));
  };

  // Reage ao resultado do hook: navega ou mostra erro
  useEffect(() => {
    if (locationStatus === "autorizado" && userLat !== null && userLng !== null) {
      const toastId = sessionStorage.getItem("curadentes_location_toast_id");
      if (toastId) {
        sessionStorage.removeItem("curadentes_location_toast_id");
        processarBuscaPorCoordenadas(userLat, userLng, toastId);
      }
    } else if (locationError) {
      const toastId = sessionStorage.getItem("curadentes_location_toast_id");
      if (toastId) {
        toast.dismiss(toastId);
        sessionStorage.removeItem("curadentes_location_toast_id");
        toast.error(locationError);
      }
    }
  }, [locationStatus, userLat, userLng, locationError, navigate]);

  return (
    <>
      {/* ── MOBILE layout (< lg) ─────────────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Search bar */}
        <div
          ref={searchContainerRef}
          className="px-4 pt-4 pb-3 relative"
          style={{ background: "#F2F2F7" }}
        >
          {/* BLOQUEIO DE BUSCA (MOBILE) */}
          {!user && (
            <div
              onClick={() => iniciarLoginComLocalizacao()}
              className="absolute inset-0 z-20 cursor-pointer"
              role="button"
              aria-label="Entrar com o Google para buscar"
            />
          )}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-3 px-4"
            style={{
              background: "#fff",
              borderRadius: showSuggestions && suggestions.length > 0 ? "14px 14px 0 0" : "14px",
              minHeight: "48px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              transition: "border-radius 0.15s",
            }}
          >
            <Search size={18} style={{ color: "#8E8E93", flexShrink: 0 }} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Bairro, Cidade"
              className="flex-1 outline-none bg-transparent text-[16px]"
              style={{ color: "#1C1C1E", minHeight: "48px", border: "none" }}
              autoComplete="off"
            />
          </form>

          {/* Dropdown de Sugestões — Mobile */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% - 12px)",
                left: "16px",
                right: "16px",
                background: "#fff",
                borderRadius: "0 0 14px 14px",
                boxShadow: "0 8px 24px rgba(10,42,102,0.12)",
                border: "0.5px solid rgba(60,60,67,0.10)",
                borderTop: "none",
                zIndex: 30,
                overflow: "hidden",
              }}
            >
              {suggestions.map((s, i) => (
                <SuggestionItem
                  key={`${s.type}-${s.label}`}
                  suggestion={s}
                  highlighted={i === highlightedIdx}
                  query={searchValue}
                  onSelect={handleSuggestionSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* "O QUE VOCÊ PRECISA?" label + chips */}
        <div style={{ background: "#F2F2F7", paddingBottom: "12px" }}>
          {/* Botao "Usar minha localizacao" (mobile) */}
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locationLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold min-h-[44px] transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "rgba(0,122,255,0.08)",
                color: "#007AFF",
                border: "0.5px solid rgba(0,122,255,0.18)",
              }}
            >
              <MapPin size={16} />
              {locationLoading ? "Buscando..." : "Usar minha Localização"}
            </button>
          </div>

          <p
            className="px-4 pb-2 text-[12px] font-semibold uppercase tracking-widest"
            style={{ color: "#8E8E93" }}
          >
            O que você precisa?
          </p>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ paddingLeft: "16px", paddingRight: "16px", scrollbarWidth: "none" }}
          >
            {FILTER_CHIPS.map((chip) => {
              const IconComp = ICON_MAP[chip.icon];
              const isActive = activeChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => handleChipClick(chip.id)}
                  aria-pressed={isActive}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap min-h-[40px] flex-shrink-0 transition-all duration-150"
                  style={
                    isActive
                      ? {
                          background: "#007AFF",
                          color: "#fff",
                          border: "1px solid transparent",
                        }
                      : {
                          background: "#fff",
                          color: "#1C1C1E",
                          border: "1px solid rgba(60,60,67,0.18)",
                        }
                  }
                >
                  {IconComp && (
                    <IconComp size={15} color={isActive ? "#fff" : "#3A3A3C"} />
                  )}
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Contador de dentistas — Mobile */}
          {totalDentists > 0 && (
            <div className="flex justify-center pt-1 pb-2">
              <div className="text-center">
                <span className="text-[15px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>
                  {totalDentists}
                </span>
                <span className="text-[12px] ml-1" style={{ color: "#8E8E93" }}>dentistas cadastrados</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP layout (≥ lg) ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden hidden lg:block"
        style={{ padding: "clamp(20px, 3.5vw, 56px) 0" }}
      >
        {/* Background glows */}
        <div style={{ position: "absolute", top: "-200px", right: "-100px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,122,255,0.18) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", bottom: "-150px", left: "-80px", width: "450px", height: "450px", borderRadius: "50%", background: "radial-gradient(circle, rgba(230,0,76,0.09) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

        <div className="container mx-auto px-5 md:px-8 lg:px-16 relative z-10">
          <div className="max-w-[900px] mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: "rgba(0,122,255,0.08)", border: "0.5px solid rgba(0,122,255,0.2)" }}>
              <MapPin size={13} style={{ color: "var(--primary-blue)" }} />
              <span className="text-[12px]" style={{ color: "var(--primary-blue)", fontWeight: 600 }}>Busca por proximidade</span>
            </div>

            {/* Headline */}
            <h1 className="mb-3" style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700, fontSize: "clamp(28px, 5vw, 50px)", lineHeight: 1.1, letterSpacing: "-0.02em", color: "#0A2A66" }}>
              Encontre seu dentista{" "}
              <span style={{ color: "#007AFF" }}>perto de você</span>
            </h1>

            <p className="mb-5 mx-auto" style={{ fontSize: "clamp(14px, 1.8vw, 17px)", lineHeight: 1.5, color: "#3A3A3C", maxWidth: "580px" }}>
              Busque por especialidade, veja avaliações reais, compare preços e agende sua consulta em minutos — sem complicação.
            </p>

            {/* Search Bar */}
            <div ref={searchContainerRef} className="max-w-[720px] mx-auto mb-4 relative">
              {/* BLOQUEIO DE BUSCA (DESKTOP) */}
              {!user && (
                <div
                  onClick={() => iniciarLoginComLocalizacao()}
                  className="absolute inset-0 z-20 cursor-pointer rounded-[16px]"
                  role="button"
                  aria-label="Entrar com o Google para buscar"
                />
              )}
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(20px) saturate(120%)",
                  WebkitBackdropFilter: "blur(20px) saturate(120%)",
                  border: "0.5px solid rgba(255,255,255,0.5)",
                  borderRadius: showSuggestions && suggestions.length > 0 ? "16px 16px 0 0" : "16px",
                  padding: "6px 6px 6px 16px",
                  minHeight: "56px",
                  boxShadow: "0 8px 20px rgba(16,24,64,0.08)",
                  transition: "border-radius 0.15s",
                }}
              >
                <Search size={20} style={{ color: "#8E8E93", flexShrink: 0 }} />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => { setSearchValue(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Bairro, Cidade"
                  className="flex-1 min-w-0 outline-none bg-transparent"
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", color: "#1C1C1E", minHeight: "44px", border: "none" }}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold min-h-[40px] flex-shrink-0 transition-all duration-200 hover:bg-blue-50 disabled:opacity-60"
                  style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF", border: "0.5px solid rgba(0,122,255,0.18)" }}
                >
                  <MapPin size={14} />
                  {locationLoading ? "Buscando..." : "Usar minha Localização"}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-3 rounded-[12px] text-white font-semibold text-[15px] min-h-[44px] flex-shrink-0 transition-all duration-200"
                  style={{ background: "#007AFF", boxShadow: "0 8px 20px rgba(0,122,255,0.25)" }}
                >
                  Buscar
                </button>
              </form>

              {/* Dropdown de Sugestões — Desktop */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "rgba(255,255,255,0.96)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderRadius: "0 0 16px 16px",
                    boxShadow: "0 16px 40px rgba(10,42,102,0.14)",
                    border: "0.5px solid rgba(255,255,255,0.5)",
                    borderTop: "none",
                    zIndex: 30,
                    overflow: "hidden",
                  }}
                >
                  {suggestions.map((s, i) => (
                    <SuggestionItem
                      key={`${s.type}-${s.label}`}
                      suggestion={s}
                      highlighted={i === highlightedIdx}
                      query={searchValue}
                      onSelect={handleSuggestionSelect}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Specialty Chips */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {FILTER_CHIPS.map((chip) => {
                const IconComp = ICON_MAP[chip.icon];
                const isActive = activeChip === chip.id;
                return (
                  <button key={chip.id} onClick={() => handleChipClick(chip.id)} aria-pressed={isActive} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium min-h-[36px] transition-all duration-200"
                    style={isActive ? { background: "#007AFF", color: "#fff", border: "0.5px solid transparent", boxShadow: "0 0 12px rgba(0,122,255,0.4)" } : { background: "rgba(255,255,255,0.60)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "0.5px solid rgba(255,255,255,0.45)", color: "#3A3A3C", boxShadow: "0 2px 6px rgba(16,24,64,0.05)" }}>
                    {IconComp && <IconComp size={13} color={isActive ? "#fff" : "#3A3A3C"} />}
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-5 mt-5">
              <div className="text-center">
                <div className="text-[20px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>{totalDentists}</div>
                <div className="text-[12px]" style={{ color: "#8E8E93" }}>dentistas cadastrados</div>
              </div>
              
              {/* Avaliação média comentada para uso futuro */}
              {/*
              <div className="text-center">
                <div className="text-[20px] font-bold" style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>{averageRating}★</div>
                <div className="text-[12px]" style={{ color: "#8E8E93" }}>avaliação média</div>
              </div>
              */}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
