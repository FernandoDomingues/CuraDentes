import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCepLookup, type CepData } from "@/hooks/useCepLookup";

function formatarCep(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 8);
  return numeros.replace(/(\d{5})(\d{1,3})/, "$1-$2");
}

interface CepInputComBuscaProps {
  value: string;
  onChange: (cep: string) => void;
  onResolved: (data: CepData) => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}

export function CepInputComBusca({ value, onChange, onResolved, inputStyle, labelStyle }: CepInputComBuscaProps) {
  const { data, loading, notFound, error } = useCepLookup(value);
  const lastResolvedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const fingerprint = `${data.logradouro}|${data.bairro}|${data.cidade}|${data.estado}`;
    if (lastResolvedRef.current === fingerprint) return;
    lastResolvedRef.current = fingerprint;
    onResolved(data);
  }, [data, onResolved]);

  useEffect(() => {
    if (error) toast.error("Não foi possível consultar o CEP. Verifique sua conexão.");
  }, [error]);

  return (
    <div>
      <label style={labelStyle}>CEP (somente números)</label>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(formatarCep(e.target.value))}
          placeholder="00000-000"
          maxLength={9}
          style={{ ...inputStyle, paddingRight: loading ? "36px" : inputStyle.paddingRight ?? undefined }}
        />
        {loading && (
          <Loader2
            size={16}
            className="animate-spin"
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#8E8E93" }}
          />
        )}
      </div>
      {notFound && (
        <p className="text-[11px] mt-1" style={{ color: "#FF9500" }}>
          CEP não encontrado. Preencha o endereço manualmente.
        </p>
      )}
    </div>
  );
}
