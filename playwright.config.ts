// ═══════════════════════════════════════════════════════════════════════════════
// PLAYWRIGHT CONFIG — Testes E2E (Chromium + Firefox + WebKit)
//
// 3 projetos paralelos cobrindo os 3 engines de navegador (~99% do mercado).
// O Vite dev server é iniciado automaticamente pelo webServer.
//
// Como rodar:
//   npm run test:e2e          # Todos os 3 engines em headless
//   npm run test:e2e:ui       # Modo interativo com UI do Playwright
//   npm run test:e2e:chromium # Apenas Chromium (mais rápido para dev)
// ═══════════════════════════════════════════════════════════════════════════════

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--no-sandbox"],
        },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
      },
    },
  ],
  webServer: {
    command: "npx vite --port 5173",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
