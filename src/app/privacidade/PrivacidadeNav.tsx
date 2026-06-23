// ═══════════════════════════════════════════════════════════════════════════════
// PrivacidadeNav — navegação interativa da Política de Privacidade.
//
// Client Component isolado: menu mobile (accordion) + sidebar desktop com
// smooth-scroll por âncora. Mantém a página /privacidade como Server Component
// (que exporta metadata). Markup/estilos portados 1:1 do site-k11.
// ═══════════════════════════════════════════════════════════════════════════════

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const SECOES = [
  { id: "introducao", label: "Introdução" },
  { id: "dados-coletados", label: "Dados que coletamos" },
  { id: "finalidade", label: "Finalidade do tratamento" },
  { id: "base-legal", label: "Base legal" },
  { id: "compartilhamento", label: "Compartilhamento de dados" },
  { id: "cookies", label: "Cookies" },
  { id: "direitos", label: "Seus direitos (LGPD)" },
  { id: "retencao", label: "Prazo de retenção" },
  { id: "seguranca", label: "Segurança" },
  { id: "alteracoes", label: "Alterações" },
  { id: "contato", label: "Contato" },
];

export function MenuMobile() {
  const [menuAberto, setMenuAberto] = useState(false);

  const handleNavClick = (id: string) => {
    setMenuAberto(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="md:hidden mb-6">
      <button
        onClick={() => setMenuAberto(!menuAberto)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] bg-white text-[14px] font-semibold text-[#0A2A66]"
        style={{ border: "0.5px solid rgba(60,60,67,0.12)" }}
      >
        Navegar pelos tópicos
        <ChevronDown size={18} className={`transition-transform ${menuAberto ? "rotate-180" : ""}`} />
      </button>
      {menuAberto && (
        <nav className="mt-2 bg-white rounded-[12px] p-2" style={{ border: "0.5px solid rgba(60,60,67,0.12)" }}>
          {SECOES.map((s) => (
            <button
              key={s.id}
              onClick={() => handleNavClick(s.id)}
              className="block w-full text-left px-3 py-2.5 text-[14px] rounded-[8px] hover:bg-[#F2F2F7] transition-colors"
              style={{ color: "#3A3A3C" }}
            >
              {s.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export function SidebarDesktop() {
  const handleNavClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="hidden md:block w-64 flex-shrink-0">
      <div className="sticky top-24 bg-white rounded-[16px] p-4" style={{ border: "0.5px solid rgba(60,60,67,0.10)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8E8E93" }}>Nesta página</p>
        <ul className="flex flex-col gap-0.5">
          {SECOES.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => handleNavClick(s.id)}
                className="w-full text-left px-3 py-2 text-[13px] rounded-[8px] hover:bg-[#F2F2F7] transition-colors"
                style={{ color: "#3A3A3C" }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
