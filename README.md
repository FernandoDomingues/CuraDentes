# CuraDentes

🚀 **Projeto de cadastro de dentistas** – uma aplicação web moderna para gerenciar o processo de registro de profissionais da saúde bucal.

---

## 📋 Visão geral

Este repositório contém a aplicação **CuraDentes** e **CuraDentes Pro**, desenvolvida com **Vite**, **React**, **TypeScript**, **Tailwind CSS** e componentes da **shadcn‑ui**. O objetivo é oferecer um fluxo de cadastro em múltiplas etapas, com validações avançadas, integração com APIs de SMS/WhatsApp e suporte a LGPD.

---

## 🛠️ Tecnologias utilizadas

- **Vite** – bundler rápido e leve
- **React** – UI declarativa
- **TypeScript** – tipagem estática
- **Tailwind CSS** – estilos utilitários
- **shadcn‑ui** – componentes acessíveis e customizáveis
- **Lucide‑react** – ícones SVG

---

## 📦 Pré‑requisitos

- **Node.js** (versão LTS) e **npm** instalados. Recomendamos usar [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) para gerenciar versões.
- Git instalado para controle de versão.

---

## ⚙️ Instalação e execução local

```bash
# 1. Clone o repositório
git clone <URL_DO_REPOSITORIO>

# 2. Entre na pasta do projeto
cd <NOME_DO_PROJETO>

# 3. Instale as dependências
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

O comando `npm run dev` abrirá a aplicação em `http://localhost:5173` com recarga automática.

---

## 📂 Estrutura de pastas relevante

- `src/` – código‑fonte da aplicação
  - `pages/` – páginas da SPA (ex.: `NovoCadastro.tsx`)
  - `components/` – componentes reutilizáveis
  - `assets/` – imagens, logos e fontes
- `public/` – arquivos estáticos servidos diretamente
- `vite.config.ts` – configuração do Vite
- `tailwind.config.ts` – configuração do Tailwind CSS

---

## ⚠️ Pendências / Próximos passos para cadastro completo

1. **Camada de backend / API**
   - Implementar endpoints REST (ou GraphQL) para criar, atualizar e validar dentistas.
   - Expor rotas como `/api/dentistas`, `/api/telefone/verify`, `/api/cadastro/confirm`.
2. **Banco de dados**
   - Definir esquema de tabelas: `dentistas`, `enderecos`, `convenios`, `horarios`, `pagamentos`.
   - Utilizar um ORM (ex.: **Prisma** ou **TypeORM**) e gerar migrations.
   - Criar chaves estrangeiras e índices para buscas eficientes.
3. **Integração com serviços externos**
   - Configurar provedor de SMS/WhatsApp (Twilio, Zenvia, etc.) para verificação de telefone.
   - Configurar serviço de armazenamento de imagens (ex.: Cloudinary, AWS S3) para foto do profissional.
4. **Variáveis de ambiente**
   - `.env.example` deve conter: `DATABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `JWT_SECRET`, `BASE_URL`.
   - Instruir o desenvolvedor a copiar `.env.example` para `.env` e preencher os valores.
5. **Autenticação e segurança**
   - Implementar fluxo de registro com token de email (JWT) e proteção de rotas sensíveis.
   - Aplicar rate‑limiting nas APIs de verificação de telefone.
6. **Testes**
   - Acrescentar testes unitários e de integração (Jest + React Testing Library) para validar lógica de formulário e chamadas de API.
7. **Deploy da API**
   - Documentar como subir a API (ex.: Vercel Serverless Functions, Railway, Render ou Docker).
   - Atualizar script de build para incluir `npm run build && npm run start:prod` no servidor.
   - **HTTPS local**: gerar certificados (ex.: usando `mkcert`), criar a pasta `certs/` e apontar `vite.config.ts` para `./certs/localhost.pem` e `./certs/localhost-key.pem`. Também incluir redirecionamento HTTP→HTTPS (porta 5172 → 5173) conforme o exemplo no README.

> **Nota:** Enquanto essas pendências não são implementadas, o fluxo de cadastro exibirá apenas a interface front‑end e validará campos localmente, mas não persiste dados nem envia SMS/WhatsApp.

---

## 🧑‍💻 Contribuindo

1. Fork o repositório
2. Crie uma branch para sua feature ou correção
3. Execute os testes (se houver) e use o lint antes de enviar o PR
4. Abra um Pull Request descrevendo as mudanças

> **Importante:** siga o padrão de commit *Conventional Commits* (ex.: `feat: adiciona validação de CPF`).

---

## 📜 Licença

Este projeto está licenciado sob a licença MIT – veja o arquivo `LICENSE` para mais detalhes.

---

## 🚀 Deploy

Para publicar a aplicação em produção, basta gerar o build estático e servir os arquivos gerados:

```bash
npm run build   # gera a pasta /dist
# Em seguida, copie o conteúdo de /dist para seu host (Vercel, Netlify, etc.)
```
