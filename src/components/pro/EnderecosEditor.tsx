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
import Link from "next/link";
import { Check, Plus, Save, Trash2 } from "lucide-react";
import { ESPECIALIDADES } from "@/lib/especialidades";
import { ESTRUTURA_CLINICA_OPCOES, clinicaKeyDe, type ClinicaSugestao } from "@/lib/salas";
import UploadFotos from "@/components/UploadFotos";
import { buscarCep } from "@/lib/cep";
import { sugerirClinicas, buscarDadosClinica } from "@/lib/clinicas-sugestao";

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
  estrutura: string[]; // comodidades da clínica (locação) — estacionamento, wifi, …
  estrutura_extra: string; // texto livre (≤150) — comodidades extra da clínica
  // Confirmação de adesão a uma clínica existente (checkbox obrigatória). undefined = não
  // é adesão; false = adesão pendente de confirmação; true = confirmada. NÃO persiste no BD.
  _adesaoConfirmada?: boolean;
  _isNew?: boolean;
}

/** Resumo de uma sala da clínica (atalho de edição na página do perfil). */
export interface SalaResumoClinica {
  id: string;
  endereco_id: string;
  titulo: string;
  numero_na_clinica: number | null;
  fotos: string[];
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
    estrutura: [], estrutura_extra: "",
    _isNew: true,
  };
}

const labelCls = "mb-1 block text-xs font-semibold text-ink-soft";
const inputCls = "w-full rounded-[10px] border border-black/15 px-3.5 py-2.5 text-sm outline-none focus:border-brand-blue";
// Classe do input quando TRAVADO (campo da clínica, na adesão) — cinza + sem cursor.
const inputTravCls = inputCls + " cursor-not-allowed bg-black/[0.04] text-ink-muted";
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
  salas = [],
}: {
  enderecos: EnderecoForm[];
  onChange: (lista: EnderecoForm[]) => void;
  onRemover?: (id: string) => void;
  salas?: SalaResumoClinica[];
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
  // Sugestão "você quis dizer": clínicas já existentes no mesmo prédio (por id do endereço).
  const [sugestoes, setSugestoes] = useState<Record<string, ClinicaSugestao[]>>({});
  const [sugFechadas, setSugFechadas] = useState<Set<string>>(new Set());

  // Endereços "aderidos" a uma clínica existente: id do endereço → clinica_key adotada.
  // Enquanto adotado, os campos que DEFINEM a clínica ficam travados (só CEP/número/
  // complemento seguem editáveis — são o que identifica a clínica).
  const [adotada, setAdotada] = useState<Record<string, string>>({});
  // Clínicas que o dentista REJEITOU para um endereço (id → clinica_keys). Impede a
  // auto-adesão de re-travar a MESMA clínica (por chave), mesmo se ele reeditar o CEP —
  // mas não bloqueia adotar OUTRA clínica em outro prédio (chave diferente).
  const [rejeitadas, setRejeitadas] = useState<Record<string, string[]>>({});
  // Refs espelham o estado para leituras confiáveis dentro de fluxos assíncronos
  // (busca de CEP / sugestão), sem fechar sobre valores velhos.
  const adotadaRef = useRef(adotada);
  const rejeitadasRef = useRef(rejeitadas);
  useEffect(() => { adotadaRef.current = adotada; }, [adotada]);
  useEffect(() => { rejeitadasRef.current = rejeitadas; }, [rejeitadas]);

  async function buscarSugestoes(idx: number) {
    const end = enderecosRef.current[idx];
    if (!end) return;
    const r = await sugerirClinicas(end.cep, end.numero);
    setSugestoes((p) => ({ ...p, [end.id]: r }));
    // AUTO-ADESÃO: se há EXATAMENTE uma clínica no prédio e o endereço ainda não foi
    // adotado nem REJEITADO (por chave), adere automaticamente (preenche + trava). Com
    // 2+ clínicas no mesmo prédio não dá para adivinhar → mostramos o cartão para escolher.
    if (
      r.length === 1 &&
      !adotadaRef.current[end.id] &&
      !(rejeitadasRef.current[end.id] ?? []).includes(r[0].clinica_key)
    ) {
      adotarClinica(end.id, r[0]);
    }
  }
  // Aderir a uma clínica existente: busca os dados do dono, preenche e TRAVA os campos
  // que DEFINEM a clínica (nome, fotos, estrutura). Telefone/WhatsApp NÃO são tocados —
  // o contato é individual do dentista. Resolve por ID (não por posição) para não agir
  // no endereço errado se a lista mudar durante o await.
  async function adotarClinica(id: string, sug: ClinicaSugestao) {
    if (!enderecosRef.current.some((e) => e.id === id)) return;
    const dados = await buscarDadosClinica(sug.clinica_key);
    onChange(
      enderecosRef.current.map((e) =>
        e.id === id
          ? {
              ...e,
              nome_clinica: sug.nome_clinica ?? e.nome_clinica,
              complemento: sug.complemento ?? e.complemento,
              _adesaoConfirmada: false, // adesão pendente da confirmação obrigatória (checkbox)
              ...(dados
                ? {
                    foto_fachada: dados.foto_fachada ?? "",
                    fotos_recepcao: dados.fotos_recepcao ?? [],
                    estrutura: dados.estrutura ?? [],
                    estrutura_extra: dados.estrutura_extra ?? "",
                  }
                : {}),
            }
          : e,
      ),
    );
    setAdotada((p) => ({ ...p, [id]: sug.clinica_key }));
    setSugFechadas((p) => new Set(p).add(id));
  }
  // Mudar CEP ou número = mudar de PRÉDIO: destrava (se adotado) e reabre a auto-adoção
  // do novo endereço. (rejeitadas NÃO é limpo — é por chave da clínica.)
  function aoMudarPredio(id: string) {
    setAdotada((p) => { if (!p[id]) return p; const c = { ...p }; delete c[id]; return c; });
    setSugFechadas((p) => { if (!p.has(id)) return p; const s = new Set(p); s.delete(id); return s; });
  }
  // Trocou de prédio (número): destrava e zera a confirmação de adesão do endereço.
  function mudarNumero(idx: number, valor: string) {
    aoMudarPredio(enderecos[idx].id);
    onChange(enderecos.map((e, i) => (i === idx ? { ...e, numero: valor, _adesaoConfirmada: undefined } : e)));
  }
  // Complemento diferencia unidades no MESMO prédio: se a chave deixar de bater com a
  // clínica adotada, é OUTRA clínica → DESTRAVA e o dentista passa a definir A PRÓPRIA
  // (ele não edita a clínica alheia; para ser outra, muda a identidade = complemento).
  function mudarComplemento(idx: number, valor: string) {
    const end = enderecos[idx];
    const chave = adotada[end.id];
    const virouOutra = !!chave && clinicaKeyDe(end.cep, end.numero, valor) !== chave;
    onChange(enderecos.map((e, i) => (i === idx ? { ...e, complemento: valor, ...(virouOutra ? { _adesaoConfirmada: undefined } : {}) } : e)));
    if (virouOutra) {
      // marca a chave como rejeitada para o blur do número não re-adotar a clínica do prédio.
      setRejeitadas((p) => ({ ...p, [end.id]: [...(p[end.id] ?? []), chave!] }));
      setAdotada((p) => { const c = { ...p }; delete c[end.id]; return c; });
    }
  }

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
  function toggleOpcao(idx: number, campo: "atividades" | "convenios" | "formas_pagamento" | "estrutura", valor: string) {
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
    aoMudarPredio(idAlvo); // editar o CEP = trocar de prédio → destrava a adesão
    // Aplica o CEP digitado sobre o estado mais recente (por id); zera a confirmação.
    onChange(enderecosRef.current.map((e) => (e.id === idAlvo ? { ...e, cep, _adesaoConfirmada: undefined } : e)));
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
        buscarSugestoes(idx); // novo prédio identificado: reavalia / auto-adota
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
                <input value={end.nome_clinica} onChange={(e) => atualizar(idx, "nome_clinica", e.target.value)} disabled={!!adotada[end.id]} className={adotada[end.id] ? inputTravCls : inputCls} style={mostrarPendencias && !end.nome_clinica.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.nome_clinica.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div>
                <label className={labelCls}>CEP *</label>
                <input inputMode="numeric" value={end.cep} onChange={(e) => aplicarCep(idx, e.target.value)} placeholder="00000000" maxLength={8} className={inputCls} style={mostrarPendencias && !end.cep.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.cep.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Logradouro *</label>
                <input value={end.logradouro} onChange={(e) => atualizar(idx, "logradouro", e.target.value)} disabled={!!adotada[end.id]} className={adotada[end.id] ? inputTravCls : inputCls} style={mostrarPendencias && !end.logradouro.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.logradouro.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div>
                <label className={labelCls}>Número *</label>
                <input inputMode="numeric" value={end.numero} onChange={(e) => mudarNumero(idx, e.target.value)} onBlur={() => buscarSugestoes(idx)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>
                  Complemento{" "}
                  {adotada[end.id]
                    ? <span className="font-bold text-brand-blue">— é OUTRA sala/conjunto? edite aqui para diferenciar</span>
                    : <span className="font-normal text-ink-muted">— sala/conjunto, se houver</span>}
                </label>
                <input value={end.complemento} onChange={(e) => mudarComplemento(idx, e.target.value)} className={inputCls}
                  style={adotada[end.id] ? { borderColor: "#007aff", boxShadow: "0 0 0 3px rgba(0,122,255,0.18)" } : undefined} />
              </div>

              {/* Banner de adesão: aparece quando o endereço bate com uma clínica que já
                  existe. Os dados dela ficam TRAVADOS (são do dono); a checkbox é uma
                  CONFIRMAÇÃO obrigatória (não destrava). Para ser outra clínica no prédio,
                  o dentista muda a identidade (complemento/número/CEP). */}
              {adotada[end.id] && (
                <div className="md:col-span-2 rounded-[12px] border p-3" style={{ borderColor: "rgba(0,122,255,0.35)", background: "rgba(0,122,255,0.06)" }}>
                  <p className="text-[13px] text-ink-soft">
                    🔒 Este endereço já tem uma <strong className="text-brand-navy">clínica cadastrada</strong>. Os dados dela ficam <strong>travados</strong> (pertencem ao dono). Ao salvar, você <strong>adere a ela</strong> e o <strong>dono aprova</strong> seu cadastro. Se você é de <strong>outra</strong> clínica no mesmo prédio, informe sua <strong className="text-brand-blue">sala/conjunto no complemento</strong> (ou mude o número/CEP).
                  </p>
                  <label className="mt-2.5 flex cursor-pointer items-start gap-2 border-t border-black/10 pt-2.5">
                    <input type="checkbox" checked={!!end._adesaoConfirmada} onChange={(e) => atualizar(idx, "_adesaoConfirmada", e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand-blue" />
                    <span className="text-[13px] font-semibold text-brand-navy">
                      Confirmo que atendo nesta clínica <span className="font-normal text-ink-soft">— ela não é minha; o dono precisa aprovar meu cadastro.</span>
                    </span>
                  </label>
                  {!end._adesaoConfirmada && (
                    <p className="mt-1 pl-6 text-[11px] font-medium" style={{ color: "#FF9500" }}>Confirmação obrigatória para salvar.</p>
                  )}
                </div>
              )}

              {/* "Você quis dizer?" — clínicas já existentes neste endereço (padroniza o nome). */}
              {!adotada[end.id] && !sugFechadas.has(end.id) && (sugestoes[end.id]?.length ?? 0) >= 2 && (
                <div className="md:col-span-2 rounded-[12px] border p-3" style={{ borderColor: "rgba(0,122,255,0.30)", background: "rgba(0,122,255,0.05)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-brand-navy">Há clínicas neste endereço — alguma é a sua?</p>
                    <button type="button" onClick={() => setSugFechadas((p) => new Set(p).add(end.id))} aria-label="Fechar" className="shrink-0 text-ink-muted hover:text-ink">✕</button>
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {sugestoes[end.id]!.map((s) => (
                      <button key={s.clinica_key} type="button" onClick={() => adotarClinica(end.id, s)} className="flex items-center justify-between gap-3 rounded-[10px] border border-black/10 bg-white px-3 py-2 text-left text-[13px] transition-colors hover:border-brand-blue">
                        <span className="min-w-0">
                          <strong className="text-brand-navy">{s.nome_clinica || "Clínica"}</strong>
                          {s.complemento ? <span className="text-ink-muted"> · {s.complemento}</span> : null}
                        </span>
                        <span className="shrink-0 text-[12px] font-semibold text-brand-blue">Usar este nome</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-ink-muted">
                    Se a sua é <strong>outra</strong> clínica no mesmo prédio, informe sua sala/conjunto no <strong>complemento</strong> para diferenciar.
                  </p>
                </div>
              )}
              <div className="md:col-span-2">
                <label className={labelCls}>Bairro *</label>
                <input value={end.bairro} onChange={(e) => atualizar(idx, "bairro", e.target.value)} disabled={!!adotada[end.id]} className={adotada[end.id] ? inputTravCls : inputCls} style={mostrarPendencias && !end.bairro.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.bairro.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div>
                <label className={labelCls}>Cidade *</label>
                <input value={end.cidade} onChange={(e) => atualizar(idx, "cidade", e.target.value)} disabled={!!adotada[end.id]} className={adotada[end.id] ? inputTravCls : inputCls} style={mostrarPendencias && !end.cidade.trim() ? pendenteStyle : undefined} />
                {mostrarPendencias && !end.cidade.trim() && <p className="mt-1 text-[11px] font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>}
              </div>
              <div>
                <label className={labelCls}>Estado *</label>
                <input value={end.estado} maxLength={2} onChange={(e) => atualizar(idx, "estado", e.target.value.toUpperCase())} disabled={!!adotada[end.id]} className={adotada[end.id] ? inputTravCls : inputCls} style={mostrarPendencias && !end.estado.trim() ? pendenteStyle : undefined} />
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
                    readOnly={!!adotada[end.id]}
                  />
                  <UploadFotos
                    label="Recepção (até 3)"
                    fotos={end.fotos_recepcao}
                    onChange={(f) => setFotos(idx, "fotos_recepcao", f)}
                    max={3}
                    escopo="clinicas"
                    readOnly={!!adotada[end.id]}
                  />
                </div>
              </div>
            )}

            {mostrarFotos && (
              <div className="rounded-[12px] border border-brand-blue/20 p-3" style={{ background: "rgba(0,122,255,0.03)" }}>
                <p className="text-xs font-bold text-brand-navy">Estrutura da clínica (locação de salas)</p>
                <p className="mb-3 mt-0.5 text-[11px] text-ink-muted">
                  Comodidades que valem para TODAS as salas deste endereço. Os equipamentos de cada sala ficam no anúncio dela.
                </p>
                <div className="flex flex-wrap gap-2">
                  {ESTRUTURA_CLINICA_OPCOES.map((opt) => {
                    const on = end.estrutura.includes(opt);
                    const trav = !!adotada[end.id];
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={trav}
                        onClick={() => toggleOpcao(idx, "estrutura", opt)}
                        className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors${trav ? " cursor-not-allowed opacity-60" : ""}`}
                        style={on ? { background: "#007aff", color: "#fff" } : { background: "#eef2fb", color: "#0a2a66" }}
                      >
                        {on && <Check size={13} className="mr-1 inline" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={end.estrutura_extra}
                  onChange={(e) => atualizar(idx, "estrutura_extra", e.target.value.slice(0, 150))}
                  maxLength={150}
                  disabled={!!adotada[end.id]}
                  placeholder="Outras comodidades da clínica (separe por vírgula)"
                  className={`${adotada[end.id] ? inputTravCls : inputCls} mt-2.5`}
                />
                <p className="mt-1 text-right text-[11px] text-ink-muted">{end.estrutura_extra.length}/150</p>
              </div>
            )}

            {mostrarFotos && salas.filter((s) => s.endereco_id === end.id).length > 0 && (
              <div className="rounded-[12px] border border-black/8 p-3">
                <p className="text-xs font-bold text-brand-navy">Salas desta clínica</p>
                <p className="mb-3 mt-0.5 text-[11px] text-ink-muted">
                  Clique para editar a sala sem sair desta página.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {salas
                    .filter((s) => s.endereco_id === end.id)
                    .map((s) => (
                      <Link
                        key={s.id}
                        href={`/pro/negocios/${s.id}/editar`}
                        title={`Editar ${s.titulo}`}
                        className="group flex w-28 flex-col overflow-hidden rounded-[10px] border border-gray-100 bg-white transition-shadow hover:shadow-md"
                      >
                        <span className="aspect-[4/3] w-full overflow-hidden bg-brand-soft">
                          {s.fotos[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.fotos[0]} alt={s.titulo} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] text-ink-muted">sem foto</span>
                          )}
                        </span>
                        <span className="px-2 py-1.5">
                          <span className="block text-[10px] font-bold uppercase text-brand-blue">
                            {s.numero_na_clinica != null ? `Sala ${String(s.numero_na_clinica).padStart(2, "0")}` : "Sala"}
                          </span>
                          <span className="block truncate text-[11px] font-semibold text-ink">{s.titulo}</span>
                        </span>
                      </Link>
                    ))}
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
