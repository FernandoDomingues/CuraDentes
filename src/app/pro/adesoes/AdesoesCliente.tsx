"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// AdesoesCliente — lista os pedidos de adesão pendentes e deixa o DONO aprovar /
// recusar. Some o card ao decidir (otimista); mostra estado vazio quando acabam.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Loader2, Check, X, User, MapPin, CheckCircle2 } from "lucide-react";
import type { AdesaoPendente } from "@/lib/salas";
import { decidirAdesao } from "./acoes";

function dataBR(iso: string) {
  // iso = "2026-06-30T..." → "30/06/2026"
  const d = (iso || "").slice(0, 10);
  return d ? d.split("-").reverse().join("/") : "";
}

export default function AdesoesCliente({ iniciais }: { iniciais: AdesaoPendente[] }) {
  const [itens, setItens] = useState<AdesaoPendente[]>(iniciais);
  const [feito, setFeito] = useState<string>("");

  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[20px] py-14 text-center" style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}>
        <CheckCircle2 size={32} style={{ color: "rgba(52,199,89,0.55)" }} />
        <p className="text-[15px] font-semibold text-brand-navy">
          {feito ? "Tudo resolvido!" : "Nenhum pedido pendente"}
        </p>
        <p className="max-w-sm text-[13px] text-ink-muted">
          {feito
            ? "Você decidiu todos os pedidos. Novos pedidos aparecerão aqui."
            : "Quando outro dentista se cadastrar numa clínica que você criou, o pedido aparece aqui para você aprovar."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {itens.map((a) => (
        <AdesaoCard
          key={a.id}
          item={a}
          onDecidido={() => {
            setFeito("ok");
            setItens((xs) => xs.filter((x) => x.id !== a.id));
          }}
        />
      ))}
    </div>
  );
}

function AdesaoCard({ item, onDecidido }: { item: AdesaoPendente; onDecidido: () => void }) {
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");

  async function decidir(aprovar: boolean) {
    setErro("");
    setOcupado(aprovar ? "aprovar" : "recusar");
    const res = await decidirAdesao(item.id, aprovar);
    setOcupado("");
    if (!res.ok) {
      setErro(res.erro || "Não foi possível registrar a decisão.");
      return;
    }
    onDecidido();
  }

  const btn = "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[12px] px-4 text-[14px] font-semibold transition-all disabled:opacity-50";

  return (
    <div className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(0,122,255,0.10)" }}>
          <User size={18} style={{ color: "#007AFF" }} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-bold text-brand-navy">{item.solicitante_nome || "Dentista"}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-muted">
            <MapPin size={13} />
            <span className="truncate">
              {item.nome_clinica || "Sua clínica"}
              {item.complemento ? ` · ${item.complemento}` : ""}
            </span>
          </p>
          {item.criada_em && <p className="mt-1 text-[12px] text-ink-muted">Pedido em {dataBR(item.criada_em)}</p>}
        </div>
      </div>

      {erro && <p role="alert" className="mt-3 text-[13px] text-danger">{erro}</p>}

      <div className="mt-4 flex gap-2">
        <button onClick={() => decidir(true)} disabled={!!ocupado} className={btn} style={{ background: "#34c759", color: "#fff" }}>
          {ocupado === "aprovar" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Aprovar
        </button>
        <button onClick={() => decidir(false)} disabled={!!ocupado} className={`${btn} border border-black/10 text-ink-soft hover:bg-black/[0.04]`}>
          {ocupado === "recusar" ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Recusar
        </button>
      </div>
    </div>
  );
}
