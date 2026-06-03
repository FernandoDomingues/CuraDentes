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
