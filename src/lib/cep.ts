// ═══════════════════════════════════════════════════════════════════════════════
// CEP — consulta o ViaCEP e devolve as partes do endereço para auto-preencher.
// Usado no formulário de endereços (cadastro e "Meu perfil"). Roda no navegador.
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnderecoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

/**
 * Busca um CEP (8 dígitos) no ViaCEP. Retorna as partes do endereço, ou null se
 * o CEP for inválido/não encontrado/erro de rede.
 */
export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const n = (cep ?? "").replace(/\D/g, "");
  if (n.length !== 8) return null;
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${n}/json/`);
    if (!resp.ok) return null;
    const d = (await resp.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (d.erro) return null;
    return {
      logradouro: d.logradouro ?? "",
      bairro: d.bairro ?? "",
      cidade: d.localidade ?? "",
      estado: d.uf ?? "",
    };
  } catch (err) {
    console.warn("[cep] falha ao consultar ViaCEP:", err);
    return null;
  }
}
