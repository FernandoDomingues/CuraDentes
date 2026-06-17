# Dentinho — biblioteca de animações (reutilizável)

Clipes de animação da mascote **Dentinho** (gerados via Kling, image-to-video, 16:9 720p, **boca estática**, fundo branco), para reaproveitar em outros reels sem gerar de novo.

| Arquivo | Gesto | Imagem-base usada |
|---|---|---|
| `dentinho-acenar.mp4` | acena "oi", piscando | `../dentinho-acenando-wide.png` |
| `dentinho-lupa.mp4` | olha curioso com a lupa | `../dentinho-lupa-wide.png` |
| `dentinho-feliz.mp4` | feliz, idle | `../dentinho-wide.png` |
| `dentinho-apontar.mp4` | aponta para o lado | `../dentinho-apontando-wide.png` |

## Como reaproveitar num reel novo
Estes são os clipes **brutos 16:9**. Para virarem cena vertical 9:16 pronta (personagem inteira, **sem marca d'água**, fundo branco puro), passe pelo pipeline padrão (ffmpeg):

```
crop=850:720:215:0,colorlevels=rimax=0.90:gimax=0.90:bimax=0.90,scale=1080:-2,
pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=white,format=yuv420p
```
- **crop largo (850)**: pega o gesto inteiro e exclui o canto com a marca do Kling.
- **colorlevels 0.90**: força o fundo cinza pra branco puro.
- **pad**: completa em 9:16 com branco (invisível no fundo branco).

Depois é só usar como `<OffthreadVideo>` numa cena (ver `src/CenaFala.tsx`) + voz (edge-tts) + legenda + logo.

## Gerar novos gestos
Gere no Kling com a imagem `../dentinho-*-wide.png` + prompt pedindo **"mouth does NOT move, camera static, no zoom, character small and centered with large white margins"** (modelos: 3.0 Omni, áudio OFF, multishot OFF). Salve o bruto aqui.
