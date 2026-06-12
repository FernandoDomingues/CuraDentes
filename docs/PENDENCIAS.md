# Pendências do Projeto

Lista de itens do checklist de QA que ainda não foram concluídos, com contexto e rationale.

---

## 🔴 Pendências em aberto (atualizado 2026-06-12)

Tudo o que depende de **código** está resolvido. Restam apenas itens cadastrais/jurídicos:

1. **Endereço físico da empresa** — preencher o placeholder `[Inserir endereço da empresa]` na seção "Contato" das páginas `/privacidade` (`src/pages/Privacidade.tsx`) e `/termos` (`src/pages/TermosDeUso.tsx`). Dado cadastral, basta substituir o texto.
2. **Revisão jurídica final (recomendado, não bloqueante)** — os textos de Privacidade e Termos já existem completos (11 seções cada) e a política de retenção está definida (expurgo de geo na exclusão, sem prazo). Recomenda-se um aval jurídico antes de tratar como definitivos.

> A questão original de "prazo de retenção de geolocalização" (antigo item C) foi **encerrada**: adotamos retenção zero / expurgo na exclusão (`migration 20260612250000`). Detalhes na seção "A. LGPD" abaixo.

---

## Como o checklist foi construído

Em uma sessão de QA, mapeamos 10 itens de melhoria no projeto. Itens 1, 2, 3 foram resolvidos antes do checklist formal (observação inicial, mocks substituídos por Supabase real, e `.env` migrado para Vercel). Itens 5, 6, 7, 8, 9 estão **concluídos**. Em sessões seguintes (itens 11-14) foram feitas mais melhorias de UX/auth. **Todos os 10 itens originais estão concluídos.**

---

## Itens concluídos nas sessões de 2026-06-10

- **Item 4 — Code-split:** 13 rotas convertidas para `React.lazy()` + `<Suspense>` com fallback `<Loader2>`. Bundle index reduzido de 742 kB → 405 kB; chunks por rota de 2–51 kB.
- **Item 10 — Playwright E2E:** 33 testes (11 por engine: Chromium + Firefox + WebKit) em `tests/e2e/`. Cobrem home, busca, perfil de dentista e 404. Helper `collectErrors` filtra falsos positivos (erros de API Supabase, migrations pendentes).
- **Peer-dep warning eliminado:** `@vitejs/plugin-react-swc` → `@vitejs/plugin-react` (Babel). `npm install` agora funciona sem `--legacy-peer-deps`.
- **Busca por nome do dentista:** adicionado `nome.ilike.%${q}%` nas queries textuais do `Pesquisa.tsx`.
- **Soft delete (LGPD):** migration `20260610120000_soft_delete.sql` com colunas `deleted_at`/`deleted_by` em `curadentespro` e `clientes`, RLS policies atualizadas, função `apagar_dados_cliente()`.

---

## Itens concluídos (referência)

- **Item 5 — Lint:** 35 errors + 8 warnings → 0 errors + 7 warnings. Auto-fix + correções manuais em 14 arquivos. Substituídos `any` por tipos Supabase; `catch {}` viraram `catch (err) { console.warn(...) }`; interfaces vazias → `type` aliases.
- **Item 6 — Geolocalização opt-in:** refatorado `useUserLocation` para não disparar prompt no mount. Botão "Usar minha Localização" em desktop e mobile com cache local (TTL 30 min).
- **Item 7 — StrictMode + tsconfig:** `<StrictMode>` envolvendo `<App />`. `tsconfig.app.json` endurecido (`noFallthrough`, `noUnusedLocals`, `noUnusedParameters`). 43 erros de typecheck corrigidos.
- **Item 8 — RLS Supabase:** migration `2026-06-02_seguranca_rls_storage.sql` substituiu 3 policies permissivas por 12 granulares, tornou `get_dentistas_proximos` SECURITY DEFINER, e adicionou 4 policies de Storage no bucket `fotos-dentistas`. Teste E2E em `tests/security/rls.test.ts` valida.
- **Item 9 — Test files organizados:** 5 scripts de debug ad-hoc deletados. Criados `tests/smoke/supabase.test.ts` (4 checagens) e `tests/security/rls.test.ts` (6 checagens RLS) com scripts npm.
- **Item 11 — Remoção do Google login no modal dentista:** o dentista usava "email/senha, Google ou criar conta". Agora é só "email/senha ou criar conta". `signInWithGoogle` no `useAuth` foi mantido (pacientes, `HeroSection`, `CtaBanner` continuam usando).
- **Item 12 — Auto-fill de CEP via ViaCEP (Etapa 4 do cadastro Pro):** criado `src/hooks/useCepLookup.ts` (debounce 500ms, cache localStorage 7 dias, AbortController para evitar race condition, estados `loading`/`notFound`/`error`). Sub-componente `CepInputComBusca` encapsula o hook. Auto-preenche `logradouro`, `bairro`, `cidade`, `estado` (sempre sobrescreve). `numero`, `complemento`, `nome_clinica` ficam manuais. `MeuPerfil.tsx` não foi tocado (escopo apenas do cadastro).
- **Item 13 — Email verification: senha antes do email:** o usuário pode verificar o email antes de definir a senha. Usamos uma senha placeholder no `signUp` (depois removido no item 14) e sincronizamos a senha real via `updateUser` ao avançar da Etapa 1 (`avancarEtapa1`). `updateUser` é idempotente.
- **Item 14 — Migração do fluxo de email: `signUp` → `signInWithOtp`:** o template "Confirm sign up" do GoTrue tem uma trava interna de "uma vez por endereço" — emails subsequentes para o mesmo destinatário não chegavam (mesmo com `resend` retornando 200). Migramos para `signInWithOtp` com `shouldCreateUser: true` (cria user stub em `auth.users`), `verifyOtp({type:"email"})` para validar, e reenvio via nova chamada a `signInWithOtp` (padrão recomendado pela doc oficial do Supabase para OTPs passwordless). SMTP do Supabase configurado com Hostinger (`smtp.hostinger.com:465` SSL). Trade-off aceito: user stubs em `auth.users` se o dentista abandonar o cadastro.
  - **Customização de templates:** ver seção "Customização de email templates" em `docs/SEGURANCA.md` (template ativo é "Magic link", não "Confirm sign up").
- **Item 15 — Redefinição de senha (`resetPasswordForEmail` + `updateUser`):** nova seção "Segurança" no `MeuPerfil.tsx` com botão "Trocar senha" que dispara o template "Password recovery" do Supabase. O link do email leva para a nova página `/pro/redefinir-senha` (público, valida sessão de recovery via evento `PASSWORD_RECOVERY` do `onAuthStateChange`). Form com barra de força reutilizada do `NovoCadastro.tsx`. Após salvar, `signOut()` e redirect para home. SMTP usa o mesmo `do-not-reply@curadentes.com.br`. Requer adicionar `${SiteURL}/pro/redefinir-senha` à lista de "Redirect URLs" no Supabase Dashboard. Ver seção "Fluxo de redefinição de senha" em `docs/SEGURANCA.md`.

- **Item 16 — Retomada de cadastro no Passo 2 + Indicadores de Pendência + TDD Obrigatório**:
  - Dentistas com cadastro incompleto sempre retornam ao **Passo 2 (Telefone)** ao acessar `/pro/novo-cadastro`, independentemente de quais passos já foram preenchidos.
  - Campos não preenchidos ficam com destaque em **laranja** (borda + sombra) quando há progresso posterior detectado.
  - A **barra de progresso** exibe cada etapa com **ícone de check verde** (se concluída) ou **exclamação laranja** (se pendente).
  - Lógica de validação centralizada em `src/utils/cadastroValidation.ts` (reutilizada no frontend e nos testes TDD).
  - Testes unitários em `tests/cadastro/validation.test.ts` cobrem: telefone, CPF (Módulo 11), CRO, endereços e status por etapa.
  - **TDD é agora obrigatório para todo desenvolvimento futuro neste projeto** (documentado no `README.md`). Nenhuma tarefa deve ser considerada concluída sem que `npm run test:all` passe com 0 falhas.

## Pendências TÉCNICAS (não estavam no checklist, mas valem nota)

### A. LGPD — Política de Privacidade e Termos de Uso (pendente)

- ✅ Soft delete (`deleted_at`/`deleted_by`) implementado em `curadentespro` e `clientes`
- ✅ Função `apagar_dados_cliente()` criada (right to be forgotten)
- ✅ Política de retenção/expurgo de `clientes.latitude`/`longitude` — **definida: retenção zero**. A `apagar_dados_cliente()` zera lat/lng no momento da exclusão (`migration 20260612250000`). A coordenada é só cache de conveniência, readquirível pelo navegador; eliminada ao fim da finalidade (LGPD art. 15/16).
- ✅ Texto de Política de Privacidade (`/privacidade`, `src/pages/Privacidade.tsx`, 11 seções) e Termos de Uso (`/termos`, `src/pages/TermosDeUso.tsx`, 11 seções) — completos e linkados no Header/Footer. A seção 8 (retenção) da Privacidade reflete o expurgo de geo na exclusão.
- ❌ Preencher o endereço físico da empresa (placeholder `[Inserir endereço da empresa]` em ambas as páginas, seção "Contato") — dado cadastral.
- ⚠️ Recomendado: revisão jurídica final dos textos antes de tratar como definitivos.

**Pendente:** apenas (a) preencher o endereço da empresa e (b) revisão jurídica final. A redação base já existe e a retenção de dados após o "esquecimento" foi resolvida com expurgo na exclusão (sem prazo a definir).

### B. ~~Conflito de peer dependencies (Vite 8)~~ ✅ Resolvido

`@vitejs/plugin-react-swc` substituído por `@vitejs/plugin-react` (Babel). `npm install` funciona sem `--legacy-peer-deps`.

---

## Próximas melhorias (sugestões, não estão no checklist)

- **Verificação de telefone no cadastro Pro** — atualmente a Etapa 2 do cadastro (`NovoCadastro.tsx`) tem o gate de validação relaxado e a UI de verificação comentada (decisão: telefone é opcional por enquanto). Quando for reativar, opções pesquisadas em 2026-06-02:
  - **WhatsApp Cloud API (Meta)** — 1000 conversas/mês grátis, depois ~US$ 0.0042/utility. Recomendado para BR (todo mundo tem WhatsApp, não paga SMS).
  - **TOTP (Google Authenticator)** — R$ 0, mais seguro que SMS, mas exige instalar app.
  - **Twilio Voice OTP** — ~US$ 0.013/min para BR (chamada de 15s ≈ R$ 0,01), pago desde a primeira.
  - **Twilio SMS** — ~US$ 0.06-0.08 por SMS no BR, mais caro.
  - SMS grátis a longo prazo não existe (carriers sempre cobram terminação).
  - Bloco da UI de SMS/WhatsApp já está no código em `NovoCadastro.tsx` (linhas comentadas com `modoVerifTel`); é só descomentar e religar o state `telefoneVerificado` quando decidir pelo provider.
- **2FA para dentistas** — `supabase.auth.mfa.enroll`
- **Stripe Connect** — para dentistas cobrarem consultas (já tem `@stripe/react-stripe-js` no package.json mas não está em uso)
- **Agendamento real** — tabela `agendamentos` + fluxo de escolha de horário
- **Chat paciente-dentista** — Realtime do Supabase
- **PWA** — service worker para instalar como app (já tem `AppSection` de marketing)

