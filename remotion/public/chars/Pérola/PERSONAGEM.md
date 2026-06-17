# 🦷💖 Pérola — Bíblia de Personagem (heroína)

Mascote-heroína do CuraDentes, **par fêmea do Dentinho**. Referência para recriar com fidelidade — ilustração, 3D ou IA. Cores **aproximadas** (guia; ajuste pela arte original).

> **Resumo em uma linha:** dente branco 3D estilo Pixar, fofa e animada, olhos grandes magenta com **cílios longos**, sorriso aberto com **aparelho ortodôntico**, **jaleco rosa/magenta** de dentista com estetoscópio, segurando um **espelho clínico**.

---

## 1. Identidade
- **Nome:** Pérola *("pérola" = dente branco / sorriso perfeito)*
- **Tipo:** mascote-dente heroína (feminina) — dentista
- **Par:** contraparte do **Dentinho** (a dupla de mascotes da marca)
- **Personalidade:** simpática, animada, acolhedora, jovem e otimista; "dentista amiga"
- **Atitude padrão:** sorrindo, em pé de frente, gesto simpático (acenar/apontar)
- **Saudação-padrão (locução):** **"Oi"** *(NÃO usar "Oiê" — decisão travada)*

## 2. Estilo & Renderização
- **Estilo:** 3D Pixar/Disney estilizado, formas arredondadas e fofas
- **Acabamento:** esmalte branco liso, fosco com leve brilho; subsurface suave
- **Iluminação:** estúdio difusa, key frontal, sombras macias
- **Fundo:** **branco liso/seamless** (#FCFCFC) — encaixa nas cenas claras dos Reels
- **Câmera:** frontal, corpo inteiro com margem

## 3. Forma & Anatomia
- **Corpo:** **dente (molar) branco** arredondado, bochechudo; **duas raízes curtas** viram perninhas
- **Braços:** brancos, curtinhos, mãos pequenas (segura o espelho clínico)
- **Postura:** ereta, alegre

## 4. Rosto & Detalhes
- **Olhos:** **grandes e expressivos**, íris **magenta/rosa**, catchlight branco; **cílios longos** (marca do feminino)
- **Sobrancelhas:** finas, expressivas
- **Boca:** **sorriso aberto e simpático** mostrando os dentes **com aparelho ortodôntico** (bráquetes visíveis) — detalhe-assinatura
- **Bochechas:** leve blush rosado

## 5. Figurino (Wardrobe)
- **Jaleco:** de dentista, **rosa/magenta** (cor de marca), aberto na frente; **bolso com ícone de dentinho**
- **Estetoscópio:** ao pescoço (tubo escuro/navy com detalhe), pendendo na frente
- **Adereço:** **espelho odontológico** (cabo + espelhinho redondo) em uma das mãos

## 6. Paleta (aproximada)
| Elemento | Cor | Hex aprox. |
|---|---|---|
| Dente (esmalte) | branco | `#F7F7F5` |
| Sombra do dente | cinza-claro | `#D9DCE0` |
| Olhos (íris) | magenta/rosa | `#C2185B` |
| Jaleco | rosa/magenta de marca | `#D6246E` |
| Jaleco (sombra) | magenta escuro | `#A11453` |
| Aparelho (bráquetes) | metal/prata | `#C9CDD2` |
| Estetoscópio | navy/escuro | `#23344F` |
| Espelho clínico | prata + cabo claro | `#BFC4CA` |
| Fundo | branco seamless | `#FCFCFC` |

## 7. 🔊 Voz (oficial — travada)
- **Voz:** `pt-BR-FranciscaNeural`
- **Ajustes:** `--rate +10%` · `--pitch +18Hz` *(timbre jovem/animado, clima "teen")*
- **Saudação:** começa com **"Oi"** (nunca "Oiê")
- **Comando edge-tts:**
  ```
  python -m edge_tts --voice pt-BR-FranciscaNeural --rate "+10%" --pitch "+18Hz" --text "..." --write-media saida.mp3
  ```
- **Áudio de referência:** `perola-voz-referencia.mp3` (nesta pasta)
- **Par:** Dentinho usa `pt-BR-AntonioNeural` (voz dos reels) — manter o contraste do casal.

## 8. Regras de consistência
**✅ FAÇA:** manter dente branco + olhos magenta com **cílios** + **aparelho** no sorriso + jaleco rosa/magenta + estetoscópio + espelho clínico · 3D Pixar fofo · fundo branco · corpo inteiro centralizado.
**❌ NÃO FAÇA:** não tirar os cílios/aparelho (assinatura feminina) · não mudar a cor do jaleco · não deixar realista/anime 2D · sem cenário/texto/marca d'água · em locução com voz por cima, manter **boca estática** (evita sincronia labial).

## 9. Prompt-base (IA de imagem)
```
Cute 3D Pixar/Disney-style white tooth mascot, FEMALE, friendly and cheerful, large expressive eyes with magenta/pink irises and LONG eyelashes, open happy smile showing teeth WITH dental braces, two short root-legs, little white arms. Wearing a pink/magenta dentist coat with a tiny tooth logo on the pocket and a stethoscope around the neck, holding a dental mirror. Soft studio lighting, smooth matte 3D render, plain solid white background, full body, centered with margin, vertical, high quality.
```
**Poses disponíveis:** `perola.png` (base), `perola-acenando`, `perola-apontando`, `perola-aprovando`, `perola-lupa` (+ versões `-wide` para o pipeline Kling). Anexe a base e peça "same character, mouth as in image, now…".

## 10. Observações de produção
- Versões **`-wide`** (personagem pequena e centralizada com muita margem branca) servem pro pipeline Kling → corte só nas laterais → letterbox 9:16 (igual Dentinho).
- **Nota técnica:** a pasta ainda se chama `Pérola` (com acento); os arquivos são ASCII (`perola-*`). Ao plugar no Remotion via `staticFile`, se o acento da pasta der ruído, renomear a pasta para `Perola`.
