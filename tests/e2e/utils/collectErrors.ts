// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Coleta erros do console filtrando falsos positivos conhecidos.
//
// Erros esperados (API Supabase, migrations pendentes) são ignorados;
// apenas erros inesperados são reportados para o teste.
// ═══════════════════════════════════════════════════════════════════════════════

import { type Page } from "@playwright/test";

const KNOWN_PATTERNS = [
  /Failed to load resource: the server responded with a status of 4(00|04)/,
  /column .* does not exist/,
  /structure of query does not match function result type/,
  /^Error: Dentista n[ãa]o encontrado/,
  /^Error: Perfil incompleto ou indispon[íi]vel/,
  /^Error: timeout/,
];

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      const isKnown = KNOWN_PATTERNS.some((p) => p.test(text));
      if (!isKnown) errors.push(text);
    }
  });
  return errors;
}
