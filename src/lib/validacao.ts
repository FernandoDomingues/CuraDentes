// ═══════════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO + MÁSCARAS do cadastro/perfil do dentista.
//
// Validadores portados do site-k11 (src/utils/cadastroValidation.ts) SEM mudança
// de regra. As máscaras formatam o que o usuário digita (CPF, telefone, CEP, CRO).
// Tudo PURO e testável — reutilizado no cadastro (wizard) e no "Meu perfil".
// ═══════════════════════════════════════════════════════════════════════════════

const UFS_VALIDAS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

/** Só os dígitos de um texto. */
function digitos(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}

// ─── Validadores ──────────────────────────────────────────────────────────────

/** Celular BR: 11 dígitos e o 3º é "9". */
export function validarTelefone(valor: string): boolean {
  const n = digitos(valor);
  return n.length === 11 && n.charAt(2) === "9";
}

/** CPF: 11 dígitos, não repetidos, com dígitos verificadores (módulo 11). */
export function validarCpf(valor: string): boolean {
  const n = digitos(valor);
  if (n.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(n)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(n.charAt(i)) * (10 - i);
  let resto = soma % 11;
  const d1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(n.charAt(9)) !== d1) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(n.charAt(i)) * (11 - i);
  resto = soma % 11;
  const d2 = resto < 2 ? 0 : 11 - resto;
  return parseInt(n.charAt(10)) === d2;
}

/** CRO: formato CRO-UF + 3 a 6 dígitos, com UF válida. */
export function validarCro(valor: string): boolean {
  const m = (valor ?? "").toUpperCase().match(/^CRO-([A-Z]{2})(\d{3,6})$/);
  return !!m && UFS_VALIDAS.includes(m[1]);
}

/** Ano de formação: opcional; se preenchido, inteiro entre 1950 e o ano atual. */
export function validarAnoFormacao(valor: string): boolean {
  if (!valor) return true;
  const ano = parseInt(valor, 10);
  if (isNaN(ano)) return false;
  return ano >= 1950 && ano <= new Date().getFullYear();
}

export interface EnderecoInput {
  nome_clinica?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

/** Valida os campos obrigatórios de cada endereço; devolve a lista de erros. */
export function validarEnderecos(enderecos: EnderecoInput[]): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  enderecos.forEach((e, i) => {
    const p = `Endereço ${i + 1}`;
    if (!e.nome_clinica?.trim()) erros.push(`${p}: Nome da clínica`);
    if (!e.logradouro?.trim()) erros.push(`${p}: Logradouro`);
    if (!e.bairro?.trim()) erros.push(`${p}: Bairro`);
    if (!e.cidade?.trim()) erros.push(`${p}: Cidade`);
    if (!e.estado?.trim()) erros.push(`${p}: Estado`);
    if (!e.cep?.trim()) erros.push(`${p}: CEP`);
  });
  return { valido: erros.length === 0, erros };
}

// ─── Máscaras ───────────────────────────────────────────────────────────────

/** ###.###.###-## (preenche progressivamente conforme digita). */
export function formatarCpf(valor: string): string {
  const n = digitos(valor).slice(0, 11);
  let out = n.slice(0, 3);
  if (n.length > 3) out += "." + n.slice(3, 6);
  if (n.length > 6) out += "." + n.slice(6, 9);
  if (n.length > 9) out += "-" + n.slice(9, 11);
  return out;
}

/** (##) #####-#### */
export function formatarTelefone(valor: string): string {
  const n = digitos(valor).slice(0, 11);
  if (n.length <= 2) return n.length ? `(${n}` : "";
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7, 11)}`;
}

/** #####-### */
export function formatarCep(valor: string): string {
  const n = digitos(valor).slice(0, 8);
  return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
}

/** CRO-UF###### — separa as 2 primeiras letras (UF) e até 6 dígitos. */
export function formatarCro(valor: string): string {
  const limpo = (valor ?? "").toUpperCase().replace(/^CRO-?/, "");
  const letras = limpo.replace(/[^A-Z]/g, "").slice(0, 2);
  const nums = limpo.replace(/[^0-9]/g, "").slice(0, 6);
  if (!letras && !nums) return "";
  return `CRO-${letras}${nums}`;
}
