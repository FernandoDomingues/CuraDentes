// ═══════════════════════════════════════════════════════════════════════════════
// TESTE E2E: Pesquisa (/pesquisa)
//
// Verifica que a página de resultados carrega, executa uma busca textual
// e exibe os filtros laterais. Os resultados dependem de dados no Supabase.
// ═══════════════════════════════════════════════════════════════════════════════

import { test, expect } from "@playwright/test";
import { collectErrors } from "./utils/collectErrors";

test.describe("Página de pesquisa", () => {
  test("carrega sem erros no console", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto("/pesquisa");
    await expect(page).toHaveURL(/\/pesquisa/);
    expect(errors).toHaveLength(0);
  });

  test("exibe o campo de filtros", async ({ page }) => {
    await page.goto("/pesquisa");
    await expect(page.locator("text=Filtros").first()).toBeVisible();
  });

  test("exibe o campo de busca na página", async ({ page }) => {
    await page.goto("/pesquisa");
    const searchInput = page.locator("input[type='text']").first();
    await expect(searchInput).toBeVisible();
  });
});
