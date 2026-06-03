# Modelo de Segurança

Documento explicando como o projeto lida com RLS, Storage, autenticação e LGPD. **Atualizado em 2026-06-02 após a migration de segurança (item 8 do checklist de QA).**

---

## TL;DR

| Camada | Status | Detalhe |
|---|---|---|
| Auth | ✅ Supabase Auth (Google OAuth para pacientes, email/senha para dentistas, OTP de email no cadastro Pro via `signInWithOtp`) | Token em `localStorage`, refresh automático |
| RLS em `avaliacoes` | ✅ 4 policies granulares | SELECT público, INSERT autenticado, UPDATE/DELETE só pelo dono |
| RLS em `clientes` | ✅ Após migration 2026-06-02 | SELECT público, escrita só pelo dono (`auth.uid() = user_id`) |
| RLS em `curadentespro` | ✅ Após migration 2026-06-02 | SELECT público, escrita só pelo dono |
| RLS em `curadentespro_enderecos` | ✅ Após migration 2026-06-02 | SELECT público, escrita só pelo dono do dentista |
| Storage `fotos-dentistas` | ✅ Após migration 2026-06-02 | Leitura pública, upload/update/delete só na pasta do próprio user |
| LGPD compliance | ⚠️ Parcial | Falta soft-delete, política de retenção, política de privacidade escrita |
| FK constraints | ⚠️ Parcial | `avaliacoes.paciente_id` ainda não tem FK para `auth.users` |

---

## Por que RLS importa mesmo com auth

A **Anon Key do Supabase é pública por design** (vai no bundle JS, qualquer um abre DevTools e vê). Sem RLS, qualquer pessoa com a URL e a chave consegue ler/modificar TODOS os dados via REST.

**Exemplo de ataque pré-migration:**
```bash
curl -X DELETE \
  'https://SEU_SUPABASE.co/rest/v1/curadentespro?id=neq.00000000-0000-0000-0000-000000000000' \
  -H "apikey: PUBLIC_KEY"
# → apaga 50 dentistas em 1 segundo
```

Com RLS ativo (mesmo com `USING (true)` em algumas policies), o Supabase filtra a operação automaticamente.

---

## Modelo de policies (pós-migration 2026-06-02)

### Padrão geral

**SELECT público** + **escrita restrita pelo dono** (`auth.uid() = user_id`):

```sql
-- Leitura: qualquer um pode ver
CREATE POLICY "Leitura pública de dentistas"
  ON public.curadentespro FOR SELECT USING (true);

-- Escrita: só o dono pode modificar o próprio perfil
CREATE POLICY "Dono edita o próprio perfil"
  ON public.curadentespro FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Tabela `curadentespro_enderecos` (relacionamento)

Endereços são vinculados ao dentista. A policy checa se o `user_id` do dentista vinculado bate com `auth.uid()`:

```sql
CREATE POLICY "Dono do dentista atualiza endereço"
  ON public.curadentespro_enderecos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.curadentespro p
      WHERE p.id = curadentespro_enderecos.curadentespro_id
        AND p.user_id = auth.uid()
    )
  );
```

### Tabela `avaliacoes` (a única com RLS antes do item 8)

```sql
-- Leitura: pública (para mostrar média no perfil)
CREATE POLICY "Leitura pública" ON avaliacoes FOR SELECT USING (true);

-- Insert: autenticado
CREATE POLICY "Insert autenticado" ON avaliacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Update/Delete: só o dono
CREATE POLICY "Update pelo dono" ON avaliacoes FOR UPDATE
  USING (auth.uid() = paciente_id);
```

---

## RPC `get_dentistas_proximos` — SECURITY DEFINER

```sql
ALTER FUNCTION get_dentistas_proximos(...)
  SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION get_dentistas_proximos(...) TO anon, authenticated;
```

**Por que `SECURITY DEFINER`:** a função faz `SELECT` em `curadentespro` e `curadentespro_enderecos`. Sem `DEFINER`, ela rodaria com as permissões do caller — e como `anon` só pode `SELECT` (não `UPDATE/DELETE`), funcionaria. **Mas** se apertarmos o RLS no futuro (ex.: bloquear SELECT de colunas sensíveis como `cpf` para anon), a RPC quebraria para usuários anônimos. Com `DEFINER`, a função roda com permissões de `postgres` (owner) e ignora RLS — só lê o que precisa para retornar.

**Não exposta para escrita** (não tem parâmetros de INSERT/UPDATE), então o risco de abuso é mínimo.

---

## Storage `fotos-dentistas`

Path convention: `{user_id}/{timestamp}_foto.{ext}`

Policies:
```sql
-- SELECT público (qualquer um vê as fotos dos dentistas)
CREATE POLICY "Leitura pública" ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-dentistas');

-- INSERT: apenas na pasta do próprio user
CREATE POLICY "Upload apenas na pasta do próprio user" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fotos-dentistas'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE/DELETE: apenas o dono
CREATE POLICY "Dono atualiza/deleta a própria foto" ON storage.objects ...
```

**Convenção de path é crítica:** o upload no `uploadService.ts` usa `${dentistaId}/${Date.now()}_foto.${ext}`. O `dentistaId` é o `curadentespro.id` (UUID), que deve ser igual ao `auth.uid()` do dono logado.

---

## Geolocalização — OPT-IN (LGPD)

A LGPD (e GDPR) exigem consentimento explícito antes de coletar dados de localização. Por isso:

- ❌ **NÃO** chamamos `navigator.geolocation.getCurrentPosition` no mount de nenhuma página
- ✅ O usuário clica explicitamente em "Usar minha Localização"
- ✅ Cache local em `localStorage` com TTL 30 min (não é um "re-prompt" constante)
- ✅ Erro é mostrado se o usuário negar (mensagem amigável, não técnico)
- ✅ Coordenadas NUNCA são enviadas a servidor externo sem ação do usuário (Nominatim é chamado só depois de o usuário submeter uma busca)

**Ver `src/hooks/useUserLocation.ts` para a implementação completa.**

---

## Auto-fill de CEP — ViaCEP, OPT-IN por digitação

A consulta de CEP no cadastro Pro (`useCepLookup.ts`) segue o mesmo princípio da geolocalização:

- ❌ **NÃO** chamamos a API do ViaCEP no mount
- ✅ Dispara só depois de o usuário digitar 8 dígitos (CEP completo) + debounce de 500ms
- ✅ Cache local em `localStorage` com TTL 7 dias (mesmo CEP não é consultado de novo)
- ✅ `AbortController` cancela requisições antigas se o usuário digitar outro CEP antes da resposta
- ✅ CEP inexistente mostra mensagem amigável e **NÃO** auto-preenche nada
- ✅ API é pública (não precisa de auth), mas o lookup é local — não vaza nada para o backend Supabase

**Ver `src/hooks/useCepLookup.ts` para a implementação completa.**

---

## Customização de email templates

O Supabase envia emails transacionais (verificação, magic link, reset de senha) usando templates HTML configuráveis. **Eles NÃO são parte do código do projeto** — vivem no Supabase Dashboard.

### Onde editar

**Supabase Dashboard → Authentication → Email Templates**

Existem 4 templates prontos para editar:

| Template | Disparado por | Usado pelo nosso projeto? |
|---|---|---|
| **Confirm sign up** | `supabase.auth.signUp()` | ⚠️ Legado — não é mais usado pelo cadastro Pro (item 14 migrou para `signInWithOtp`) |
| **Magic link** | `supabase.auth.signInWithOtp()` | ✅ **Sim** — é o template que o dentista recebe na Etapa 1 do cadastro Pro |
| **Email change** | mudança de email do user autenticado | ❌ Não usado |
| **Password recovery** | `supabase.auth.resetPasswordForEmail()` | ✅ **Sim** — disparado pelo botão "Trocar senha" em `MeuPerfil.tsx`, link leva para `/pro/redefinir-senha` |

**Erro comum:** customizar "Confirm sign up" achando que o cadastro Pro usa — mas o fluxo atual (`signInWithOtp` no `enviarTokenEmail` em `src/pages/pro/NovoCadastro.tsx`) dispara o template "Magic link". Se a tela mostra email em inglês, é este o template a editar.

### Variáveis disponíveis

Todas funcionam em qualquer template:

| Variável | O que é | Útil para |
|---|---|---|
| `{{ .Token }}` | Código OTP (6 dígitos por padrão) | Mostrar o código destacado pro usuário digitar no form |
| `{{ .ConfirmationURL }}` | Link mágico que loga o user com 1 clique | Botão de "entrar diretamente" como alternativa |
| `{{ .SiteURL }}` | URL do projeto configurado no Supabase | Link "voltar para o site" no rodapé |
| `{{ .Email }}` | Email do destinatário | Confirmação visual / log |

⚠️ **`{{ .Token }}` pode não estar disponível** em projetos com versão antiga do GoTrue (pré-2.x). Se não funcionar, o template cai num fallback de link-only e o usuário precisa clicar no link (não dá pra digitar código no form). Teste disparando um `signInWithOtp` e vendo se o email recebido contém um número de 6 dígitos.

### Idioma e branding

Os templates default vêm em inglês com link genérico. **Recomendado:** traduzir para português e colocar branding "CuraDentes". Aprovação de copy é decisão do time, mas o template precisa ter `{{ .Token }}` (ou `{{ .ConfirmationURL }}`) visível — caso contrário o usuário não consegue completar o fluxo.

**Exemplo mínimo (HTML) para o "Magic link":**

```html
<h2 style="font-family: sans-serif; color: #0A6E5C;">CuraDentes</h2>
<p>Use o código abaixo para verificar seu e-mail e continuar seu cadastro:</p>
<p style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold;
          letter-spacing: 6px; color: #0A6E5C; text-align: center;
          padding: 16px; background: #F2F8F6; border-radius: 12px;">
  {{ .Token }}
</p>
<p>Este código expira em 1 hora e só pode ser usado uma vez.</p>
<p>Ou <a href="{{ .ConfirmationURL }}">clique aqui para entrar diretamente</a>.</p>
<p style="color: #8E8E93; font-size: 12px;">
  Se você não solicitou este código, ignore este e-mail.
</p>
```

### Como testar

1. Customize o template no Dashboard
2. Salve (botão "Save")
3. Em outro navegador / aba anônima, dispare `signInWithOtp` (ou acione o fluxo no app)
4. Confira o email recebido — o HTML do Supabase é inline, então estilos CSS simples funcionam
5. Se o `{{ .Token }}` não renderizar, veja o log do Supabase (Auth → Logs) e verifique a versão do GoTrue

### SMTP provider

Os templates rodam em cima do SMTP configurado em **Project Settings → Auth → SMTP**. Se o email demora > 30s para chegar ou não chega, o problema geralmente é SMTP (não é o template). Ver `docs/PENDENCIAS.md` item 14 para o setup com Hostinger.

---

## Fluxo de redefinição de senha

O dentista pode trocar a senha pela seção "Segurança" em `MeuPerfil.tsx`. O fluxo é:

1. **Botão "Trocar senha"** chama `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
2. **Supabase dispara o template "Password recovery"** (precisa estar customizado em português)
3. **Dentista clica no link** do email → Supabase redireciona para `${redirectTo}#type=recovery&access_token=...`
4. **Página `/pro/redefinir-senha`** carrega, `detectSessionInUrl: true` parseia o hash, dispara o evento `PASSWORD_RECOVERY`
5. **Form de nova senha** aparece (validação: 8+ chars + confirmação + barra de força)
6. **Submit** chama `supabase.auth.updateUser({ password: nova })` → Supabase faz hash e atualiza `auth.users.encrypted_password`
7. **`signOut()`** encerra a sessão de recovery e redireciona para `/` com toast de sucesso
8. **Dentista faz login** com a nova senha

**Por que usar o fluxo de recovery (e não atualizar direto)?**
- Prova que o usuário tem acesso ao email da conta (autenticação de segundo fator grátis)
- Funciona mesmo que o dentista tenha esquecido a senha atual
- Padroniza o template "Password recovery" para casos de "esqueci a senha" no futuro (item da checklist)

**Configuração adicional no Supabase Dashboard → Auth → URL Configuration:**
- Adicionar `https://curadentes.com.br/pro/redefinir-senha` à lista de "Redirect URLs"
- Adicionar `http://localhost:5173/pro/redefinir-senha` para desenvolvimento local

**`redirectTo` no código:** `window.location.origin + '/pro/redefinir-senha'` — funciona em dev e prod sem hardcode.

**Rota `/pro/redefinir-senha` é pública** (sem `ProtectedRoute`) porque o usuário chega com uma sessão de recovery que não satisfaz o `ProtectedRoute` convencional. A própria página valida se há sessão e mostra erro caso contrário.

---

## Como auditar a segurança

### 1. Listar policies atuais

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 2. Verificar RLS ativo por tabela

```sql
SELECT tablename, rowsecurity
FROM pg_tables WHERE schemaname = 'public';
```

### 3. Testar acesso anônimo (sem login)

```sql
SET ROLE anon;
SELECT COUNT(*) FROM public.clientes;  -- esperado: > 0 (SELECT público)
SELECT COUNT(*) FROM public.curadentespro_enderecos;  -- esperado: > 0
-- Tente um INSERT e veja se falha:
INSERT INTO public.curadentespro (nome, cro) VALUES ('test', 'test');  -- esperado: erro de RLS
RESET ROLE;
```

### 4. Rodar o teste automatizado

```bash
npm run test:security
```

6 verificações:
1. Anon PODE ler `curadentespro` (busca funciona)
2. Anon NÃO PODE deletar (RLS bloqueia — 0 rows affected)
3. Anon NÃO PODE inserir em `avaliacoes` (RLS bloqueia)
4. RPC `get_dentistas_proximos` funciona para anon
5. Anon NÃO PODE fazer upload no bucket (RLS bloqueia)
6. Anon PODE listar arquivos públicos do bucket

**Lembrar:** nesse teste, "falhou" geralmente = BOM, significa que RLS bloqueou.

---

## Variáveis de ambiente

| Var | Onde mora | Quem tem acesso |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` local + Vercel | Público (vai no bundle JS) |
| `VITE_SUPABASE_ANON_KEY` | `.env` local + Vercel | Público (vai no bundle JS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **SOMENTE Vercel, nunca `.env`** | Privado (bypass total de RLS — uso administrativo) |

**Service Role Key** é o "master key" do Supabase. Ela bypassa TODAS as policies de RLS. Use apenas em:
- Migrations manuais no Studio
- Cron jobs / webhooks administrativos (nunca expor ao front)
- Backup/restore

---

## Roadmap de segurança (não está no checklist, mas vale notar)

| # | Item | Prioridade | Esforço |
|---|---|---|---|
| A | Backfill de `user_id` nos 50 dentistas seed | 🟠 Média | 30 min (UPDATE no Studio) |
| B | FK `avaliacoes.paciente_id → auth.users(id)` | 🟡 Baixa | 5 min (mas precisa limpar órfãos antes) |
| C | Soft-delete (`deleted_at`) em `clientes` e `curadentespro` | 🟠 Média | 1h + UI |
| D | Política de retenção/expurgo de `clientes.latitude`/`longitude` | 🟠 Média | 1h + decisão jurídica |
| E | Função `apagar_dados_cliente()` (LGPD) | 🟠 Média | 30 min |
| F | Textos de Política de Privacidade + Termos de Uso | 🟠 Média | decisão jurídica + UI |
| G | 2FA para dentistas | 🟢 Baixa (depois do MVP) | 1 dia |
| H | Rate limiting (Supabase Edge Functions) | 🟢 Baixa | depende do provider |
| I | Audit log (quem editou o quê) | 🟢 Baixa | 1 dia |

---

## Contato em caso de incidente

Se alguém reportar vazamento de dados ou comportamento estranho:
1. Verificar `auth.audit_log_entries` no Supabase Studio
2. Conferir `pg_stat_activity` para queries suspeitas
3. Revogar a `VITE_SUPABASE_ANON_KEY` e gerar uma nova (afeta todos os usuários, requer deploy)
4. Considerar ativar `auth.rate_limits` no painel do Supabase

---

**Última atualização:** 2026-06-02 (após migration de segurança + iteração do fluxo de auth)
