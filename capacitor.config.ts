import type { CapacitorConfig } from '@capacitor/cli';

// ═══════════════════════════════════════════════════════════════════════════════
// Capacitor — wrapper nativo (Android + iOS) do CuraDentes
//
// Estratégia: o app abre o SITE AO VIVO (server.url). Assim, mudanças no site
// aparecem no app sem precisar republicar nas lojas. O conteúdo de `webDir`
// (dist) é só um fallback empacotado caso a URL fique indisponível.
//
// Para usar recursos nativos (push, geolocalização, câmera), o próprio site
// React chama as APIs @capacitor/* — a ponte nativa é injetada mesmo carregando
// uma URL remota. Ver MOBILE.md na raiz do projeto.
// ═══════════════════════════════════════════════════════════════════════════════

const config: CapacitorConfig = {
  appId: 'br.com.curadentes.app',
  appName: 'CuraDentes',
  webDir: 'dist',
  server: {
    // App aponta para o site publicado. Trocar aqui para apontar para staging.
    url: 'https://curadentes.com.br',
    cleartext: false,
  },
};

export default config;
