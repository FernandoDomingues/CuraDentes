# Recomeço — Dentinho com BOCA FECHADA (sem lip-sync)

Estratégia: personagem com a **boca sempre fechada** (sorriso de lábios juntos), só gesticulando.
Assim a voz PT-BR + legendas entram por cima **sem problema de sincronia labial**.

## ETAPA 1 — Gerar as 4 imagens (Gemini / Bing Image Creator)

**Imagem base (gere primeiro):**
```
Cute 3D tooth mascot character, glossy white tooth wearing a small open dentist lab coat and a stethoscope, big friendly blue eyes, GENTLE CLOSED-MOUTH SMILE (lips together, NOT showing teeth, NOT talking), Pixar-style 3D render, soft studio lighting, plain solid white background, full body, high quality.
```

**Depois, as 4 poses** (no Gemini, anexe a imagem base e peça "same character, mouth closed, now…"). Todas com **boca fechada**:

| Pose | Acrescente ao prompt | Salvar como (sobrescrever) |
|---|---|---|
| Acenar | *…waving one hand in a friendly hello, closed-mouth smile* | `dentinho-acenando.png` |
| Lupa | *…holding a magnifying glass, curious look, mouth closed* | `dentinho-lupa.png` |
| Feliz | *…happy and friendly, hands relaxed, closed-mouth smile* | `dentinho.png` |
| Apontar | *…pointing to the side with one hand, closed-mouth smile* | `dentinho-apontando.png` |

> **Regra de ouro:** em TODAS, inclua **"closed-mouth smile, lips together, not talking, not showing teeth"**.
> Salvar em: `remotion/public/chars/` (mesmos nomes de antes — vamos substituir).

## ETAPA 2 — Gerar os clipes no Kling (depois que eu preparar as imagens)
Image to Video · 16:9 · 5s · áudio OFF · multishot OFF. Prompt por cena pedindo **boca fechada**:
- Acenar: *…waves its hand, MOUTH CLOSED, not talking, blinks, gentle idle. Camera static, single shot, white background.*
- Lupa: *…looks around curiously with a magnifying glass, MOUTH CLOSED, blinks…*
- Feliz: *…smiles gently with closed mouth, small nod…*
- Apontar: *…points to the side, MOUTH CLOSED, blinks…*

## ETAPA 3 — Comigo
Re-padronizo as imagens em 16:9, corto largo (personagem inteira, sem marca), monto com **voz PT-BR + legendas** (sem lip-sync) e exporto versionado.
