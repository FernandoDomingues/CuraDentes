// ═══════════════════════════════════════════════════════════════════════════════
// MuroCro — tela exibida na área de Locação de Salas quando o dentista AINDA NÃO
// tem o CRO aprovado. A feature só fica visível/utilizável após a verificação
// (regra de produto). Componente puramente apresentacional (Server Component).
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import Container from "@/components/Container";

export default function MuroCro() {
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
          <ShieldCheck size={28} style={{ color: "#007aff" }} />
        </span>
        <h1 className="text-[22px] font-bold text-brand-navy">Recurso liberado após a verificação do CRO</h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          A <strong>Locação de Salas</strong> é exclusiva para dentistas com o CRO já aprovado pela
          nossa equipe. Assim que confirmarmos o seu registro, esta área é liberada automaticamente —
          tanto para anunciar uma sala quanto para alugar.
        </p>
        <div className="mt-2 flex flex-col items-center gap-3">
          <Link
            href="/pro/dashboard"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-[14px] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110"
            style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.25)" }}
          >
            <ArrowLeft size={16} /> Voltar ao painel
          </Link>
          <p className="text-[13px] text-ink-muted">
            Cadastro incompleto? Conclua-o no painel para acelerar a verificação.
          </p>
        </div>
      </div>
    </Container>
  );
}
