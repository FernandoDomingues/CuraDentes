// ═══════════════════════════════════════════════════════════════════════════════
// /pro/salas — painel do ANFITRIÃO: minhas salas anunciadas (Fase 1).
// Guarda herdada de ProLayout (dentista/superuser). Leitura via carregarMinhasSalas.
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { Plus, MapPin, Building2, Pencil } from "lucide-react";
import Container from "@/components/Container";
import { carregarMinhasSalas } from "./acoes";
import { formatarPreco } from "@/lib/salas";

export const dynamic = "force-dynamic";

export default async function MinhasSalasPage() {
  const { salas, enderecos } = await carregarMinhasSalas();
  const semEndereco = enderecos.length === 0;

  return (
    <Container className="py-10 md:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-brand-navy">Minhas salas</h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            Anuncie uma sala ou cadeira ociosa para outros dentistas alugarem por atendimento.
          </p>
        </div>
        {!semEndereco && (
          <Link
            href="/pro/salas/nova"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[14px] px-5 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110"
            style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.25)" }}
          >
            <Plus size={18} /> Anunciar sala
          </Link>
        )}
      </div>

      {/* Sem endereço cadastrado: não dá para anunciar (a sala fica num endereço seu). */}
      {semEndereco ? (
        <div
          className="flex flex-col items-center gap-3 rounded-[20px] py-14 text-center"
          style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}
        >
          <Building2 size={34} style={{ color: "rgba(0,122,255,0.30)" }} />
          <p className="text-[16px] font-semibold text-brand-navy">Cadastre um endereço primeiro</p>
          <p className="max-w-md text-[14px] text-ink-muted">
            Uma sala fica vinculada a um dos seus endereços de clínica. Adicione um endereço no seu
            perfil para poder anunciar.
          </p>
          <Link
            href="/pro/perfil"
            className="mt-2 rounded-[14px] px-6 py-3 text-[14px] font-semibold text-white"
            style={{ background: "#007aff" }}
          >
            Ir para o perfil
          </Link>
        </div>
      ) : salas.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-[20px] py-14 text-center"
          style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}
        >
          <MapPin size={34} style={{ color: "rgba(0,122,255,0.30)" }} />
          <p className="text-[16px] font-semibold text-brand-navy">Nenhuma sala anunciada ainda</p>
          <p className="text-[14px] text-ink-muted">Clique em “Anunciar sala” para criar a primeira.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {salas.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-3 rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[17px] font-bold text-brand-navy">{s.titulo}</h2>
                  <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-muted">
                    <MapPin size={13} />
                    {[s.bairro, s.cidade].filter(Boolean).join(", ") || s.nome_clinica || "—"}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={
                    s.status === "ativa"
                      ? { background: "rgba(52,199,89,0.12)", color: "#2a8a3e" }
                      : { background: "rgba(255,149,0,0.14)", color: "#b56a00" }
                  }
                >
                  {s.status === "ativa" ? "Ativa" : "Pausada"}
                </span>
              </div>

              <p className="text-[15px] font-bold text-brand-blue">
                {formatarPreco(s.preco_valor, s.preco_unidade)}
              </p>

              {s.equipamentos.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {s.equipamentos.slice(0, 4).map((e) => (
                    <span
                      key={e}
                      className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand-navy"
                    >
                      {e}
                    </span>
                  ))}
                  {s.equipamentos.length > 4 && (
                    <span className="px-1 text-[11px] text-ink-muted">+{s.equipamentos.length - 4}</span>
                  )}
                </div>
              )}

              <div className="mt-1 flex items-center gap-2 border-t border-gray-100 pt-3">
                <Link
                  href={`/pro/salas/${s.id}/editar`}
                  className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold text-brand-navy transition-colors hover:bg-black/[0.04]"
                >
                  <Pencil size={14} /> Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
