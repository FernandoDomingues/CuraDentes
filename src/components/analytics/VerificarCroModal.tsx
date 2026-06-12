import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, CheckCircle, XCircle, Copy, Shield } from "lucide-react";

const UF_MAP: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

function parseCro(cro: string) {
  if (!cro) return { uf: "", numero: "", ufNome: "" };
  let uf = "";
  let numero = "";
  if (cro.includes("-")) {
    const parts = cro.split("-");
    const afterDash = parts[1] || "";
    uf = afterDash.replace(/\d/g, "").toUpperCase().trim();
    numero = afterDash.replace(/\D/g, "");
  } else {
    uf = cro.replace(/\d/g, "").toUpperCase();
    numero = cro.replace(/\D/g, "");
  }
  return { uf, numero, ufNome: UF_MAP[uf] || uf };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  dentistaId: string;
  nome: string;
  cro: string;
  verificacaoId: string | null;
  onSaved: () => void;
};

export default function VerificarCroModal({
  isOpen,
  onClose,
  dentistaId,
  nome,
  cro,
  onSaved,
}: Props) {
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const { uf, numero, ufNome } = parseCro(cro);

  const copiar = useCallback((texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, []);

  async function salvarResultado(status: "verificado" | "falhou") {
    setSalvando(true);
    try {
      const { data, error } = await supabase.rpc("marcar_verificacao_cro", {
        p_dentista_id: dentistaId,
        p_verificado: status === "verificado",
        p_observacao: null,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      if (status === "falhou") {
        toast.warning(
          `Perfil de ${nome} desativado. Envie um email para suporte@curadentes.com.br informando sobre a inativação.`,
          { duration: 8000 }
        );
      } else {
        toast.success("CRO verificado com sucesso!");
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("[VerificarCroModal]", err);
      toast.error("Erro ao salvar verificação: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] w-[900px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-[#0A2A66]">
                Verificar CRO
              </DialogTitle>
              <DialogDescription className="text-sm text-[#6B7280]">
                {nome} • {cro}
              </DialogDescription>
            </div>
            <a
              href="https://busca-profissionais.cfo.org.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#007AFF] text-white hover:bg-[#0056CC] transition-colors"
            >
              <ExternalLink size={12} />
              Abrir em nova aba
            </a>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar com dados do CRO */}
          <div className="w-72 shrink-0 border-r bg-gray-50 p-5 flex flex-col gap-5 overflow-y-auto">
            <div>
              <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                Dados extraídos do CRO
              </h4>

              <div className="space-y-3">
                <div className="bg-white rounded-xl p-3.5 border">
                  <p className="text-[10px] font-medium text-[#8E8E93] uppercase mb-1">CRO/UF</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#0A2A66]">{ufNome || uf || "—"}</p>
                    <button onClick={() => copiar(ufNome || uf)} className="text-[#8E8E93] hover:text-[#007AFF]">
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 border">
                  <p className="text-[10px] font-medium text-[#8E8E93] uppercase mb-1">Categoria</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#0A2A66]">Cirurgião Dentista</p>
                    <button onClick={() => copiar("Cirurgião Dentista")} className="text-[#8E8E93] hover:text-[#007AFF]">
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 border">
                  <p className="text-[10px] font-medium text-[#8E8E93] uppercase mb-1">Nº Inscrição</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#0A2A66]">{numero || "—"}</p>
                    <button onClick={() => copiar(numero)} className="text-[#8E8E93] hover:text-[#007AFF]">
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#FFF3CD] rounded-xl p-3.5 border border-yellow-300">
              <p className="text-[11px] font-medium text-[#856404] mb-1.5 flex items-center gap-1">
                <Shield size={12} />
                Instruções
              </p>
              <ol className="text-[11px] text-[#856404] space-y-1.5 list-decimal list-inside">
                <li>No site do CFO, preencha os campos ao lado</li>
                <li>Marque o <strong>reCAPTCHA</strong> ("Não sou um robô")</li>
                <li>Clique em <strong>PESQUISAR</strong></li>
                <li>Confira se os dados do dentista aparecem</li>
                <li>Volte aqui e marque o resultado</li>
              </ol>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <Button
                onClick={() => salvarResultado("verificado")}
                disabled={salvando}
                className="w-full gap-2 bg-[#34C759] hover:bg-[#2DB84E] text-white font-medium text-sm h-10"
              >
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Marcar como Verificado
              </Button>
              <Button
                onClick={() => salvarResultado("falhou")}
                disabled={salvando}
                variant="outline"
                className="w-full gap-2 text-[#FF3B30] border-[#FF3B30]/30 hover:bg-red-50 font-medium text-sm h-10"
              >
                <XCircle size={14} />
                Falhou na verificação
              </Button>
            </div>

            {copiado && (
              <p className="text-[11px] text-center text-[#34C759] font-medium">Copiado!</p>
            )}
          </div>

          {/* Iframe do CFO */}
          <div className="flex-1 bg-white">
            <iframe
              src="https://busca-profissionais.cfo.org.br/"
              className="w-full h-full border-0"
              title="Busca de profissionais CFO"
              sandbox="allow-same-origin allow-forms allow-scripts allow-popups"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
