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
  (JSON-LD por dentista) + `sitemap.xml` + `robots.txt`. *(o coração do orgânico)*
- **Fase 2** — autenticação e área logada (login/entrar, cadastro, dashboard,
  meu perfil, editor de fotos).
- **Fase 3** — analytics, painel DBA, verificação de CRO e app mobile (Capacitor).
- **Fase 4** — paridade total, manuais de back-end e cutover.

## 5. O que precisa ser replicado do site-k11
Regras de negócio que já existem e devem ser mantidas:
- Nome amigável de especialidade para o paciente x nome canônico (cadastro/SEO).
- Bio do dentista opcional (vazia = não exibe nada, sem texto padrão).
- Estacionamento + "informações ao cliente" por endereço; destaque de urgência.
- Foto de perfil sempre em WebP, caminho fixo por dentista (sem acúmulo).
- Painel DBA e analytics protegidos por `is_superuser()` (só o SuperDom).
