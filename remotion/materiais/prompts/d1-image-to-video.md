# Dentinho "viva" — prompts image-to-video (Reel D1) · versão 16:9 + corte

Estratégia para fugir da marca d'água do Kling grátis **sem pagar**:
gerar em **16:9 (paisagem)** com a Dentinho **centralizada e pequena** → depois eu **recorto o centro em 9:16**, jogando fora os cantos (onde o logo do Kling costuma aparecer).

## Use as imagens JÁ PREPARADAS (16:9, personagem centralizado)
Em `remotion/public/chars/`:
- `dentinho-acenando-wide.png` · `dentinho-lupa-wide.png` · `dentinho-wide.png` · `dentinho-apontando-wide.png`
(Já vêm 1920×1080 com muita margem branca dos lados — é o que faz o corte funcionar.)

## Configuração no Kling (para todos)
- Modo: **Image to Video** → suba a imagem `*-wide.png` da cena.
- Proporção/Aspect: **16:9** (paisagem). Modo **Standard** (free). Duração: **5s**.
- "Motion/creativity": **média-baixa** (preserva o personagem).
- Câmera **parada** (sem zoom/pan) — senão o personagem sai da coluna central e o corte estraga.

## Salvar em: `remotion/public/chars/video/` (com estes nomes)

| Cena | Subir | Prompt de movimento | Salvar como |
|---|---|---|---|
| 0 — abertura | `dentinho-acenando-wide.png` | *16:9 landscape. A cute 3D tooth mascot stays centered with wide empty white margins on both sides. It smiles warmly and waves its hand in a friendly greeting, mouth relaxed (not talking), blinks naturally, gentle idle bounce. Camera completely static, no zoom, no pan. Plain solid white background, no text.* | `scene-0.mp4` |
| 1 — busca | `dentinho-lupa-wide.png` | *16:9 landscape. A cute 3D tooth mascot stays centered with wide white margins. It looks around curiously holding a magnifying glass, moves the magnifier and shifts its eyes as if searching, blinks. Camera completely static, no zoom, no pan. Plain solid white background, no text.* | `scene-1.mp4` |
| 2 — grátis | `dentinho-wide.png` | *16:9 landscape. A cute 3D tooth mascot stays centered with wide white margins. It smiles happily and gives a cheerful little nod holding a dental mirror, blinks, gentle idle bounce. Camera completely static, no zoom, no pan. Plain solid white background, no text.* | `scene-2.mp4` |
| 3 — CTA | `dentinho-apontando-wide.png` | *16:9 landscape. A cute 3D tooth mascot stays centered with wide white margins. It points to the side enthusiastically and nods inviting, big smile, blinks. Camera completely static, no zoom, no pan. Plain solid white background, no text.* | `scene-3.mp4` |

## 🔊 Como a Dentinho "fala em português"
O image-to-video gera **só movimento, sem som** — então os prompts descrevem **gestos**, não fala (por isso troquei "saying hi" por "friendly greeting, mouth relaxed"). O português vem de:
- **Locução PT-BR (edge-tts)** que já temos em `remotion/public/voiceover/d1/scene-N.mp3` — entra na montagem; **ou**
- **Lip-sync PT-BR**: gere o clipe de **boca neutra/relaxada** e depois passe no **Kling → AI Human → Lip Sync** (ou **Hedra**) com esse mesmo mp3 → a boca mexe falando português.
> Por isso o prompt pede **"mouth relaxed (not talking)"**: facilita o lip-sync depois (o Kling sincroniza melhor quando a boca ainda não está mexendo).

## O que EU faço depois (automático no pipeline)
- **Recorto o centro em 9:16** (coluna central ~608px de 1920) → o canto com a marca cai fora.
- Encaixo o clipe na cena, sincronizo com a voz (edge-tts) e adiciono as **legendas grandes** + marca.
- Exporto **versionado**: `conteudo/reel_D1_dentistas_v3.mp4` (mantendo o v2).

## Avisos
- ⚠️ **Confira cada clipe:** se o Kling colocar a marca **centralizada embaixo** (às vezes acontece), o corte central NÃO remove → regere esse clipe.
- ⚠️ Se o personagem **sair do centro** (a IA mexeu demais a câmera), regere com "camera completely static".
- A coluna central é estreita, então a Dentinho aparece **grande e cheia** no 9:16 final — é o esperado.

## Opcional: fazer ela FALAR (lip-sync)
- **Kling → AI Human → New Video**: suba o clipe + em **Lip Sync** mande o mp3 da fala (`remotion/public/voiceover/d1/scene-N.mp3`). Gere de **boca neutra** no passo anterior.
- Salve como `scene-N-talk.mp4` e me avise (uso o áudio do próprio clipe, sem dobrar a voz).
