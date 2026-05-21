// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: LISTAGEM TOP 10 DE DENTISTAS
//
// Exibe o ranking dos 10 dentistas mais bem avaliados da cidade.
// Funcionalidades:
//   - Seção recolhida por padrão, expande ao clique do usuário
//   - Filtros: "Por Avaliação Geral" | "Por Especialidades" | "Por Convênio"
//   - Mobile: lista vertical com foto, rating, tags, horário e convênios
//   - Desktop: top 3 em cards destacados com medalha + ranks 4-10 em lista compacta
//
// FEATURE INATIVA (comentada):
//   Sistema de recompensa para o dentista que ficar mais tempo no Top 1
//   em cada especialidade por mês — recebe cupom de 100% de desconto no plano.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  Star, Trophy, CheckCircle, MapPin, Clock, Heart,
  ChevronDown, ChevronUp, Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DENTISTS } from "@/constants/data";
import DentistCard from "./DentistCard";
import type { TipoFiltroRanking } from "@/types/dentist";

// ─── Ordena os dentistas por rating descendente ───────────────────────────────
const DENTISTAS_ORDENADOS_GERAL = [...DENTISTS].sort((a, b) => b.rating - a.rating);

// ─── Cores das medalhas para o pódio (top 3) ─────────────────────────────────
const MEDALHA: Record<number, { fundo: string; texto: string; label: string }> = {
  0: { fundo: "#FFD700", texto: "#7A5800", label: "1º" },
  1: { fundo: "#C0C0C0", texto: "#4A4A4A", label: "2º" },
  2: { fundo: "#CD7F32", texto: "#5A2800", label: "3º" },
};

// ─── Especialidades únicas extraídas dos dados para o filtro ─────────────────
const ESPECIALIDADES_DISPONIVEIS = Array.from(
  new Set(DENTISTS.map((d) => d.specialty))
).sort();

// ─── Convênios únicos extraídos dos dados para o filtro ──────────────────────
// Nota: em produção, estes dados virão de uma query JOIN com a tabela de convênios
const CONVENIOS_DISPONIVEIS = [
  "Amil Dental", "Bradesco Dental", "SulAmérica Odonto",
  "Hapvida Odonto", "Odontoprev", "Unimed Odonto",
  "Porto Seguro Saúde", "NotreDame Intermédica",
];

// ─── Componente principal ────────────────────────────────────────────────────
export default function FeaturedDentists() {
  const navigate = useNavigate();

  // Controla se a seção está expandida ou recolhida (recolhida por padrão)
  const [expandido, setExpandido] = useState(false);

  // Tipo de filtro ativo no ranking
  const [filtroAtivo, setFiltroAtivo] = useState<TipoFiltroRanking>("avaliacao_geral");

  // Especialidade selecionada quando filtro é "especialidade"
  const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState<string>(
    ESPECIALIDADES_DISPONIVEIS[0]
  );

  // Convênio selecionado quando filtro é "convenio"
  const [convenioSelecionado, setConvenioSelecionado] = useState<string>(
    CONVENIOS_DISPONIVEIS[0]
  );

  /**
   * Calcula a lista de dentistas filtrada e ordenada conforme o filtro ativo.
   * - avaliacao_geral: todos os 10, ordenados por rating
   * - especialidade: filtra por specialty e ordena por rating
   * - convenio: como os dados mock não têm lista de convênios por nome,
   *   filtra por dentistas que têm ao menos 1 convênio (simulação)
   *   Em produção: JOIN com tabela dentista_convenio WHERE nome = convenioSelecionado
   */
  const dentistasExibidos = (() => {
    if (filtroAtivo === "avaliacao_geral") {
      return DENTISTAS_ORDENADOS_GERAL;
    }
    if (filtroAtivo === "especialidade") {
      return [...DENTISTS]
        .filter((d) => d.specialty === especialidadeSelecionada)
        .sort((a, b) => b.rating - a.rating);
    }
    if (filtroAtivo === "convenio") {
      // Simulação: filtra por dentistas com convênios cadastrados
      // Em produção: filtrar por nome do convênio via query ao banco
      return [...DENTISTS]
        .filter((d) => (d.convenios ?? 0) > 0)
        .sort((a, b) => b.rating - a.rating);
    }
    return DENTISTAS_ORDENADOS_GERAL;
  })();

  return (
    <section style={{ paddingBottom: "0" }}>

      {/* ════════════════════════════════════════════════════════════════════
          VERSÃO MOBILE (< lg)
          Layout em lista vertical com cabeçalho recolhível
      ════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden" style={{ background: "#F2F2F7" }}>

        {/* Cabeçalho clicável — expande/recolhe a seção */}
        <button
          className="w-full flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: expandido ? "0.5px solid rgba(60,60,67,0.10)" : "none",
            background: "#fff",
            cursor: "pointer",
          }}
          onClick={() => setExpandido(!expandido)}
          aria-expanded={expandido}
          aria-controls="lista-dentistas-mobile"
        >
          <div className="flex items-center gap-2">
            <Trophy size={16} style={{ color: "#FFD700" }} />
            <span className="text-[14px] font-bold" style={{ color: "#0A2A66" }}>
              Top 10 da Cidade
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicador do filtro ativo no cabeçalho */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                background: "rgba(0,122,255,0.10)",
                color: "#007AFF",
                border: "1px solid rgba(0,122,255,0.18)",
              }}
            >
              <Filter size={11} />
              {filtroAtivo === "avaliacao_geral"
                ? "Avaliação Geral"
                : filtroAtivo === "especialidade"
                  ? especialidadeSelecionada
                  : convenioSelecionado}
            </div>
            {expandido ? (
              <ChevronUp size={16} style={{ color: "#8E8E93" }} />
            ) : (
              <ChevronDown size={16} style={{ color: "#8E8E93" }} />
            )}
          </div>
        </button>

        {/* Barra de filtros mobile — visível apenas quando expandido */}
        {expandido && (
          <div
            style={{
              background: "#fff",
              borderBottom: "0.5px solid rgba(60,60,67,0.10)",
              padding: "10px 12px",
            }}
          >
            {/* Rótulo */}
            <div className="flex items-center gap-1.5 mb-2">
              <Filter size={12} style={{ color: "#8E8E93" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8E8E93" }}>
                Ordenar por
              </span>
            </div>

            {/* Grid de filtros — 3 colunas iguais, sem scroll horizontal */}
            <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              {/* Botão: Por Avaliação Geral */}
              <button
                onClick={(e) => { e.stopPropagation(); setFiltroAtivo("avaliacao_geral"); }}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-[12px] text-[11px] font-semibold min-h-[52px] transition-all duration-200 text-center leading-tight"
                style={
                  filtroAtivo === "avaliacao_geral"
                    ? { background: "#007AFF", color: "#fff", border: "0.5px solid transparent" }
                    : { background: "rgba(60,60,67,0.05)", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.15)" }
                }
              >
                <Star size={14} fill={filtroAtivo === "avaliacao_geral" ? "#fff" : "#3A3A3C"} stroke="none" />
                Avaliação Geral
              </button>

              {/* Botão: Por Especialidades */}
              <button
                onClick={(e) => { e.stopPropagation(); setFiltroAtivo("especialidade"); }}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-[12px] text-[11px] font-semibold min-h-[52px] transition-all duration-200 text-center leading-tight"
                style={
                  filtroAtivo === "especialidade"
                    ? { background: "#007AFF", color: "#fff", border: "0.5px solid transparent" }
                    : { background: "rgba(60,60,67,0.05)", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.15)" }
                }
              >
                <Filter size={14} style={{ color: filtroAtivo === "especialidade" ? "#fff" : "#3A3A3C" }} />
                Por Especialidades
              </button>

              {/* Botão: Por Convênio */}
              <button
                onClick={(e) => { e.stopPropagation(); setFiltroAtivo("convenio"); }}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-[12px] text-[11px] font-semibold min-h-[52px] transition-all duration-200 text-center leading-tight"
                style={
                  filtroAtivo === "convenio"
                    ? { background: "#007AFF", color: "#fff", border: "0.5px solid transparent" }
                    : { background: "rgba(60,60,67,0.05)", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.15)" }
                }
              >
                <CheckCircle size={14} style={{ color: filtroAtivo === "convenio" ? "#fff" : "#3A3A3C" }} />
                Por Convênio
              </button>
            </div>

            {/* Seletor de especialidade — aparece abaixo quando ativo */}
            {filtroAtivo === "especialidade" && (
              <div className="mt-2">
                <select
                  value={especialidadeSelecionada}
                  onChange={(e) => setEspecialidadeSelecionada(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] font-medium outline-none"
                  style={{
                    background: "rgba(0,122,255,0.08)",
                    color: "#007AFF",
                    border: "0.5px solid rgba(0,122,255,0.25)",
                    cursor: "pointer",
                  }}
                >
                  {ESPECIALIDADES_DISPONIVEIS.map((esp) => (
                    <option key={esp} value={esp}>{esp}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Seletor de convênio — aparece abaixo quando ativo */}
            {filtroAtivo === "convenio" && (
              <div className="mt-2">
                <select
                  value={convenioSelecionado}
                  onChange={(e) => setConvenioSelecionado(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] font-medium outline-none"
                  style={{
                    background: "rgba(0,122,255,0.08)",
                    color: "#007AFF",
                    border: "0.5px solid rgba(0,122,255,0.25)",
                    cursor: "pointer",
                  }}
                >
                  {CONVENIOS_DISPONIVEIS.map((conv) => (
                    <option key={conv} value={conv}>{conv}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Contador de resultados */}
            <p className="text-[11px] mt-2" style={{ color: "#8E8E93" }}>
              {dentistasExibidos.length} profissional{dentistasExibidos.length !== 1 ? "is" : ""} encontrado{dentistasExibidos.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Lista expandida de dentistas */}
        {expandido && (
          <div
            id="lista-dentistas-mobile"
            className="flex flex-col"
            style={{ gap: "1px", background: "rgba(60,60,67,0.10)" }}
          >
            {dentistasExibidos.map((dentista, idx) => (
              <div
                key={dentista.id}
                style={{ background: "#fff", cursor: "pointer" }}
                onClick={() => navigate(`/dentista/${dentista.id}`)}
              >
                {/* Linha com posição e rating */}
                <div className="flex items-center gap-2 px-4 pt-3">
                  <div
                    className="flex items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0"
                    style={{
                      width: "24px",
                      height: "24px",
                      background: MEDALHA[idx]?.fundo ?? "rgba(0,122,255,0.10)",
                      color: MEDALHA[idx]?.texto ?? "#007AFF",
                    }}
                  >
                    {MEDALHA[idx]?.label ?? `${idx + 1}º`}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={12} fill="#FFCC00" stroke="none" />
                    <span className="text-[13px] font-bold" style={{ color: "#FFCC00" }}>
                      {dentista.rating.toFixed(1)}
                    </span>
                    <span className="text-[12px]" style={{ color: "#8E8E93" }}>
                      ({dentista.reviews} avaliações)
                    </span>
                  </div>
                </div>

                {/* Foto, nome, especialidade, localização */}
                <div className="flex items-start gap-3 px-4 pt-2 pb-0">
                  <div
                    className="flex-shrink-0 overflow-hidden"
                    style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#E5EAF2" }}
                  >
                    <img
                      src={dentista.photo}
                      alt={dentista.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="font-bold text-[16px] leading-tight"
                        style={{ color: "#0A2A66", fontFamily: "Inter, sans-serif" }}
                      >
                        {dentista.name}
                      </h3>
                      {/* Botão de favorito — sem propagação de clique
                      <button
                        className="flex-shrink-0 flex items-center justify-center w-9 h-9 -mt-0.5"
                        aria-label="Favoritar"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Heart size={18} style={{ color: "#C7C7CC" }} />
                      </button>*/}
                    </div>
                    <p className="text-[12px] font-semibold mt-0.5" style={{ color: "#E6004C" }}>
                      {dentista.specialty}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={11} style={{ color: "#8E8E93" }} />
                      <span className="text-[12px]" style={{ color: "#8E8E93" }}>
                        {dentista.neighborhood ?? dentista.city} · {dentista.distance}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tags de especialidade */}
                {dentista.tags && dentista.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-4 pt-2 pb-2">
                    {dentista.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full text-[12px] font-medium"
                        style={{
                          background: "rgba(0,122,255,0.07)",
                          color: "#007AFF",
                          border: "1px solid rgba(0,122,255,0.14)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Rodapé: horário e convênios */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderTop: "0.5px solid rgba(60,60,67,0.08)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} style={{ color: "#8E8E93" }} />
                    <span className="text-[12px]" style={{ color: "#8E8E93" }}>
                      {dentista.hours ?? "Seg-Sex 8h-18h"}
                    </span>
                  </div>
                  {dentista.convenios != null && dentista.convenios > 0 && (
                    <div className="flex items-center gap-1">
                      <CheckCircle size={13} style={{ color: "#34C759" }} />
                      <span className="text-[12px] font-semibold" style={{ color: "#34C759" }}>
                        {dentista.convenios} convênios
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VERSÃO DESKTOP / TABLET (≥ lg)
          Cabeçalho recolhível + top 3 em cards + ranks 4-10 em lista compacta
      ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block" style={{ paddingBottom: "80px" }}>
        <div className="container mx-auto px-5 md:px-8 lg:px-16">

          {/* Botão de expansão / recolhimento */}
          <button
            className="w-full flex items-center justify-between py-6"
            onClick={() => setExpandido(!expandido)}
            aria-expanded={expandido}
            aria-controls="lista-dentistas-desktop"
            style={{ cursor: "pointer", background: "transparent" }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[13px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--primary-blue)" }}
                >
                  Ranking
                </span>
              </div>
              <h2
                className="flex items-center gap-3 text-left"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(26px, 4vw, 34px)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                  color: "var(--brand-navy)",
                }}
              >
                <Trophy size={28} style={{ color: "#FFD700" }} />
                Top 10 da cidade por avaliação
              </h2>
              <p className="mt-1 text-[15px]" style={{ color: "var(--text-secondary)" }}>
                Profissionais mais bem avaliados pelos pacientes CuraDentes
              </p>
            </div>

            {/* Indicador de expandido/recolhido */}
            <div
              className="flex items-center gap-2 px-5 py-3 rounded-[14px] font-semibold text-[15px] flex-shrink-0 transition-all duration-200"
              style={{
                background: expandido ? "rgba(0,122,255,0.10)" : "rgba(0,122,255,0.06)",
                color: "#007AFF",
                border: "0.5px solid rgba(0,122,255,0.20)",
                minHeight: "48px",
              }}
            >
              {expandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              {expandido ? "Recolher ranking" : "Ver ranking completo"}
            </div>
          </button>

          {/* Conteúdo expandido */}
          {expandido && (
            <div id="lista-dentistas-desktop">

              {/* ── Barra de filtros ── */}
              <div
                className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-[16px]"
                style={{
                  background: "rgba(255,255,255,0.70)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "0.5px solid rgba(255,255,255,0.45)",
                  boxShadow: "0 2px 8px rgba(16,24,64,0.06)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Filter size={15} style={{ color: "#8E8E93" }} />
                  <span className="text-[13px] font-semibold" style={{ color: "#8E8E93" }}>
                    Ordenar por:
                  </span>
                </div>

                {/* Botão: Por Avaliação Geral */}
                <button
                  onClick={() => setFiltroAtivo("avaliacao_geral")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold min-h-[36px] transition-all duration-200"
                  style={
                    filtroAtivo === "avaliacao_geral"
                      ? { background: "#007AFF", color: "#fff", border: "0.5px solid transparent" }
                      : { background: "transparent", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.18)" }
                  }
                >
                  <Star size={13} fill={filtroAtivo === "avaliacao_geral" ? "#fff" : "#3A3A3C"} stroke="none" />
                  Por Avaliação Geral
                </button>

                {/* Botão: Por Especialidades */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFiltroAtivo("especialidade")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold min-h-[36px] transition-all duration-200"
                    style={
                      filtroAtivo === "especialidade"
                        ? { background: "#007AFF", color: "#fff", border: "0.5px solid transparent" }
                        : { background: "transparent", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.18)" }
                    }
                  >
                    Por Especialidades
                  </button>
                  {/* Seletor de especialidade — visível apenas quando filtro está ativo */}
                  {filtroAtivo === "especialidade" && (
                    <select
                      value={especialidadeSelecionada}
                      onChange={(e) => setEspecialidadeSelecionada(e.target.value)}
                      className="px-3 py-1.5 rounded-[10px] text-[13px] font-medium outline-none"
                      style={{
                        background: "rgba(0,122,255,0.08)",
                        color: "#007AFF",
                        border: "0.5px solid rgba(0,122,255,0.25)",
                        cursor: "pointer",
                      }}
                    >
                      {ESPECIALIDADES_DISPONIVEIS.map((esp) => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Botão: Por Convênio */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFiltroAtivo("convenio")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold min-h-[36px] transition-all duration-200"
                    style={
                      filtroAtivo === "convenio"
                        ? { background: "#007AFF", color: "#fff", border: "0.5px solid transparent" }
                        : { background: "transparent", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.18)" }
                    }
                  >
                    <CheckCircle size={13} style={{ color: filtroAtivo === "convenio" ? "#fff" : "#3A3A3C" }} />
                    Por Convênio
                  </button>
                  {/* Seletor de convênio — visível apenas quando filtro está ativo */}
                  {filtroAtivo === "convenio" && (
                    <select
                      value={convenioSelecionado}
                      onChange={(e) => setConvenioSelecionado(e.target.value)}
                      className="px-3 py-1.5 rounded-[10px] text-[13px] font-medium outline-none"
                      style={{
                        background: "rgba(0,122,255,0.08)",
                        color: "#007AFF",
                        border: "0.5px solid rgba(0,122,255,0.25)",
                        cursor: "pointer",
                      }}
                    >
                      {CONVENIOS_DISPONIVEIS.map((conv) => (
                        <option key={conv} value={conv}>{conv}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Contador de resultados */}
                <span
                  className="ml-auto text-[13px]"
                  style={{ color: "#8E8E93" }}
                >
                  {dentistasExibidos.length} profissional{dentistasExibidos.length !== 1 ? "is" : ""} encontrado{dentistasExibidos.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Top 3 — cards destacados com medalha */}
              {dentistasExibidos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  {dentistasExibidos.slice(0, 3).map((dentista, idx) => (
                    <div
                      key={dentista.id}
                      className="relative cursor-pointer"
                      onClick={() => navigate(`/dentista/${dentista.id}`)}
                    >
                      {/* Medalha posicionada acima do card */}
                      <div
                        className="absolute -top-3 -left-1 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold shadow-md"
                        style={{
                          background: MEDALHA[idx]?.fundo ?? "#E5EAF2",
                          color: MEDALHA[idx]?.texto ?? "#0A2A66",
                        }}
                      >
                        {MEDALHA[idx]?.label ?? `${idx + 1}º`} lugar
                      </div>
                      <DentistCard dentist={dentista} />
                    </div>
                  ))}
                </div>
              )}

              {/* Ranks 4+ — lista compacta */}
              {dentistasExibidos.length > 3 && (
                <div
                  className="rounded-[20px] overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    backdropFilter: "blur(24px) saturate(120%)",
                    WebkitBackdropFilter: "blur(24px) saturate(120%)",
                    border: "0.5px solid rgba(255,255,255,0.40)",
                    boxShadow: "0 4px 16px rgba(16,24,64,0.06)",
                  }}
                >
                  {dentistasExibidos.slice(3).map((dentista, idx) => {
                    const posicao = idx + 4;
                    const isUltimo = idx === dentistasExibidos.slice(3).length - 1;

                    return (
                      <div
                        key={dentista.id}
                        className="flex items-center gap-4 px-5 py-4 transition-colors duration-150 cursor-pointer group"
                        style={{
                          borderBottom: isUltimo ? "none" : "0.5px solid rgba(60,60,67,0.08)",
                        }}
                        onClick={() => navigate(`/dentista/${dentista.id}`)}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(0,122,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "transparent";
                        }}
                      >
                        {/* Número da posição */}
                        <div
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-[13px] font-bold"
                          style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF" }}
                        >
                          {posicao}º
                        </div>

                        {/* Foto circular */}
                        <div
                          className="flex-shrink-0 overflow-hidden"
                          style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#E5EAF2" }}
                        >
                          <img
                            src={dentista.photo}
                            alt={dentista.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Nome e especialidade */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-semibold text-[15px] truncate"
                            style={{ color: "var(--brand-navy)", fontFamily: "Inter, sans-serif" }}
                          >
                            {dentista.name}
                          </p>
                          <p className="text-[13px] font-medium" style={{ color: "#E6004C" }}>
                            {dentista.specialty}
                          </p>
                        </div>

                        {/* Tags — visíveis apenas em telas largas */}
                        <div className="hidden xl:flex gap-1.5 flex-shrink-0">
                          {(dentista.tags ?? []).slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 rounded-full text-[12px] font-medium"
                              style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF" }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Star size={15} fill="#FFCC00" stroke="none" />
                          <span className="text-[15px] font-bold" style={{ color: "#0A2A66" }}>
                            {dentista.rating.toFixed(1)}
                          </span>
                          <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                            ({dentista.reviews})
                          </span>
                        </div>

                        {/* Localização */}
                        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                          <MapPin size={13} style={{ color: "#8E8E93" }} />
                          <span className="text-[13px]" style={{ color: "#8E8E93" }}>
                            {dentista.neighborhood} · {dentista.distance}
                          </span>
                        </div>

                        {/* Convênios */}
                        {dentista.convenios != null && (
                          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
                            <CheckCircle size={14} style={{ color: "#34C759" }} />
                            <span className="text-[13px] font-semibold" style={{ color: "#34C759" }}>
                              {dentista.convenios} conv.
                            </span>
                          </div>
                        )}

                        {/* CTA — aparece ao hover via opacity */}
                        <button
                          className="flex-shrink-0 px-4 py-2 rounded-[12px] text-white text-[13px] font-semibold min-h-[36px] transition-all duration-200 opacity-0 group-hover:opacity-100"
                          style={{
                            background: "var(--primary-blue)",
                            boxShadow: "0 4px 12px rgba(0,122,255,0.25)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dentista/${dentista.id}`);
                          }}
                        >
                          Ver perfil
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mensagem quando nenhum dentista é encontrado com o filtro */}
              {dentistasExibidos.length === 0 && (
                <div
                  className="text-center py-12"
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    borderRadius: "20px",
                    border: "0.5px solid rgba(255,255,255,0.40)",
                  }}
                >
                  <p className="text-[16px]" style={{ color: "#8E8E93" }}>
                    Nenhum dentista encontrado com este filtro.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/*
       * ════════════════════════════════════════════════════════════════════
       * FEATURE INATIVA — SISTEMA DE RECOMPENSA TOP 1 MENSAL
       * ════════════════════════════════════════════════════════════════════
       *
       * Lógica planejada:
       *   - Ao final de cada mês, uma Edge Function verifica qual dentista
       *     ficou mais dias no Top 1 de cada especialidade.
       *   - O vencedor recebe isenção de 100% no plano do mês seguinte,
       *     via cupom gerado automaticamente.
       *   - Forma de envio do cupom: a definir (e-mail, notificação in-app, etc.)
       *
       * Para ativar:
       *   1. Habilite o backend (Supabase)
       *   2. Crie a Edge Function "apurar-top1-mensal" com cron mensal
       *   3. Crie as tabelas historico_top1_mensal e cupons_desconto
       *   4. Remova os comentários abaixo
       *
       * import { supabase } from "@/lib/supabase";
       *
       * async function registrarTop1Mensal(
       *   dentista_id: number,
       *   especialidade: string,
       *   mes_referencia: string,  // formato: "YYYY-MM"
       *   dias_em_top1: number
       * ) {
       *   await supabase.from("historico_top1_mensal").insert({
       *     dentista_id,
       *     especialidade,
       *     mes_referencia,
       *     dias_em_top1,
       *     recebeu_cupom: false,
       *   });
       *
       *   // Gera o cupom de 100% de desconto
       *   await supabase.from("cupons_desconto").insert({
       *     dentista_id,
       *     percentual: 100,
       *     mes_referencia,
       *     status: "pendente_envio",
       *   });
       * }
       * ════════════════════════════════════════════════════════════════════
       */}
    </section>
  );
}
