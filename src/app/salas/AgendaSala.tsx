"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// AgendaSala — calendário de reserva (modal). Fluxo dos prints:
//   1) MÊS: dias que o anfitrião liberou ficam selecionáveis; indisponíveis riscados.
//   2) SEMANA: dias em colunas; sob cada um, os horários de hora em hora.
// Seleção (regra do usuário): 1º clique = início, 2º = fim (faixa contígua); do 3º
// clique em diante vira PONTUAL (cada toque liga/desliga uma hora). Múltiplas faixas
// contíguas viram múltiplas solicitações no envio.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ArrowLeft, Calendar as CalIcon } from "lucide-react";
import {
  diaTemDisponibilidade, horasDoDia, dataLocalISO, parseDataLocal, formatarHora,
  agruparHorasEmFaixas, DIAS_SEMANA_CURTO, type BlocoDisponibilidade,
} from "@/lib/salas";

export default function AgendaSala({
  disponibilidade,
  onFechar,
  onConfirmar,
}: {
  disponibilidade: BlocoDisponibilidade[];
  onFechar: () => void;
  onConfirmar: (sel: { data: string; horas: number[] }) => void;
}) {
  const hojeISO = dataLocalISO(new Date());
  const [tela, setTela] = useState<"mes" | "semana">("mes");
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [weekStartISO, setWeekStartISO] = useState<string | null>(null);

  // Seleção (dentro de UM dia).
  const [selData, setSelData] = useState<string | null>(null);
  const [selHoras, setSelHoras] = useState<number[]>([]);
  const [passo, setPasso] = useState(0); // 0=nada, 1=âncora, 2=faixa feita, 3+=pontual
  const [ancora, setAncora] = useState<number | null>(null);

  // ── Grade do mês ──
  const ano = mesRef.getFullYear();
  const mes = mesRef.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas: (string | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(dataLocalISO(new Date(ano, mes, d)));
  const mesNome = mesRef.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  function escolherDia(iso: string) {
    const dt = parseDataLocal(iso);
    const ws = new Date(dt);
    ws.setDate(dt.getDate() - dt.getDay()); // domingo da semana
    setWeekStartISO(dataLocalISO(ws));
    setSelData(iso);
    setSelHoras([]);
    setPasso(0);
    setAncora(null);
    setTela("semana");
  }

  function navMes(delta: number) {
    setMesRef(new Date(ano, mes + delta, 1));
  }
  function navSemana(delta: number) {
    if (!weekStartISO) return;
    const d = parseDataLocal(weekStartISO);
    d.setDate(d.getDate() + delta * 7);
    setWeekStartISO(dataLocalISO(d));
  }

  // ── Semana ──
  const diasSemana = weekStartISO
    ? Array.from({ length: 7 }, (_, i) => {
        const d = parseDataLocal(weekStartISO);
        d.setDate(d.getDate() + i);
        return dataLocalISO(d);
      })
    : [];
  const colunas = diasSemana.filter((iso) => iso >= hojeISO && diaTemDisponibilidade(disponibilidade, iso));
  const semanaPassada = diasSemana.length > 0 && diasSemana[6] < hojeISO;

  function clicarSlot(iso: string, h: number) {
    if (iso !== selData) {
      setSelData(iso);
      setSelHoras([h]);
      setAncora(h);
      setPasso(1);
      return;
    }
    if (passo === 1 && ancora != null) {
      const a = Math.min(ancora, h);
      const b = Math.max(ancora, h);
      const arr: number[] = [];
      for (let x = a; x <= b; x++) arr.push(x);
      setSelHoras(arr);
      setPasso(2);
      return;
    }
    if (passo >= 2) {
      setSelHoras((prev) =>
        prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort((a, b) => a - b),
      );
      setPasso(3);
      return;
    }
    setSelHoras([h]);
    setAncora(h);
    setPasso(1);
  }

  const faixas = agruparHorasEmFaixas(selHoras);
  const resumo = faixas.map((f) => `${f.inicio}–${f.fim}`).join(", ");

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[24px] bg-white sm:rounded-[24px]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            {tela === "semana" && (
              <button onClick={() => setTela("mes")} aria-label="Voltar ao mês" className="text-ink-muted hover:text-ink">
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-brand-navy">
              <CalIcon size={17} style={{ color: "#007aff" }} />
              {tela === "mes" ? "Escolha a data" : "Escolha o horário"}
            </h2>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-black/5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tela === "mes" ? (
            <>
              {/* Nav mês */}
              <div className="mb-3 flex items-center justify-between">
                <button onClick={() => navMes(-1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5" aria-label="Mês anterior">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-[15px] font-semibold capitalize text-brand-navy">{mesNome}</span>
                <button onClick={() => navMes(1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5" aria-label="Próximo mês">
                  <ChevronRight size={18} />
                </button>
              </div>
              {/* Dias da semana */}
              <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-ink-muted">
                {DIAS_SEMANA_CURTO.map((d) => (
                  <span key={d} className="py-1">{d[0]}</span>
                ))}
              </div>
              {/* Grade */}
              <div className="grid grid-cols-7 gap-1">
                {celulas.map((iso, i) => {
                  if (!iso) return <span key={`v${i}`} />;
                  const disp = iso >= hojeISO && diaTemDisponibilidade(disponibilidade, iso);
                  const dia = Number(iso.slice(8, 10));
                  return (
                    <button
                      key={iso}
                      disabled={!disp}
                      onClick={() => escolherDia(iso)}
                      className="flex aspect-square items-center justify-center rounded-[10px] text-[14px] font-medium transition-colors disabled:cursor-not-allowed"
                      style={
                        disp
                          ? { background: "rgba(0,122,255,0.10)", color: "#0a2a66" }
                          : { color: "rgba(60,60,67,0.30)", textDecoration: iso < hojeISO ? "none" : "line-through" }
                      }
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 flex items-center gap-2 text-[12px] text-ink-muted">
                <span className="inline-block h-4 w-4 rounded" style={{ background: "rgba(0,122,255,0.10)" }} />
                Dias com horários liberados pela clínica.
              </p>
            </>
          ) : (
            <>
              {/* Nav semana */}
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={() => navSemana(-1)}
                  disabled={semanaPassada}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-30"
                  aria-label="Semana anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-[13px] font-semibold text-ink-soft">
                  {weekStartISO && `${weekStartISO.slice(8, 10)}/${weekStartISO.slice(5, 7)}`} –{" "}
                  {diasSemana[6] && `${diasSemana[6].slice(8, 10)}/${diasSemana[6].slice(5, 7)}`}
                </span>
                <button onClick={() => navSemana(1)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5" aria-label="Próxima semana">
                  <ChevronRight size={18} />
                </button>
              </div>

              {colunas.length === 0 ? (
                <p className="py-8 text-center text-[14px] text-ink-muted">
                  Sem horários nesta semana. Use as setas para navegar.
                </p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {colunas.map((iso) => {
                    const dt = parseDataLocal(iso);
                    const horas = horasDoDia(disponibilidade, iso);
                    return (
                      <div key={iso} className="flex min-w-[92px] flex-1 flex-col gap-2">
                        <div className="text-center">
                          <p className="text-[13px] font-bold text-brand-navy">{DIAS_SEMANA_CURTO[dt.getDay()]}</p>
                          <p className="text-[12px] text-ink-muted">{iso.slice(8, 10)}/{iso.slice(5, 7)}</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {horas.map((h) => {
                            const on = selData === iso && selHoras.includes(h);
                            return (
                              <button
                                key={h}
                                onClick={() => clicarSlot(iso, h)}
                                className="rounded-full py-2 text-center text-[13px] font-semibold transition-colors"
                                style={
                                  on
                                    ? { background: "#007aff", color: "#fff" }
                                    : { background: "rgba(0,122,255,0.08)", color: "#0a2a66" }
                                }
                              >
                                {formatarHora(h)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé: resumo + confirmar (só na semana, com seleção) */}
        {tela === "semana" && (
          <div className="border-t border-gray-100 p-4">
            {selHoras.length > 0 && selData ? (
              <>
                <p className="mb-2 text-[13px] text-ink-soft">
                  <span className="font-semibold text-ink">{selData.split("-").reverse().join("/")}</span> · {resumo}
                </p>
                <button
                  onClick={() => onConfirmar({ data: selData, horas: selHoras })}
                  className="min-h-[48px] w-full rounded-[14px] text-[15px] font-semibold text-white transition-all hover:brightness-110"
                  style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.25)" }}
                >
                  Confirmar horário
                </button>
              </>
            ) : (
              <p className="text-center text-[13px] text-ink-muted">
                Toque num horário (início e fim para uma faixa).
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
