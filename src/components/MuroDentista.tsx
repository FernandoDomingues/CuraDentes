"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// MuroDentista — muro de acesso da área /pro (só dentista). Mostrado para quem chega
// SEM sessão: em vez de jogar no login de paciente (Google), oferece o login de
// DENTISTA (mesma experiência do muro de /coworking). Paciente logado é redirecionado
// pelo layout; aqui tratamos só o caso anônimo.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { Stethoscope } from "lucide-react";
import Container from "@/components/Container";
import { useSessao } from "@/components/SessaoProvider";

export default function MuroDentista() {
  const { abrirModalDentista } = useSessao();

  return (
    <Container className="py-16">
      <div
        className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-[24px] p-8 text-center"
        style={{ background: "#fff", border: "1.5px solid rgba(0,122,255,0.18)", boxShadow: "0 8px 32px rgba(10,42,102,0.08)" }}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(0,122,255,0.10)" }}>
          <Stethoscope size={28} style={{ color: "#007aff" }} />
        </span>
        <h1 className="text-[22px] font-bold text-brand-navy">Área exclusiva para dentistas</h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Entre com sua conta de dentista para acessar seu painel, seus negócios e a locação de salas.
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
      </div>
    </Container>
  );
}
