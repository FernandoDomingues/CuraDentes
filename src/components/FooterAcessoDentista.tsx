"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// FooterAcessoDentista — link "Acesso do dentista" do rodapé (Client Component).
//
// O Footer é Server Component, então isolamos aqui o único item interativo: em vez
// de navegar para /entrar, este link ABRE O MODAL de login do dentista via
// `useSessao().abrirModalDentista` (mesmo comportamento do site k11). O estilo é
// idêntico aos demais links do rodapé.
// ═══════════════════════════════════════════════════════════════════════════════

import { useSessao } from "@/components/SessaoProvider";

const CLASSE_LINK =
  "text-[14px] text-white/[0.72] transition-colors duration-200 inline-block min-h-[32px] py-0.5 hover:text-white cursor-pointer text-left";

export default function FooterAcessoDentista() {
  const { abrirModalDentista } = useSessao();
  return (
    <button type="button" onClick={abrirModalDentista} className={CLASSE_LINK}>
      Acesso do dentista
    </button>
  );
}
