"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Aviso de privacidade / consentimento (LGPD).
//
// O site usa APENAS armazenamento local FUNCIONAL (lembrar a localização, rascunho
// do cadastro, cache de resultados de busca) — NÃO há cookies de rastreamento ou
// publicidade. Por isso o aviso é informativo + aceite (não há o que "recusar" sem
// desligar conveniências). O aceite fica em localStorage para não reaparecer.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";

const CHAVE = "curadentes_consentimento_v1";

export default function CookieConsent() {
  const [visivel, setVisivel] = useState(false);

  // Só dá para checar o localStorage no cliente (no servidor não existe). Fazê-lo
  // num efeito evita divergência de hidratação (o servidor renderiza sem o aviso).
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(CHAVE)) setVisivel(true);
    } catch {
      /* localStorage indisponível (ex.: modo privado) — simplesmente não mostra */
    }
  }, []);

  function aceitar() {
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      /* ignore */
    }
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de privacidade"
      className="fixed inset-x-0 bottom-0 z-[150] px-3 pt-0"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl p-4 shadow-xl sm:flex-row sm:items-center sm:gap-4"
        style={{ background: "#0A2A66", color: "#fff" }}
      >
        <p className="flex-1 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.92)" }}>
          Usamos armazenamento local apenas para melhorar sua experiência — lembrar
          sua localização, salvar o rascunho do cadastro e agilizar a busca. Não
          usamos cookies de rastreamento ou publicidade.{" "}
          <Link href="/privacidade" className="font-semibold underline">
            Saiba mais
          </Link>
          .
        </p>
        <button
          onClick={aceitar}
          className="shrink-0 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#fff", color: "#0A2A66" }}
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
