"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// MuroSalas — gate da vitrine pública /coworking. A Locação de Salas é members-only:
// só dentista com CRO aprovado vê a lista/detalhe (regra de produto). Mostra a
// mensagem certa conforme o estado da sessão e abre o login de dentista.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { DoorOpen, ShieldCheck } from "lucide-react";
import Container from "@/components/Container";
import { useSessao } from "@/components/SessaoProvider";

export default function MuroSalas({ modo }: { modo: "anonimo" | "sem-cro" }) {
  const { abrirModalDentista } = useSessao();

  return (
    <Container className="py-16">
      <div
        className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-[24px] p-8 text-center"
        style={{ background: "#fff", border: "1.5px solid rgba(0,122,255,0.18)", boxShadow: "0 8px 32px rgba(10,42,102,0.08)" }}
      >
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "rgba(0,122,255,0.10)" }}
        >
          {modo === "anonimo" ? (
            <DoorOpen size={28} style={{ color: "#007aff" }} />
          ) : (
            <ShieldCheck size={28} style={{ color: "#007aff" }} />
          )}
        </span>

        {modo === "anonimo" ? (
          <>
            <h1 className="text-[22px] font-bold text-brand-navy">Alugue uma sala odontológica</h1>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              A Locação de Salas é exclusiva para dentistas com CRO verificado. Entre com sua conta de
              dentista para ver as salas disponíveis e solicitar um horário.
            </p>
            <button
              onClick={abrirModalDentista}
              className="mt-2 inline-flex min-h-[48px] items-center gap-2 rounded-[14px] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110"
              style={{ background: "#0a2a66", boxShadow: "0 4px 16px rgba(10,42,102,0.22)" }}
            >
              Entrar como dentista
            </button>
            <p className="text-[13px] text-ink-muted">
              Ainda não tem conta?{" "}
              <Link href="/cadastro" className="font-semibold text-brand-blue hover:underline">
                Cadastre-se
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-bold text-brand-navy">CRO em verificação</h1>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              A Locação de Salas é liberada para dentistas com o CRO já aprovado pela nossa equipe.
              Assim que confirmarmos o seu registro, as salas aparecem aqui automaticamente.
            </p>
            <Link
              href="/pro/dashboard"
              className="mt-2 inline-flex min-h-[48px] items-center gap-2 rounded-[14px] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110"
              style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.25)" }}
            >
              Ir para o painel
            </Link>
          </>
        )}
      </div>
    </Container>
  );
}
