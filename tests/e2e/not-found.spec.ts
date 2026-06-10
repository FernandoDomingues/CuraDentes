// ═══════════════════════════════════════════════════════════════════════════════
// TESTE E2E: 404 (/*)
//
// Verifica que rotas inexistentes exibem a página 404 com links de navegação.
// ═══════════════════════════════════════════════════════════════════════════════

import { test, expect } from "@playwright/test";

test.describe("Página 404", () => {
  test("mostra página de erro para rota inexistente", async ({ page }) => {
    await page.goto("/rota-inexistente-xyz123");
    await expect(page.locator("text=404").or(page.locator("text=não encontrada").or(page.locator("text=NotFound"))).first()).toBeVisible();
  });

  test("exibe link para voltar à home", async ({ page }) => {
    await page.goto("/rota-inexistente-xyz123");

    const homeLink = page.locator("a[href='/'], a:has-text('Início'), a:has-text('Home')").first();
    await expect(homeLink).toBeVisible();

    await homeLink.click();
    await expect(page).toHaveURL("/");
  });
});
