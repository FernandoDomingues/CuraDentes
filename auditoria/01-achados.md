# Relatório de Achados — Auditoria CuraDentes (site-R0)

> Resultado do pente-fino sobre a [checklist de 260 itens](00-CHECKLIST.md). Stack: Next.js 16 (App Router) · React 19 · Supabase · Leaflet · Tailwind 4 · Vitest.
>
> **Método:** verificações automáticas (lint/type-check/testes/`npm audit`) + 6 auditorias de leitura especializadas (segurança, SEO/GEO/AEO, performance, arquitetura/TS, a11y/responsividade/cross-browser, formulários/busca/analytics/legal). Achados de maior gravidade verificados manualmente por leitura direta do código (citados com 🔎).
>
> Data do relatório: 2026-06-25

---

## 0. Status (atualizado em 2026-06-26)

> **▶ Atualização 2026-06-28 — AUDITORIA PAUSADA a pedido do usuário.** Re-verificada contra o código vivo (workflow de 6 agentes) + lint/testes rodados. **~55/62 efetivamente resolvidos · 0 crítico em aberto.**
> - **C1** (sessão httpOnly): **CONCLUÍDO e em produção** — refactor completo (tudo no servidor) + QA de 9 fluxos no navegador + smoke test.
> - **Também concluídos desde 26/06:** **A1** os headers de segurança EXISTEM (HSTS, nosniff, X-Frame, Referrer-Policy, Permissions-Policy + CSP) — a CSP está em **Report-Only**, falta só virar *enforce*; **M23** banner de consentimento de cookies; **A2** lint com **0 erros**; testes 114 → **148**; além de M24, M10, M28, M3, M6, B14, M11.
> - **Lote 1 de polimento** (merge `a3ee57e`, em prod 2026-06-28): **A13** (foco/Esc/focus-trap no modal de avaliações), **B10** (onError de avatar quebrado nos cards — helper `src/lib/avatar.ts`), **M5** (bots de IA explícitos no robots.txt).
> - **Falta, nenhum crítico:** *dependem de você* → **A1** ligar a CSP em enforce (decisão + QA do mapa/iframe-CFO/upload), **A5** OG 1200×630 (arte), **B16** endereço/foro (dado). *Adiado por custo* → **M1/M2** imagens via next/image. *Polimento opcional (lote 2)* → M22 (ARIA combobox), B5 (geo JSON-LD), B6 (breadcrumb), B7/B8 (tipos), B15 (timezone analytics), B1/B2 (senha/reset), M7 (sitemap lastmod), A11 (next/font).
> - **Para retomar:** rodar o "lote 2" (opcionais, mesma disciplina branch→Preview→QA→prod) ou encaminhar os itens que dependem de você.
>
> _O detalhamento por ID abaixo é do levantamento original (25–26/06) e fica como referência histórica; alguns status individuais nas seções seguintes podem estar defasados — vale o resumo acima._

A maior parte já foi **corrigida e publicada** em lotes pequenos e verificados (build + testes + lint a cada lote). Mapa de status conferido contra o código atual:

- ✅ **Corrigidos e no ar (~49):** C2, C3, C4, A2, A3, A4, A6, A7, A8, A9, A10, A12, A14, M3, M4, M5, M6, M8, M9, M10, M11, M12, M13, M14, M15, M16, M17, M18, M19, M20, M21, M23, M24, M25, M27, M28, B4, B9, B10, B12, B13, B14, B18, B19. (Inclui também: busca por nome do dentista + autocomplete, e o editor de fotos migrado para `react-easy-crop`.)
- 🟡 **Parciais (parte segura feita; resto é opcional/precisa de hook):** **A11** (5 `.woff` mortos removidos **+ preload da CuraDentes-Bold**; a migração para `next/font` ficou opcional — o ganho restante é pequeno), **A13** (semântica `role="dialog"` feita; falta focus-trap + Esc).
- 🟡 **Abertos (sobraram os com ressalva):** M7 (sitemap lastmod — depende da coluna `updated_at` existir), M11 (estrelas do perfil — muda estilo, visual), M22 (ARIA combobox — médio risco), M26 (máscara de telefone — muda comportamento de form), B1/B2 (auth/senha — mudam comportamento), B5 (JSON-LD geo — precisa expor lat/lng), B6 (breadcrumb — risco de 404 p/ especialidade não-canônica), B7/B8 (tipagem — fiddly), B11 (em AppMobile — arquivo do usuário), B15 (timezone analytics — muda valores, não verificável daqui), B3 (config — provável no-op no Next 16).
- 🙋 **Dependem de você (decisão ou dado):** **A1** (ligar a CSP em *enforce* — exige QA no Preview de mapa/iframe-CFO/upload), **A5** (imagem OG 1200×630), **M1/M2** (otimização de imagens — *deferida por custo Vercel até começar o lucro*), **B16** (endereço da empresa + foro jurídico), **C1** (sessão HttpOnly — mudança de arquitetura, recomendo discutir).

> Modo atual: aplicando as correções 🟡 em lotes verificados. Os itens 🙋 aguardam você.

---

## 1. Sumário executivo

| Severidade | Qtde | Veredito |
|---|---:|---|
| 🔴 Crítico | 1 | Token de sessão (JWT) exposto a JavaScript — corrigir antes de produção |
| 🟠 Alto | 14 | Lint quebrado, sem headers de segurança, CTAs 404, /pro indexável, fonte pesada, sem error boundaries, código morto |
| 🟡 Médio | 28 | Imagens não otimizadas, a11y de modais/teclado, duplicações, LGPD/política divergente |
| 🔵 Baixo | 19 | Polimento, contraste, casts, timezone, placeholders legais |
| **Total** | **62** | |

**Estado das verificações automáticas:**

| Check | Resultado |
|---|---|
| `npm run test` (Vitest) | ✅ **114 testes / 14 arquivos — todos passam** |
| `tsc --noEmit` (type-check) | ✅ **limpo, sem erros** |
| `npm run lint` (ESLint) | ❌ **52 problemas: 21 erros + 31 warnings** |
| `npm audit` | ⚠️ **2 moderadas** (postcss, transitiva do próprio Next) |
| `npm run build` | ⏳ não executado nesta rodada (requer env de produção) |

**Leitura geral:** a base é sólida — boa separação server/client, RLS/superuser validados no servidor, JSON-LD escapado, libs pesadas (Leaflet/recharts/react-image-crop) bem isoladas fora do bundle da home, validações com testes. Os problemas concentram-se em: (1) **uma decisão de arquitetura de sessão insegura**, (2) **lint não-limpo travando o item "build limpo"**, (3) **otimização de imagens/fonte**, (4) **acessibilidade de teclado/modais**, e (5) **higiene de código morto e LGPD documental**.

---

## 2. 🔴 CRÍTICO

### C1 — Cookies de sessão gravados com `httpOnly: false`: o JWT de acesso fica legível por qualquer JavaScript 🔎
- **Itens:** 56, 58 (segurança de cookies/XSS)
- **Local:** [auth/callback/route.ts:107-119](src/app/auth/callback/route.ts#L107-L119) · [auth/login-dentista/route.ts:59](src/app/auth/login-dentista/route.ts#L59) · consumido em [sessao-cookie.ts:26-65](src/lib/sessao-cookie.ts#L26-L65)
- **Evidência:** `res.cookies.set(name, value, { ...options, httpOnly: false, sameSite: "lax", secure: true, path: "/" })`. O cliente lê o token cru: `document.cookie` → `JSON.parse(val)` → `sess.access_token`.
- **Impacto:** O `access_token` (JWT do Supabase) fica acessível via `document.cookie`. **Qualquer** falha de XSS (dependência comprometida, conteúdo injetado, etc.) consegue exfiltrar o token e sequestrar a conta — inclusive a do superuser. É a principal defesa contra roubo de sessão, desligada de propósito. Agravado por **C/A** (ausência de CSP, item A1).
- **Causa-raiz (importante):** o comentário diz que "o @supabase/ssr precisa que o cliente leia os cookies", mas o motivo real (documentado em `sessao-cookie.ts:4-8`) é um **deadlock do supabase-js** em `getSession()/getUser()` no navegador. A leitura via cookie é um *workaround*, não uma exigência do SSR.
- **Correção proposta (não trivial — exige decisão de arquitetura):** restaurar `HttpOnly: true` (default) e trocar a forma como o estado de login chega ao cliente. Opções: (a) um Server Component pai obtém o usuário (`getUsuario()`) e passa por props/contexto para o header/ilhas; ou (b) um route handler leve (`/api/me`) que devolve `{ nome, foto }` (sem token) lido server-side. O `proxy.ts` já renova a sessão server-side, então o fluxo HttpOnly é viável. **Não aplicar como fix mecânico** — precisa de teste do fluxo de login/logout completo.

---

### C2 — Verificação de CRO (detalhe) dá 404 para o superuser 🔎 (descoberto pós-auditoria, 2026-06-25)
- **Tipo:** bug funcional (feature 100% quebrada) decorrente da proteção de PII.
- **Local:** [verificar-cro/[id]/page.tsx:19](../src/app/pro/verificar-cro/[id]/page.tsx#L19)
- **Evidência:** o `select` do join incluía a coluna `email` de `curadentespro`, **revogada via REST** (confirmado contra o Supabase de produção: `42501 permission denied`). A query do superuser falha → `if (error) notFound()` → **404**. A fila (`verificar-cro/page.tsx`) e o `auth.ts` já evitam a coluna (usam RPC/sessão); só o detalhe ficou para trás.
- **Impacto:** clicar em "Verificar" (página com o iframe do CFO) **sempre** dava 404 — a verificação manual de CRO ficou inacessível.
- **Correção (aplicada):** remover `email` do `select` e buscá-lo pela RPC `emails_dentistas_cro` (gated `is_superuser`), como a fila. Corrigido e publicado em 2026-06-25.

---

### C3 — Cadastro de dentista 100% quebrado: INSERT em `curadentespro` com a coluna protegida `email` (403) 🔎 (pós-auditoria, 2026-06-26)
- **Tipo:** bug crítico — nenhum dentista NOVO conseguia se cadastrar (travava no passo 1).
- **Local:** [cadastro/page.tsx (avancar1)](../src/app/cadastro/page.tsx#L293)
- **Evidência:** o `upsert` do passo 1 incluía a coluna `email` de `curadentespro`, **revogada via REST** (mesma proteção do C2). INSERT → **403 Forbidden** (confirmado em produção, com sessão autenticada válida). Decorrente da mesma proteção de PII que causou o C2.
- **Impacto:** cadastro de novos profissionais **totalmente bloqueado** — provavelmente desde que a proteção do e-mail foi adicionada, sem ninguém notar.
- **Correção (aplicada):** o cliente não grava mais `email` (vive em `auth.users`, lido por `getUsuario`); recomendado um **trigger `SECURITY DEFINER`** no banco para preencher a coluna a partir de `auth.users` no INSERT. Corrigido e publicado em 2026-06-26.

### C4 — Cadastro: editor de fotos não retornava ao cadastro 🔎 (pós-auditoria, 2026-06-26)
- **Tipo:** bug de fluxo (só alcançável após o C3 destravar o passo 1).
- **Local:** [EditorFotos.tsx (salvar)](../src/app/pro/editor-de-fotos/EditorFotos.tsx#L152)
- **Evidência:** ao salvar a foto, fazia `router.push("/pro/dashboard")` fixo — jogava o dentista para o painel ("cadastro incompleto") em vez de voltar ao cadastro.
- **Correção (aplicada):** quando aberto pelo cadastro, o editor volta para `/cadastro`; a retomada posiciona na etapa correta. Corrigido e publicado em 2026-06-26.

---

## 3. 🟠 ALTO

### A1 — Ausência total de cabeçalhos de segurança HTTP
- **Item:** 57
- **Local:** [next.config.ts](next.config.ts) — não há `async headers()`.
- **Impacto:** Sem **CSP** (qualquer XSS tem impacto máximo — sinérgico com C1), sem `X-Frame-Options`/`frame-ancestors` (clickjacking), sem `X-Content-Type-Options: nosniff`, sem **HSTS**, sem `Referrer-Policy`/`Permissions-Policy`.
- **Correção:** adicionar `async headers()` com HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` (ou CSP `frame-ancestors 'self'`), `Permissions-Policy` e uma CSP. ⚠️ A CSP precisa liberar o iframe do CFO em `/pro/verificar-cro` e o Storage do Supabase.

### A2 — `npm run lint` não passa: 21 erros (bloqueia "build limpo") 🔎
- **Itens:** 1, 2
- **Detalhe dos erros:**
  - `react-hooks/set-state-in-effect` (React 19, regra nova): [BuscaCliente.tsx:131,165](src/app/busca/BuscaCliente.tsx#L131) · [UrgenciaCliente.tsx:118](src/app/urgencia/UrgenciaCliente.tsx#L118) · [Hero.tsx:83](src/components/home/Hero.tsx#L83) · [sugestoes.ts:213,227](src/lib/sugestoes.ts#L213)
  - `react/no-unescaped-entities`: [privacidade/page.tsx:82,89,264,280](src/app/privacidade/page.tsx#L82) (12 erros) · [sobre/page.tsx:99,100](src/app/sobre/page.tsx#L99)
  - `@next/next/no-html-link-for-pages`: [UrgenciaCliente.tsx:153](src/app/urgencia/UrgenciaCliente.tsx#L153) (`<a href="/">` em vez de `<Link>`)
- **Warnings (31):** 28× `<img>` cru (`no-img-element`), vars não usadas (`isSuperuserEmail` em EntrarForm, `Zap` em dashboard), `eslint-disable` inútil em Especialidades.
- **Impacto:** projeto não passa no gate de lint; os `set-state-in-effect` indicam efeitos que podem causar renders em cascata.
- **Correção:** corrigir os 21 erros (escapar aspas, trocar `<a>` por `<Link>`, refatorar os `setState` em efeito para `useMemo`/derivação ou guards) e limpar warnings.

### A3 — CTAs da página `/sobre` apontam para rotas inexistentes (404 duplo) 🔎
- **Itens:** 113, 116
- **Local:** [sobre/page.tsx:200](src/app/sobre/page.tsx#L200) `href="/pesquisa"` (rota real: `/busca`) · [sobre/page.tsx:210](src/app/sobre/page.tsx#L210) `href="/pro/novo-cadastro"` (rota real: `/cadastro`).
- **Impacto:** os **dois** botões principais da institucional ("Buscar dentista" e cadastro) levam a 404 — perda direta de conversão e sinal ruim de qualidade/links quebrados para crawlers.
- **Correção:** `/pesquisa` → `/busca`; `/pro/novo-cadastro` → `/cadastro` (confirmar a rota de cadastro pretendida).

### A4 — Área autenticada `/pro/*` sem `noindex` (só bloqueada no robots)
- **Item:** 104
- **Local:** [pro/layout.tsx](src/app/pro/layout.tsx) — sem `export const metadata` com `robots`. `entrar`/`cadastro`/`redefinir-senha` têm `index:false`; `/pro/*` não.
- **Impacto:** `Disallow` no robots impede *crawl*, não *indexação* de URLs descobertas por links externos — páginas privadas do dentista podem aparecer "nuas" no índice.
- **Correção:** `export const metadata: Metadata = { robots: { index: false, follow: false } }` em `pro/layout.tsx` (herda às subrotas).

### A5 — Imagem OG/Twitter é 500×500 com card `summary_large_image`
- **Item:** 109
- **Local:** `public/og-image.png` (500×500) usada em [layout.tsx:37,43](src/app/layout.tsx#L37).
- **Impacto:** previews sociais (WhatsApp/Facebook/LinkedIn/Twitter) esperam ~1200×630; a imagem quadrada é cortada → preview ruim, menor CTR. Faltam `width`/`height`/`alt` no objeto OG.
- **Correção:** gerar `og-image.png` 1200×630 e declarar `images: [{ url, width:1200, height:630, alt }]`.

### A6 — `/busca` dispara prompt de geolocalização automaticamente (sem gesto do usuário) 🔎
- **Itens:** 189, 234 (UX + LGPD)
- **Local:** [BuscaCliente.tsx:176-186](src/app/busca/BuscaCliente.tsx#L176-L186) — `navigator.geolocation.getCurrentPosition(...)` dentro de `useEffect` no load.
- **Impacto:** contradiz o padrão "só no clique" usado em `/urgencia` (comentado lá como LGPD) e no próprio botão "Usar minha localização". Prompt não solicitado prejudica UX e consentimento ativo.
- **Correção:** pedir localização só ao clicar; sem origem, manter o comportamento já existente (não mostrar distância).

### A7 — Módulo `src/lib/busca.ts` inteiro é código morto
- **Item:** 18
- **Local:** [lib/busca.ts](src/lib/busca.ts) (todo o arquivo) — nenhum import fora dele próprio. A `/busca` reimplementa a busca inline em `BuscaCliente.tsx`.
- **Impacto:** ~160 linhas (com `SELECT_JOIN`, `enriquecerAvaliacoes`) versionadas sem uso, dando falsa impressão de ser a fonte da busca.
- **Correção:** remover o módulo **ou** fazer `BuscaCliente` consumi-lo (eliminando a busca inline duplicada). Escolher uma fonte única.

### A8 — Componente `CardDentista` inteiro é código morto
- **Itens:** 18, 27
- **Local:** [components/CardDentista.tsx](src/components/CardDentista.tsx) — sem nenhum import. Busca, urgência e topo de especialidade renderizam cards à mão, com markup divergente.
- **Impacto:** componente pronto (com `Estrelas`, avatar, badges) ignorado; ≥3 variações visuais de "card de dentista" coexistem.
- **Correção:** adotar `CardDentista` nesses pontos (unifica UI) ou remover.

### A9 — Regra de exibição de nome (`nomeExibicao`) reimplementada inline em 4 lugares
- **Item:** 23
- **Local:** existe em [dentistas.ts:155-159](src/lib/dentistas.ts#L155-L159); copiada em [UrgenciaCliente.tsx:160](src/app/urgencia/UrgenciaCliente.tsx#L160), [PerfilDentistaView.tsx:981](src/app/dentista/[id]/PerfilDentistaView.tsx#L981), [TopDentistas.tsx:107](src/app/especialidade/[slug]/TopDentistas.tsx#L107), [BuscaCliente.tsx:607](src/app/busca/BuscaCliente.tsx#L607).
- **Impacto:** 4 cópias da mesma regra (`trat && !nome.startsWith(trat) ? ...`); ajustes divergem.
- **Correção:** importar e usar `nomeExibicao(...)` nos 4 pontos.

### A10 — URL do avatar padrão hardcoded em 5 arquivos
- **Item:** 25
- **Local:** [CardDentista.tsx:9](src/components/CardDentista.tsx#L9), [UrgenciaCliente.tsx:25](src/app/urgencia/UrgenciaCliente.tsx#L25), [TopDentistas.tsx:32](src/app/especialidade/[slug]/TopDentistas.tsx#L32), [dentista/[id]/page.tsx:25](src/app/dentista/[id]/page.tsx#L25), [pro/dashboard/page.tsx:24](src/app/pro/dashboard/page.tsx#L24) — mesma string do Storage, com nomes de constante diferentes (`AVATAR_PADRAO`/`AVATAR_FALLBACK`).
- **Correção:** centralizar em `lib/site.ts` e importar.

### A11 — Fonte CuraDentes: 5 pesos via `@font-face` cru, sem preload nem subsetting (~639 KB woff2 + `.woff` mortos)
- **Item:** 80
- **Local:** [globals.css:16-20](src/app/globals.css#L16-L20); `public/fonts/curadentes/` (5 woff2 de ~126-130 KB + 5 `.woff` ~190 KB não referenciados).
- **Impacto:** sem `<link rel=preload>`, a fonte da marca acima da dobra entra tarde (flash); `.woff` irmãos são ~960 KB de peso morto no deploy; não passam por `next/font` (perde subsetting/preload/cache imutável).
- **Correção:** migrar para `next/font/local` com `display:"swap"`, só os pesos usados (provável 600/700), subset `latin`; remover os `.woff` não usados.

### A12 — Sem `viewport`/`generateViewport` e sem `theme-color`
- **Item:** 173 (e base p/ safe-area)
- **Local:** [layout.tsx:21-45](src/app/layout.tsx#L21) — só `metadata`.
- **Impacto:** barra do navegador mobile sem identidade; sem `viewportFit:"cover"` o `env(safe-area-*)` (M20) nem funciona.
- **Correção:** `export const viewport: Viewport = { width:"device-width", initialScale:1, viewportFit:"cover", themeColor:"#0a2a66" }`.

### A13 — Modais (login paciente/dentista, avaliações) sem focus-trap, Escape ou `role="dialog"`
- **Itens:** 152, 154
- **Local:** [SessaoProvider.tsx:246-311](src/components/SessaoProvider.tsx#L246-L311) · [PerfilDentistaView.tsx:1350-1385](src/app/dentista/[id]/PerfilDentistaView.tsx#L1350-L1385).
- **Impacto:** usuário de teclado/leitor "preso" no fundo (Tab vaza), sem fechar por Esc, sem anúncio de diálogo. Falha WCAG 2.1.2 / 4.1.2.
- **Correção:** `role="dialog" aria-modal aria-labelledby`, foco inicial no modal, retorno de foco ao fechar, fechar no Esc, ciclar Tab.

### A14 — Nenhum `error.tsx` em toda a árvore de rotas (sem error boundaries) 🔎
- **Item:** 188
- **Local:** `src/app/**` — Glob por `error.tsx` = vazio.
- **Impacto:** exceção em Server Component (ex.: Supabase fora no `/dentista/[id]`) cai na tela genérica do Next ("Application error"), sem marca nem "tentar novamente".
- **Correção:** criar `src/app/error.tsx` (client, com `reset()`) e, idealmente, por segmento crítico (`busca`, `dentista/[id]`, `urgencia`).

---

## 4. 🟡 MÉDIO

### M1 — `celular.png` (629 KB, 819×1229) servido por `<img>` cru, sem `next/image`
- **Itens:** 76, 77 · **Local:** [AppMobile.tsx:146](src/components/home/AppMobile.tsx#L146). Sem `width/height` (risco CLS), sem lazy/WebP. **Correção:** WebP/AVIF + `next/image` (`width=819 height=1229 sizes loading="lazy"`) → ~80-150 KB.

### M2 — Fotos de dentistas via `<img>` cru em listas (home/busca/perfil)
- **Itens:** 75, 90 · **Local:** [UltimosDentistas.tsx:209](src/components/home/UltimosDentistas.tsx#L209), [BuscaCliente.tsx:1119](src/app/busca/BuscaCliente.tsx#L1119), [PerfilDentistaView.tsx:345,1114,1400](src/app/dentista/[id]/PerfilDentistaView.tsx#L1114), [PerfilEditor.tsx:285](src/app/pro/perfil/PerfilEditor.tsx#L285). O host do Storage **já está liberado** em `next.config.ts` para `next/image`, mas o código não usa. **Correção:** `next/image` com `width/height/sizes`.

### M3 — `ComoFunciona` é `"use client"` sem interatividade real (infla bundle da home)
- **Item:** 21 · **Local:** [ComoFunciona.tsx:1](src/components/home/ComoFunciona.tsx#L1) — `"use client"` só por hover (reproduzível em CSS). **Correção:** virar Server Component e usar `hover:` do Tailwind (padrão já usado em `Especialidades.tsx`).

### M4 — `FAQPage` duplicado (JSON-LD + microdata) na página de especialidade
- **Item:** 130/131 · **Local:** [especialidade/[slug]/page.tsx:69-78](src/app/especialidade/[slug]/page.tsx#L69) (JSON-LD) **e** :154-167 (microdata `itemScope FAQPage`). **Impacto:** dois `FAQPage` na mesma URL → risco de aviso de dados estruturados duplicados. **Correção:** manter só uma fonte (preferir JSON-LD).

### M5 — Sem `public/llms.txt` e sem tratamento intencional de crawlers de IA (GEO)
- **Itens:** 136, 137 · **Local:** `public/` (sem `llms.txt`); [robots.ts:15-21](src/app/robots.ts#L15) só tem `userAgent:"*"`. **Correção:** adicionar `llms.txt` (descrição canônica da marca + links p/ `/sobre`, `/especialidade/*`, `/urgencia`) e, se a liberação a IAs for intencional, declarar os user-agents (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended) explicitamente.

### M6 — Sem Web App Manifest (PWA/ícones)
- **Item:** 118/119 · **Local:** [layout.tsx:29](src/app/layout.tsx#L29) só declara `icons`; não há `app/manifest.ts`. A home (`AppMobile`) promete app — incoerente. **Correção:** `src/app/manifest.ts` (name, icons multi-tamanho, `theme_color`, `display`).

### M7 — `sitemap.lastModified` é sempre "agora" para todas as URLs
- **Item:** 101/113 · **Local:** [sitemap.ts:19+](src/app/sitemap.ts#L19) (`const agora = new Date()`); a query nem seleciona `updated_at`. **Impacto:** `<lastmod>` ruidoso é desvalorizado pelos buscadores. **Correção:** usar `updated_at` por dentista; datas fixas nas institucionais.

### M8 — Duas funções divergentes para URL de Instagram (`www` vs sem `www`)
- **Item:** 24 · **Local:** [instagram.ts:33](src/lib/instagram.ts#L33) (`https://www.instagram.com/`) vs [contato.ts:31](src/lib/contato.ts#L31) (`https://instagram.com/`). Escrita salva com `www`; leitura do perfil público gera sem `www`. **Correção:** consolidar na de `instagram.ts`.

### M9 — Lista das 27 UFs duplicada (`UFS_VALIDAS` vs `UF_MAP`)
- **Item:** 24 · **Local:** [validacao.ts:9-12](src/lib/validacao.ts#L9) e [cro.ts:6-12](src/lib/cro.ts#L6). **Correção:** derivar uma da outra (`Object.keys(UF_MAP)`).

### M10 — `console.log` de depuração na busca/cache em produção (expõe coords e termo)
- **Itens:** 19, 70 · **Local:** [BuscaCliente.tsx](src/app/busca/BuscaCliente.tsx) (~14-24 ocorrências: 247, 335, 370, 624…) + `lib/dentistCache.ts:114,165,184,187`. Logam params, coordenadas do usuário e contagens. **Correção:** remover (manter só `console.error/warn`) ou atrás de flag `NODE_ENV`.

### M11 — Estrelas reimplementadas no perfil (arredonda) vs componente `Estrelas` (fracionário)
- **Item:** 23 · **Local:** [Estrelas.tsx](src/components/Estrelas.tsx) (meia-estrela proporcional) vs [PerfilDentistaView.tsx:1184-1198](src/app/dentista/[id]/PerfilDentistaView.tsx#L1184) (`Math.round`). 4,3 vira "4 cheias" no perfil e "86%" no card. **Correção:** usar `<Estrelas>` no perfil.

### M12 — Formatação de distância `"X km"` duplicada, sem helper central
- **Item:** 23 · **Local:** [BuscaCliente.tsx:1197](src/app/busca/BuscaCliente.tsx#L1197) e [UrgenciaCliente.tsx:198](src/app/urgencia/UrgenciaCliente.tsx#L198) (`.toFixed(1)+" km"`). **Correção:** `formatarDistancia(km)` em `lib/distancia.ts` (com vírgula pt-BR e metros abaixo de 1 km).

### M13 — Timeouts de geocoding/geolocalização repetidos (5000/8000 ms)
- **Item:** 25 · **Local:** [geocoding.ts:18,48,76](src/lib/geocoding.ts#L18) (`5000`) e `8000` espalhado em Hero/Busca/Urgência/TopDentistas. **Correção:** constantes únicas.

### M14 — `buscarDentistaPorCro`/`buscarDentistaPorId` exportadas mas mortas
- **Item:** 18 · **Local:** [dentistas.ts:199-206](src/lib/dentistas.ts#L199). Só `buscarDentistaPorIdOuCro` é usado. **Correção:** remover ou rebaixar a internas.

### M15 — `<select>`/inputs de busca com fonte <16px (zoom involuntário no iOS)
- **Item:** 169 · **Local:** [BuscaCliente.tsx:1088](src/app/busca/BuscaCliente.tsx#L1088) (`text-[13px]` no `<select>`) e :965 (`text-[15px]` no input). **Impacto:** Safari iOS dá zoom ao focar campo <16px. **Correção:** `font-size:16px` em todos os controles de formulário.

### M16 — Hambúrguer mobile com `aria-label` fixo "Menu" (não reflete aberto/fechado)
- **Item:** 155 · **Local:** [Header.tsx:132](src/components/Header.tsx#L132). **Correção:** `aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}`.

### M17 — Sem skip-link ("pular para o conteúdo") e `<main>` sem `id`
- **Item:** 161 · **Local:** [layout.tsx:57-59](src/app/layout.tsx#L57). Falha WCAG 2.4.1. **Correção:** `<a href="#conteudo" class="sr-only focus:not-sr-only">…</a>` + `id="conteudo"` no `<main>`.

### M18 — `100vh` em vez de `100dvh` (corte sob a barra do navegador mobile)
- **Item:** 177 · **Local:** [BuscaCliente.tsx:866](src/app/busca/BuscaCliente.tsx#L866) (`calc(100vh - 120px)`), [globals.css:87](src/app/globals.css#L87), [EntrarForm.tsx:114](src/app/entrar/EntrarForm.tsx#L114). **Correção:** `100dvh` com fallback.

### M19 — `prefers-reduced-motion` não respeitado (scroll suave + animações sempre on)
- **Item:** 160 · **Local:** [globals.css:77](src/app/globals.css#L77) (`scroll-behavior:smooth`) + keyframes; nenhum `@media (prefers-reduced-motion)`. **Correção:** bloco que zera animações/transições e `scroll-behavior:auto`.

### M20 — Safe-area iOS (notch) não tratada
- **Item:** 171 · **Local:** [globals.css](src/app/globals.css) (sem `env(safe-area-inset-*)`), header sticky [Header.tsx:38-45](src/components/Header.tsx#L38). **Correção:** `viewportFit:"cover"` (ver A12) + `padding: env(safe-area-inset-*)` em barras fixas.

### M21 — Inputs de modais/login sem `label` associado; erros sem `role="alert"`/`aria-describedby`
- **Item:** 154 · **Local:** [SessaoProvider.tsx:280-295](src/components/SessaoProvider.tsx#L280) (label sem `htmlFor`/`id`); [EntrarForm.tsx:159-176](src/app/entrar/EntrarForm.tsx#L159). Falha WCAG 1.3.1/3.3.1. **Correção:** associar `label`↔`input` e `role="alert"` nas mensagens de erro.

### M22 — Autocomplete de busca sem semântica ARIA de combobox
- **Item:** 158 · **Local:** [BuscaCliente.tsx:958-1012](src/app/busca/BuscaCliente.tsx#L958), [Hero.tsx:204-245](src/components/home/Hero.tsx#L204). Falta `role="combobox"`/`listbox`/`option`, `aria-activedescendant`. **Correção:** implementar o padrão ARIA Combobox.

### M23 — Sem banner/registro de consentimento de cookies/armazenamento
- **Item:** 233 · **Local:** projeto (nenhum componente de consentimento). A política declara coletar IP/user-agent e usar localStorage. **Correção:** aviso de cookies/armazenamento **ou** ajustar a política ao que de fato é coletado.

### M24 — Política cita "cache de CEP por 7 dias" que **não existe** na implementação 🔎
- **Item:** 232 · **Local:** [privacidade/page.tsx:222,283](src/app/privacidade/page.tsx#L222) vs [cep.ts](src/lib/cep.ts) (fetch direto, sem cache). O cache real é de sugestões (24h) e busca (30 min). **Impacto:** documento legal descreve tratamento inexistente. **Correção:** corrigir a política e TTLs.

### M25 — Pluralização incorreta: "1 dentistas encontrados"
- **Item:** 243 · **Local:** [BuscaCliente.tsx:1052](src/app/busca/BuscaCliente.tsx#L1052). **Correção:** `${n} ${n===1?"dentista encontrado":"dentistas encontrados"}`.

### M26 — Telefone/WhatsApp do endereço (Pro) sem máscara nem validação
- **Itens:** 201, 203 · **Local:** [EnderecosEditor.tsx:247-253](src/components/pro/EnderecosEditor.tsx#L247). Texto livre vai ao banco e vira link `wa.me`/`tel:`; sem `inputMode`/`type="tel"`. `validarTelefone` existe mas não é aplicado. **Correção:** aplicar `formatarTelefone`, `type="tel"`, `inputMode="numeric"` e validar.

### M27 — CEP do endereço não sinaliza erro/timeout; `fetch` ao ViaCEP sem timeout
- **Item:** 200 · **Local:** [cep.ts:17-41](src/lib/cep.ts#L17) (retorna `null` em silêncio) + [EnderecosEditor.tsx:148-165](src/components/pro/EnderecosEditor.tsx#L148) (`if (d){...}` sem `else`). **Impacto:** CEP inexistente/ViaCEP fora = silêncio; sem `AbortController` a requisição pode pendurar. **Correção:** mensagem "CEP não encontrado", spinner, timeout.

### M28 — "0.0 km daqui" ainda possível na busca textual (endereço sem coordenadas) 🔎
- **Item:** 190 · **Local:** [BuscaCliente.tsx:415-418,1195-1198](src/app/busca/BuscaCliente.tsx#L1195). O guard usa "tem origem do usuário", não "o endereço tem coords"; endereço sem geocodificação + coords de login → "0.0 km daqui". **Correção:** só exibir badge se `temOrigemUsuario && end.distancia_km > 0`.

---

## 5. 🔵 BAIXO

| ID | Item | Local | Achado / Correção |
|---|---|---|---|
| B1 | 63/64 | [EntrarForm.tsx:100-108](src/app/entrar/EntrarForm.tsx#L100) | Reset de senha via anon key no cliente pode permitir enumeração por timing no GoTrue. Garantir rate-limit; considerar mover p/ route handler de tempo constante. |
| B2 | 62 | [senha.ts:7,31](src/lib/senha.ts#L7) | Política mínima fraca (só ≥8 chars; aceita "aaaaaaaa"). Exigir `forcaSenha ≥ 3` no submit + política no painel Supabase. |
| B3 | 98 | next.config | `lucide-react` ok (imports nomeados); opcional `optimizePackageImports:["lucide-react"]`. |
| B4 | 89 | dentista/especialidade | Confirmar `revalidate`/ISR nas páginas públicas de perfil/especialidade (evitar render por request). |
| B5 | 124 | [jsonld.ts:33-55](src/lib/jsonld.ts#L33) | JSON-LD `Dentist` sem `geo`/`priceRange`/`openingHours` (enriquecimento perdido). Expor lat/lng e adicionar `geo`. |
| B6 | 126 | [dentista/[id]/page.tsx:72](src/app/dentista/[id]/page.tsx#L72) | Breadcrumb aponta `/busca?q=` (não canônica) — apontar para `/especialidade/<slug>`. |
| B7 | 41/42 | [BuscaCliente.tsx:327,476](src/app/busca/BuscaCliente.tsx#L327), [UltimosDentistas.tsx:120](src/components/home/UltimosDentistas.tsx#L120), verificar-cro/[id]/page.tsx:25 | `as unknown as` desliga checagem de tipo. Tipar a fonte (select/RPC) e remover. |
| B8 | 26 | [BuscaCliente.tsx:55-72](src/app/busca/BuscaCliente.tsx#L55), UltimosDentistas | Tipos de row do banco redefinidos localmente. Reusar `DentistaRow`/`EnderecoRow` de `dentistas.ts`. |
| B9 | 195 | [cadastro/page.tsx:1119,1121,1141](src/app/cadastro/page.tsx#L1119) | `<Link target="_blank">` sem `rel="noopener noreferrer"` (resto do site tem). |
| B10 | 186 | [Header.tsx:109,150](src/components/Header.tsx#L109), cards | `<img>` de avatar sem `onError` de fallback (imagem quebrada se a foto remota 404). |
| B11 | 153 | [AppMobile.tsx:146](src/components/home/AppMobile.tsx#L146) | `alt` descritivo numa imagem decorativa — usar `alt=""`. |
| B12 | 151 | [Footer.tsx:104,133,136](src/components/Footer.tsx#L104) | Texto secundário do rodapé (`white/0.45`, `white/0.35` sobre navy) ~1.9–2.6:1 — abaixo de 4.5:1. Subir opacidade ≥0.7. |
| B13 | 156 | [BuscaCliente.tsx:1140-1143](src/app/busca/BuscaCliente.tsx#L1140) | Estrela do card de busca sem rótulo ("4.5" solto). Usar `aria-label` ou `Estrelas`. |
| B14 | 230 | [HeatMapLayer.tsx:49](src/components/analytics/HeatMapLayer.tsx#L49) | `Math.max(...points.map())` pode estourar a pilha com dezenas de milhares de pontos. Usar `reduce`. |
| B15 | 231 | [analytics.ts:60-77](src/lib/analytics.ts#L60), [dba.ts:26-27](src/lib/dba.ts#L26) | Buckets diários usam fuso do navegador, não `America/Sao_Paulo` (efeito de borda à meia-noite). Fixar timezone. |
| B16 | 232/238 | [privacidade/page.tsx:322](src/app/privacidade/page.tsx#L322), [termos/page.tsx:299](src/app/termos/page.tsx#L299) | Placeholders legais não preenchidos: `[Inserir endereço da empresa]`, foro `[cidade/estado]`. Preencher antes do go-live. |
| B17 | 7 | dependências | `npm audit`: 2 moderadas (postcss `<8.5.10`, XSS em stringify) — **transitiva do próprio Next**; correção só com downgrade quebrando. Acompanhar patch do Next 16, sem ação imediata. |
| B18 | 19 | [EntrarForm.tsx:20](src/app/entrar/EntrarForm.tsx#L20), [pro/dashboard/page.tsx:14](src/app/pro/dashboard/page.tsx#L14), [Especialidades.tsx:26](src/components/home/Especialidades.tsx#L26) | Vars/imports não usados (`isSuperuserEmail`, `Zap`) e `eslint-disable` inútil. Limpar. |
| B19 | 132 | [ajuda/avaliacoes-google/page.tsx](src/app/ajuda/avaliacoes-google/page.tsx) | Já tem `noindex` e fora do sitemap (OK). Opcional: incluir `/ajuda/` no disallow do robots para poupar crawl. |

---

## 6. ✅ Verificados OK (controles que passaram)

**Segurança:** sem `service_role` no cliente/bundle (grep zero); `.env.local` ignorado, só `.env.example` versionado; nenhum import server-only em `"use client"`; `/pro/*` e `dashboard-analytics`/`verificar-cro` protegidos no servidor (`getUsuario()`/`requireSuperuser()` com `auth.getUser()`); CRO via RPC gated; **open redirect tratado** no callback (`/^\/(?![/\\])/`); proxy usa `getUser()`; JSON-LD escapado (`<`); upload valida MIME/tamanho (2MB, jpeg/png/webp — SVG rejeitado), caminho fixo sem traversal; queries parametrizadas (input do PostgREST sanitizado em `busca.ts:73`); logs de busca anônimos (sem IP/user_id).

**SEO/dados estruturados:** `metadataBase`, `lang=pt-BR`, títulos/descrições únicos por rota, canonical (inclui `/busca` fixo p/ neutralizar query), OG/Twitter declarados, robots bloqueia áreas privadas e referencia sitemap, sitemap cobre tudo, **404 real** com `noindex`, um `<h1>` por página, `Organization`+`WebSite`+`SearchAction`, `BreadcrumbList`, `aggregateRating` condicionado a avaliações reais exibidas, conteúdo essencial em SSR (bom p/ GEO/AEO), conteúdo de urgência/FAQ em forma de pergunta (AEO), NAP consistente.

**Performance:** **Leaflet/leaflet.heat, recharts e react-image-crop NÃO vazam para a home** — isolados em `/pro/*` via `"use client"` + `next/dynamic({ssr:false})`; Leaflet com cleanup correto (sem leak); `next/font/google` (Inter) com `swap`/subset; `og-image` 27 KB; especialidades em WebP 9-33 KB; `/busca` sem mapa.

**Arquitetura/TS:** Haversine único e reusado; `slugificar` único; `calcularAvaliacoes` centralizado; validadores CRO/CPF/CEP/telefone sem cópias; sem `catch` vazio que engole erro; **zero `as any`/`@ts-ignore`** em produção; type-check limpo.

**Forms/UX/Analytics:** validações de CRO/CPF/Instagram/contato testadas; `SugestaoEndereco` com debounce + teclado + click-outside; `EditorFotos` valida tipo e exporta 400×400 WebP; **exclusão de conta** com confirmação em 2 passos + RPC de anonimização (direito LGPD); estados de loading/vazio/erro com retry na busca e na urgência (máquina de estados exemplar); geolocalização opt-in tratada em urgência; `log-busca` fire-and-forget que nunca quebra a UX; painéis de analytics com empty-states e cancelamento; **114 testes passam**.

**A11y (parcial OK):** `Estrelas` com `role="img"`+`aria-label`; botões-ícone rotulados; viewport **sem** bloqueio de zoom; `backdrop-filter` com prefixo `-webkit-`; alvos de toque ≥44px na maioria; `rel="noopener noreferrer"` na maioria dos links externos.

---

## 7. Ordem de correção sugerida

**Fase 0 — antes de qualquer produção (🔴/🟠 de segurança):**
1. **C1** (sessão HttpOnly — decisão de arquitetura; testar login/logout) → 2. **A1** (headers/CSP) → 3. **A2** (lint: 21 erros).

**Fase 1 — SEO/conversão (rápidas, alto retorno):**
4. **A3** (CTAs 404) · **A4** (`noindex` /pro) · **A5** (OG 1200×630) · **A6** (geo sob clique) · **M25** (pluralização) · **M16/M17** (a11y rápidas).

**Fase 2 — performance & a11y estrutural:**
5. **A11** (fonte) · **M1/M2** (imagens `next/image`) · **A12/M18/M19/M20** (viewport/dvh/motion/safe-area) · **A13/A14/M21/M22** (modais, error boundaries, ARIA).

**Fase 3 — higiene de código & LGPD:**
6. **A7-A10, M3, M8-M14, M28** (código morto/duplicação/console) · **M4-M7** (dados estruturados/manifest/sitemap) · **M5** (GEO llms.txt) · **M23/M24, B16** (LGPD/política) · restante dos 🔵.

---

> **Próximo passo:** me diga quais itens aprova para correção (por ID, por fase, ou "tudo"). Aplico em commits pequenos por bloco e te mostro o diff. O **C1** eu recomendo discutirmos antes de mexer, porque envolve mudar como o login chega ao cliente (não é fix mecânico).
