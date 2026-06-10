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
import CroVerificationBadge from "@/components/analytics/CroVerificationBadge";
import { Loader2, ArrowLeft, ExternalLink, RefreshCw, ShieldAlert, CheckCircle } from "lucide-react";

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

type DadosExtraidos = {
  nome: string;
  situacao: string;
  data_inscricao: string;
  validade: string;
  especialidades: string;
  endereco: string;
  pendencias: string;
};

const camposChecklist: { chave: keyof DadosExtraidos; rotulo: string; dica: string }[] = [
  { chave: "nome", rotulo: "Nome do Profissional", dica: "Confere com o cadastrado?" },
  { chave: "situacao", rotulo: "Situação do Registro", dica: "Deve constar como 'Ativo' ou 'Regular'." },
  { chave: "data_inscricao", rotulo: "Data de Inscrição", dica: "Data em que o CRO foi emitido." },
  { chave: "validade", rotulo: "Validade", dica: "Se houver, conferir se está vigente." },
  { chave: "especialidades", rotulo: "Especialidades Registradas", dica: "Conferem com o cadastro?" },
  { chave: "endereco", rotulo: "Endereço Profissional", dica: "Endereço cadastrado no CFO." },
  { chave: "pendencias", rotulo: "Pendências Éticas/Disciplinares", dica: "Se houver, sinalizar." },
];

export default function VerificarCroDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verificacao, setVerificacao] = useState<VerificacaoDetalhe | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosExtraidos>({
    nome: "", situacao: "", data_inscricao: "", validade: "",
    especialidades: "", endereco: "", pendencias: "",
  });
  const [observacao, setObservacao] = useState("");
  const [termoAceito, setTermoAceito] = useState(false);

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
        setVerificacao(data as unknown as VerificacaoDetalhe);
        setObservacao((data as any).observacao || "");

        const consultados = (data as any).dados_consultados as DadosExtraidos | null;
        if (consultados) {
          setDadosExtraidos(consultados);
        }
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

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* ─── Cabeçalho ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/pro/verificar-cro")}
            className="p-2 rounded-xl bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} style={{ color: "#007AFF" }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#0A2A66]">Verificar CRO</h1>
            <p className="text-sm text-[#6B7280]">{pro?.nome} — {verificacao.cro}</p>
          </div>
          {pro && <CroVerificationBadge verificado={!!pro.cro_verificado} size="md" />}
          {jaVerificado && (
            <span className="flex items-center gap-1 text-sm font-medium text-[#34C759]">
              <CheckCircle size={16} />
              Verificado em {new Date(verificacao.atualizado_em).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ─── Coluna 1: Instruções + dados dentista ──────────────────── */}
          <div className="space-y-6">
            {/* Instruções */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0A2A66] mb-2">Consultar CRO</h2>
              <ol className="text-sm text-[#6B7280] space-y-2 list-decimal list-inside mb-4">
                <li>Abra o site de busca do CFO em nova aba</li>
                <li>Selecione a UF <strong>{verificacao.uf}</strong></li>
                <li>Digite o nº de inscrição: <strong>{numeroCRO}</strong></li>
                <li>Resolva o reCAPTCHA e clique em Pesquisar</li>
                <li>Confira os dados e preencha o formulário ao lado</li>
              </ol>
              <a
                href="https://busca-profissionais.cfo.org.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 transition-colors w-fit"
              >
                <ExternalLink size={16} />
                Abrir busca do CFO
              </a>
            </section>

            {/* Dados do dentista */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0A2A66] mb-4">Dados do Dentista</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[#6B7280]">Nome</p>
                  <p className="font-medium text-[#0A2A66]">{pro?.nome}</p>
                </div>
                <div>
                  <p className="text-[#6B7280]">E-mail</p>
                  <p className="font-medium text-[#0A2A66]">{pro?.email}</p>
                </div>
                <div>
                  <p className="text-[#6B7280]">CRO</p>
                  <p className="font-mono font-medium text-[#0A2A66]">{pro?.cro}</p>
                </div>
              </div>
            </section>
          </div>

          {/* ─── Coluna 2: Formulário + Ações ──────────────────────────── */}
          <div className="space-y-6">
            {/* Formulário */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0A2A66] mb-4">
                Dados encontrados no CFO
              </h2>
              <p className="text-sm text-[#6B7280] mb-4">
                Preencha com os dados exibidos no site do CFO após a consulta.
              </p>

              <div className="space-y-4">
                {camposChecklist.map((campo) => (
                  <div key={campo.chave}>
                    <label className="block text-sm font-medium text-[#0A2A66] mb-1">
                      {campo.rotulo}
                    </label>
                    <p className="text-xs text-[#8E8E93] mb-1">{campo.dica}</p>
                    <input
                      type="text"
                      value={dadosExtraidos[campo.chave]}
                      onChange={(e) => setDadosExtraidos({ ...dadosExtraidos, [campo.chave]: e.target.value })}
                      placeholder="Digite o valor encontrado..."
                      className="w-full px-4 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20"
                      disabled={jaVerificado}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-[#0A2A66] mb-1">
                    Observação (opcional)
                  </label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Anotações sobre a verificação..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 resize-none"
                    disabled={jaVerificado}
                  />
                </div>

                {!jaVerificado && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termoAceito}
                      onChange={(e) => setTermoAceito(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-xs text-[#6B7280]">
                      Atesto que os dados acima conferem com os exibidos no site do CFO.
                      Sou responsável pela veracidade desta verificação.
                    </span>
                  </label>
                )}
              </div>
            </section>

            {/* Ações */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0A2A66] mb-4">Ações</h2>

              {jaVerificado ? (
                <div className="p-4 rounded-xl bg-[#34C759]/5 border border-[#34C759]/20">
                  <div className="flex items-center gap-2 text-[#34C759] font-medium">
                    <CheckCircle size={20} />
                    CRO já verificado
                  </div>
                  <p className="text-sm text-[#6B7280] mt-2">
                    Este CRO foi verificado e aprovado.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleMarcarVerificado}
                    disabled={salvando || !termoAceito}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 text-white"
                    style={{
                      background: termoAceito && !salvando ? "#34C759" : "rgba(52,199,89,0.35)",
                      cursor: termoAceito && !salvando ? "pointer" : "not-allowed",
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
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
