// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: NotFound (404)
//
// Página exibida para rotas inexistentes. Mostra mensagem amigável
// com links para voltar à home ou ir para a página de busca.
// ═══════════════════════════════════════════════════════════════════════════════

import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search } from "lucide-react";

import logoIconUrl from "@/assets/logos/logo-redes-sociais.png";

const LOGO_ICON = logoIconUrl;

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #E3F2FD 0%, #FFFFFF 60%)" }}
    >
      <div className="text-center px-5 max-w-md">
        <img src={LOGO_ICON} alt="CuraDentes" className="w-16 h-16 mx-auto mb-6 opacity-80" />
        <h1
          className="text-[80px] font-bold mb-2 leading-none"
          style={{ color: "var(--brand-navy)", fontFamily: "Inter, sans-serif", letterSpacing: "-0.04em" }}
        >
          404
        </h1>
        <p className="text-[18px] mb-2 font-semibold" style={{ color: "var(--brand-navy)" }}>
          Página não encontrada
        </p>
        <p className="text-[15px] mb-8" style={{ color: "var(--text-muted)" }}>
          Parece que essa página saiu para uma consulta e ainda não voltou.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-[14px] text-white font-semibold text-[15px] min-h-[48px] transition-all duration-200"
            style={{ background: "var(--primary-blue)", boxShadow: "var(--shadow-cta)" }}
          >
            <Home size={16} />
            Voltar ao início
          </a>
          <a
            href="/#especialidades"
            className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-[14px] font-semibold text-[15px] min-h-[48px] transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.65)",
              backdropFilter: "blur(20px)",
              border: "0.5px solid rgba(255,255,255,0.45)",
              color: "var(--text-primary)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Search size={16} />
            Buscar dentista
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
