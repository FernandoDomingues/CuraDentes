# Plano de correção — Segurança (A1: headers/CSP + C1: sessão HttpOnly)

> Plano para revisão. **Nada será aplicado sem seu OK.** Site no ar (Vercel, deploy manual `vercel --prod`).
> Relacionado: [01-achados.md](01-achados.md) (C1 e A1).
> Data: 2026-06-25

---

## 0. Resumo e recomendação

| Frente | Risco da correção | Recomendação |
|---|---|---|
| **A1 — Headers + CSP** | Baixo (headers) a médio (CSP, mitigável com rollout Report-Only) | **Fazer primeiro.** É o que mais reduz o risco do C1, com risco controlado. |
| **C1 — Sessão HttpOnly** | **Alto** (refatora toda a auth do cliente) | **Adiar / tratar via A1 + TTL + anti-XSS.** A exposição do token é *inerente* ao `@supabase/ssr` no navegador. |

**Por quê:** o A1 (uma boa CSP) faz com que, mesmo que exista um XSS, o script **não consiga enviar o token para fora** nem carregar script de origem não autorizada — neutralizando na prática o vetor do C1. Já o C1 "de verdade" (HttpOnly) exige reescrever como **todo** o cliente fala com o Supabase.

---

## 1. Por que o C1 NÃO é um fix de uma linha (a descoberta técnica)

O cliente do navegador é o `createBrowserClient` do `@supabase/ssr` ([client.ts:36](src/lib/supabase/client.ts#L36)). Esse cliente **lê e grava a sessão em `document.cookie`**. Para ele enxergar quem está logado, o cookie de sessão **tem que ser legível por JavaScript** — ou seja, **não pode ser `HttpOnly`**.

Se tornarmos o cookie `HttpOnly`, quebra tudo isto (todos dependem do token/sessão no cliente):

- [UserMenu.tsx:45](src/components/UserMenu.tsx#L45) — `supabase.auth.getUser()` (estado de login no cabeçalho)
- [AuthListener.tsx:86](src/components/AuthListener.tsx#L86) — `onAuthStateChange` + inserts em `logs_login`/`clientes`
- [SessaoProvider.tsx:88-113](src/components/SessaoProvider.tsx#L88-L113) — lê o cookie e faz **REST autenticado** (`Bearer ${accessToken}`) para checar "é dentista?"
- Dashboards de analytics, [BioEditor](src/app/pro/dashboard/BioEditor.tsx), [upload de foto](src/lib/upload-foto.ts), [PerfilEditor](src/app/pro/perfil/PerfilEditor.tsx), [VerificarCroDetalheCliente](src/app/pro/verificar-cro/[id]/VerificarCroDetalheCliente.tsx) — todos via `criarClienteNavegador()`

➡️ Conclusão: o comentário do código ("o `@supabase/ssr` precisa que o cliente leia os cookies") está **correto**. O motivo histórico extra (deadlock do `supabase-js`) **já foi resolvido** com o `lockNoOp` em [client.ts:29-37](src/lib/supabase/client.ts#L29-L37), mas isso **não** remove a necessidade do cookie legível.

➡️ Portanto, `HttpOnly` de verdade ⇒ **parar de usar o cliente Supabase no navegador para auth** e mover **todas** as operações autenticadas para o servidor (Server Actions / Route Handlers). É um projeto grande (Seção 4).

---

## 2. Plano A1 — Headers de segurança + CSP  ✅ recomendado agora

### 2a. Headers "simples" (risco baixíssimo) — `next.config.ts` → `async headers()`
Aplicáveis a todas as rotas. Não dependem de allowlist, não quebram funcionalidade:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN` (anti-clickjacking; complementa `frame-ancestors`)
- `Permissions-Policy: geolocation=(self), camera=(self), microphone=()` (geo/câmera usados; câmera no editor de foto? confirmar — senão remover `self`)
- `X-DNS-Prefetch-Control: on`

> Estes eu aplico com confiança — só preciso confirmar se a **câmera** é usada (editor de fotos usa upload de arquivo, não câmera; então `camera=()`).

### 2b. CSP (precisa de cuidado) — **rollout em 2 fases, sem quebrar nada**

**Fase 1 — `Content-Security-Policy-Report-Only` (NÃO bloqueia nada):** publico a CSP só em modo relatório. O navegador **não bloqueia** nada; apenas registra o que *teria* bloqueado. Navegamos por TUDO (home, busca, mapa, login Google, dashboard, analytics, verificar-CRO com o iframe do CFO, upload de foto) e coletamos as violações reais. Risco para o usuário: **zero**.

**Fase 2 — enforce:** com a lista real em mãos, ajusto a allowlist e troco `-Report-Only` pela CSP que bloqueia.

**Allowlist provável** (a confirmar na Fase 1):
```
default-src 'self';
script-src 'self' 'nonce-…' ;            # ver desafio do Next abaixo
style-src 'self' 'unsafe-inline';        # o código usa muito style={{…}} inline
img-src 'self' data: blob:
        https://dsnzgxjuqlalysyfiion.supabase.co
        https://*.googleusercontent.com
        https://*.tile.openstreetmap.org;
font-src 'self';
connect-src 'self'
        https://dsnzgxjuqlalysyfiion.supabase.co
        https://nominatim.openstreetmap.org
        https://viacep.com.br;
frame-src https://busca-profissionais.cfo.org.br;   # iframe do CFO em /pro/verificar-cro
frame-ancestors 'self';
base-uri 'self';
form-action 'self' https://accounts.google.com;     # OAuth Google
object-src 'none';
```
> Os domínios de mapa/geocoding (OpenStreetMap/Nominatim) e ViaCEP serão confirmados na Fase 1 — a CSP Report-Only existe exatamente para não chutarmos.

**O desafio do Next.js (a parte difícil):** o Next injeta *scripts inline* (hidratação). Para uma CSP forte de `script-src` há duas opções:
- **(A) `script-src 'self' 'unsafe-inline'`** — CSP mais fraca em script, mas **ainda muito valiosa**: `connect-src`/`frame-ancestors`/`form-action` continuam bloqueando a **exfiltração** do token e o clickjacking. Menos trabalho, baixo risco. *(Sugiro começar por aqui.)*
- **(B) Nonce por requisição via `proxy.ts`** — CSP forte (`script-src 'self' 'nonce-…'`, sem `unsafe-inline`). Protege também contra injeção de `<script>`. Mais trabalho e precisa testar bem hidratação. *(Evolução depois.)*

> Recomendo **(A) primeiro** (já entrega a mitigação central do C1: bloquear exfiltração via `connect-src`) e evoluir para **(B)** depois.

### 2c. Verificação obrigatória
- O iframe do CFO em `/pro/verificar-cro` **precisa** estar no `frame-src`, senão a verificação de CRO quebra.
- O login Google é redirect de topo (não `fetch`), então `connect-src` não precisa do Google; mas `form-action` sim.

---

## 3. Mitigações complementares ao C1 (baratas, alto valor)

1. **Reduzir o TTL do access token** no painel do Supabase (Auth → Sessions): de 3600s para ~1800s. Diminui a janela de uso de um token roubado. Refresh rotation já é padrão.
2. **Anti-XSS (o vetor real é supply-chain):**
   - Confirmar que não há `dangerouslySetInnerHTML` com dado de usuário (auditoria já indicou que o único uso é no JSON-LD, escapado).
   - Ativar **Dependabot/atualizações** e rodar `npm audit` periodicamente (hoje: 2 moderadas transitivas do Next — acompanhar patch).
   - Manter o React fazendo o escape (não introduzir innerHTML com bio/nome/avaliação).

> Com A1 (CSP) + TTL menor + anti-XSS, o risco prático do C1 cai drasticamente **sem** a refatoração grande.

---

## 4. Plano C1 "completo" (HttpOnly de verdade) — projeto maior, OPCIONAL

Só se você decidir investir. Escopo (~12–15 arquivos), risco **alto** (mexe em todo o login do site no ar):

1. **Estado de login no cabeçalho** → via **Server Component**: o `layout` chama `getUsuario()` ([auth.ts:32](src/lib/auth.ts#L32)) e passa `{ nome, foto, papel }` por props/Context para um `UserMenu` "burro". Remove a leitura de cookie no cliente.
2. **Operações autenticadas do cliente → servidor:** transformar em **Server Actions / Route Handlers** cada chamada `criarClienteNavegador().from(...)`/`.update(...)`/`.insert(...)`/`.rpc(...)`:
   - `AuthListener` (logs_login, update clientes) · `BioEditor` · `upload-foto` · `PerfilEditor` · painéis de analytics · `VerificarCroDetalheCliente` · checagem "é dentista?" do `SessaoProvider`.
3. **Login/Logout:** logout vira route handler que limpa cookie no servidor; remover `lerSessaoDoCookie`/`limparCookiesSessao` ([sessao-cookie.ts](src/lib/sessao-cookie.ts)).
4. **Religar `HttpOnly: true`** nos route handlers ([callback](src/app/auth/callback/route.ts#L113), [login-dentista](src/app/auth/login-dentista/route.ts#L59)).
5. **Bônus:** elimina a **redundância** atual — `SessaoProvider` (cookie+REST) e `UserMenu` (`getUser`+`from`) hoje calculam o login de **dois jeitos diferentes**.

**Risco/QA:** este é o tipo de mudança que **pode deslogar todo mundo** ou quebrar o painel se algo escapar. Exige QA completo (Seção 5) e, idealmente, fazer por partes atrás de um preview antes de `--prod`.

---

## 5. QA e rollback (para qualquer mudança de segurança)

**Roteiro de QA (sempre num Preview Vercel antes de `--prod`):**
- Login paciente (Google) → ver nome/foto no header → sair.
- Login dentista (e-mail/senha) → dashboard → editar bio → upload de foto → sair.
- Superuser → analytics/DBA → verificar-CRO (com o **iframe do CFO** carregando).
- Recuperar senha (e-mail chega, link funciona).
- Busca com mapa/geolocalização; ViaCEP no cadastro.
- Console do navegador sem violações de CSP (na Fase 2).

**Rollback:** `vercel rollback` (volta para o deploy anterior em segundos) ou `git revert` + `vercel --prod`. Headers/CSP são 100% reversíveis.

---

## 6. O que proponho executar (com seu OK), em ordem

1. **Passo 1 — Headers simples (2a):** baixo risco. Aplico, verifico build, publico em Preview, depois `--prod`.
2. **Passo 2 — CSP Report-Only (2b Fase 1):** não bloqueia nada. Publico, navegamos tudo, coletamos violações.
3. **Passo 3 — CSP enforce (2b Fase 2):** ajusto a allowlist e ligo o bloqueio.
4. **Passo 4 — TTL menor + Dependabot (Seção 3):** você ajusta o TTL no painel Supabase; eu preparo a config de deps.
5. **C1 completo (Seção 4):** só se você decidir; eu detalho um sub-plano e fazemos por partes.

> Minha recomendação: começar pelos **Passos 1 e 2 agora** (risco baixo/zero) e decidir sobre o C1 completo depois de ver o impacto real.
