// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: Verificar CRO (/pro/verificar-cro)
//
// Dashboard para o superuser gerenciar verificações de CRO pendentes.
// Lista todos os dentistas com CRO pendente, com atalho para verificação.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import CroVerificationBadge from "@/components/analytics/CroVerificationBadge";
import { Loader2, ExternalLink, Search, ShieldCheck, ShieldAlert, Clock, CheckCircle, XCircle, Eye } from "lucide-react";

type VerificacaoRow = {
  id: string | null;
  dentista_id: string;
  cro: string;
  uf: string;
  status: "pendente" | "processando" | "verificado" | "falhou";
  dados_consultados: Record<string, unknown> | null;
  erro: string | null;
  observacao: string | null;
  criado_em: string;
  nome: string;
  email: string;
  cro_verificado: boolean;
  deleted_at: string | null;
};

export default function VerificarCro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verificacoes, setVerificacoes] = useState<VerificacaoRow[]>([]);
  const [filtro, setFiltro] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        // Busca todos os dentistas com CRO (inclusive inativos)
        const { data: dentistas, error: errDentistas } = await supabase
          .from("curadentespro")
          .select("id, nome, email, cro, cro_verificado, deleted_at")
          .not("cro", "is", null)
          .neq("cro", "");

        if (errDentistas) throw errDentistas;

        // Busca verificações existentes
        const { data: verificacoesData, error: errVerif } = await supabase
          .from("cro_verificacoes")
          .select("*");

        if (errVerif) throw errVerif;

        // Monta mapa de verificação por dentista_id
        type VerifDbRow = {
          id: string;
          dentista_id: string;
          uf: string | null;
          status: VerificacaoRow["status"];
          dados_consultados: Record<string, unknown> | null;
          erro: string | null;
          observacao: string | null;
          criado_em: string;
        };
        type DentistaDbRow = {
          id: string;
          nome: string;
          email: string;
          cro: string | null;
          cro_verificado: boolean | null;
          deleted_at: string | null;
          criado_em?: string;
        };
        const verifMap = new Map<string, VerifDbRow>();
        for (const v of (verificacoesData || []) as VerifDbRow[]) {
          verifMap.set(v.dentista_id, v);
        }

        // Combina: dentista + verificação (se existir)
        const rows: VerificacaoRow[] = (dentistas || []).map((pro: DentistaDbRow) => {
          const v = verifMap.get(pro.id);
          const uf = (pro.cro || "").includes("-")
            ? pro.cro.split("-")[1]?.trim()?.replace(/\d/g, "")?.trim() || ""
            : "";
          return {
            id: v?.id || null,
            dentista_id: pro.id,
            cro: pro.cro,
            uf: v?.uf || uf,
            status: v?.status || "pendente",
            dados_consultados: v?.dados_consultados || null,
            erro: v?.erro || null,
            observacao: v?.observacao || null,
            criado_em: v?.criado_em || pro.criado_em || new Date().toISOString(),
            nome: pro.nome,
            email: pro.email,
            cro_verificado: !!pro.cro_verificado,
            deleted_at: pro.deleted_at || null,
          };
        });

        rows.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
        setVerificacoes(rows);
      } catch (err) {
        console.error("[VerificarCro] Erro ao carregar:", err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const filtradas = verificacoes.filter((v) => {
    if (filtro === "pendentes" && v.status !== "pendente") return false;
    if (filtro === "verificadas" && v.status !== "verificado") return false;
    if (filtro === "falhas" && v.status !== "falhou") return false;
    if (busca) {
      const q = busca.toLowerCase();
      const nome = v.nome?.toLowerCase() || "";
      const cro = v.cro?.toLowerCase() || "";
      if (!nome.includes(q) && !cro.includes(q)) return false;
    }
    return true;
  });

  const pendentes = verificacoes.filter((v) => v.status === "pendente").length;
  const verificadas = verificacoes.filter((v) => v.status === "verificado").length;
  const inativas = verificacoes.filter((v) => v.status === "falhou").length;

  const statusIcon = (status: string) => {
    switch (status) {
      case "verificado": return <CheckCircle size={16} style={{ color: "#34C759" }} />;
      case "pendente": return <Clock size={16} style={{ color: "#FF9500" }} />;
      case "falhou": return <XCircle size={16} style={{ color: "#FF3B30" }} />;
      default: return <Loader2 size={16} className="animate-spin" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "verificado": return "Verificado";
      case "pendente": return "Pendente";
      case "falhou": return "Inativo";
      default: return "Processando";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0A2A66]">Verificação de CRO</h1>
          <a
            href="https://busca-profissionais.cfo.org.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#007AFF] hover:bg-gray-50 border border-gray-200"
          >
            <ExternalLink size={14} />
            Abrir busca do CFO
          </a>
        </div>

        {/* ─── KPIs ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldAlert size={20} style={{ color: "#FF9500" }} />
              <div>
                <p className="text-xs text-[#6B7280]">Pendentes</p>
                <p className="text-2xl font-bold text-[#0A2A66]">{pendentes}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} style={{ color: "#34C759" }} />
              <div>
                <p className="text-xs text-[#6B7280]">Verificadas</p>
                <p className="text-2xl font-bold text-[#0A2A66]">{verificadas}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <XCircle size={20} style={{ color: "#FF3B30" }} />
              <div>
                <p className="text-xs text-[#6B7280]">Inativas</p>
                <p className="text-2xl font-bold text-[#0A2A66]">{inativas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Filtros ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { key: "todas", label: "Todas" },
            { key: "pendentes", label: "Pendentes" },
            { key: "verificadas", label: "Verificadas" },
            { key: "falhas", label: "Inativas" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtro === f.key
                  ? "bg-[#007AFF] text-white"
                  : "bg-white text-[#0A2A66] hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="relative ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Buscar por nome ou CRO..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 w-64"
            />
          </div>
        </div>

        {/* ─── Lista ─────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {filtradas.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <ShieldCheck size={40} className="mx-auto text-[#34C759] mb-3" />
              <p className="text-[#6B7280]">Nenhuma verificação encontrada.</p>
            </div>
          ) : (
            filtradas.map((v) => {
              return (
                <div
                  key={v.dentista_id}
                  className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {statusIcon(v.status)}
                      <div>
                        <p className="font-semibold text-[#0A2A66]">
                          {v.nome || "Sem nome"}
                          {v.deleted_at && (
                            <span className="ml-2 text-[10px] font-medium text-[#FF3B30] bg-red-50 px-1.5 py-0.5 rounded-full">
                              Inativo
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-[#6B7280] mt-1">
                          <span className="font-mono">{v.cro}</span>
                          <CroVerificationBadge verificado={v.cro_verificado} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-[#6B7280]">
                          {new Date(v.criado_em).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {statusLabel(v.status)}
                        </p>
                      </div>
                      <button
                        onClick={() => { if (v.id) navigate(`/pro/verificar-cro/${v.id}`); }}
                        disabled={!v.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#007AFF] text-white hover:bg-[#0056CC] transition-colors disabled:opacity-50"
                      >
                        <Eye size={13} />
                        Verificar
                      </button>
                    </div>
                  </div>
                  {v.erro && v.status === "falhou" && (
                    <p className="text-xs text-[#FF3B30] mt-2">{v.erro}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
