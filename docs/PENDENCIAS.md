# Pendências do Projeto

Lista de itens do checklist de QA que ainda não foram concluídos, com contexto e rationale.

---

## Como o checklist foi construído

Em uma sessão de QA, mapeamos 10 itens de melhoria no projeto. Itens 1, 2, 3 foram resolvidos antes do checklist formal (observação inicial, mocks substituídos por Supabase real, e `.env` migrado para Vercel). Itens 5, 6, 7, 8, 9 estão **concluídos**. Restam:

| # | Item | Status | Por que adiado |
|---|---|---|---|
| 4 | Code-split do bundle | ⏳ adiado | Conjunto de rotas ainda instável (serão adicionadas mais páginas) |
| 10 | Playwright smoke E2E | ⏳ adiado | Páginas ainda em iteração; testes exigiriam refatoração constante |

---

## Item 4 — Code-split do bundle

**O que é:** Quebrar o bundle único de ~595 kB em chunks por rota usando `React.lazy` + `Suspense` no `App.tsx`. Cada página (`Pesquisa`, `DentistProfile`, `Dashboard`, `MeuPerfil`, `NovoCadastro`) viraria um chunk baixado só quando o usuário acessa a rota.

**Esforço estimado:** ~30-45 min
- Trocar imports diretos em `App.tsx` por `lazy(() => import("@/pages/..."))`
- Envolver `<Routes>` em `<Suspense fallback={<Loader />}>`
- Decidir fallback (spinner? skeleton?)
- Testar build e medir chunks gerados

**Por que adiar:**
- O conjunto de rotas está instável (próximas features vão adicionar mais páginas)
- Cada nova rota exige realocar os limites do `lazy()`
- Suspense fallbacks precisam ser pensados quando o design amadurece
- Code-split feito cedo geralmente é refeito em 1-2 meses

**Quando retomar:** Quando o conjunto de rotas estiver estável (provavelmente quando o MVP estiver "finalizado" do ponto de vista de feature) E quando o item 10 (Playwright) estiver em vigor para validar que nada quebrou.

**Métricas atuais do bundle:**
- `dist/index-*.js`: ~597 kB / gzip 161 kB
- 1641 módulos no build
- Tempo de build: ~1.5s

---

## Item 10 — Playwright smoke E2E

**O que é:** Testes end-to-end que abrem um browser real e validam o fluxo principal do usuário:
1. Home carrega sem erros no console
2. Home → clica "Buscar" → vai pra `/pesquisa`
3. Pesquisa lista dentistas (≥ 1 card visível)
4. Pesquisa → clica num dentista → vai pra `/dentista/:id`
5. Perfil do dentista mostra nome, CRO, endereço
6. URL inexistente → mostra 404

**Esforço estimado:** ~45 min
- `npm install -D @playwright/test --legacy-peer-deps` (conflito pré-existente com Vite 8)
- `npx playwright install chromium` (download ~150 MB)
- Criar `playwright.config.ts`
- Criar 4-6 arquivos `.spec.ts` em `tests/e2e/`
- Adicionar scripts `test:e2e`, `test:e2e:ui` no `package.json`

**Por que adiar:**
- A página está em iteração ativa (mudanças quebrariam testes constantemente)
- Cada refatoração visual / copy / estrutural exigiria atualizar os testes
- Custo/benefício só compensa quando o front estiver "parado" ou em CI

**Quando retomar:**
- Quando a UI estiver estável por 1-2 semanas
- OU quando entrar em CI (aí vira guarda de PR)
- OU quando algum bug em produção pegar o time de surpresa e a busca manual virar problema

**Alternativa mais leve:** teste manual com checklist em [`docs/`](./) ou ferramenta de smoke (k6, Artillery) antes de E2E completo.

---

## Itens concluídos (referência)

- **Item 5 — Lint:** 35 errors + 8 warnings → 0 errors + 7 warnings. Auto-fix + correções manuais em 14 arquivos. Substituídos `any` por tipos Supabase; `catch {}` viraram `catch (err) { console.warn(...) }`; interfaces vazias → `type` aliases.
- **Item 6 — Geolocalização opt-in:** refatorado `useUserLocation` para não disparar prompt no mount. Botão "Usar minha Localização" em desktop e mobile com cache local (TTL 30 min).
- **Item 7 — StrictMode + tsconfig:** `<StrictMode>` envolvendo `<App />`. `tsconfig.app.json` endurecido (`noFallthrough`, `noUnusedLocals`, `noUnusedParameters`). 43 erros de typecheck corrigidos.
- **Item 8 — RLS Supabase:** migration `2026-06-02_seguranca_rls_storage.sql` substituiu 3 policies permissivas por 12 granulares, tornou `get_dentistas_proximos` SECURITY DEFINER, e adicionou 4 policies de Storage no bucket `fotos-dentistas`. Teste E2E em `tests/security/rls.test.ts` valida.
- **Item 9 — Test files organizados:** 5 scripts de debug ad-hoc deletados. Criados `tests/smoke/supabase.test.ts` (4 checagens) e `tests/security/rls.test.ts` (6 checagens RLS) com scripts npm.

---

## Pendências TÉCNICAS (não estavam no checklist, mas valem nota)

### A. Backfill de `user_id` em dentistas seed

Após a migration de segurança (item 8), os 50 dentistas do seed ficaram com `user_id = NULL`. Eles continuam visíveis (SELECT público), mas **não conseguem editar o próprio perfil via painel** porque a policy exige `auth.uid() = user_id`.

**Solução:**
- Dentistas que fizerem signup no site vão popular `user_id` automaticamente (via `signUp` do Supabase Auth + `upsert` na tabela `curadentespro`)
- Para os 50 do seed, rodar manualmente no Studio:
  ```sql
  UPDATE public.curadentespro
    SET user_id = u.id
    FROM auth.users u
    WHERE lower(u.email) = lower(curadentespro.email)
      AND curadentespro.user_id IS NULL;
  ```

### B. FK em `avaliacoes.paciente_id`

A coluna existe mas não tem `REFERENCES auth.users(id)`. INSERT autenticado aceita qualquer UUID. **Não é crítico** (RLS já bloqueia anon), mas seria mais limpo:
```sql
ALTER TABLE public.avaliacoes
  ADD CONSTRAINT avaliacoes_paciente_id_fkey
  FOREIGN KEY (paciente_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Atenção:** pode falhar se houver `paciente_id` órfão. Rodar `SELECT DISTINCT paciente_id FROM avaliacoes WHERE paciente_id NOT IN (SELECT id FROM auth.users);` antes.

### C. LGPD completo (diferido)

Não há ainda:
- `deleted_at` para soft delete
- Política de retenção/expurgo de `clientes.latitude`/`longitude`
- Função `apagar_dados_cliente(cliente_id uuid)` que faz `DELETE FROM auth.users` (cascade apaga tudo)
- Texto de Política de Privacidade + Termos de Uso (hoje são âncoras vazias no Header)

**Decisão jurídica necessária:** prazo de retenção dos dados após "esquecimento".

### D. Conflito de peer dependencies (Vite 8)

`@vitejs/plugin-react-swc@3.x` pede Vite 4-7, mas o projeto tem Vite 8. `npm install` falha sem `--legacy-peer-deps`. **Não bloqueia nada** (build e dev funcionam), mas é warning em todo install novo.

**Possíveis soluções (em ordem de complexidade):**
1. Downgrade Vite para 7.x
2. Trocar `@vitejs/plugin-react-swc` por `@vitejs/plugin-react` (Babel)
3. Usar `--legacy-peer-deps` no CI

---

## Próximas melhorias (sugestões, não estão no checklist)

- **Token de email (signup Pro com verificação)** — `supabase.auth.signInWithOtp` + template de email
- **2FA para dentistas** — `supabase.auth.mfa.enroll`
- **Stripe Connect** — para dentistas cobrarem consultas (já tem `@stripe/react-stripe-js` no package.json mas não está em uso)
- **Agendamento real** — tabela `agendamentos` + fluxo de escolha de horário
- **Chat paciente-dentista** — Realtime do Supabase
- **PWA** — service worker para instalar como app (já tem `AppSection` de marketing)
