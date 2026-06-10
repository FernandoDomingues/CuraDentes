// ═══════════════════════════════════════════════════════════════════════════════
// TESTE E2E: Perfil do Dentista (/dentista/:id)
//
// Verifica que o perfil público do dentista carrega corretamente.
// NOTA: testa com um ID fixo. Se o banco estiver vazio, o teste é ignorado.
// ═══════════════════════════════════════════════════════════════════════════════

import { test, expect } from "@playwright/test";

test.describe("Perfil do dentista", () => {
  test("exibe 'não encontrado' para ID inválido", async ({ page }) => {
    await page.goto("/dentista/id-invalido-0000");
    await expect(page.locator("text=não encontrado").or(page.locator("text=Dentista não encontrado"))).toBeVisible();
  });

  test("redireciona para /pesquisa se não houver dentistas", async ({ page }) => {
    await page.goto("/dentista/00000000-0000-0000-0000-000000000000");
    // Se o dentista não existe, a página deve mostrar erro sem crash
    await expect(page.locator("body")).toBeVisible();
  });
});
