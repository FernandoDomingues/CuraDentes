# CuraDentes — site-R0 (reconstrução em Next.js)

> **Status:** 🚧 em construção (Fases 0 e 1 concluídas). O site atual continua
> sendo o `site-k11` (Vite/SPA), que fica **intacto e no ar** até esta versão
> atingir paridade total e fazermos o "cutover" (a troca).
>
> **Fase 1 (páginas públicas) — pronto:** home, perfil do dentista
> (`/dentista/[id]`, SSR + JSON-LD `Dentist`), especialidades
> (`/especialidade/[slug]`, SSG + FAQ JSON-LD), `/sobre`, `/termos`,
> `/privacidade`, `/urgencia` e `/busca`, além de `robots.txt` e `sitemap.xml`
> dinâmico (uma URL por dentista e por especialidade).
>
> **Fase 2 (autenticação + área logada) — pronto.** Login `/entrar` (Google +
> dentista) com sessão em cookies (`@supabase/ssr`), `/auth/callback`,
> `/redefinir-senha`, painel `/pro/dashboard` (guard no servidor),
> `/pro/editor-de-fotos` (crop + WebP), `/pro/perfil` (editar perfil + CRUD de
> endereços) e `/cadastro` (wizard de 6 etapas com verificação de e-mail por
> código). Review de segurança multiagente aplicado.
>
> **Fase 3 (área do superuser) — quase completa.** Pronto: gate de superuser,
> **verificação de CRO** (`/pro/verificar-cro` + detalhe), **Análise do negócio**
> (`/pro/dashboard-analytics` — gráficos recharts + mapa de calor Leaflet) e o
> **painel DBA** (`/pro/dashboard-analytics/dba`). Falta só o app mobile
> (Capacitor). **104 testes passando.**

## Por que este projeto existe
O `site-k11` é uma **SPA** (renderizada no navegador). Isso significa que, para
buscadores e IAs que **não executam JavaScript**, todas as páginas chegam vazias
— o conteúdo (dentistas, especialidades, avaliações) só aparece depois que o
React roda. Resultado: péssima descoberta orgânica (Google e IAs como ChatGPT,
Gemini, Perplexity quase não conseguem indexar/citar o site).

O **site-R0** recria tudo em **Next.js**, que entrega **HTML real já pronto no
servidor** (SSR/SSG). Assim as páginas públicas (perfis de dentista,
especialidades, localidades) ficam de fato indexáveis — o objetivo é ser a
**melhor entrega orgânica possível**. Veja o porquê em [docs/DECISOES.md](docs/DECISOES.md).

## Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** (estilos)
- **Supabase** (back-end: banco, autenticação, storage) — **o mesmo do site-k11**
- **Vitest + Testing Library** (testes — usamos **TDD**)

## Como rodar (passo a passo, para iniciantes)
Pré-requisito: ter o **Node.js 20+** instalado.

```bash
# 1. instalar as dependências (só na primeira vez)
npm install

# 2. configurar as variáveis de ambiente
#    copie o arquivo de exemplo e preencha com as chaves do Supabase
cp .env.example .env.local   # depois edite .env.local

# 3. rodar o site em modo desenvolvimento (abre em http://localhost:3000)
npm run dev

# 4. gerar a versão de produção e rodá-la
npm run build
npm start
```

## Testes (TDD)
Neste projeto, **toda função nasce com um teste** (escrito antes — Test-Driven).
O fluxo: escreve o teste → vê falhar (vermelho) → implementa o mínimo → vê passar
(verde) → refatora com segurança.

```bash
npm test           # roda todos os testes uma vez
npm run test:watch # fica observando e re-roda ao salvar (bom durante o dev)
```
Os testes ficam ao lado do código, no arquivo `<nome>.test.ts(x)`.
Exemplo: [src/lib/slug.ts](src/lib/slug.ts) + [src/lib/slug.test.ts](src/lib/slug.test.ts).

## Estrutura de pastas
```
site-R0/
├── src/
│   ├── app/        # rotas e páginas (App Router do Next.js)
│   ├── lib/        # utilitários e clientes (ex.: slug, cliente Supabase)
│   ├── components/ # componentes de UI reutilizáveis  (a criar)
│   └── ...
├── docs/           # documentação do projeto (PT-BR)
│   ├── DECISOES.md # por que cada escolha de arquitetura
│   └── backend/    # manuais de uso do back-end (Supabase)  (a criar)
├── public/         # arquivos estáticos (imagens, robots.txt, etc.)
└── ...
```

## Documentação
Tudo em PT-BR, na pasta [docs/](docs/). Comece por [docs/DECISOES.md](docs/DECISOES.md).
