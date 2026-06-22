# Manuais do back-end (Supabase) — CuraDentes

> O back-end **não é recriado** no site-R0: usamos o **mesmo projeto Supabase** do
> site-k11 (ref `dsnzgxjuqlalysyfiion`). Estes manuais **documentam** esse back-end
> para quem for desenvolver o front. São preenchidos ao longo das fases.

## O que é o back-end aqui
Supabase = banco PostgreSQL + Autenticação + Storage (arquivos) + RPCs (funções no
banco) + RLS (regras de quem pode ler/escrever cada linha) + Edge Functions.

## Inventário (a detalhar em cada manual)

### Tabelas principais
- `curadentespro` — dentistas (perfil profissional). Campos como `lgpd_aceito`
  (cadastro completo) e `deleted_at` (soft delete).
- `curadentespro_enderecos` — endereços de atendimento (atividades, convênios,
  agenda, `atende_urgencias`, `estacionamento`, `observacoes`, lat/long).
- `curadentespro_email` / `curadentespro_cpf` — dados sensíveis separados.
- `clientes` — pacientes.
- `avaliacoes` — avaliações por atividade.
- `cro_verificacoes` — fila/registro de verificação de CRO.
- `perfil_visualizacoes` / `perfil_contatos` — eventos (views de perfil, cliques de contato).
- `logs_busca` / `logs_login` — eventos de busca e de login (origem/dispositivo).
- `app_config` — configs/segredos (ex.: segredo de cron).

### RPCs (funções)
- `is_superuser()` — gate do superuser (confia só no email top-level do JWT).
- `dba_estatisticas()` / `dba_series()` — painel DBA (uso do banco/storage e séries).
- `taxa_sucesso_contato(p_dias)` — funil busca → contato.
- `get_dentistas_urgencia_proximos(lat,lng)` — 10 dentistas de urgência mais próximos.
- `marcar_verificacao_cro(...)` — verificação de CRO (superuser).

### Storage (buckets)
- `fotos-dentistas` — fotos de perfil (WebP, caminho fixo `{id}/foto.webp`, público).
- `especialidades` — imagens das especialidades.

### Edge Functions
- `lembrete-cadastro` — régua de reativação/exclusão de cadastro incompleto (cron).

## Como detalhar (padrão de cada manual)
Para cada tabela/RPC: **o que é**, **colunas/parâmetros**, **RLS/quem acessa**,
**exemplos de query** (via `@supabase/supabase-js`) e **cuidados (LGPD)**.

## Pendências de segurança do back-end (review da Fase 2)

> Itens que dependem de **RLS/SQL no Supabase** (compartilhado com o site-k11) e,
> por isso, NÃO foram alterados pelo front do site-R0 — registrar aqui para tratar
> no banco antes do cutover.

1. **`logs_login` aceita `user_id` do cliente.** O insert da origem do login roda
   no navegador (anon key), então `user_id`/origem/dispositivo são forjáveis (risco
   de poluir o analytics, não de vazar dado). Endurecer a policy de INSERT com
   `WITH CHECK (user_id = auth.uid() OR user_id IS NULL)` e, idealmente, `DEFAULT
   auth.uid()` na coluna; derivar origem/dispositivo server-side (trigger/Edge) no futuro.
2. **`is_superuser()` deve ler só o email TOP-LEVEL do JWT** (`auth.jwt()->>'email'`),
   NUNCA `user_metadata`/`raw_user_meta_data` (que o próprio usuário edita via
   `updateUser` → escalonamento de privilégio). No site-k11 isso já foi corrigido
   (migration `20260622020000_dba_review_fixes.sql`). Ao portar os RPCs de
   analytics/DBA (Fase 3) para o site-R0, copiar a versão endurecida + teste de regressão.

## Manuais (a criar)
- `tabelas.md` — esquema + RLS de cada tabela.
- `rpcs.md` — assinatura e uso de cada RPC.
- `storage.md` — buckets, políticas e upload de fotos (WebP).
- `auth.md` — fluxo de login (Google + email/senha) e superuser.
- `edge-functions.md` — funções agendadas (cron).
