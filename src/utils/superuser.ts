// ═══════════════════════════════════════════════════════════════════════════════
// SUPERUSER — Identidade do administrador (SuperDom)
//
// O Supabase Auth exige email em toda conta. O admin loga digitando o "usuário"
// SuperDom, que é mapeado internamente para o email fixo abaixo.
//
// FONTE DA VERDADE no frontend. No banco, a verdade é a função public.is_superuser()
// (migration 20260612100000). Os dois precisam apontar para o MESMO email.
// ═══════════════════════════════════════════════════════════════════════════════

export const SUPERUSER_EMAIL = "superdom@curadentes.com.br";
export const SUPERUSER_USERNAME = "superdom";

/**
 * Converte o que foi digitado no login em um email válido para o Supabase Auth.
 * - "SuperDom" (qualquer caixa) → email interno do superuser
 * - qualquer outra coisa → retorna como está (trim)
 */
export function resolveLoginEmail(input: string): string {
  const trimmed = (input ?? "").trim();
  if (trimmed.toLowerCase() === SUPERUSER_USERNAME) return SUPERUSER_EMAIL;
  return trimmed;
}

/** True se o email é o do superuser (case-insensitive). */
export function isSuperuserEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === SUPERUSER_EMAIL;
}
