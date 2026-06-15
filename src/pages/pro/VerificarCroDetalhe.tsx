// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: Verificar CRO — Detalhe (/pro/verificar-cro/:id)
//
// Fluxo:
//   1. Admin abre o site busca-profissionais.cfo.org.br em nova aba
//   2. Seleciona UF, digita o número do CRO, resolve o reCAPTCHA
//   3. Confere os dados retornados e preenche o formulário abaixo
//   4. Marca como Verificado / Falhou
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import { Loader2, ArrowLeft, ExternalLink, RefreshCw, ShieldAlert, CheckCircle, Copy } from "lucide-react";

const UF_MAP: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

type VerificacaoDetalhe = {
  id: string;
  dentista_id: string;
  cro: string;
  uf: string;
  status: string;
  dados_consultados: Record<string, unknown> | null;
  erro: string | null;
  observacao: string | null;
  criado_em: string;
  atualizado_em: string;
  curadentespro: {
    nome: string;
    email: string;
    cro: string;
    cro_verificado: boolean;
    foto_url: string | null;
  };
};

export default function VerificarCroDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verificacao, setVerificacao] = useState<VerificacaoDetalhe | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [copiado, setCopiado] = useState("");

  function copiar(texto: string, qual: string) {
    navigator.clipboard.writeText(texto);
    setCopiado(qual);
    setTimeout(() => setCopiado(""), 2000);
  }

  useEffect(() => {
    async function carregar() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from("cro_verificacoes")
          .select(`
            *,
            curadentespro!inner ( nome, email, cro, cro_verificado, foto_url )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        const row = data as { observacao?: string | null };
        setVerificacao(data as unknown as VerificacaoDetalhe);
        setObservacao(row.observacao || "");
      } catch (err) {
        console.error("[VerificarCroDetalhe] Erro:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [id]);

  async function handleMarcarVerificado() {
    if (!verificacao) return;
    setSalvando(true);
    try {
      const { data, error } = await supabase.rpc("marcar_verificacao_cro", {
        p_dentista_id: verificacao.dentista_id,
        p_verificado: true,
        p_observacao: observacao || null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      setVerificacao({ ...verificacao, status: "verificado" } as VerificacaoDetalhe);
      toast.success("CRO verificado com sucesso!");
    } catch (err) {
      console.error("[VerificarCroDetalhe] Erro ao salvar:", err);
      toast.error("Erro ao verificar CRO: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setSalvando(false);
    }
  }

  async function handleMarcarFalhou() {
    if (!verificacao) return;
    setSalvando(true);
    try {
      const { data, error } = await supabase.rpc("marcar_verificacao_cro", {
        p_dentista_id: verificacao.dentista_id,
        p_verificado: false,
        p_observacao: observacao || null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      setVerificacao({ ...verificacao, status: "falhou" } as VerificacaoDetalhe);
      toast.success("Verificação marcada como falha.");
    } catch (err) {
      console.error("[VerificarCroDetalhe] Erro ao salvar:", err);
      toast.error("Erro ao salvar: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setSalvando(false);
    }
  }

  async function handleReabrir() {
    if (!verificacao) return;
    await supabase.from("cro_verificacoes").update({
      status: "pendente",
      erro: null,
    }).eq("id", verificacao.id);
    setVerificacao({ ...verificacao, status: "pendente" } as VerificacaoDetalhe);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!verificacao) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <p className="text-[#6B7280]">Verificação não encontrada.</p>
      </div>
    );
  }

  const pro = verificacao.curadentespro;
  const jaVerificado = verificacao.status === "verificado";
  const numeroCRO = verificacao.cro.replace(/\D/g, "");
  const ufSigla = (verificacao.cro.includes("-") ? verificacao.cro.split("-")[1] : verificacao.cro)
    .replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
  const ufNome = UF_MAP[ufSigla] || verificacao.uf || ufSigla;

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* ─── Cabeçalho ─────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 flex-wrap">
          <button
            onClick={() => navigate("/pro/verificar-cro")}
            className="p-2 rounded-xl bg-white hover:bg-gray-50 transition-colors shrink-0"
          >
            <ArrowLeft size={20} style={{ color: "#007AFF" }} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#0A2A66] whitespace-nowrap">Verificar CRO</h1>
            <p className="text-sm text-[#6B7280] break-words">{pro?.nome}</p>
            <p className="text-sm font-mono text-[#6B7280] whitespace-nowrap">{verificacao.cro}</p>
          </div>
          {jaVerificado && (
            <span className="flex items-center gap-1 text-sm font-medium text-[#34C759]">
              <CheckCircle size={16} />
              Verificado em {new Date(verificacao.atualizado_em).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        {/* ─── Consulta no CFO (largura total, embutido) ────────────────── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2A66]">Consultar no CFO</h2>
              <p className="text-sm text-[#6B7280]">Selecione a UF, cole o nº abaixo, resolva o captcha e clique em Pesquisar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => copiar(ufNome, "uf")} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 transition-colors">
                <span className="text-[#8E8E93]">CRO/UF:</span>
                <span className="font-semibold text-[#0A2A66]">{ufNome}{ufSigla ? ` (${ufSigla})` : ""}</span>
                <Copy size={13} className="text-[#8E8E93]" />
              </button>
              <button onClick={() => copiar(numeroCRO, "num")} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 transition-colors">
                <span className="text-[#8E8E93]">Nº:</span>
                <span className="font-semibold font-mono text-[#0A2A66]">{numeroCRO || "—"}</span>
                <Copy size={13} className="text-[#8E8E93]" />
              </button>
            </div>
          </div>
          {copiado && (
            <p className="text-[12px] text-[#34C759] mb-2">
              {copiado === "uf" ? "CRO/UF copiado!" : "Nº inscrição copiado!"}
            </p>
          )}

          {/* Formulário do CFO embutido em LARGURA DE CELULAR (força o layout mobile,
              coluna única — o CFO é responsivo e empilha abaixo de ~576px). SEM sandbox. */}
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white mx-auto" style={{ maxWidth: "420px", height: "1040px" }}>
            <iframe
              src="https://busca-profissionais.cfo.org.br/"
              title="Busca de profissionais CFO"
              className="w-full h-full border-0"
            />
          </div>

          <a href="https://busca-profissionais.cfo.org.br/" target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-[#007AFF] hover:underline">
            <ExternalLink size={15} />
            Abrir em nova aba (se não carregar acima)
          </a>
        </section>

        {/* ─── Verificação (só quando ainda NÃO verificado; o cabeçalho já mostra o status) ── */}
        {!jaVerificado && (
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0A2A66] mb-4">Verificação</h2>
            <div className="space-y-3">
              <button
                onClick={handleMarcarVerificado}
                disabled={salvando}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 text-white"
                style={{
                  background: salvando ? "rgba(52,199,89,0.35)" : "#34C759",
                  cursor: salvando ? "not-allowed" : "pointer",
                }}
              >
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {salvando ? "Salvando..." : "Marcar como Verificado"}
              </button>

              <button
                onClick={handleMarcarFalhou}
                disabled={salvando}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{
                  color: "#FF3B30",
                  background: "rgba(255,59,48,0.06)",
                  border: "0.5px solid rgba(255,59,48,0.18)",
                  opacity: salvando ? 0.5 : 1,
                  cursor: salvando ? "not-allowed" : "pointer",
                }}
              >
                <ShieldAlert size={16} />
                Marcar como Não Verificado (falhou)
              </button>

              {verificacao.status === "falhou" && (
                <button
                  onClick={handleReabrir}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-[#007AFF] bg-[#007AFF]/5 hover:bg-[#007AFF]/10 transition-colors"
                >
                  <RefreshCw size={16} />
                  Reabrir verificação
                </button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
