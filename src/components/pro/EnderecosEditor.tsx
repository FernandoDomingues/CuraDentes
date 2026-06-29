"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// EnderecosEditor — CRUD de endereços de atendimento (compartilhado).
//
// Usado tanto no "Meu perfil" quanto no wizard de cadastro. Edição diferida: o
// componente só altera o estado (via onChange); a persistência (insert/update/
// delete + geocoding) é responsabilidade da página que o usa. `onRemover` avisa
// o id removido para a página decidir apagar no banco (no cadastro isso é ignorado,
// pois lá o save é delete-all + reinsert).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Save, Trash2 } from "lucide-react";
import { ESPECIALIDADES } from "@/lib/especialidades";
import UploadFotos from "@/components/UploadFotos";
import { buscarCep } from "@/lib/cep";

export interface AgendaDiaForm {
  dia: string;
  inicio: string;
  fim: string;
  ativo: boolean;
}

export interface EnderecoForm {
  id: string;
  nome_clinica: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  whatsapp: string;
  atende_urgencias: boolean;
  aceita_urgencia_termo: boolean;
  estacionamento: boolean;
  atividades: string[];
  convenios: string[];
  formas_pagamento: string[];
  politica_cancelamento: string;
  observacoes: string;
  agenda: AgendaDiaForm[];
  foto_fachada: string; // URL única (locação) — bucket fotos-salas
  fotos_recepcao: string[]; // 0..3 URLs (locação)
  _isNew?: boolean;
}

export const CONVENIOS_OPCOES = [
  "Amil Dental", "Bradesco Dental", "SulAmérica Odonto", "Hapvida Odonto",
  "Odontoprev", "Unimed Odonto", "Porto Seguro Saúde", "NotreDame Intermédica",
  "Ameplan", "Metlife Odonto", "Uniodonto",
];
export const PAGAMENTOS_OPCOES = [
  "Dinheiro", "PIX", "Cartão de débito", "Cartão de crédito (à vista)",
  "Cartão de crédito (parcelado 3x)", "Cartão de crédito (parcelado 6x)",
  "Cartão de crédito (parcelado 12x)", "Boleto bancário", "Transferência bancária",
];
export const DIAS_SEMANA = [
  "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
  "Sexta-feira", "Sábado", "Domingo",
];
export const POLITICA_PADRAO =
  "Cancelamentos devem ser feitos com no mínimo 24 horas de antecedência. Faltas sem aviso prévio poderão ser cobradas uma taxa administrativa.";

/** Cria um endereço novo em branco (id local "end-...", _isNew, agenda padrão). */
export function novoEndereco(): EnderecoForm {
  return {
    id: `end-${Date.now()}-${Math.round(performance.now())}`,
    nome_clinica: "", logradouro: "", numero: "", complemento: "", bairro: "",
    cidade: "", estado: "", cep: "", telefone: "", whatsapp: "",
    atende_urgencias: false, aceita_urgencia_termo: false, estacionamento: false,
    atividades: [], convenios: [], formas_pagamento: [],
    politica_cancelamento: POLITICA_PADRAO, observacoes: "",
    agenda: DIAS_SEMANA.map((dia) => ({
      dia, inicio: "08:00", fim: "18:00",
      ativo: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"].includes(dia),
    })),
    foto_fachada: "", fotos_recepcao: [],
    _isNew: true,
  };
}

const labelCls = "mb-1 block text-xs font-semibold text-ink-soft";
const inputCls = "w-full rounded-[10px] border border-black/15 px-3.5 py-2.5 text-sm outline-none focus:border-brand-blue";
// Estilo de borda/sombra laranja para campo obrigatório pendente (estilo k11).
const pendenteStyle: React.CSSProperties = { borderColor: "#FF9500", boxShadow: "0 0 0 3px rgba(255,149,0,0.15)" };

export default function EnderecosEditor({
  enderecos,
  onChange,
  onRemover,
  onSalvarProgresso,
  max = 8,
  mostrarPendencias = false,
  mostrarFotos = false,
}: {
  enderecos: EnderecoForm[];
  onChange: (lista: EnderecoForm[]) => void;
  onRemover?: (id: string) => void;
  /** Opcional: persiste o endereço de índice `idx` (a página decide como). Se
   *  ausente, o botão "Salvar progresso" só dá feedback visual local. */
  onSalvarProgresso?: (idx: number) => void | Promise<void>;
  max?: number;
  /** Quando true, destaca em laranja os campos obrigatórios ainda vazios. */
  mostrarPendencias?: boolean;
  /** Quando true, mostra o upload de fachada/recepção da clínica (locação de salas). */
  mostrarFotos?: boolean;
}) {
  // Índice do endereço que acabou de exibir o feedback "Salvo" (some após 2,5s).
  const [salvoIdx, setSalvoIdx] = useState<number | null>(null);

  async function salvarProgresso(idx: number) {
    try {
      await onSalvarProgresso?.(idx);
    } catch {
      toast.error("Não foi possível salvar o progresso. Tente novamente.");
      return;
    }
    setSalvoIdx(idx);
    toast.success("Progresso salvo.");
    setTimeout(() => setSalvoIdx((cur) => (cur === idx ? null : cur)), 2500);
  }
  // Ref sempre com a lista mais recente — para o aplicarCep (assíncrono) mesclar
  // sobre o estado atual por id, sem sobrescrever o que o usuário digitou durante
  // a consulta ao ViaCEP (race pego no review).
  const enderecosRef = useRef(enderecos);
  useEffect(() => {
    enderecosRef.current = enderecos;
  }, [enderecos]);

  function atualizar(idx: number, campo: keyof EnderecoForm, valor: string | boolean) {
    const n = [...enderecos];
    n[idx] = { ...n[idx], [campo]: valor };
    onChange(n);
  }
  function setFotos(idx: number, campo: "foto_fachada" | "fotos_recepcao", valor: string | string[]) {
    const n = [...enderecos];
    n[idx] = { ...n[idx], [campo]: valor };
    onChange(n);
  }
  function toggleOpcao(idx: number, campo: "atividades" | "convenios" | "formas_pagamento", valor: string) {
    const n = [...enderecos];
    const lista = n[idx][campo];
    n[idx] = { ...n[idx], [campo]: lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor] };
    onChange(n);
  }
  function atualizarAgenda(idx: number, idxDia: number, campo: "ativo" | "inicio" | "fim", valor: string | boolean) {
    const n = [...enderecos];
    const agenda = [...n[idx].agenda];
    agenda[idxDia] = { ...agenda[idxDia], [campo]: valor };
    n[idx] = { ...n[idx], agenda };
    onChange(n);
  }
  async function aplicarCep(idx: number, cepDigitado: string) {
    // CEP só com dígitos: remove traço/espaços/letras ao digitar OU colar
    // (ex.: colar "18016-400" guarda "18016400"). Máximo 8 dígitos.
    const cep = (cepDigitado ?? "").replace(/\D/g, "").slice(0, 8);
    const idAlvo = enderecos[idx].id;
    // Aplica o CEP digitado sobre o estado mais recente (por id).
    onChange(enderecosRef.current.map((e) => (e.id === idAlvo ? { ...e, cep } : e)));
    if (cep.replace(/\D/g, "").length === 8) {
      const d = await buscarCep(cep);
      if (d) {
        // Mescla SÓ os campos do endereço por id, sobre o estado atual no momento da
        // resposta — preserva edições feitas durante a consulta (número, etc.).
        onChange(
          enderecosRef.current.map((e) =>
            e.id === idAlvo ? { ...e, logradouro: d.logradouro, bairro: d.bairro, cidade: d.cidade, estado: d.estado } : e,
          ),
        );
      } else {
        // CEP inexistente, fora do ar ou timeout (buscarCep retorna null em todos):
        // antes ficava em silêncio. Agora avisamos para o usuário preencher à mão.
        toast.error("CEP não encontrado. Preencha o endereço manualmente.");
      }
    }
  }
  function remover(idx: number) {
    const id = enderecos[idx].id;
    onRemover?.(id);
    onChange(enderecos.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-5">
      {enderecos.map((end, idx) => (
        <div key={end.id} className="overflow-hidden rounded-3xl border border-black/10 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-black/8 px-6 py-4" style={{ background: "rgba(0,122,255,0.04)" }}>
            <h3 className="font-bold text-brand-navy">
              Endereço {idx + 1}{end.nome_clinica ? ` — ${end.nome_clinica}` : ""}
            </h3>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => salvarProgresso(idx)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                style={salvoIdx === idx
                  ? { color: "#34C759", background: "rgba(52,199,89,0.10)" }
                  : { color: "#007AFF", background: "rgba(0,122,255,0.08)" }}
                title="Salvar progresso deste endereço"
              >
                {salvoIdx === idx ? <Check size={13} /> : <Save size={13} />}
                {salvoIdx === idx ? "Salvo" : "Salvar progresso"}
              </button>
              {enderecos.length > 1 && (
                <button
                  onClick={() => remover(idx)}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  style={{ color: "#FF3B30", background: "rgba(255,59,48,0.08)" }}
                  title="Excluir endereço"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Nome da clínica / consultório *</label>
                <input value={end.nome_clinica} onChange={(e) => atualizar(idx, "nome_clinica", e.target.value)} className={inputCls} style={mostrarPendencias && !end.nome_clinica.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.nome_clinica.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div>
                <label className={labelCls}>CEP *</label>
                <input inputMode="numeric" value={end.cep} onChange={(e) => aplicarCep(idx, e.target.value)} placeholder="00000000" maxLength={8} className={inputCls} style={mostrarPendencias && !end.cep.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.cep.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Logradouro *</label>
                <input value={end.logradouro} onChange={(e) => atualizar(idx, "logradouro", e.target.value)} className={inputCls} style={mostrarPendencias && !end.logradouro.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.logradouro.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div>
                <label className={labelCls}>Número *</label>
                <input inputMode="numeric" value={end.numero} onChange={(e) => atualizar(idx, "numero", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Complemento</label>
                <input value={end.complemento} onChange={(e) => atualizar(idx, "complemento", e.target.value)} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Bairro *</label>
                <input value={end.bairro} onChange={(e) => atualizar(idx, "bairro", e.target.value)} className={inputCls} style={mostrarPendencias && !end.bairro.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.bairro.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div>
                <label className={labelCls}>Cidade *</label>
                <input value={end.cidade} onChange={(e) => atualizar(idx, "cidade", e.target.value)} className={inputCls} style={mostrarPendencias && !end.cidade.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.cidade.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div>
                <label className={labelCls}>Estado *</label>
                <input value={end.estado} maxLength={2} onChange={(e) => atualizar(idx, "estado", e.target.value.toUpperCase())} className={inputCls} style={mostrarPendencias && !end.estado.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.estado.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div>
                <label className={labelCls}>Telefone fixo</label>
                <input type="tel" inputMode="numeric" value={end.telefone} onChange={(e) => atualizar(idx, "telefone", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>WhatsApp</label>
                <input type="tel" inputMode="numeric" value={end.whatsapp} onChange={(e) => atualizar(idx, "whatsapp", e.target.value)} placeholder="5511999999999" className={inputCls} />
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-[12px] border border-danger/15 bg-danger/5 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={end.atende_urgencias} onChange={(e) => atualizar(idx, "atende_urgencias", e.target.checked)} className="h-5 w-5 accent-brand-magenta" />
                <span className="text-sm font-bold text-brand-magenta">Atendo urgências neste endereço</span>
              </label>
              {end.atende_urgencias && (
                <label className="flex cursor-pointer items-start gap-2 pl-8">
                  <input type="checkbox" checked={end.aceita_urgencia_termo} onChange={(e) => atualizar(idx, "aceita_urgencia_termo", e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-magenta" />
                  <span className="text-xs text-ink-soft">Concordo em realizar encaixes de pacientes em urgência no meu horário.</span>
                </label>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={end.estacionamento} onChange={(e) => atualizar(idx, "estacionamento", e.target.checked)} className="h-5 w-5 accent-brand-blue" />
              <span className="text-sm font-semibold text-ink-soft">Este endereço tem estacionamento</span>
            </label>

            <div>
              <label className={labelCls}>Informações de estacionamento ao cliente <span className="font-normal text-ink-muted">(opcional · máx. 300)</span></label>
              <textarea value={end.observacoes} maxLength={300} rows={2} onChange={(e) => atualizar(idx, "observacoes", e.target.value)} className={`${inputCls} resize-y`} />
              <p className="mt-1 text-right text-[11px] text-ink-muted">{end.observacoes.length}/300</p>
            </div>

            <div>
              <label className={`${labelCls} mb-2`}>Horários de atendimento</label>
              <div className="flex flex-col gap-2">
                {end.agenda.map((d, idxDia) => (
                  <div key={d.dia} className="flex flex-col gap-2 rounded-lg border border-black/8 bg-black/3 p-2 sm:flex-row sm:items-center sm:gap-3">
                    <label className="flex w-[150px] flex-shrink-0 cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={d.ativo} onChange={(e) => atualizarAgenda(idx, idxDia, "ativo", e.target.checked)} className="h-4 w-4 accent-brand-blue" />
                      <span className={`text-[13px] font-medium ${d.ativo ? "text-ink" : "text-ink-muted"}`}>{d.dia}</span>
                    </label>
                    {d.ativo ? (
                      <div className="flex items-center gap-2 pl-6 sm:pl-0">
                        <input type="time" value={d.inicio} onChange={(e) => atualizarAgenda(idx, idxDia, "inicio", e.target.value)} className="rounded border border-black/15 p-1 text-[13px]" />
                        <span className="text-xs text-ink-muted">até</span>
                        <input type="time" value={d.fim} onChange={(e) => atualizarAgenda(idx, idxDia, "fim", e.target.value)} className="rounded border border-black/15 p-1 text-[13px]" />
                      </div>
                    ) : (
                      <span className="pl-6 text-xs italic text-ink-muted sm:pl-0">Fechado</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <ChipGroup titulo="Procedimentos realizados neste local" opcoes={ESPECIALIDADES} selecionadas={end.atividades} cor="bg-brand-blue" onToggle={(v) => toggleOpcao(idx, "atividades", v)} />
            <ChipGroup titulo="Convênios aceitos" opcoes={CONVENIOS_OPCOES} selecionadas={end.convenios} cor="bg-success" onToggle={(v) => toggleOpcao(idx, "convenios", v)} />
            <ChipGroup titulo="Formas de pagamento" opcoes={PAGAMENTOS_OPCOES} selecionadas={end.formas_pagamento} cor="bg-[#FF9500]" onToggle={(v) => toggleOpcao(idx, "formas_pagamento", v)} />

            {mostrarFotos && (
              <div className="rounded-[12px] border border-brand-blue/20 p-3" style={{ background: "rgba(0,122,255,0.03)" }}>
                <p className="text-xs font-bold text-brand-navy">Fotos da clínica (locação de salas)</p>
                <p className="mb-3 mt-0.5 text-[11px] text-ink-muted">
                  Valem para todas as salas deste endereço. A foto de cada sala fica no anúncio da sala.
                </p>
                <div className="flex flex-col gap-3">
                  <UploadFotos
                    label="Fachada (1)"
                    fotos={end.foto_fachada ? [end.foto_fachada] : []}
                    onChange={(f) => setFotos(idx, "foto_fachada", f[0] ?? "")}
                    max={1}
                    escopo="clinicas"
                  />
                  <UploadFotos
                    label="Recepção (até 3)"
                    fotos={end.fotos_recepcao}
                    onChange={(f) => setFotos(idx, "fotos_recepcao", f)}
                    max={3}
                    escopo="clinicas"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {enderecos.length < max && (
        <button
          onClick={() => onChange([...enderecos, novoEndereco()])}
          className="flex w-full items-center justify-center gap-2 rounded-[16px] text-[14px] font-semibold transition-all duration-200"
          style={{ border: "1.5px dashed rgba(0,122,255,0.30)", color: "#007AFF", background: "rgba(0,122,255,0.04)", minHeight: "56px", padding: "16px" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,122,255,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,122,255,0.04)"; }}
        >
          <Plus size={18} />
          Adicionar endereço ({enderecos.length}/{max})
        </button>
      )}
    </div>
  );
}

function ChipGroup({
  titulo, opcoes, selecionadas, cor, onToggle,
}: {
  titulo: string;
  opcoes: string[];
  selecionadas: string[];
  cor: string;
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <label className={`${labelCls} mb-2`}>{titulo}</label>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((op) => {
          const ativo = selecionadas.includes(op);
          return (
            <button key={op} type="button" onClick={() => onToggle(op)} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${ativo ? `${cor} text-white` : "bg-black/5 text-ink-soft"}`}>
              {ativo && <Check size={12} className="flex-shrink-0" />}
              {op}
            </button>
          );
        })}
      </div>
    </div>
  );
}
