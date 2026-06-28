# Documento de Design — MVP "Locação Pontual de Salas" (CuraDentes B2B)

> **Status:** proposta de design para implementação enxuta, integrada ao CuraDentes.
> **Premissas travadas pelo dono:** (1) integrado ao site/domínio/conta existentes; (2) plataforma só **conecta**, não processa pagamento no MVP; (3) reserva por **solicitação → aprovação** da clínica (sem instantâneo).
> **Filosofia:** site no ar, segurança a sério (Server Actions com id da sessão + RLS no banco), lotes pequenos verificados (branch → Preview → QA → prod).

---

## 0. Decisões do dono (travadas 2026-06-28)
- **Contato:** revelado **só após a clínica aprovar**. → A sala tem um **contato de locação DEDICADO e privado** (`salas.contato_whatsapp/contato_email`), **separado do telefone público de paciente** (que já é público no perfil). Revelado só pela RPC `contato_da_reserva` (gated em `status='aprovada'` + ser parte). A leitura pública das salas é por uma **view `salas_publicas`** que NÃO expõe `endereco_id`/`anfitriao_id`/contato. *(Decisão de v2, pós revisão adversarial: usar o telefone público da clínica NÃO honraria a trava — ele é descobrível pelo perfil; por isso o contato dedicado.)*
- **CRO:** exigir **CRO verificado para os DOIS lados** — anunciar **e** solicitar. → checar `cro_verificado = true` no INSERT de `salas` (anfitrião) **e** na criação de `solicitacoes_reserva` (locatário); reforçar no RLS/RPC.
- **Preço:** **sempre mostrar valor** (R$ por hora/turno/dia). → `salas.preco_valor NOT NULL` + `preco_unidade`.
- **Defaults aplicados** (recomendações da §8 — overridable): sala **referencia `endereco_id`** existente; conexão por **e-mail** na Fase 1 (in-app na Fase 3); cancelamento pós-aprovação "por fora" no MVP; CTA "Alugar sala" **discreto** na home.

---

## 1. Visão e escopo do MVP

### Problema
Clínicas têm sala/cadeira ociosa em janelas previsíveis. Dentistas precisam, pontualmente, de um espaço para um atendimento específico. O CuraDentes já tem as duas pontas cadastradas (todos são `papel='dentista'`, com clínicas geolocalizadas em `curadentespro_enderecos`). Falta só o **mercado de duas pontas** entre elas.

### As duas pontas (sem novo papel)
Ambas são `papel='dentista'` (`src/lib/auth.ts:18-63`). Não criamos subpapel. A distinção é **derivada de dados**:
- **Anfitrião** = dentista que publicou ao menos uma sala (`salas.anfitriao_id = uid`).
- **Locatário** = qualquer dentista logado que solicita uma sala de outro.

O mesmo dentista pode ser as duas coisas. Isso evita migração de papéis e RLS de role.

### ENTRA no MVP (caminho feliz)
1. Anfitrião publica 1+ salas, vinculadas a um endereço existente seu (`curadentespro_enderecos`), com janelas de disponibilidade semanais e preço **informativo** (texto/numérico, sem cobrança).
2. Locatário busca salas por proximidade (reuso de `get_dentistas_proximos` → nova `get_salas_proximas`) e por cidade/bairro.
3. Locatário **solicita** um horário (data + intervalo) com mensagem.
4. Anfitrião recebe e-mail, vê a solicitação em `/pro/salas/solicitacoes`, **aprova ou recusa**.
5. Ao **aprovar**, as partes são **conectadas**: contato (WhatsApp/telefone/e-mail) é liberado para ambas e ambas recebem e-mail. **Pagamento acertado por fora.**

### FICA PARA DEPOIS (fase 2+)
- **Pagamento/gateway** na plataforma (só preparamos ganchos: `salas.preco_*`, aceite de termos via `cobranca_aviso_aceita`).
- **Reserva instantânea / calendário transacional anti-overbooking real** (no MVP a aprovação é manual e humana resolve conflitos; ver §8).
- **Avaliação/reputação da locação** (reusa-se depois o padrão `avaliacoes`).
- **Mapa visual com pins** (MVP é lista de cards, como a busca atual).
- **Repasse/comissão da plataforma.**
- **Fotos da sala** podem entrar já na Fase 2 (não bloqueiam o caminho feliz).

### Princípio de corte
O MVP é **um mural de classificados B2B com handshake de aprovação**. Nada de transação financeira, nada de lock de slot atômico. A plataforma garante: descoberta por proximidade + solicitação rastreável + aprovação + troca de contato.

---

## 2. As duas pontas e os fluxos passo-a-passo

### (a) Anfitrião publica uma sala
1. Entra em `/pro/salas` (herda guarda de `ProLayout` — `src/app/pro/layout.tsx:21-30`).
2. Clica "Anunciar sala". Formulário reusa `EnderecosEditor` como base (`SalaEditor`):
   - **Seleciona um endereço existente** seu (dropdown vindo de `curadentespro_enderecos.eq('curadentespro_id', uid)`) → herda `nome_clinica`, `logradouro…cep`, `latitude/longitude`, `estacionamento`. **Não regeocodifica** se o endereço já tem coords (reusa pipeline `geocodeEnderecoComFallback` só se faltar — `src/lib/geocoding.ts:105-131`).
   - Preenche campos próprios da sala: `titulo`, `descricao`, `preco_valor` + `preco_unidade` (hora/turno/dia — informativo), `equipamentos[]` (chips, vocabulário novo: cadeira, raio-x, autoclave, recepção compartilhada…), `disponibilidade` (JSON, mesmo shape de `agenda`: `{dia, inicio, fim, ativo}`), `politica_cancelamento` (reusa default `POLITICA_PADRAO`).
3. Salva via Server Action `salvarSala` (padrão `salvarPerfil` — §3), com `anfitriao_id = user.id` da **sessão** (nunca do cliente — `src/app/pro/perfil/acoes.ts:14-105`).
4. Sala fica `status='ativa'` e visível na busca pública.

### (b) Locatário busca e solicita
1. Vai para `/salas` (Server Component casca+SEO + `SalasCliente`, clonando `src/app/busca/page.tsx:14-40`).
2. "Usar minha localização" (opt-in LGPD, só no clique — `src/app/busca/BuscaCliente.tsx:772-815`) ou digita cidade/bairro (autocomplete `useAddressSuggestions`).
3. Lista de cards de sala (clone do card de `BuscaCliente.tsx:1071-1172`): foto/clínica, título, preço informativo, equipamentos, badge "X daqui" (`calcularDistanciaKm` + `formatarDistancia` — `src/lib/distancia.ts`), CTA **"Solicitar horário"**.
4. Abre `/salas/[id]`: detalhe + janelas de disponibilidade semanais (exibição, não slots datados travados).
5. Clica "Solicitar horário". **Muro de login** (clone de `handleContactRequest` — `PerfilDentistaView.tsx:967-974`): se não logado → modal de login; se paciente → bloqueado (só dentista solicita).
6. Escolhe **data + intervalo (início/fim)** + mensagem opcional → Server Action `solicitarReserva` (`locatario_id = user.id` da sessão).
7. Cria linha em `solicitacoes_reserva` com `status='pendente'`. Contato da clínica **NÃO** é revelado ainda (regra de visibilidade nova — ver §3 RLS).

### (c) Anfitrião aprova/recusa
1. Recebe e-mail (Edge Function `notificar-reserva-sala`, padrão `notificarCroInativa` — `src/app/pro/verificar-cro/[id]/acoes.ts:38-52`).
2. Vê a fila em `/pro/salas/solicitacoes`.
3. Aprova ou recusa via **RPC gated** `decidir_solicitacao_reserva(p_solicitacao_id, p_decisao, p_obs)` (padrão `marcar_verificacao_cro` — `acoes.ts:24-34`). A RPC valida no banco que `auth.uid()` é o anfitrião da sala daquela solicitação. Estado vai para `aprovada` ou `recusada`.

### (d) Conexão ao aprovar
1. Ao virar `aprovada`, a RPC marca `contato_liberado=true` na solicitação.
2. RLS passa a permitir que **ambas as partes** leiam o contato uma da outra **apenas para aquela solicitação aprovada** (telefone/whatsapp via RPC, não REST — §3).
3. Edge Function dispara e-mail para os dois com os contatos. UI de `/pro/salas/solicitacoes` e `/pro/minhas-solicitacoes` mostra botão WhatsApp/tel (reuso `urlWhatsapp`).
4. As partes acertam pagamento **por fora**. Fim do MVP.

---

## 3. Modelo de dados (tabelas novas + RLS)

> Tudo vive no **Supabase compartilhado** (ref `dsnzgxjuqlalysyfiion`), criado por migration no projeto, **não há .sql neste repo** (`docs/backend/README.md:3-9`). Abaixo é a especificação que vai para o banco.

### Tabela `salas` (a sala alugável)
| coluna | tipo | nota |
|---|---|---|
| `id` | uuid PK | `default gen_random_uuid()` |
| `anfitriao_id` | uuid | FK → `curadentespro.id`; **= auth.uid do dono** |
| `endereco_id` | uuid | FK → `curadentespro_enderecos.id`; herda local/lat/lng |
| `titulo` | text | |
| `descricao` | text | |
| `equipamentos` | text[] | vocabulário novo de infraestrutura |
| `preco_valor` | numeric null | informativo no MVP |
| `preco_unidade` | text | 'hora'\|'turno'\|'dia' |
| `disponibilidade` | jsonb | shape `{dia,inicio,fim,ativo}` (igual `agenda`) |
| `politica_cancelamento` | text | `POLITICA_PADRAO` |
| `fotos` | text[] | bucket novo `fotos-salas` (fase 2) |
| `status` | text | 'ativa'\|'pausada'\|'removida' |
| `latitude`/`longitude` | numeric null | desnormalizado do endereço p/ a RPC geográfica |
| `created_at` | timestamptz | `default now()` |

**Relação:** uma sala pertence a um anfitrião (`curadentespro`) e referencia um dos endereços dele (`curadentespro_enderecos`). Desnormalizar `latitude/longitude` na própria `salas` evita join na RPC geográfica e protege contra `null` herdado (forçar coords no save).

### Tabela `sala_disponibilidade` (opcional na Fase 1)
No MVP, a disponibilidade vive como **JSON recorrente** dentro de `salas.disponibilidade` (reuso direto de `normalizarAgenda` — `src/lib/dentistas.ts:76-86`). Só promovemos para tabela de **slots datados** quando entrarmos em anti-overbooking real (fase 2). **Decisão de corte:** Fase 1 não tem slots datados; o intervalo desejado é texto/timestamp **na solicitação**, e o conflito é resolvido pela aprovação humana.

### Tabela `solicitacoes_reserva` (o booking-request)
| coluna | tipo | nota |
|---|---|---|
| `id` | uuid PK | |
| `sala_id` | uuid | FK → `salas.id` |
| `anfitriao_id` | uuid | denormalizado de `salas.anfitriao_id` (facilita RLS) |
| `locatario_id` | uuid | **= auth.uid do solicitante** (FK `curadentespro.id`) |
| `data` | date | dia solicitado |
| `hora_inicio` / `hora_fim` | time | intervalo |
| `mensagem` | text null | recado do locatário |
| `status` | text | 'pendente'\|'aprovada'\|'recusada'\|'cancelada' |
| `observacao_anfitriao` | text null | motivo de recusa |
| `contato_liberado` | boolean | `default false`; vira true ao aprovar |
| `created_at` / `decidida_em` | timestamptz | |

**Ciclo de vida:** `pendente` → (`aprovada` | `recusada`) por RPC; locatário pode `cancelar` enquanto `pendente`. Sem transições mágicas: tudo via RPC gated.

### Políticas RLS (padrão do projeto: "RLS é a proteção final")

Atenção às pendências já conhecidas do back-end (`docs/backend/README.md:50-59`): `DEFAULT auth.uid()`, `WITH CHECK`, `is_superuser()` só por `auth.jwt()->>'email'` top-level.

**`salas`**
- `SELECT` público: `USING (status = 'ativa')` — qualquer um (anon incl.) vê salas ativas (cliente público, `src/lib/supabase/public.ts`). Contato não está aqui (fica no endereço/RPC).
- `INSERT`: `WITH CHECK (anfitriao_id = auth.uid())` + `anfitriao_id DEFAULT auth.uid()`. Exigir que `endereco_id` pertença ao mesmo `auth.uid` (subselect em `curadentespro_enderecos`).
- `UPDATE`/`DELETE`: `USING (anfitriao_id = auth.uid())`.

**`solicitacoes_reserva`**
- `INSERT` (locatário): `WITH CHECK (locatario_id = auth.uid() AND locatario_id <> anfitriao_id)` — não solicita a própria sala. `anfitriao_id` deve bater com a `salas.anfitriao_id` da `sala_id` (validar via trigger ou RPC de criação).
- `SELECT`: `USING (locatario_id = auth.uid() OR anfitriao_id = auth.uid())` — só as duas partes (e superuser via `is_superuser()`).
- `UPDATE` de status: **bloqueado por REST**; só via RPC `decidir_solicitacao_reserva` (SECURITY DEFINER, gated: confere `auth.uid() = anfitriao_id`). Cancelamento pelo locatário: RPC `cancelar_solicitacao` gated em `locatario_id = auth.uid() AND status='pendente'`.

**Contato (PII) — regra de visibilidade nova**
Telefone/WhatsApp/e-mail **nunca via REST** (lição `colunas-pii-protegidas-rest`; `src/app/cadastro/acoes.ts:68-69`). Criar RPC `contato_da_reserva(p_solicitacao_id)` SECURITY DEFINER que retorna o contato da contraparte **só se** `auth.uid()` é parte da solicitação **e** `status='aprovada'` (`contato_liberado=true`). Antes de aprovar, contato fica oculto — fechando a lacuna "telefone/whatsapp públicos no endereço".

> Nota: o endereço da clínica (`curadentespro_enderecos`) já é público hoje, inclusive `telefone/whatsapp`. Para a locação, exibir só cidade/bairro até aprovar e usar a RPC acima para o canal direto. (Decisão em aberto — §8.)

---

## 4. Mapa de reuso (o que aproveita vs. o que é novo)

| Capacidade | Reusa (ref) | Novo |
|---|---|---|
| **Conta/login dentista** | `getUsuario`, login email/OAuth, cookies httpOnly (`src/lib/auth.ts:32-74`, `auth/callback`, `auth/login-dentista`) | — (nenhum novo papel) |
| **Distinção anfitrião/locatário** | derivada de dados | flag derivada `ehAnfitriao` em `/api/me` |
| **Clínica/endereço (base da sala)** | `curadentespro_enderecos`, `EnderecosEditor`, CEP/ViaCEP (`src/components/pro/EnderecosEditor.tsx`) | tabela `salas` referenciando `endereco_id` |
| **Agenda/disponibilidade** | JSON `{dia,inicio,fim,ativo}` + `normalizarAgenda` (`src/lib/dentistas.ts:76-86`) | semântica de "janela ociosa" (mesmo shape) |
| **Geo-busca por proximidade** | `geocoding.ts`, `distancia.ts`, RPC `get_dentistas_proximos`, `sanitizarTermoBusca` (`src/lib/busca-filtro.ts`) | RPC clone `get_salas_proximas` |
| **Autocomplete cidade/bairro** | `useAddressSuggestions` + cache (`src/lib/sugestoes.ts`) | — |
| **CRO / verificação** | `cro_verificado` em `curadentespro` | (opcional) exigir CRO verificado p/ anunciar |
| **Stack/clientes Supabase** | `criarClienteServidor`/`público`/`navegador` (`src/lib/supabase/*`) | — |
| **Server Action segura** | molde `salvarPerfil`/`dashboard/acoes` (uid da sessão, `{ok,erro}`) | `salvarSala`, `solicitarReserva` |
| **Operação sensível** | RPC gated `marcar_verificacao_cro` | RPC `decidir_solicitacao_reserva`, `contato_da_reserva`, `cancelar_solicitacao` |
| **Notificação e-mail** | `functions.invoke` best-effort (`notificarCroInativa`, `send-rating-notification`) | Edge Function `notificar-reserva-sala` + templates |
| **Contato gated** | `handleContactRequest` + muro de login + `urlWhatsapp` (`PerfilDentistaView.tsx:967`) | liberação condicionada a `status='aprovada'` |
| **Fotos** | `uploadFotoDentista` (FormData + Storage + caminho fixo) | bucket `fotos-salas` (fase 2) |
| **Funil/eventos** | `logarBusca`, upsert idempotente `registrarContato` | `logs_busca_salas` / eventos de solicitação |
| **Design system / telas** | `Container`, tokens marca, card `rounded-[24px]`, sidebar 280px + grade | telas `/salas`, `/pro/salas` |
| **Guarda de rota** | `ProLayout` (`src/app/pro/layout.tsx`) | — (telas do anfitrião sob `/pro`) |

---

## 5. Rotas / telas

| Rota | Tipo | Guarda | Conteúdo |
|---|---|---|---|
| `/salas` | público (SC+Client, clone `busca/page.tsx`) | nenhuma (anon lê salas ativas via RLS) | busca de salas: barra + autocomplete + "usar localização", lista de cards, filtros sidebar (cidade, equipamentos, preço) |
| `/salas/[id]` | público (SC casca/SEO + Client) | nenhuma | detalhe da sala, disponibilidade semanal, CTA "Solicitar horário" (muro de login) |
| `/pro/salas` | painel | `ProLayout` (dentista/superuser) | "minhas salas" do anfitrião: lista + "Anunciar sala" + editar/pausar |
| `/pro/salas/nova` e `/pro/salas/[id]/editar` | painel | `ProLayout` | `SalaEditor` (clone `EnderecosEditor`) |
| `/pro/salas/solicitacoes` | painel | `ProLayout` | fila de solicitações recebidas (aprovar/recusar) + contato liberado |
| `/pro/minhas-solicitacoes` | painel | `ProLayout` | solicitações **enviadas** pelo dentista como locatário (status + contato se aprovado) |

- **Entrada na busca pública** (`/`, header): adicionar link/CTA "Alugar uma sala". Banner discreto para não competir com a busca de paciente.
- **`/pro/dashboard`**: card "Salas" + "Solicitações pendentes (N)" (clone do padrão de cards de métrica — `src/app/pro/dashboard/page.tsx`).
- **`/api/me`**: estender o payload com `ehAnfitriao` (tem sala) e `solicitacoesPendentes` (count) — **sem vazar token** (padrão `src/app/api/me/route.ts:16-35`). Hoje só expõe `ehPro/ehSuper`.

**Atenção ao proxy** (`src/proxy.ts:19-60`): matcher cobre `/pro`, `/entrar`, `/cadastro`, `/redefinir-senha`. As telas do anfitrião já caem em `/pro` (ok). `/salas/*` é público e não lê sessão no servidor (lê via cliente público + Server Action no clique), então **não precisa entrar no matcher**. Se uma página de `/salas` passar a ler sessão server-side, **estender o matcher**.

---

## 6. Notificações / conexão

Reuso integral do mecanismo existente: **Server Action chama `supabase.functions.invoke(...)` no servidor, best-effort com `try/catch` + `console.warn`** (padrão `notificarCroInativa` e `send-rating-notification`). E-mail/PII resolvidos **dentro** da Edge Function (nunca no cliente).

**Nova Edge Function `notificar-reserva-sala`** (criada no Supabase, não versionada no repo) com 3 gatilhos, recebendo só ids no body:
1. **Nova solicitação** → e-mail ao **anfitrião** ("Fulano quer sua sala X em DD/MM, HH–HH. Aprovar/recusar no painel"). Disparada dentro de `solicitarReserva`.
2. **Aprovada** → e-mail às **duas partes** com os contatos (WhatsApp/tel/e-mail), nota "pagamento acertado entre vocês". Disparada dentro de `decidir_solicitacao_reserva` (ou na action que a invoca).
3. **Recusada** → e-mail ao **locatário** (com `observacao_anfitriao` se houver).

A Edge Function resolve e-mail/telefone pelos ids no servidor (igual `send-rating-notification` resolve pelo `dentistId`). **Provedor de e-mail (Resend?) e templates ficam no Supabase** — confirmar/estender lá (não há código de Edge Function no repo).

**Conexão in-app (não só e-mail):** em `/pro/salas/solicitacoes` e `/pro/minhas-solicitacoes`, após `aprovada`, mostrar botão WhatsApp/tel via RPC `contato_da_reserva` (não REST). Reusa `urlWhatsapp` e a mecânica de `handleContactRequest` (muro de login + registro do clique). Registrar a abertura do contato como evento de funil (clone `registrarContato`, upsert idempotente).

---

## 7. Plano de construção em fases (cada fase = 1 lote branch → Preview → QA → prod)

> Cada fase termina com **build + lint verdes**, Preview na Vercel, QA do dono no navegador, autorização, merge e `vercel --prod`. Trabalho de banco (tabelas/RLS/RPC/Edge Function) é aplicado no Supabase compartilhado **antes** do código que o consome, e testado em Preview.

**Fase 0 — Banco (sem UI).**
Criar `salas` + `solicitacoes_reserva` + RLS + RPCs (`decidir_solicitacao_reserva`, `cancelar_solicitacao`, `contato_da_reserva`) + `get_salas_proximas`. Validar policies com SQL manual no Supabase (inserir como dentista A, tentar ler/editar como B). Sem deploy de front. **Este é o lote de maior risco** — revisar RLS com lupa.

**Fase 1 — Caminho feliz mínimo (sem fotos, sem busca geo).**
- `/pro/salas` + `salvarSala` (clone `EnderecosEditor`/`salvarPerfil`), preço informativo, disponibilidade JSON.
- `/salas` lista **simples** (sem geo, só cidade/bairro textual via `sanitizarTermoBusca`) + `/salas/[id]`.
- `solicitarReserva` (muro de login) → `/pro/salas/solicitacoes` → aprovar/recusar via RPC.
- Conexão **só por e-mail** (Edge Function `notificar-reserva-sala`, 3 gatilhos).
- Saída: um dentista publica, outro solicita, anfitrião aprova, ambos recebem contato por e-mail. Fim-a-fim funcionando.

**Fase 2 — Busca por proximidade.**
- `get_salas_proximas` (clone `get_dentistas_proximos`); "usar minha localização"; badge "X daqui"; filtros sidebar (equipamentos/preço); autocomplete `useAddressSuggestions`. Garantir `latitude/longitude` no save da sala (forçar/CEP-first).

**Fase 3 — Conexão in-app + funil.**
- Botão WhatsApp/tel via `contato_da_reserva` nas telas de solicitação; `/pro/minhas-solicitacoes`; cards no `/pro/dashboard`; `/api/me` com `ehAnfitriao` + contagem de pendentes; eventos de funil (clone `registrarContato`/`logarBusca`).

**Fase 4 — Fotos da sala.**
- Bucket `fotos-salas` (RLS owner-only), clone `uploadFotoDentista`, galeria no card/detalhe.

**Fase 5 (futuro, fora do MVP) — pagamento + slots datados.**
- Gateway, `sala_disponibilidade` com slots datados e lock anti-overbooking, aceite de termos via `cobranca_aviso_aceita`, comissão/repasse.

---

## 8. Riscos, decisões em aberto e perguntas ao dono

### Riscos técnicos
- **RLS de duas pontas é novo no projeto** (até hoje toda action age só sobre o próprio `uid`). Uma solicitação envolve anfitrião + locatário + sala. Mitigação: encapsular toda transição de estado e leitura de contato em **RPCs SECURITY DEFINER gated** (não REST), e revisar com testes manuais cruzados na Fase 0.
- **Sem anti-overbooking real** no MVP: duas solicitações podem pedir o mesmo horário; resolvido por aprovação humana (anfitrião não aprova duas conflitantes). Aceitável para B2B de baixo volume. Risco vira problema só com escala → fase 2.
- **PII pública no endereço hoje:** `telefone/whatsapp` de `curadentespro_enderecos` já são públicos. Se quisermos ocultar até aprovar, isso muda a exibição pública atual da clínica — precisa decisão (pode ser que a clínica **queira** ser contatada).
- **Geocoding best-effort grava `null`:** salas sem coords somem da busca geo. Mitigar forçando CEP-first no save e bloqueando publicação sem coords, ou geocodificar no servidor.
- **Edge Function/templates/Resend não estão no repo:** depende de configurar no Supabase; o provedor de e-mail precisa ser confirmado.
- **Volume de notificação:** sem limite, um anfitrião pode receber spam de solicitações. Considerar rate-limit por locatário/sala (fase 2).

### Decisões em aberto (perguntar ao dono ANTES de codar)
1. **Preço:** mostrar valor numérico (R$/hora-turno-dia) já no MVP, ou só "a combinar"? (Afeta `salas.preco_*` e o card.)
2. **Visibilidade do contato:** ocultar telefone/WhatsApp da clínica na tela de sala até a aprovação, ou liberar de cara (já que o endereço é público hoje)?
3. **Quem pode anunciar:** exigir **CRO verificado** (`cro_verificado=true`) para publicar sala? E para solicitar?
4. **Sala = endereço existente** (referenciar `endereco_id`) **ou** sala como local independente? Recomendo referenciar (reuso máximo), mas confirmar.
5. **Conexão:** e-mail é suficiente no MVP, ou já liberar WhatsApp/tel in-app na Fase 1? (Recomendo e-mail na F1, in-app na F3.)
6. **Cancelamento pós-aprovação:** no MVP, cancelar depois de aprovado é "por fora" (e-mail/WhatsApp entre as partes) ou precisa de botão/estado? (Recomendo "por fora" no MVP; estado só na fase com pagamento.)
7. **Entrada na home:** quão visível deve ser o CTA "Alugar sala" para não confundir o paciente que busca dentista?

### Recomendação de partida
Aprovar Fase 0 (banco/RLS) + Fase 1 (caminho feliz por e-mail) com as respostas das perguntas 1–5. É o menor lote que entrega valor real (uma locação conectada fim-a-fim) sem tocar em pagamento nem em calendário transacional.