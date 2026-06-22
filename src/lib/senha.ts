// ═══════════════════════════════════════════════════════════════════════════════
// SENHA — força (indicador visual) e regra mínima de validade.
// Pura e testável. Usada na redefinição de senha e no cadastro (Fase 2).
// ═══════════════════════════════════════════════════════════════════════════════

/** Tamanho mínimo aceito (única regra que bloqueia). */
export const SENHA_MIN = 8;

export interface ForcaSenha {
  /** 0 (vazia) a 4 (forte). */
  nivel: number;
  rotulo: "Vazia" | "Fraca" | "Regular" | "Boa" | "Forte";
  /** Cor sugerida para a barra (hex). */
  cor: string;
}

const ROTULOS = ["Vazia", "Fraca", "Regular", "Boa", "Forte"] as const;
const CORES = ["#E2E5EA", "#FF3B30", "#FF9500", "#FFCC00", "#34C759"];

/** Calcula a força: +1 por tamanho>=8, maiúscula, dígito, símbolo. */
export function forcaSenha(senha: string): ForcaSenha {
  if (!senha) return { nivel: 0, rotulo: "Vazia", cor: CORES[0] };
  let n = 0;
  if (senha.length >= SENHA_MIN) n++;
  if (/[A-Z]/.test(senha)) n++;
  if (/[0-9]/.test(senha)) n++;
  if (/[^A-Za-z0-9]/.test(senha)) n++;
  return { nivel: n, rotulo: ROTULOS[n], cor: CORES[n] };
}

/** Regra mínima de validade (a única que bloqueia o envio). */
export function senhaValida(senha: string): boolean {
  return typeof senha === "string" && senha.length >= SENHA_MIN;
}
