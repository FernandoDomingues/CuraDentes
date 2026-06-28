"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// SalaEditor — formulário de criar/editar uma sala (Fase 1). Salva via Server
// Action salvarSala (id da sessão). Não envia campos derivados (trigger preenche).
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { salvarSala } from "./acoes";
import {
  EQUIPAMENTOS_OPCOES,
  PRECO_UNIDADE_LABEL,
  disponibilidadePadrao,
  type EnderecoResumo,
  type MinhaSala,
  type PrecoUnidade,
  type SalaForm,
  type DisponibilidadeDia,
} from "@/lib/salas";

const UNIDADES: PrecoUnidade[] = ["hora", "turno", "dia"];

export default function SalaEditor({
  enderecos,
  salaInicial,
}: {
  enderecos: EnderecoResumo[];
  salaInicial?: MinhaSala;
}) {
  const router = useRouter();
  const [form, setForm] = useState<SalaForm>(() => ({
    id: salaInicial?.id,
    endereco_id: salaInicial?.endereco_id ?? enderecos[0]?.id ?? "",
    titulo: salaInicial?.titulo ?? "",
    descricao: salaInicial?.descricao ?? "",
    equipamentos: salaInicial?.equipamentos ?? [],
    preco_valor: salaInicial ? String(salaInicial.preco_valor) : "",
    preco_unidade: salaInicial?.preco_unidade ?? "hora",
    disponibilidade: salaInicial?.disponibilidade?.length
      ? salaInicial.disponibilidade
      : disponibilidadePadrao(),
    politica_cancelamento: salaInicial?.politica_cancelamento ?? "",
    contato_whatsapp: salaInicial?.contato_whatsapp ?? "",
    contato_email: salaInicial?.contato_email ?? "",
  }));
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  function set<K extends keyof SalaForm>(campo: K, valor: SalaForm[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }
  function toggleEquip(e: string) {
    setForm((f) => ({
      ...f,
      equipamentos: f.equipamentos.includes(e)
        ? f.equipamentos.filter((x) => x !== e)
        : [...f.equipamentos, e],
    }));
  }
  function setDia(i: number, patch: Partial<DisponibilidadeDia>) {
    setForm((f) => ({
      ...f,
      disponibilidade: f.disponibilidade.map((d, idx) => (idx === i ? { ...d, ...patch } : d)),
    }));
  }

  async function salvar() {
    setErro("");
    setOcupado(true);
    const res = await salvarSala(form);
    setOcupado(false);
    if (!res.ok) {
      setErro(res.erro || "Não foi possível salvar a sala.");
      return;
    }
    toast.success(salaInicial ? "Sala atualizada!" : "Sala anunciada!");
    router.push("/pro/salas");
    router.refresh();
  }

  const inputBase =
    "w-full rounded-[12px] border border-black/15 px-4 py-3 text-[15px] outline-none focus:border-brand-blue";
  const label = "mb-1.5 block text-[13px] font-semibold text-ink-soft";

  return (
    <div className="flex flex-col gap-6">
      {/* Onde fica */}
      <Secao titulo="Onde fica a sala">
        <label className={label}>Endereço / clínica</label>
        <select
          value={form.endereco_id}
          onChange={(e) => set("endereco_id", e.target.value)}
          className={inputBase}
        >
          {enderecos.map((e) => (
            <option key={e.id} value={e.id}>
              {[e.nome_clinica, e.bairro, e.cidade].filter(Boolean).join(" · ") || "Endereço"}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[12px] text-ink-muted">
          A sala fica num dos seus endereços. Cidade e bairro vêm dele automaticamente.
        </p>
      </Secao>

      {/* Sobre a sala */}
      <Secao titulo="Sobre a sala">
        <label className={label}>Título</label>
        <input
          value={form.titulo}
          onChange={(e) => set("titulo", e.target.value)}
          placeholder="Ex.: Consultório completo com cadeira e raio-X"
          maxLength={120}
          className={inputBase}
        />
        <label className={`${label} mt-4`}>Descrição (opcional)</label>
        <textarea
          value={form.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Detalhes da sala, regras, o que está incluso…"
          className={`${inputBase} resize-none`}
        />
        <label className={`${label} mt-4`}>Equipamentos / estrutura</label>
        <div className="flex flex-wrap gap-2">
          {EQUIPAMENTOS_OPCOES.map((e) => {
            const on = form.equipamentos.includes(e);
            return (
              <button
                key={e}
                type="button"
                onClick={() => toggleEquip(e)}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
                style={
                  on
                    ? { background: "#007aff", color: "#fff" }
                    : { background: "#eef2fb", color: "#0a2a66" }
                }
              >
                {on && <Check size={13} className="mr-1 inline" />}
                {e}
              </button>
            );
          })}
        </div>
      </Secao>

      {/* Preço */}
      <Secao titulo="Preço da locação">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className={label}>Valor (R$)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.preco_valor}
              onChange={(e) => set("preco_valor", e.target.value)}
              placeholder="120,00"
              className={inputBase}
            />
          </div>
          <div className="min-w-[140px]">
            <label className={label}>Unidade</label>
            <select
              value={form.preco_unidade}
              onChange={(e) => set("preco_unidade", e.target.value as PrecoUnidade)}
              className={inputBase}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {PRECO_UNIDADE_LABEL[u]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Secao>

      {/* Disponibilidade */}
      <Secao titulo="Disponibilidade semanal">
        <div className="flex flex-col gap-2">
          {form.disponibilidade.map((d, i) => (
            <div key={d.dia} className="flex flex-wrap items-center gap-3">
              <label className="flex w-[150px] items-center gap-2 text-[14px] text-ink">
                <input
                  type="checkbox"
                  checked={d.ativo}
                  onChange={(e) => setDia(i, { ativo: e.target.checked })}
                  className="h-4 w-4 accent-[#007aff]"
                />
                {d.dia}
              </label>
              {d.ativo ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={d.inicio}
                    onChange={(e) => setDia(i, { inicio: e.target.value })}
                    className="rounded-[10px] border border-black/15 px-2 py-1.5 text-[14px]"
                  />
                  <span className="text-ink-muted">até</span>
                  <input
                    type="time"
                    value={d.fim}
                    onChange={(e) => setDia(i, { fim: e.target.value })}
                    className="rounded-[10px] border border-black/15 px-2 py-1.5 text-[14px]"
                  />
                </div>
              ) : (
                <span className="text-[13px] text-ink-muted">Fechado</span>
              )}
            </div>
          ))}
        </div>
      </Secao>

      {/* Contato de locação (privado, revelado só após aprovar) */}
      <Secao titulo="Contato de locação (privado)">
        <p className="mb-3 text-[13px] text-ink-muted">
          É revelado ao dentista <strong>só depois que você aprovar</strong> a solicitação. Pode ser
          diferente do telefone público da sua clínica. Informe ao menos um.
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className={label}>WhatsApp</label>
            <input
              type="tel"
              inputMode="numeric"
              value={form.contato_whatsapp}
              onChange={(e) => set("contato_whatsapp", e.target.value)}
              placeholder="5515999999999"
              className={inputBase}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className={label}>E-mail</label>
            <input
              type="email"
              value={form.contato_email}
              onChange={(e) => set("contato_email", e.target.value)}
              placeholder="contato@clinica.com"
              className={inputBase}
            />
          </div>
        </div>
      </Secao>

      {/* Política de cancelamento */}
      <Secao titulo="Política de cancelamento (opcional)">
        <textarea
          value={form.politica_cancelamento}
          onChange={(e) => set("politica_cancelamento", e.target.value)}
          rows={2}
          placeholder="Ex.: cancelamento gratuito até 24h antes."
          className={`${inputBase} resize-none`}
        />
      </Secao>

      {erro && (
        <p role="alert" className="text-[13px] text-danger">
          {erro}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={ocupado}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.25)" }}
        >
          {ocupado && <Loader2 size={16} className="animate-spin" />}
          {salaInicial ? "Salvar alterações" : "Anunciar sala"}
        </button>
        <button
          onClick={() => router.push("/pro/salas")}
          className="text-[14px] font-semibold text-ink-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-[15px] font-bold text-brand-navy">{titulo}</h2>
      {children}
    </section>
  );
}
