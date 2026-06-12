# CuraDentes

Aplicação web que conecta pacientes a dentistas próximos, com busca por geolocalização, perfil completo, avaliações e painel profissional ("CuraDentes Pro").

---

## Visão geral

Este repositório contém a SPA **CuraDentes** (lado paciente) e **CuraDentes Pro** (lado dentista), construídas com Vite + React + TypeScript + Tailwind + shadcn-ui, com backend 100% Supabase (Postgres + Auth + Storage + RPCs).

A landing page convida o usuário a buscar dentistas por bairro, cidade ou proximidade. O perfil do dentista mostra CRO, endereços com agenda, formas de pagamento, convênios, contato (WhatsApp/telefone) e sistema de avaliações 1-5 com média por especialidade. O lado Pro tem signup em 6 etapas, dashboard com métricas e editor de perfil.

---

## Tecnologias

- **Vite 8** + **React 18** + **TypeScript 5** (com `tsconfig.app.json` endurecido: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- **Tailwind CSS 3** + **shadcn-ui** + **lucide-react** (ícones)
- **React Router 6** para SPA
- **Zustand 5** para estado global de auth
- **Supabase JS 2** para Postgres + Auth + Storage + RPCs
- **React Query 5** para cache de queries
- **React Hook Form 7** + **Zod 3** para formulários complexos (signup Pro)
- **Sonner** para toasts
- **StrictMode** ativo em `main.tsx` (item 7 do checklist)

---

## Pré-requisitos

- Node.js 20+ (suporta `--env-file`)
- npm
- Conta no Supabase (projeto configurado em `dsnzgxjuqlalysyfiion`)

---

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar .env (pegar do time ou do Vercel)
#    VITE_SUPABASE_URL=https://dsnzgxjuqlalysyfiion.supabase.co
#    VITE_SUPABASE_ANON_KEY=<chave-anon-publica>

# 3. Dev server (http://localhost:5173)
npm run dev

# 4. Build de produção
npm run build

# 5. Lint + typecheck
npm run lint
npm run typecheck    # roda tsc em src/ E em tests/
```

### Scripts disponíveis

| Script | O que faz |
|---|---|
| `npm run dev` | Inicia o Vite dev server |
| `npm run build` | Build de produção (gera `dist/`) |
| `npm run preview` | Serve o build localmente |
| `npm run lint` | ESLint em todo o projeto |
| `npm run typecheck` | TypeScript em `src/` + `tests/` |
| `npm run test:cadastro` | ⚠️ **TDD obrigatório** — testes unitários de validação do cadastro Pro |
| `npm run test:smoke` | 4 checagens rápidas contra o Supabase |
| `npm run test:security` | 6 testes E2E de RLS + Storage |
| `npm run test:all` | Roda cadastro + smoke + security |

---

## Estrutura de pastas

```
site-k7/
├── src/
│   ├── pages/                # Rotas da SPA
│   │   ├── Index.tsx         # Home (landing)
│   │   ├── Pesquisa.tsx      # Busca de dentistas
│   │   ├── DentistProfile.tsx # Perfil público do dentista
│   │   ├── NotFound.tsx      # 404
│   │   └── pro/              # Rotas autenticadas (dentista)
│   │       ├── NovoCadastro.tsx  # Signup em 6 etapas
│   │       ├── Dashboard.tsx     # Painel principal Pro
│   │       └── MeuPerfil.tsx     # Editor de perfil
│   ├── components/
│   │   ├── layout/           # Header, Footer
│   │   ├── features/         # HeroSection, HowItWorks, etc.
│   │   └── ui/               # shadcn-ui primitives
│   ├── hooks/
│   │   ├── useAuth.ts            # Zustand store + Supabase Auth
│   │   ├── useUserLocation.ts    # Geolocalização OPT-IN (LGPD)
│   │   ├── useCepLookup.ts       # Auto-fill de CEP via ViaCEP (debounce + cache 7d)
│   │   └── useAddressSuggestions.ts # Autocomplete fuzzy
│   ├── lib/
│   │   ├── supabase.ts       # Cliente singleton
│   │   ├── dentistCache.ts   # Cache local de busca (localStorage)
│   │   ├── uploadService.ts  # Upload de foto pro Storage
│   │   └── geocoding.ts      # Nominatim (OpenStreetMap)
│   ├── types/                # Tipos TypeScript compartilhados
│   └── constants/            # Dados estáticos (chips, listas)
├── supabase_migrations/       # SQL aplicado no Supabase Studio
│   ├── supabase_migration_final.sql    # Schema (seeds com PII removidos do versionamento — LGPD)
│   ├── nova_migracao_raio3km.sql        # lat/lng + RPC Haversine
│   ├── fix_rpc_get_dentistas_proximos.sql # Cast types v2
│   └── nova_migracao_avaliacoes.sql    # Tabela avaliacoes + RLS
├── tests/                    # Smoke + security + unit tests
│   ├── cadastro/validation.test.ts  # ⚠️ TDD: valida regras do cadastro Pro
│   ├── smoke/supabase.test.ts
│   └── security/rls.test.ts
├── docs/
│   ├── PENDENCIAS.md         # Itens pendentes (4, 10 + outros)
│   └── SEGURANCA.md          # Modelo de RLS + Storage
├── tsconfig.app.json         # TS config endurecido (item 7)
├── tsconfig.test.json        # TS config para tests/
├── vite.config.ts            # Vite + CSP (Google OAuth, Google Fonts)
└── package.json
```

---

## Rotas

| Rota | Auth | Descrição |
|---|---|---|
| `/` | público | Landing page com busca, especialidades, últimos dentistas |
| `/pesquisa?q=...&lat=...&lng=...&r=5` | público | Resultados de busca com filtros (raio, convênios, pagamentos) |
| `/dentista/:id` | público | Perfil completo do dentista + avaliações |
| `/pro/novo-cadastro` | público (cria auth) | Signup Pro em 6 etapas |
| `/pro/dashboard` | autenticado (dentista) | Painel com endereços, agenda, métricas |
| `/pro/perfil` | autenticado (dentista) | Editor de perfil |
| `*` | público | 404 |

---

## Padrões importantes

- **Imports**: use `@/` para apontar para `src/` (configurado em `tsconfig.app.json` e `vite.config.ts`)
- **Estado global**: Zustand para auth, `useState` para o resto
- **Cache local**: `localStorage` para user, geolocalização, query de busca, e cache de perfis
- **Geolocalização**: SEMPRE opt-in (botão explícito). Nunca chamar `getCurrentPosition` no mount
- **Busca**: usa `get_dentistas_proximos` (RPC SECURITY DEFINER) + busca textual em paralelo
- **CEP**: auto-fill via ViaCEP (hook `useCepLookup`), com debounce 500ms e cache local de 7 dias
- **Auth**: Zustand store com cache local em `localStorage` para login instantâneo
- **TypeScript**: `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters` ativos
- **Lint**: 0 errors, 7 warnings shadcn vendor (esperado, ignore)
- **Validação centralizada**: lógica de validação em `src/utils/cadastroValidation.ts` — reutilizada no frontend e nos testes

---

## ⚠️ Metodologia TDD — OBRIGATÓRIO

> **Para qualquer agente de IA ou desenvolvedor que atuar neste projeto:** a metodologia **Test-Driven Design (TDD)** é obrigatória.

### Regras:
1. **Escreva os testes antes** (ou simultaneamente) a qualquer nova lógica de validação ou regra de negócio.
2. **Centralize a lógica** em `src/utils/` para que possa ser importada tanto pelo frontend quanto pelos testes.
3. **Execute `npm run test:all` antes de considerar qualquer tarefa concluída.** Se algum teste falhar, a tarefa não está concluída.
4. **Não duplique validações** — a fonte da verdade é `src/utils/cadastroValidation.ts`.
5. **Documente novos testes** em `tests/` e atualize os scripts em `package.json`.

### Arquivos de teste atuais:
| Arquivo | O que valida |
|---|---|
| `tests/cadastro/validation.test.ts` | Regras de validação do cadastro Pro (CPF, CRO, telefone, endereços, etapas) |
| `tests/smoke/supabase.test.ts` | Conectividade Supabase (schema, RPC, últimos dentistas) |
| `tests/security/rls.test.ts` | Segurança RLS (leitura pública, bloqueio de delete/insert anônimo) |

---

## 🚨 Pendências de Segurança (auditoria 2026-06-11)

> **Status:** identificadas em análise de código. **#1 e #6 corrigidas em 2026-06-12** (ver abaixo); demais pendentes.
> Falsos positivos já descartados: `.env` está no `.gitignore` (não versionado); anon key e Google Client ID são públicos por design; tabelas `curadentespro`/`clientes`/`enderecos` têm RLS por `auth.uid()`; o "DELETE policy ausente" é soft-delete proposital.

### ✅ Resolvidas (2026-06-12)

- **#1 — Escalada de privilégio na RPC `marcar_verificacao_cro`** — corrigida em `supabase/migrations/20260612090000_fix_marcar_verificacao_cro_authz.sql` (aplicada no remoto via `supabase db push`). Adicionado gate de autorização **dentro** da função (`IF NOT public.is_superuser() THEN RETURN não-autorizado`). Regressão coberta em `tests/security/rls.test.ts` (testes [7] anon e [8] não-superuser, este último condicional a `TEST_DENTISTA_EMAIL`/`TEST_DENTISTA_PASSWORD` no `.env`).
- **#6 — Email de superadmin hardcoded** — centralizado no helper `public.is_superuser()` (fonte única da verdade). As policies de `cro_verificacoes` e `logs_busca` agora chamam o helper; para trocar o admin, altera-se só a função. _(Resta migrar as policies antigas de `curadentespro`, se houver, para o helper.)_

### 🔴 Críticas (exploráveis por qualquer conta autenticada hoje)

2. **Edge function `send-rating-notification` é relay de email aberto** — `supabase/functions/send-rating-notification/index.ts:16-67`.
   Sem verificação de identidade/role, sem rate limiting, CORS `*`. Payload (`dentistEmail`, `dentistName`, `patientName`) totalmente controlado pelo chamador → spam/phishing via `do-not-reply@curadentes.com.br` e consumo de créditos do Resend.
3. **Edge function `scrape-cro` sem auth + sessões em memória** — `supabase/functions/scrape-cro/index.ts:238-292` (CORS `*` na linha 243).
   Sem autenticação (força-bruta/scraping do SISCAF via nossa infra). Além disso, sessões num `Map` em memória (linha 51) **quebram entre instâncias/cold starts** → fluxo captcha→consulta falha de forma intermitente. Migrar para Supabase KV/tabela.

### 🟠 Altas

4. **Não existe `ProtectedRoute`** — `src/App.tsx:75-92`. Todas as rotas `/pro/*` (incl. admin `/pro/verificar-cro` e `/pro/verificar-cro/:id`) estão no router **sem guarda de autorização**, apesar de `docs/SEGURANCA.md:248` afirmar que existe. Hoje só o RLS protege — e a falha #1 mostra que o RLS está furado para a operação sensível.
5. **Validação de upload só no cliente** — `src/lib/uploadService.ts`. Tamanho (2MB) e MIME checados apenas no front; bucket Storage sem limite/allowed-mime por policy → contornável via API direta.
6. ~~**Email de superadmin hardcoded em 7 policies**~~ — ✅ **resolvida em 2026-06-12** (centralizada no helper `public.is_superuser()`; ver seção "✅ Resolvidas"). Evolução futura: tabela de roles em vez de email único.

### 🟡 Médias

7. **Mock de produção** — `src/pages/pro/Dashboard.tsx:554` (`dentista.id === 101 ? ["end-1-a"] : []`).
8. **`window.location.reload()` após verificar CRO** — `src/pages/pro/VerificarCro.tsx`. Descarta estado React; preferir refetch.
9. **Modelo de identidade ambíguo (`id` vs `user_id`)** — `src/hooks/useAuth.ts:246-253` grava ambos como `authUser.id`, enquanto os 50 dentistas seed têm `user_id = NULL` (ver `docs/PENDENCIAS.md:47-60`) e não conseguem editar o próprio perfil.
10. **Rascunho do cadastro em `localStorage` com CPF/CRO em texto puro** — `src/pages/pro/NovoCadastro.tsx`. Senha é corretamente omitida, mas PII sensível (LGPD) fica exposta a XSS. Limpar rascunho ao concluir.

### ⚪ Baixas / qualidade

11. `avaliacoes.paciente_id` sem FK para `auth.users` (já em `docs/PENDENCIAS.md:62-71`).
12. `signInWithOAuth` com `redirectTo: window.location.href` (`src/hooks/useAuth.ts:95`) — usar rota de callback fixa.
13. Textos legais de Privacidade/Termos ainda pendentes (decisão jurídica — `docs/PENDENCIAS.md:73-80`).

**Ordem de ataque sugerida:** #1 → #2/#3 → #4. As três primeiras são exploráveis por qualquer conta autenticada hoje.

---

## Documentação adicional

- **[`docs/PENDENCIAS.md`](./docs/PENDENCIAS.md)** — Itens pendentes do checklist de QA
- **[`docs/SEGURANCA.md`](./docs/SEGURANCA.md)** — Modelo de segurança (RLS, Storage, LGPD)
- Migrations em `supabase_migrations/` são comentadas linha-a-linha

---

## Deploy

Build estático vai pra Vercel. Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas no painel da Vercel (não no `.env` versionado).

```bash
npm run build       # gera dist/
vercel --prod       # deploy
```

---

## Licença

MIT — ver `LICENSE`.
