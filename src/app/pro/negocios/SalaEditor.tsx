"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// SalaEditor — cadastro de salas. Ao ANUNCIAR (sem salaInicial), permite adicionar
// VÁRIAS salas de uma vez (botão "+"): o endereço e a política são compartilhados;
// cada sala tem seu título/equipamentos/preço/disponibilidade/fotos (1–3). Ao EDITAR,
// é uma sala só. Salva via Server Action salvarSala (uma chamada por sala).
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import UploadFotos from "@/components/UploadFotos";
import { salvarSala } from "./acoes";
import {
  EQUIPAMENTOS_OPCOES,
  disponibilidadePadrao,
  normalizarBlocos,
  dataLocalISO,
  DIAS_SEMANA_LONGO,
  type EnderecoResumo,
  type MinhaSala,
  type SalaForm,
  type BlocoDisponibilidade,
} from "@/lib/salas";

const HORAS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const inputBase = "w-full rounded-[12px] border border-black/15 px-4 py-3 text-[15px] outline-none focus:border-brand-blue";
const labelCls = "mb-1.5 block text-[13px] font-semibold text-ink-soft";

interface RoomForm {
  id?: string;
  titulo: string;
  descricao: string;
  equipamentos: string[];
  preco_valor: string; // por hora
  preco_diaria: string; // opcional
  disponibilidade: BlocoDisponibilidade[];
  fotos: string[];
}

function salaVazia(): RoomForm {
  return {
    titulo: "", descricao: "", equipamentos: [], preco_valor: "", preco_diaria: "",
    disponibilidade: disponibilidadePadrao(), fotos: [],
  };
}

export default function SalaEditor({
  enderecos,
  salaInicial,
}: {
  enderecos: EnderecoResumo[];
  salaInicial?: MinhaSala;
}) {
  const router = useRouter();
  const editando = !!salaInicial;
  const [enderecoId, setEnderecoId] = useState(salaInicial?.endereco_id ?? enderecos[0]?.id ?? "");
  const [politica, setPolitica] = useState(salaInicial?.politica_cancelamento ?? "");
  const [salas, setSalas] = useState<RoomForm[]>(() =>
    salaInicial
      ? [{
          id: salaInicial.id,
          titulo: salaInicial.titulo,
          descricao: salaInicial.descricao ?? "",
          equipamentos: salaInicial.equipamentos ?? [],
          preco_valor: String(salaInicial.preco_valor),
          preco_diaria: salaInicial.preco_diaria != null ? String(salaInicial.preco_diaria) : "",
          disponibilidade: salaInicial.disponibilidade?.length
            ? normalizarBlocos(salaInicial.disponibilidade)
            : disponibilidadePadrao(),
          fotos: salaInicial.fotos ?? [],
        }]
      : [salaVazia()],
  );
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  function setRoom(i: number, room: RoomForm) {
    setSalas((s) => s.map((r, idx) => (idx === i ? room : r)));
  }

  async function salvar() {
    setErro("");
    if (!enderecoId) return setErro("Escolha em qual endereço as salas ficam.");
    for (const r of salas) {
      if (!r.titulo.trim()) return setErro("Dê um título a cada sala.");
      const preco = Number(String(r.preco_valor).replace(",", "."));
      if (!Number.isFinite(preco) || preco < 0) return setErro("Informe um preço válido em cada sala.");
      if (!r.fotos.length) return setErro("Cada sala precisa de ao menos uma foto.");
    }
    setOcupado(true);
    let falhou = "";
    for (const r of salas) {
      const input: SalaForm = {
        id: r.id,
        endereco_id: enderecoId,
        titulo: r.titulo,
        descricao: r.descricao,
        equipamentos: r.equipamentos,
        preco_valor: r.preco_valor,
        preco_unidade: "hora",
        preco_diaria: r.preco_diaria,
        disponibilidade: r.disponibilidade,
        politica_cancelamento: politica,
        fotos: r.fotos,
      };
      const res = await salvarSala(input);
      if (!res.ok) {
        falhou = res.erro || "Não foi possível salvar.";
        break;
      }
    }
    setOcupado(false);
    if (falhou) return setErro(falhou);
    toast.success(editando ? "Sala atualizada!" : salas.length > 1 ? "Salas anunciadas!" : "Sala anunciada!");
    router.push("/pro/negocios");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Onde ficam (compartilhado) */}
      <Secao titulo="Onde ficam as salas">
        <label className={labelCls}>Endereço / clínica</label>
        <select value={enderecoId} onChange={(e) => setEnderecoId(e.target.value)} className={inputBase}>
          {enderecos.map((e) => (
            <option key={e.id} value={e.id}>
              {[e.nome_clinica, e.bairro, e.cidade].filter(Boolean).join(" · ") || "Endereço"}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[12px] text-ink-muted">
          A fachada e a recepção da clínica ficam no seu{" "}
          <a href="/pro/editar-perfil" className="font-semibold text-brand-blue hover:underline">perfil</a>{" "}
          (valem para todas as salas deste endereço).
        </p>
      </Secao>

      {/* Salas (uma ou várias) */}
      {salas.map((room, i) => (
        <SalaBloco
          key={i}
          numero={i + 1}
          room={room}
          onChange={(r) => setRoom(i, r)}
          onRemove={!editando && salas.length > 1 ? () => setSalas((s) => s.filter((_, idx) => idx !== i)) : undefined}
        />
      ))}

      {!editando && (
        <button
          type="button"
          onClick={() => setSalas((s) => [...s, salaVazia()])}
          className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-dashed border-brand-blue/40 px-4 py-3 text-[14px] font-semibold text-brand-blue transition-colors hover:bg-brand-blue/5"
        >
          <Plus size={16} /> Adicionar outra sala
        </button>
      )}

      {/* Política (compartilhada) */}
      <Secao titulo="Política de cancelamento (opcional)">
        <textarea
          value={politica}
          onChange={(e) => setPolitica(e.target.value)}
          rows={2}
          placeholder="Ex.: cancelamento gratuito até 24h antes."
          className={`${inputBase} resize-none`}
        />
      </Secao>

      {erro && (
        <p role="alert" className="text-[13px] text-danger">{erro}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={ocupado}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.25)" }}
        >
          {ocupado && <Loader2 size={16} className="animate-spin" />}
          {editando ? "Salvar alterações" : salas.length > 1 ? `Anunciar ${salas.length} salas` : "Anunciar sala"}
        </button>
        <button onClick={() => router.push("/pro/negocios")} className="text-[14px] font-semibold text-ink-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Bloco de UMA sala ───────────────────────────────────────────────────────────
function SalaBloco({
  numero,
  room,
  onChange,
  onRemove,
}: {
  numero: number;
  room: RoomForm;
  onChange: (r: RoomForm) => void;
  onRemove?: () => void;
}) {
  function set<K extends keyof RoomForm>(campo: K, valor: RoomForm[K]) {
    onChange({ ...room, [campo]: valor });
  }
  function toggleEquip(e: string) {
    set("equipamentos", room.equipamentos.includes(e) ? room.equipamentos.filter((x) => x !== e) : [...room.equipamentos, e]);
  }
  function addBloco() {
    set("disponibilidade", [...room.disponibilidade, { tipo: "semanal", diaSemana: 5, inicio: "08:00", fim: "18:00" }]);
  }
  function setBloco(i: number, novo: BlocoDisponibilidade) {
    set("disponibilidade", room.disponibilidade.map((b, idx) => (idx === i ? novo : b)));
  }

  return (
    <section className="rounded-[18px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-brand-navy">Sala {numero}</h2>
        {onRemove && (
          <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-[13px] font-semibold text-danger hover:underline">
            <X size={14} /> Remover
          </button>
        )}
      </div>

      <label className={labelCls}>Título</label>
      <input value={room.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex.: Consultório com cadeira e raio-X" maxLength={120} className={inputBase} />

      <label className={`${labelCls} mt-4`}>Descrição (opcional)</label>
      <textarea value={room.descricao} onChange={(e) => set("descricao", e.target.value)} rows={2} maxLength={2000} placeholder="Detalhes, regras, o que está incluso…" className={`${inputBase} resize-none`} />

      <label className={`${labelCls} mt-4`}>Equipamentos / estrutura</label>
      <div className="flex flex-wrap gap-2">
        {EQUIPAMENTOS_OPCOES.map((e) => {
          const on = room.equipamentos.includes(e);
          return (
            <button key={e} type="button" onClick={() => toggleEquip(e)} className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors" style={on ? { background: "#007aff", color: "#fff" } : { background: "#eef2fb", color: "#0a2a66" }}>
              {on && <Check size={13} className="mr-1 inline" />}
              {e}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className={labelCls}>Valor por hora (R$)</label>
          <input type="number" min={0} step="0.01" value={room.preco_valor} onChange={(e) => set("preco_valor", e.target.value)} placeholder="120,00" className={inputBase} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className={labelCls}>Valor da diária (R$) <span className="font-normal text-ink-muted">— opcional</span></label>
          <input type="number" min={0} step="0.01" value={room.preco_diaria} onChange={(e) => set("preco_diaria", e.target.value)} placeholder="800,00" className={inputBase} />
        </div>
      </div>

      <label className={`${labelCls} mt-4`}>Disponibilidade</label>
      <div className="flex flex-col gap-2.5">
        {room.disponibilidade.map((b, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-[12px] border border-black/8 bg-black/[0.02] p-2.5">
            <select
              value={b.tipo}
              onChange={(e) =>
                setBloco(i, e.target.value === "semanal"
                  ? { tipo: "semanal", diaSemana: 5, inicio: b.inicio, fim: b.fim }
                  : { tipo: "data", data: dataLocalISO(new Date()), inicio: b.inicio, fim: b.fim })
              }
              className="rounded-[10px] border border-black/15 px-2 py-1.5 text-[13px]"
            >
              <option value="semanal">Toda semana</option>
              <option value="data">Data específica</option>
            </select>
            {b.tipo === "semanal" ? (
              <select value={b.diaSemana} onChange={(e) => setBloco(i, { ...b, diaSemana: Number(e.target.value) })} className="rounded-[10px] border border-black/15 px-2 py-1.5 text-[13px]">
                {DIAS_SEMANA_LONGO.map((d, idx) => (
                  <option key={idx} value={idx}>{d}</option>
                ))}
              </select>
            ) : (
              <input type="date" value={b.data} min={dataLocalISO(new Date())} onChange={(e) => setBloco(i, { ...b, data: e.target.value })} className="rounded-[10px] border border-black/15 px-2 py-1.5 text-[13px]" />
            )}
            <span className="text-[13px] text-ink-muted">das</span>
            <select value={b.inicio} onChange={(e) => setBloco(i, { ...b, inicio: e.target.value })} className="rounded-[10px] border border-black/15 px-2 py-1.5 text-[13px]">
              {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-[13px] text-ink-muted">às</span>
            <select value={b.fim} onChange={(e) => setBloco(i, { ...b, fim: e.target.value })} className="rounded-[10px] border border-black/15 px-2 py-1.5 text-[13px]">
              {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <button type="button" onClick={() => set("disponibilidade", room.disponibilidade.filter((_, idx) => idx !== i))} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/5" aria-label="Remover bloco">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addBloco} className="mt-3 inline-flex items-center gap-1.5 rounded-[12px] border border-brand-blue/30 px-3.5 py-2 text-[13px] font-semibold text-brand-blue transition-colors hover:bg-brand-blue/5">
        <Plus size={15} /> Adicionar disponibilidade
      </button>

      <div className="mt-5">
        <label className={labelCls}>Fotos da sala (1 a 3)</label>
        <UploadFotos fotos={room.fotos} onChange={(f) => set("fotos", f)} max={3} escopo="salas" />
      </div>
    </section>
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
