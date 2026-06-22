// ═══════════════════════════════════════════════════════════════════════════════
// CRO — helpers para a verificação manual (superuser) contra o site do CFO.
// Puros e testáveis. Portados do site-k11 (VerificarCro/Detalhe).
// ═══════════════════════════════════════════════════════════════════════════════

export const UF_MAP: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

/** Só os dígitos do CRO (o "número de inscrição" usado na busca do CFO). */
export function numeroDoCro(cro: string): string {
  return (cro ?? "").replace(/\D/g, "");
}

/** UF (2 letras maiúsculas) derivada do CRO: parte após o "-" (ou o todo). */
export function ufDoCro(cro: string): string {
  const base = (cro ?? "").includes("-") ? cro.split("-")[1] ?? "" : cro ?? "";
  return base.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
}

/** Nome do estado a partir da sigla; devolve a própria sigla se desconhecida. */
export function nomeUf(sigla: string): string {
  return UF_MAP[sigla] || sigla;
}
