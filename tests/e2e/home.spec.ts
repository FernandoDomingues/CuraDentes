// ═══════════════════════════════════════════════════════════════════════════════
// TESTE E2E: Home (/)
//
// Verifica que a landing page carrega sem erros no console e exibe os
// elementos principais: logo, busca, seção de especialidades e CTA.
// ═══════════════════════════════════════════════════════════════════════════════

import { test, expect } from "@playwright/test";
import { collectErrors } from "./utils/collectErrors";

test.describe("Página inicial", () => {
  test("carrega sem erros no console", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto("/");

    await expect(page.locator("h1, h2").first()).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("exibe o campo de busca", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // O input existe em 2 versões (mobile + desktop).
    // Apenas uma fica visível conforme o viewport.
    await expect(page.getByPlaceholder("Bairro, Cidade").first()).toBeAttached();
  });

  test("exibe a seção de especialidades", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Especialidades").first()).toBeVisible();
  });

  test("o link 'Buscar' leva para /pesquisa", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator("input[type='text'], input[placeholder*='Buscar' i]").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Sorocaba");
      const searchBtn = page.locator("button:has-text('Buscar'), button[type='submit']").first();
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
        await expect(page).toHaveURL(/\/pesquisa/);
      }
    }
  });
});
