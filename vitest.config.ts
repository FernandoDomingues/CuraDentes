// ═══════════════════════════════════════════════════════════════════════════════
// Configuração do Vitest (motor de testes) — base do nosso TDD.
//
// Por que cada coisa:
//   - plugin-react: deixa o Vitest entender JSX/TSX (componentes React) nos testes.
//   - environment "jsdom": simula um "navegador" em memória, pra testar componentes
//     que mexem com DOM (botões, inputs, etc.) sem abrir um browser de verdade.
//   - globals: true: libera `describe`, `it`, `expect` sem precisar importar em todo teste.
//   - setupFiles: roda o vitest.setup.ts antes dos testes (adiciona matchers extras).
//   - alias "@": faz `@/algo` apontar para `src/algo` (igual ao app), pros imports
//     nos testes funcionarem do mesmo jeito que no código.
// ═══════════════════════════════════════════════════════════════════════════════

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
});
