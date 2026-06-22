# CuraDentes — App Mobile (Android + iOS)

Wrapper nativo do site, feito com [Capacitor](https://capacitorjs.com). O app
**abre o site ao vivo** (`https://curadentes.com.br`) — então mudanças no site
aparecem no app **sem precisar republicar** nas lojas.

## Estrutura
- `capacitor.config.ts` — configuração (appId, nome, URL que o app abre).
- `android/` — projeto Android (abre no Android Studio).
- `ios/` — projeto Xcode (abre no Xcode, **só em Mac**).
- `dist/` — build do site, empacotado como *fallback* caso a URL fique fora do ar.

## Identidade
- **appId:** `br.com.curadentes.app` (package Android / bundle id iOS)
- **appName:** `CuraDentes`
- **URL aberta pelo app:** definida em `capacitor.config.ts` → `server.url`.
  Troque ali para apontar para staging em vez de produção.

## Pré-requisitos
- **Android:** [Android Studio](https://developer.android.com/studio) + JDK 17.
- **iOS:** **Mac** com Xcode — não dá para buildar iOS no Windows. A pasta `ios/`
  já está criada; o build/publicação precisa de um Mac (físico ou CI Mac na
  nuvem: Codemagic, Ionic Appflow, GitHub Actions macOS).

## Fluxo de trabalho

### Mudou só o site (telas, conteúdo)?
Nada a fazer no app — ele carrega a URL ao vivo. Basta publicar o site.

### Mudou `capacitor.config.ts`, plugins nativos, ícone ou versão?
```bash
npm run cap:sync      # vite build + copia config/assets para android e ios
npm run cap:android   # abre no Android Studio
npm run cap:ios       # abre no Xcode (em Mac)
```
A partir daí, roda/builda pelo Android Studio / Xcode (emulador, device, ou
gera o APK/AAB e o IPA para as lojas).

## Recursos nativos (push, localização) — quando for a hora
O site React chama as APIs do Capacitor; a ponte nativa é injetada **mesmo
carregando a URL remota**. Para os "lembretes automáticos" e o mapa:
```bash
npm i @capacitor/push-notifications @capacitor/geolocation
npm run cap:sync
```
e no código do site, só quando estiver rodando dentro do app:
```ts
import { Capacitor } from '@capacitor/core';
if (Capacitor.isNativePlatform()) {
  // usar PushNotifications, Geolocation, etc.
}
```

## Ícones e splash
Gerar a partir de uma imagem-fonte:
```bash
npm i -D @capacitor/assets
# coloque assets/icon.png (1024x1024) e assets/splash.png (2732x2732)
npx capacitor-assets generate
```

## ⚠️ Antes de publicar na App Store
A Apple rejeita app que é só "site dentro de um wrapper" sem função nativa
(diretriz 4.2 — minimum functionality). Garanta valor nativo — **push
(lembretes)** e **geolocalização**, que já estão no plano — antes de submeter.
O Google Play é mais tolerante, mas também prefere algo nativo.

## Publicação (resumo)
- **Android:** Android Studio → Build → Generate Signed Bundle (AAB) → enviar no
  Google Play Console.
- **iOS:** Xcode (em Mac) → Product → Archive → distribuir via App Store Connect.
