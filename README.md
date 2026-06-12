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

## 🛡️ Auditoria de Segurança (2026-06-11) — resolvida em 2026-06-12

> Todas as falhas de código identificadas na auditoria foram corrigidas e aplicadas em produção. Resta apenas item de decisão jurídica.
> Falsos positivos descartados: `.env` está no `.gitignore`; anon key e Google Client ID são públicos por design; o "DELETE policy ausente" é soft-delete proposital.

### ✅ Resolvidas

- **#0 — Vazamento de CPF (LGPD)** — `migration 20260612110000`. O RLS é row-level, não column-level, então qualquer um lia o CPF de todos via REST. Removido o SELECT de tabela de anon/authenticated + GRANT por coluna (tudo menos `cpf`); o dono lê o próprio CPF via RPC `meu_cpf()`. Teste [9] em `rls.test.ts`.
- **#1 — Escalada de privilégio na RPC `marcar_verificacao_cro`** — `migration 20260612090000`. Gate `IF NOT public.is_superuser()` dentro da função SECURITY DEFINER. Testes [7]/[8] em `rls.test.ts`.
- **#2 — Edge function `send-rating-notification` (relay aberto)** — agora exige usuário autenticado real (`auth.getUser()` na função) e CORS reflete a origem. Verificado: chamada só com anon key → 401. Redeployada.
- **#3 — Edge function `scrape-cro`** — **removida** (deployada + local). Era código morto, sem auth, com sessões em memória. Superfície de ataque eliminada.
- **#4 — Guarda de rota** — criado `RequireSuperuser` envolvendo `/pro/dashboard-analytics`, `/pro/verificar-cro` e `/pro/verificar-cro/:id`. As demais `/pro/*` se auto-protegem (checagem de sessão + RLS).
- **#5 — Validação de upload no servidor** — bucket `fotos-dentistas` já tem `file_size_limit = 2MB` e `allowed_mime_types` (jpeg/png/webp); documentado em `migration 20260612120000`.
- **#6 — Email de superadmin hardcoded** — centralizado no helper `public.is_superuser()` (fonte única).
- **#7 — Mock de produção** — removido o `dentista.id === 101` do `Dashboard.tsx`; urgência passa a vir do campo real `atende_urgencias`.
- **#8 — `window.location.reload()`** — trocado por `setRecarregar()` (refetch) em `VerificarCro.tsx`.
- **#9 — Backfill de `user_id`** — verificado: 0 dentistas ativos sem `user_id` (já estava feito).
- **#10 — CPF/CRO no `localStorage`** — removidos do rascunho do cadastro (`NovoCadastro.tsx`); ficam só em memória até o upsert.
- **#11 — FK `avaliacoes.paciente_id → auth.users`** — `migration 20260612120000` (0 órfãos verificados, `ON DELETE CASCADE`).
- **#12 — `signInWithOAuth` redirect** — `redirectTo` passou de `window.location.href` para `origin + pathname` (sem query/hash).

### ⏳ Pendente (fora do código)

- **#13 — Textos legais de Privacidade/Termos** — depende de decisão/redação jurídica (`docs/PENDENCIAS.md:73-80`).

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
