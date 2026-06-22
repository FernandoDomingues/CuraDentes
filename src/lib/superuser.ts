// ═══════════════════════════════════════════════════════════════════════════════
// SUPERUSER — identidade do administrador (SuperDom).
//
// O Supabase Auth exige email em toda conta. O admin loga digitando o "usuário"
// SuperDom, mapeado para o email fixo abaixo. FONTE DA VERDADE no front; no banco,
// a verdade é a função public.is_superuser(). Os dois apontam para o MESMO email.
// (Portado do site-k11, sem mudança de comportamento.)
// ═══════════════════════════════════════════════════════════════════════════════

export const SUPERUSER_EMAIL = "superdom@curadentes.com.br";
export const SUPERUSER_USERNAME = "superdom";

/**
 * Converte o que foi digitado no login num email válido para o Supabase Auth.
 * "SuperDom" (qualquer caixa) → email interno do superuser; senão, retorna o trim.
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
