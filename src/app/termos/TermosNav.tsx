// ═══════════════════════════════════════════════════════════════════════════════
// TermosNav — navegação da página /termos (client component).
//
// Reproduz o menu mobile (accordion) e a sidebar desktop com smooth-scroll do
// site-k11. O conteúdo jurídico vem como children (server-rendered) e é
// posicionado ao lado da sidebar no layout flex.
// ═══════════════════════════════════════════════════════════════════════════════

"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

const SECOES = [
  { id: "aceitacao", label: "Aceitação" },
  { id: "definicoes", label: "Definições" },
  { id: "cadastro-paciente", label: "Cadastro do paciente" },
  { id: "cadastro-dentista", label: "Cadastro do dentista" },
  { id: "planos", label: "Planos e pagamento" },
  { id: "uso-plataforma", label: "Uso da plataforma" },
  { id: "obrigacoes", label: "Obrigações" },
  { id: "responsabilidade", label: "Responsabilidade" },
  { id: "propriedade-intelectual", label: "Propriedade intelectual" },
  { id: "cancelamento", label: "Cancelamento" },
  { id: "disposicoes", label: "Disposições gerais" },
  { id: "contato", label: "Contato" },
];

export default function TermosNav({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);

  const handleNavClick = (id: string) => {
    setMenuAberto(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Menu mobile */}
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

      <div className="flex gap-10">
        {/* Sidebar desktop */}
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

        {children}
      </div>
    </>
  );
}
