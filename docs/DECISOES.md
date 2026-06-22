# Decisões de arquitetura (ADR) — site-R0

Este arquivo registra **por que** cada escolha foi feita, em linguagem simples.
Serve para quem entra no projeto entender o raciocínio sem precisar perguntar.

---

## 1. Por que Next.js (e não continuar SPA)
**Problema:** o site antigo (`site-k11`) é uma SPA em Vite/React. O servidor
entrega um HTML "vazio" e o conteúdo só aparece depois que o JavaScript roda no
navegador. Buscadores e IAs que não executam JS veem páginas vazias → o site
quase não é indexado nem citado.

**Decisão:** usar **Next.js** com renderização no servidor (SSR) e geração
estática (SSG). As páginas públicas (perfil de dentista, especialidade,
localidade) passam a chegar como **HTML completo**, prontas para Google e IAs
lerem e citarem.

**Consequência:** muito melhor SEO/AEO; um pouco mais de complexidade do que uma
SPA pura (precisamos pensar o que roda no servidor x no cliente).

## 2. Por que reusar o mesmo Supabase
**Decisão:** o back-end (banco de dados, autenticação, storage, RPCs, RLS,
Edge Functions) **continua sendo o mesmo Supabase** do site-k11. Não recriamos
o back-end — só o front-end.

**Por quê:** os dados reais (dentistas, avaliações, cadastros) já estão lá. Os
"manuais de back-end" (em `docs/backend/`) vão **documentar** esse Supabase, não
substituí-lo.

## 3. Por que TDD (teste antes do código)
**Decisão:** cada função/módulo nasce com um teste escrito **antes** da
implementação (Test-Driven Development).

**Por quê:** numa reconstrução grande, os testes garantem que cada peça faz o que
deve e que mudanças futuras não quebram o que já funciona. Dá segurança para
refatorar.

## 4. Por que reconstruir em fases (e manter o site-k11 no ar)
**Decisão:** construir o site-R0 em fases, mantendo o `site-k11` **intacto e
funcionando** até o site-R0 ter todas as funcionalidades. Só então fazemos a
troca ("cutover"), e o site-k11 é guardado num backup.

**Fases:**
- **Fase 0** — fundação: scaffold do Next.js, TDD (Vitest), estrutura de pastas,
  documentação inicial e cliente Supabase. ✅
- **Fase 1** — páginas públicas (home, busca, perfil do dentista, especialidade,
  urgência, sobre, termos, privacidade) com SSR/SSG + dados estruturados
  (JSON-LD por dentista) + `sitemap.xml` + `robots.txt`. *(o coração do orgânico)* ✅
  - Perfil `/dentista/[id]`: SSR (revalidate 1h) + `generateMetadata` + JSON-LD
    `Dentist`/`PostalAddress`/`AggregateRating` + Breadcrumb.
  - Especialidade `/especialidade/[slug]`: SSG (generateStaticParams) + FAQ JSON-LD.
  - Home: JSON-LD `Organization` + `WebSite` (SearchAction). Busca é `<form>` GET.
  - `/busca` e `/urgencia`: casca SSR (indexável) + parte interativa em componente
    cliente (geolocalização/consulta), pois dependem do navegador.
  - Lógica de negócio coberta por TDD (especialidades, avaliações, perfil, JSON-LD,
    contato): 52 testes.
- **Fase 2** — autenticação e área logada (login/entrar, cadastro, dashboard,
  meu perfil, editor de fotos). ✅
  - **Cadastro fica FORA de /pro** (`/cadastro`): o dentista começa anônimo; a
    verificação de e-mail por código (OTP) é o que cria a sessão. /pro é guardado.
  - **Editor de endereços compartilhado** (`components/pro/EnderecosEditor.tsx`)
    entre o cadastro e o "Meu perfil" (DRY).
  - **Auth com cookies (@supabase/ssr), não localStorage:** a sessão vive em
    cookies para o SERVIDOR (middleware/proxy, Server Components, guards) também
    enxergar o login — base de uma área logada com SSR. `proxy.ts` renova a sessão.
  - **Papel derivado no servidor** (`lib/auth.ts`): superuser → dentista → paciente.
    Guard em `app/pro/layout.tsx`. Proteção real dos dados = RLS no banco.
  - Pronto: `/entrar` (Google + dentista) + `/auth/callback`, `/redefinir-senha`,
    `/pro/dashboard`, `/pro/editor-de-fotos`, `/pro/perfil`, `/cadastro`, header
    reativo. Reviews de segurança e de correção (multiagente) aplicados.
- **Fase 3** — analytics, painel DBA, verificação de CRO e app mobile (Capacitor).
  *(em andamento)*
  - **Área do superuser** gated por `requireSuperuser()` no servidor; superuser cai
    em `/pro/dashboard-analytics` (hub). A proteção real é `is_superuser()` (RLS).
  - Pronto: **verificação de CRO** (`/pro/verificar-cro` + `[id]`) com a busca do
    CFO embutida e marcação via RPC `marcar_verificacao_cro`; **Análise do negócio**
    (`/pro/dashboard-analytics`, recharts + mapa de calor Leaflet) e **painel DBA**
    (`/pro/dashboard-analytics/dba`). O shaping de datas roda no cliente (fuso local)
    e o mapa Leaflet é carregado com `next/dynamic { ssr: false }`. Falta só o app
    mobile (Capacitor).
- **Fase 4** — paridade total, manuais de back-end e cutover.

## 5. O que precisa ser replicado do site-k11
Regras de negócio que já existem e devem ser mantidas:
- Nome amigável de especialidade para o paciente x nome canônico (cadastro/SEO).
- Bio do dentista opcional (vazia = não exibe nada, sem texto padrão).
- Estacionamento + "informações ao cliente" por endereço; destaque de urgência.
- Foto de perfil sempre em WebP, caminho fixo por dentista (sem acúmulo).
- Painel DBA e analytics protegidos por `is_superuser()` (só o SuperDom).
