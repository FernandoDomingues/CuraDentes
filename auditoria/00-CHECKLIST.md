# Checklist de Auditoria — CuraDentes (site-R0)

> **Objetivo:** pente-fino antes de considerar o projeto finalizado. Stack: **Next.js 16 (App Router) · React 19 · Supabase (SSR/Auth/Storage) · Leaflet + leaflet.heat · Tailwind 4 · Vitest**. Site pt-BR (diretório/marketplace de dentistas) com área Pro, analytics, mapa de calor, verificação de CRO, busca por geolocalização, SEO (sitemap/robots/JSON-LD).
>
> **Como usar:** cada item é marcável (`[ ]` → `[x]`). Status sugerido por item: ✅ OK · ⚠️ Ajustar · ❌ Falha · ⏭️ N/A · ❓ Investigar. Itens numerados de forma **contínua** (1…N) para conferência da contagem (meta: ≥200).
>
> **Escopo:** APENAS a pasta `site-R0`. Nada do `site-k11` deve ser referenciado ou importado.
>
> Data base da auditoria: 2026-06-25

---

## Legenda de severidade
- 🔴 **Crítico** — quebra, vazamento de dados, ou bloqueia uso/indexação.
- 🟠 **Alto** — impacto sério em UX, performance, conversão ou SEO.
- 🟡 **Médio** — qualidade/manutenção/robustez.
- 🔵 **Baixo** — polimento, consistência, “nice to have”.

---

## A. Build, configuração & tooling

- [ ] 1. 🔴 `npm run build` conclui sem erros nem warnings de produção (build limpo).
- [ ] 2. 🔴 `npm run lint` passa sem erros (e sem `eslint-disable` espalhados sem justificativa).
- [ ] 3. 🟠 `tsc --noEmit` (type-check) passa sem erros; `strict` está ligado no `tsconfig.json` — confirmar que nada usa `// @ts-ignore`/`any` para mascarar.
- [ ] 4. 🟠 `npm run test` (Vitest) — todos os testes passam; sem testes `.skip`/`.only` esquecidos.
- [ ] 5. 🟡 Cobertura de testes medida; libs críticas (`busca`, `cro`, `senha`, `validacao`, `dba`, `analytics`, `avaliacoes`, `jsonld`, `slug`, `especialidades`, `instagram`, `contato`, `superuser`) têm testes representativos.
- [ ] 6. 🟡 Versões de dependências fixadas/coerentes; sem mistura de major instáveis (Next 16, React 19, Tailwind 4, Vitest 4).
- [ ] 7. 🟠 `npm audit` sem vulnerabilidades altas/críticas; dependências sem CVE conhecido.
- [ ] 8. 🟡 Sem dependências não utilizadas no `package.json` (ex.: confirmar uso de `recharts`, `react-image-crop`, `sonner`, `leaflet.heat`).
- [ ] 9. 🟡 Sem dependências usadas porém ausentes do `package.json` (imports “fantasma”).
- [ ] 10. 🔵 `engines` do Node declarado no `package.json` (alinha dev/CI/produção).
- [ ] 11. 🟡 `next.config.ts` — `images.remotePatterns` cobre exatamente o host do Supabase Storage e nada além do necessário.
- [ ] 12. 🟡 `turbopack.root` correto (evita “subir” e pegar lockfile errado) — validado no build de produção.
- [ ] 13. 🔵 `.gitignore` cobre `.next/`, `node_modules/`, `.env.local`, artefatos de build e logs.
- [ ] 14. 🔴 `.env.local` **não** versionado; `.env.example` presente, completo e sem segredos reais.
- [ ] 15. 🟡 `eslint.config.mjs` ativo com `core-web-vitals` + regras TS; `globalIgnores` não está ignorando código de produção por engano.
- [ ] 16. 🔵 `postcss.config.mjs` / Tailwind 4 configurado corretamente (purge/scan dos caminhos certos).
- [ ] 17. 🔵 Scripts npm documentados (README) — `dev`, `build`, `start`, `lint`, `test`.
- [ ] 18. 🟡 Sem arquivos órfãos/mortos no `src/` (componentes/libs não importados em lugar nenhum).
- [ ] 19. 🔵 Sem `console.log`/`console.debug` de depuração esquecidos no código de produção.
- [ ] 20. 🔵 Sem `TODO`/`FIXME`/`HACK` críticos pendentes sem rastreio.

## B. Arquitetura, redundância & simplificação (expertise de programação)

- [ ] 21. 🟡 Server vs Client Components bem divididos — `"use client"` só onde há interatividade/estado/efeito; nada de cliente desnecessário inflando o bundle.
- [ ] 22. 🟠 Nenhum segredo/lib server-only vaza para Client Component (ex.: `supabase/server.ts` nunca importado em arquivo `"use client"`).
- [ ] 23. 🟡 Lógica duplicada entre componentes consolidada (ex.: formatação de distância, estrelas/avaliações, normalização de especialidade/slug em um único utilitário).
- [ ] 24. 🟡 `src/lib/*` sem funções redundantes que fazem o mesmo (ex.: validações de CRO/CEP/telefone/e-mail centralizadas, sem variações copiadas).
- [ ] 25. 🟡 Constantes mágicas (raios de busca, limites de paginação, distâncias, timeouts) extraídas para um único módulo de config.
- [ ] 26. 🟡 Tipos compartilhados em `src/types/*` reutilizados — sem redefinição local de `Dentista`/endereços/especialidades.
- [ ] 27. 🟡 Componentes de UI repetidos unificados (`Container`, `Estrelas`, `CardDentista`, badges) — sem variações quase-iguais.
- [ ] 28. 🟡 Funções longas/`page.tsx` gigantes quebradas em unidades testáveis; complexidade ciclomática razoável.
- [ ] 29. 🟡 Cálculo de distância (Haversine) implementado uma única vez e reutilizado (busca textual e por geolocalização).
- [ ] 30. 🟡 Evitar recomputar dados pesados a cada render — memoização (`useMemo`/`useCallback`) onde faz diferença, sem memoizar à toa.
- [ ] 31. 🟡 Sem prop drilling excessivo — contexto/composição onde apropriado.
- [ ] 32. 🔵 Nomenclatura consistente (pt-BR no domínio) entre arquivos, funções e rotas.
- [ ] 33. 🟡 Tratamento de erros consistente (libs retornam erro previsível; UI trata) — sem `try/catch` que engole erro silenciosamente.
- [ ] 34. 🟡 Sem lógica de negócio duplicada entre `lib/busca.ts`, `lib/dentistas.ts` e as páginas que consomem.
- [ ] 35. 🔵 Imports absolutos `@/*` usados de forma consistente (sem `../../../`).
- [ ] 36. 🟡 Funções puras (sem efeito colateral) onde possível — facilita teste e cache.
- [ ] 37. 🟡 `proxy.ts` (middleware) com `matcher` mínimo necessário — confirmado que páginas públicas não acionam o proxy (custo/latência).
- [ ] 38. 🔵 Comentários explicam o “porquê”, não o “o quê”; sem comentário desatualizado/contraditório com o código.
- [ ] 39. 🟡 Sem “feature flags”/código morto de experimentos antigos de IAs anteriores.
- [ ] 40. 🟡 Padrão único de data-fetching no servidor (sem misturar fetch direto + client supabase de formas divergentes para o mesmo dado).

## C. TypeScript & tipagem

- [ ] 41. 🟠 Zero `any` implícito/explícito sem justificativa; preferir `unknown` + narrowing.
- [ ] 42. 🟡 Tipos de retorno do Supabase tipados (rows, RPC) — sem `as any` em queries.
- [ ] 43. 🟡 `null`/`undefined` tratados explicitamente (dados opcionais de dentista: bio, foto, instagram, endereços).
- [ ] 44. 🟡 `leaflet-heat.d.ts` e `leaflet` tipados corretamente; sem `@ts-expect-error` solto.
- [ ] 45. 🔵 Enums/uniões para valores fechados (especialidades, papéis de usuário, status de CRO).
- [ ] 46. 🟡 Props de componentes tipadas (sem `props: any`); children tipados.
- [ ] 47. 🔵 `tsconfig` paths e `moduleResolution: bundler` coerentes com imports usados.

## D. Segurança 🔴 (prioridade máxima)

- [ ] 48. 🔴 **RLS (Row Level Security)** habilitada em TODAS as tabelas do Supabase; políticas revisadas (leitura pública só do que é público; escrita só do dono).
- [ ] 49. 🔴 `NEXT_PUBLIC_SUPABASE_ANON_KEY` é realmente a chave **anon** (nunca a `service_role`) — service_role jamais exposta ao cliente/bundle.
- [ ] 50. 🔴 Nenhuma `service_role`/segredo em código client-side, em `NEXT_PUBLIC_*` ou no bundle final (`grep` no `.next/static`).
- [ ] 51. 🔴 Proteção de rotas `/pro/*` validada no servidor (layout Server Component deriva o usuário) — não dá para acessar dashboard sem sessão válida.
- [ ] 52. 🔴 Autorização por papel: dentista só vê/edita os **próprios** dados; analytics/DBA só para quem tem permissão (superuser) — testar acesso cruzado.
- [ ] 53. 🔴 Verificação de CRO (`/pro/verificar-cro`) só acessível a quem tem permissão; não permite aprovar/rejeitar CRO de terceiros sem autorização.
- [ ] 54. 🔴 Endpoints/route handlers (`/auth/callback`, `/auth/login-dentista`) validam entrada e não confiam em parâmetros do cliente sem checagem.
- [ ] 55. 🔴 Open redirect: parâmetros de `redirect`/`next` no login/callback validados contra allowlist (não redirecionar para domínio externo arbitrário).
- [ ] 56. 🟠 Cookies de sessão `HttpOnly`, `Secure`, `SameSite` adequados (config do `@supabase/ssr`).
- [ ] 57. 🟠 Cabeçalhos de segurança configurados: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`, `Permissions-Policy`.
- [ ] 58. 🟠 XSS: nenhum `dangerouslySetInnerHTML` sem sanitização; conteúdo de usuário (bio, nome) escapado. JSON-LD injetado com escape correto.
- [ ] 59. 🟠 Upload de fotos: valida tipo MIME real, extensão e **tamanho máximo**; rejeita SVG com script; nome de arquivo sanitizado; path traversal impossível.
- [ ] 60. 🟠 Storage do Supabase: bucket de fotos com políticas corretas (upload só do dono; leitura pública apenas das fotos de perfil).
- [ ] 61. 🟠 Rate limiting / proteção contra abuso em: login, redefinição de senha, cadastro, log de busca, contato. Anti-brute force.
- [ ] 62. 🟠 Senhas: política de força aplicada (`lib/senha.ts`); nunca logada; hashing delegado ao Supabase Auth.
- [ ] 63. 🟠 Fluxo de redefinição de senha: token de uso único, expira, não vaza na URL/log; não permite enumeração de e-mails (resposta genérica).
- [ ] 64. 🟡 Enumeração de usuários: mensagens de erro de login/cadastro não revelam se o e-mail existe.
- [ ] 65. 🟠 Injeção: queries Supabase parametrizadas (sem concatenação de string em filtros `.ilike`/`.eq` com input bruto); RPCs validam args.
- [ ] 66. 🟡 CSRF: ações sensíveis (logout, alterar conta, excluir) protegidas (Supabase usa tokens; confirmar que GET não muda estado).
- [ ] 67. 🟡 `lib/superuser.ts` — checagem de superusuário feita no servidor, não confiável a partir do cliente; sem lista hardcoded vazando.
- [ ] 68. 🟡 Dados sensíveis (e-mail, telefone, endereço exato) não expostos em APIs públicas/JSON-LD além do necessário/consentido.
- [ ] 69. 🟡 Geolocalização do usuário tratada com privacidade (não persistir coordenadas exatas sem necessidade/consentimento — ver LGPD).
- [ ] 70. 🟡 `log-busca.ts` não registra PII desnecessária; logs de busca anonimizados/agregados.
- [ ] 71. 🔵 Dependências de terceiros (Leaflet tiles, fontes) carregadas de origem confiável/HTTPS; sem mixed content.
- [ ] 72. 🔵 Mensagens de erro de produção não vazam stack trace/detalhes internos ao usuário.
- [ ] 73. 🟡 `proxy.ts` chama `supabase.auth.getUser()` (valida no servidor) e não confia apenas em `getSession()` (que lê cookie sem validar).
- [ ] 74. 🔵 Sem chaves de API de terceiros (mapas, e-mail) hardcoded no front; tudo via env.

## E. Performance & tempo de carregamento 🟠

- [ ] 75. 🟠 Imagens via `next/image` com `width`/`height`/`sizes` corretos; sem `<img>` cru para conteúdo otimizável.
- [ ] 76. 🟠 `public/images/celular.png` e demais PNGs grandes otimizados/convertidos para WebP/AVIF; peso conferido.
- [ ] 77. 🟠 `priority`/`fetchPriority` só na imagem LCP (hero); resto com `loading="lazy"`.
- [ ] 78. 🟠 Especialidades já em `.webp` — confirmar dimensões e que não há reescala pesada no cliente.
- [ ] 79. 🟠 OG image (`og-image.png`) com peso razoável (não multi-MB).
- [ ] 80. 🟠 Fontes CuraDentes: `woff2` priorizado, `font-display: swap`, `preload` só dos pesos usados acima da dobra; subset se possível.
- [ ] 81. 🟠 Leaflet + leaflet.heat carregados **sob demanda** (dynamic import, só na página de mapa/analytics) — não no bundle global.
- [ ] 82. 🟠 `recharts` carregado só onde há gráfico (dashboard-analytics), via dynamic import — é pesado.
- [ ] 83. 🟠 `react-image-crop` só na rota do editor de fotos, não global.
- [ ] 84. 🟠 Análise do bundle (`@next/bundle-analyzer` ou similar) — nenhum chunk inesperadamente grande; sem lib pesada no first load JS da home.
- [ ] 85. 🟠 Core Web Vitals (campo/lab): **LCP** < 2,5s, **INP** < 200ms, **CLS** < 0,1 na home e na busca.
- [ ] 86. 🟠 CLS: dimensões reservadas para imagens, mapa, cards; fontes sem FOIT/layout shift.
- [ ] 87. 🟡 Streaming/Suspense usado em listas pesadas (busca, últimos dentistas) com skeleton; sem bloquear render inteiro.
- [ ] 88. 🟡 Estratégia de cache do Next correta por rota (estático onde dá: home, sobre, termos, especialidade; dinâmico só onde precisa: busca, dashboard).
- [ ] 89. 🟡 `revalidate`/ISR definido para páginas de dentista/especialidade (dados mudam pouco) — evita render a cada request.
- [ ] 90. 🟡 Paginação/limite na busca e listas (não trazer todos os dentistas de uma vez).
- [ ] 91. 🟡 Queries Supabase pedem só as colunas necessárias (`select` enxuto), com índices nas colunas filtradas/ordenadas.
- [ ] 92. 🟡 Geolocalização/distância calculada no banco (PostGIS/RPC) quando possível, não trazendo tudo p/ filtrar no cliente.
- [ ] 93. 🟡 Sem waterfalls de requests sequenciais evitáveis — paralelizar (`Promise.all`).
- [ ] 94. 🔵 Tiles do mapa com cache; heatmap não recalcula a cada pan/zoom desnecessariamente.
- [ ] 95. 🔵 Compressão (gzip/brotli) ativa no host; assets com `Cache-Control` longo + hash.
- [ ] 96. 🔵 Preconnect/dns-prefetch para Supabase e provedor de tiles do mapa.
- [ ] 97. 🔵 Sem re-render global por mudança de estado pequeno (ex.: header/login não re-renderiza a página toda).
- [ ] 98. 🔵 Ícones via `lucide-react` tree-shakeable (import nomeado, não o pacote inteiro).
- [ ] 99. 🔵 SVGs em `public/icons` otimizados (SVGO) e sem metadados desnecessários.
- [ ] 100. 🔵 Sem polyfills/legados desnecessários para o target ES2017.

## F. SEO técnico

- [ ] 101. 🔴 `sitemap.ts` gera todas as URLs indexáveis (home, especialidades, dentistas, páginas institucionais) com `lastmod` coerente.
- [ ] 102. 🔴 `robots.ts` permite indexação das públicas e **bloqueia** `/pro/*`, `/entrar`, `/cadastro`, `/redefinir-senha`, `/auth/*`.
- [ ] 103. 🔴 `robots.ts` referencia o `sitemap.xml`; sem `Disallow: /` acidental em produção.
- [ ] 104. 🔴 Nenhuma página pública com `noindex` por engano; área Pro/auth **com** `noindex`.
- [ ] 105. 🟠 `<title>` único e descritivo por rota (home, busca, cada dentista, cada especialidade, urgência, sobre).
- [ ] 106. 🟠 `meta description` única e persuasiva por rota (≤ ~155 caracteres).
- [ ] 107. 🟠 Canonical correto em cada página (evita duplicação por query string da busca).
- [ ] 108. 🟠 URL da busca com query params: decidir indexação (canonical p/ versão limpa ou `noindex` em combinações infinitas).
- [ ] 109. 🟠 Open Graph completo (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale=pt_BR`, `og:site_name`).
- [ ] 110. 🟠 Twitter Cards (`summary_large_image`) configurados.
- [ ] 111. 🟠 `lang="pt-BR"` no `<html>`; `metadataBase` definido no `layout.tsx`.
- [ ] 112. 🟡 Hierarquia de headings correta (um `<h1>` por página, `h2/h3` lógicos).
- [ ] 113. 🟡 Slugs limpos e estáveis (`lib/slug.ts`) — sem acento/espaço; redirecionar slug antigo se mudar (evitar 404/link rot).
- [ ] 114. 🟡 `not-found.tsx` retorna **HTTP 404** real (não 200 “soft 404”); página 404 útil com links.
- [ ] 115. 🟡 Imagens com `alt` descritivo e único (fotos de dentista, especialidades, hero).
- [ ] 116. 🟡 Links internos com texto âncora descritivo; sem “clique aqui”.
- [ ] 117. 🟡 Paginação/listas com links rastreáveis (`<a href>`), não só JS.
- [ ] 118. 🔵 `favicon`/`icon.png`/`apple-touch-icon` e `manifest` presentes e corretos.
- [ ] 119. 🔵 `theme-color` e PWA básico (manifest) se aplicável.
- [ ] 120. 🔵 Sem cadeias de redirect; HTTPS forçado; sem URLs duplicadas (com/sem barra final padronizado).
- [ ] 121. 🔵 Hreflang só se houver outra língua (não aplicável se só pt-BR — confirmar).
- [ ] 122. 🟡 Tempo de resposta do servidor (TTFB) baixo nas páginas indexáveis (afeta crawl budget).

## G. Dados estruturados (Schema.org / JSON-LD) — base de SEO + GEO + AEO

- [ ] 123. 🟠 `JsonLd.tsx`/`lib/jsonld.ts` injeta JSON-LD válido (passa no Rich Results Test e Schema validator).
- [ ] 124. 🟠 Cada dentista com `Dentist`/`Physician`/`LocalBusiness` + `MedicalBusiness`: nome, `address` (PostalAddress), `geo`, `telephone`, `image`, `priceRange`, `openingHours` se houver.
- [ ] 125. 🟠 `aggregateRating`/`review` no schema do dentista **apenas** se as avaliações forem reais e exibidas na página (senão é violação de diretriz).
- [ ] 126. 🟠 `BreadcrumbList` nas páginas internas (especialidade → dentista).
- [ ] 127. 🟠 `Organization`/`WebSite` no layout com `name`, `url`, `logo`, `sameAs` (redes sociais).
- [ ] 128. 🟠 `SearchAction` (sitelinks searchbox) no `WebSite` schema se a busca for pública.
- [ ] 129. 🟠 `MedicalSpecialty`/`MedicalProcedure` nas páginas de especialidade (canal, implante, ortodontia, etc.).
- [ ] 130. 🟡 `FAQPage` schema nas páginas com perguntas frequentes (especialidade/urgência) — direto para AEO.
- [ ] 131. 🟡 JSON-LD reflete fielmente o conteúdo visível (sem dados ocultos só p/ robô).
- [ ] 132. 🔵 Datas (`datePublished`/`dateModified`) presentes onde fizer sentido (conteúdo institucional).

## H. GEO — Generative Engine Optimization (ChatGPT, Gemini, Perplexity, Copilot)

- [ ] 133. 🟠 Conteúdo com **afirmações factuais claras e autônomas** (cada parágrafo entende-se fora de contexto) — facilita citação por LLMs.
- [ ] 134. 🟠 Entidades bem definidas: “CuraDentes é um diretório de dentistas no Brasil que…” — descrição canônica da marca repetida de forma consistente.
- [ ] 135. 🟠 `/sobre` deixa explícito o que é o serviço, para quem, cobertura geográfica e diferencial (matéria-prima para respostas geradas).
- [ ] 136. 🟠 Disponibilizar `public/llms.txt` (e/ou `llms-full.txt`) descrevendo o site e apontando páginas-chave para motores generativos.
- [ ] 137. 🟠 `robots.txt` decide **conscientemente** o acesso de crawlers de IA (GPTBot, OAI-SearchBot, PerplexityBot, Google-Extended, ClaudeBot) — permitir/bloquear de forma intencional, não acidental.
- [ ] 138. 🟡 Dados estruturados ricos (Seção G) reforçam a extração por IA — schema = combustível para GEO.
- [ ] 139. 🟡 Autoridade/E-E-A-T: autoria, credenciais (CRO verificado), política de verificação visíveis e explícitas no conteúdo.
- [ ] 140. 🟡 Conteúdo atualizado e datado (frescor) — motores generativos priorizam fontes recentes e datadas.
- [ ] 141. 🟡 Linguagem objetiva, com números e fatos citáveis (ex.: “verificamos o CRO junto ao conselho”) em vez de marketing vago.
- [ ] 142. 🔵 URLs e títulos descritivos (a IA cita a URL) — slug fala por si.
- [ ] 143. 🔵 Conteúdo acessível sem JS (SSR) — crawlers de IA muitas vezes não executam JS; o texto essencial precisa estar no HTML inicial.

## I. AEO — Answer Engine Optimization (featured snippets, busca por voz, respostas diretas)

- [ ] 144. 🟠 Perguntas frequentes reais respondidas de forma **concisa e direta** (40–60 palavras) logo após um heading em forma de pergunta.
- [ ] 145. 🟠 Headings em linguagem natural/perguntas: “Quanto custa um implante dentário?”, “O que é tratamento de canal?”.
- [ ] 146. 🟠 `FAQPage`/`HowTo` JSON-LD acompanhando o conteúdo de pergunta-resposta (reforço da Seção G/130).
- [ ] 147. 🟡 Conteúdo de urgência (`/urgencia`) responde direto “o que fazer em uma emergência odontológica” — formato de resposta para voz/assistente.
- [ ] 148. 🟡 Listas e tabelas para conteúdo enumerável (sintomas, passos, tipos de tratamento) — formatos que viram snippet.
- [ ] 149. 🟡 Definições curtas no topo de páginas de especialidade (parágrafo-resumo “TL;DR”).
- [ ] 150. 🔵 Dados locais consistentes (NAP: nome, endereço, telefone) idênticos entre página, schema e perfis externos — base de busca local/voz.

## J. Acessibilidade (a11y) — WCAG 2.1 AA

- [ ] 151. 🟠 Contraste de cor de texto/botões/links ≥ 4.5:1 (3:1 para texto grande) — verde da marca incluído.
- [ ] 152. 🟠 Navegação 100% por teclado: foco visível, ordem lógica, sem armadilha de foco (modais, menu do usuário).
- [ ] 153. 🟠 Todas as imagens informativas com `alt`; decorativas com `alt=""`.
- [ ] 154. 🟠 Formulários (entrar, cadastro, redefinir senha, editor de bio/endereços) com `<label>` associado, `aria-describedby` para erros, foco no primeiro erro.
- [ ] 155. 🟠 Botões/ícones-só (lucide) com `aria-label` (ex.: fechar, menu, voltar).
- [ ] 156. 🟡 `Estrelas.tsx` acessível: rating exposto a leitor de tela (`aria-label="4,5 de 5"`), não só visual.
- [ ] 157. 🟡 Mapa Leaflet com alternativa textual (lista de resultados) — mapa não pode ser a única forma de acessar a informação.
- [ ] 158. 🟡 Toasts (`sonner`) anunciados via `aria-live`; não somem rápido demais para leitores.
- [ ] 159. 🟡 Estados de foco/hover/disabled distinguíveis; alvos de toque ≥ 44×44px no mobile.
- [ ] 160. 🟡 `prefers-reduced-motion` respeitado em animações/transições.
- [ ] 161. 🔵 Landmarks semânticos (`<header>`, `<nav>`, `<main>`, `<footer>`) e `skip to content`.
- [ ] 162. 🔵 Idioma e direção corretos; `lang` em trechos de outra língua se houver.
- [ ] 163. 🔵 Zoom até 200% sem perda de conteúdo/funcionalidade.

## K. Responsividade (mobile, tablet, desktop)

- [ ] 164. 🟠 Sem scroll horizontal em 320px (iPhone SE), 360–414px (Android comum), 390/430px (iPhones recentes).
- [ ] 165. 🟠 Tablet retrato e paisagem (768px, 820px, 1024px) — layout intermediário não “quebra” entre breakpoints do Tailwind.
- [ ] 166. 🟠 `AppMobile.tsx`/Hero com a imagem do celular renderizando bem em todas as larguras (atenção: arquivo em edição no git status).
- [ ] 167. 🟠 Header/menu colapsa corretamente no mobile (hambúrguer, `UserMenu`); sobreposição/z-index do menu OK.
- [ ] 168. 🟠 Cards de dentista, busca e mapa empilham/reflowam sem cortar conteúdo nem botões.
- [ ] 169. 🟡 Tipografia fluida/legível no mobile (mínimo ~16px em inputs para evitar zoom automático no iOS).
- [ ] 170. 🟡 Mapa ocupa altura adequada no mobile; gestos de pan/zoom não “prendem” o scroll da página.
- [ ] 171. 🟡 Safe areas do iOS (notch/home indicator) respeitadas em barras fixas (`env(safe-area-inset-*)`).
- [ ] 172. 🟡 Modais/bottom sheets cabem na viewport com teclado aberto (não escondem o botão de enviar).
- [ ] 173. 🔵 `viewport` meta correto (`width=device-width, initial-scale=1`), sem `maximum-scale=1`/`user-scalable=no` (bloqueia zoom = a11y).
- [ ] 174. 🔵 Imagens `sizes` responsivos servindo resolução adequada por device (não baixar imagem desktop no mobile).
- [ ] 175. 🔵 Orientação landscape no celular não quebra telas-chave (busca, dentista).

## L. Cross-browser

- [ ] 176. 🟠 Chrome, Edge, Firefox, Safari (macOS) e Safari iOS — render e funcionalidade equivalentes nas telas-chave.
- [ ] 177. 🟠 Safari/iOS: geolocalização, `position: sticky`, `backdrop-filter`, flex/grid gaps e `100vh` (usar `100dvh`) testados.
- [ ] 178. 🟠 Leaflet funciona em Safari iOS e Android Chrome (toque, zoom, marcadores, heatmap).
- [ ] 179. 🟡 Firefox: fontes `woff2`, máscaras/SVG e `clamp()` ok.
- [ ] 180. 🟡 Autofill/gerenciador de senhas dos navegadores não quebra layout dos formulários.
- [ ] 181. 🟡 Datas/números formatados via `Intl` com locale pt-BR consistente entre navegadores.
- [ ] 182. 🔵 Sem APIs não suportadas sem fallback (ex.: `navigator.geolocation` ausente/negado tratado).
- [ ] 183. 🔵 Comportamento com JS desabilitado: conteúdo essencial (SSR) ainda legível e indexável.
- [ ] 184. 🔵 Cookies/sessão funcionam com bloqueadores de terceiros (cookies são de 1ª parte do próprio domínio).

## M. UX, fluxos e estados

- [ ] 185. 🟠 Estados de **loading** (skeleton/spinner) em busca, listas, dashboard, mapa.
- [ ] 186. 🟠 Estados **vazios** tratados (busca sem resultado, dentista sem foto/bio, sem avaliações, sem endereços).
- [ ] 187. 🟠 Estados de **erro** com mensagem clara e ação de retry (falha de rede, geolocalização negada, Supabase fora).
- [ ] 188. 🟠 `error.tsx`/error boundaries por segmento de rota — uma falha não derruba o app inteiro.
- [ ] 189. 🟠 Busca: comportamento quando o usuário **nega** geolocalização (pedir localização/CEP e ainda assim mostrar distância — alinhado aos commits recentes de busca).
- [ ] 190. 🟡 Busca textual não mostra “0 km” enganoso sem localização (regressão já tratada em commit — confirmar que segue ok).
- [ ] 191. 🟡 Feedback de sucesso/erro consistente via `sonner` (salvou bio, atualizou endereço, enviou contato).
- [ ] 192. 🟡 Confirmação antes de ações destrutivas (excluir conta/endereço/foto) com `AcoesConta`.
- [ ] 193. 🟡 Botões com estado `loading`/`disabled` durante submit (evita duplo-clique/duplo-envio).
- [ ] 194. 🟡 Navegação “voltar” do navegador preserva estado da busca (query/scroll) de forma razoável.
- [ ] 195. 🔵 Links externos (Instagram, redes) com `target="_blank"` + `rel="noopener noreferrer"`.
- [ ] 196. 🔵 Microcopy pt-BR consistente, sem placeholder “Lorem ipsum”/textos de IA esquecidos.
- [ ] 197. 🔵 Scroll restoration entre navegações de rota previsível.

## N. Formulários, validação & integrações

- [ ] 198. 🟠 Validação no **cliente e no servidor** (nunca confiar só no cliente) para todos os forms.
- [ ] 199. 🟠 `lib/cro.ts` valida formato e dígito/UF do CRO; mensagens claras; sem aceitar lixo.
- [ ] 200. 🟠 `lib/cep.ts` valida e busca CEP com tratamento de CEP inexistente/timeout da API externa.
- [ ] 201. 🟠 `lib/validacao.ts`/`lib/contato.ts` validam e-mail e telefone (formato BR) de forma robusta.
- [ ] 202. 🟡 `lib/instagram.ts` normaliza handle/URL (com/sem @, com/sem URL completa) e rejeita inválidos.
- [ ] 203. 🟡 Máscaras de input (telefone, CEP, CRO) não quebram colar/teclado mobile; valor limpo enviado ao back.
- [ ] 204. 🟡 Mensagens de erro próximas ao campo, específicas e em pt-BR.
- [ ] 205. 🟡 Editor de fotos (`react-image-crop`): valida proporção/saída, comprime antes do upload, trata cancelamento.
- [ ] 206. 🟡 `EnderecosEditor`/`EnderecoCard`: limites de quantidade, validação de cada endereço, geocodificação consistente.
- [ ] 207. 🔵 Autocomplete/`SugestaoEndereco` com debounce, teclado (setas/enter) e fechamento ao clicar fora.
- [ ] 208. 🔵 Campos com `autocomplete`/`inputmode`/`type` corretos (email, tel, etc.) p/ teclado mobile.

## O. Autenticação, sessão & área Pro

- [ ] 209. 🔴 Login dentista (`/auth/login-dentista`, `EntrarForm`) e callback OAuth (`/auth/callback`) estabelecem sessão corretamente, sem corrida de cookies (ver comentário do `proxy.ts`).
- [ ] 210. 🔴 Logout (`encerrar-sessao.ts`) limpa sessão/cookies de fato; após logout, `/pro/*` redireciona para `/entrar`.
- [ ] 211. 🟠 `AuthListener`/`UserMenu` refletem estado de login em tempo real no header das páginas públicas (ilha cliente).
- [ ] 212. 🟠 Expiração/renovação de token (proxy) testada: sessão longa não “cai” navegando entre Server Components.
- [ ] 213. 🟠 `origem-login.ts`/`sessao-cookie.ts` — origem do login tratada com segurança; cookie não manipulável para escalar privilégio.
- [ ] 214. 🟡 Redirecionos pós-login levam ao destino pretendido (e validado — ver item 55).
- [ ] 215. 🟡 Acesso direto a URLs profundas de `/pro` sem login → redireciona, sem flash de conteúdo protegido.
- [ ] 216. 🟡 Verificação de CRO: fluxo cliente (`VerificarCroDetalheCliente`) e listagem refletem status real; e-mail `cro-inativa.html` disparado corretamente.
- [ ] 217. 🔵 `CroVerificationBadge` mostra estado correto (verificado/pendente/inativo) e é consistente entre perfil público e dashboard.

## P. Busca, geolocalização & mapas

- [ ] 218. 🟠 Busca por especialidade + localização retorna resultados corretos e ordenados por distância real do usuário.
- [ ] 219. 🟠 Distância calculada a partir da localização **real** do usuário (commits recentes) — sem regressão de “0 km” / distância fixa.
- [ ] 220. 🟠 Quando falta localização, o app a solicita (geolocalização ou CEP) e só então calcula distância — UX alinhada aos últimos fixes.
- [ ] 221. 🟡 `HeatMapLayer`/`leaflet.heat` renderiza sem travar; performance ok com muitos pontos; limpa camadas ao desmontar (sem leak).
- [ ] 222. 🟡 Marcadores do mapa com popup/acessível; clique leva ao perfil do dentista.
- [ ] 223. 🟡 `lib/busca.ts` + `log-busca.ts` registram busca sem PII e sem quebrar a UX se o log falhar.
- [ ] 224. 🟡 `sugestoes.ts`/`SugestaoEndereco` — provedor de geocoding com tratamento de limite/erro e resultados pt-BR.
- [ ] 225. 🔵 Mapa não vaza memória ao navegar entre rotas (cleanup do Leaflet em `useEffect`).
- [ ] 226. 🔵 Fallback quando geolocalização é negada/indisponível (item 182) sem erro no console.

## Q. Analytics & DBA (área restrita)

- [ ] 227. 🟠 `dashboard-analytics`/`dba` só acessível a superuser; nenhum dado agregado de terceiros vaza para dentista comum.
- [ ] 228. 🟡 `lib/analytics.ts`/`lib/dba.ts` — métricas corretas, sem dupla contagem; testes cobrem agregações.
- [ ] 229. 🟡 `recharts` carregado sob demanda (item 82); gráficos com estado vazio/carregando.
- [ ] 230. 🟡 `UrgenciasPainel`/`AnalisePainel`/`DbaPainel` tratam datasets vazios e grandes sem travar.
- [ ] 231. 🔵 Filtros de período/região consistentes e com timezone correto (America/Sao_Paulo).

## R. Conteúdo, legal & LGPD

- [ ] 232. 🟠 `/privacidade` e `/termos` completos, datados, com base legal LGPD; nav (`PrivacidadeNav`/`TermosNav`) funcional.
- [ ] 233. 🟠 Banner/consentimento de cookies se houver tracking/analytics; respeita opt-out antes de coletar.
- [ ] 234. 🟠 Coleta de geolocalização e dados de busca declarada na política; consentimento ao pedir localização.
- [ ] 235. 🟡 Direitos do titular (acesso/exclusão de dados) — exclusão de conta (`AcoesConta`) realmente apaga/anonimiza dados.
- [ ] 236. 🟡 Conteúdo médico/odontológico com disclaimers adequados (não é aconselhamento; procure profissional).
- [ ] 237. 🟡 `/sobre` (MVV) coerente com o restante; sem contradições de proposta de valor.
- [ ] 238. 🔵 Dados de contato/responsável e canal de privacidade (DPO/e-mail) publicados.
- [ ] 239. 🔵 Créditos de imagens (`public/especialidades/CREDITOS.txt`, fontes OFL) corretos e licenças respeitadas.

## S. Internacionalização & formatação pt-BR

- [ ] 240. 🟡 Datas, moeda e números via `Intl`/locale pt-BR consistentes (sem mistura de formato).
- [ ] 241. 🔵 Distância formatada em km/m de forma humana e arredondada (sem “3.7281 km”).
- [ ] 242. 🔵 Acentuação e caracteres especiais corretos em todo o conteúdo (sem mojibake/encoding quebrado).
- [ ] 243. 🔵 Pluralização correta (“1 dentista” vs “2 dentistas”, “1 km” vs “2 km”).

## T. Observabilidade, deploy & infraestrutura

- [ ] 244. 🟠 Monitoramento de erros em produção (ex.: Sentry) ou ao menos logs estruturados no servidor.
- [ ] 245. 🟡 Variáveis de ambiente de produção configuradas no host (Supabase URL/anon key, domínio, etc.) e diferentes de dev.
- [ ] 246. 🟡 Health check / página de status básica; 404 e 500 testados em produção.
- [ ] 247. 🟡 Domínio canônico definido (com/sem `www`) com redirect 301 único; `metadataBase` aponta para ele.
- [ ] 248. 🔵 Headers de cache e segurança aplicados no host (Vercel/Netlify/etc.), não só no Next.
- [ ] 249. 🔵 Backup/retention do banco Supabase configurado.
- [ ] 250. 🔵 Pipeline de CI roda lint + type-check + testes + build antes do deploy.

## U. Verificações finais (smoke test manual)

- [ ] 251. 🔴 Percorrer fluxo completo do **visitante**: home → busca → resultado → perfil do dentista → contato/Instagram.
- [ ] 252. 🔴 Percorrer fluxo completo do **dentista**: cadastro → login → editar bio/fotos/endereços → verificar CRO → logout.
- [ ] 253. 🟠 Percorrer fluxo de **recuperação de senha** de ponta a ponta (e-mail recebido, link válido, troca efetiva).
- [ ] 254. 🟠 Rodar Lighthouse (mobile e desktop) em home, busca, dentista e especialidade — registrar Performance/SEO/Best Practices/A11y.
- [ ] 255. 🟠 Validar todas as URLs do `sitemap.xml` retornam 200 e são indexáveis.
- [ ] 256. 🟡 Testar com conexão lenta (throttling 3G) e CPU 4×: app utilizável.
- [ ] 257. 🟡 Verificar console do navegador limpo (sem erros/warnings) nas telas-chave.
- [ ] 258. 🟡 Conferir que **nada** importa de `..\site-k11` (escopo isolado em site-R0).
- [ ] 259. 🔵 Revisar `git status`: arquivos em edição (`AppMobile.tsx`, `celular.png`) intencionais; sem assets órfãos (`celular-ref2.png` removido).
- [ ] 260. 🔵 Revisar textos de marca/contato/redes sociais reais (sem placeholders) antes do go-live.

---

## Resumo de contagem
**Total de itens: 260** (≥ 200 exigidos). Distribuição por bloco:

| Bloco | Itens |
|---|---|
| A. Build & tooling | 1–20 |
| B. Arquitetura/redundância | 21–40 |
| C. TypeScript | 41–47 |
| D. Segurança | 48–74 |
| E. Performance | 75–100 |
| F. SEO técnico | 101–122 |
| G. Dados estruturados | 123–132 |
| H. GEO | 133–143 |
| I. AEO | 144–150 |
| J. Acessibilidade | 151–163 |
| K. Responsividade | 164–175 |
| L. Cross-browser | 176–184 |
| M. UX/estados | 185–197 |
| N. Formulários | 198–208 |
| O. Auth/sessão | 209–217 |
| P. Busca/mapas | 218–226 |
| Q. Analytics/DBA | 227–231 |
| R. Legal/LGPD | 232–239 |
| S. i18n pt-BR | 240–243 |
| T. Observabilidade/deploy | 244–250 |
| U. Smoke test final | 251–260 |

---

## Próximo passo sugerido
Com a checklist aprovada, executo a auditoria por blocos (começando pelos 🔴 de **Segurança**, **SEO técnico** e **Performance**), produzindo um relatório de achados (`auditoria/01-achados.md`) com: arquivo:linha, severidade, evidência, impacto e correção proposta. Você revisa e eu aplico as correções aprovadas.
