-- ════════════════════════════════════════════════════════════════════════════════
-- FASE 0 — Banco do subprojeto "Locação Pontual de Salas" (CuraDentes B2B)
-- Rodar no SQL Editor do Supabase compartilhado (ref dsnzgxjuqlalysyfiion).
-- ADITIVO: cria objetos novos, NÃO altera nada existente. Reversível (ver §8).
--
-- ⚠️ JÁ APLICADO. NÃO reaplicar isolado: o hardening de CRO vive em 04-hardening-cro.sql
--    (salas_publicas / get_salas_proximas / decidir / contato passam a exigir o CRO
--    VIGENTE). Reaplicar SÓ este arquivo regrediria aquele filtro — rode o 04 em seguida.
-- v2 — pós revisão adversarial (4 lentes). Correções aplicadas: posse de
-- endereco_id no UPDATE; campos desnormalizados derivados por TRIGGER (não pelo
-- cliente); CRO do anfitrião revalidado na solicitação e na aprovação; contato de
-- locação DEDICADO e privado (não o telefone público do perfil); e-mail lido de
-- curadentespro (não auth.users); índice anti-spam; leitura pública via VIEW que
-- NÃO expõe endereco_id/anfitriao_id.
--
-- Decisões travadas (doc 00-design-mvp §0):
--   • Contato SÓ após aprovação  → contato DEDICADO em salas (privado) + RPC gated
--   • CRO verificado DOS DOIS lados → checado no INSERT/UPDATE de salas E nas RPCs
--   • Preço SEMPRE visível          → salas.preco_valor NOT NULL
--
-- DEPENDÊNCIAS no banco (confirmar que existem e são seguras antes de aplicar):
--   • public.is_superuser()  → deve decidir por auth.jwt()->>'email' (allowlist fixa),
--                              SECURITY DEFINER, search_path fixo. Usada em sol_select.
--   • curadentespro.email    → preenchida pelo trigger sync_email_curadentespro
--                              (de auth.users); lida só por funções DEFINER.
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 1. TABELAS ──────────────────────────────────────────────────────────────────

create table if not exists public.salas (
  id                    uuid primary key default gen_random_uuid(),
  anfitriao_id          uuid not null default auth.uid()
                          references public.curadentespro(id) on delete cascade,
  endereco_id           uuid not null
                          references public.curadentespro_enderecos(id) on delete restrict,
  titulo                text not null check (length(btrim(titulo)) between 1 and 120),
  descricao             text check (length(descricao) <= 2000),
  equipamentos          text[] not null default '{}',
  preco_valor           numeric(10,2) not null check (preco_valor >= 0),   -- sempre presente
  preco_unidade         text not null default 'hora' check (preco_unidade in ('hora','turno','dia')),
  disponibilidade       jsonb not null default '[]'::jsonb,                -- [{dia,inicio,fim,ativo}]
  politica_cancelamento text,
  fotos                 text[] not null default '{}',                      -- bucket fotos-salas (fase 4)
  status                text not null default 'ativa' check (status in ('ativa','pausada','removida')),
  -- CONTATO DEDICADO da locação (privado; NÃO é o telefone público do perfil de paciente).
  -- Revelado só por contato_da_reserva após aprovação. Exigido ao menos um canal:
  contato_whatsapp      text,
  contato_email         text,
  -- Desnormalizado do endereço — PREENCHIDO POR TRIGGER (não pelo cliente). Público-seguro
  -- (sem telefone/whatsapp). endereco_id e anfitriao_id NÃO são expostos publicamente (ver view §4).
  nome_clinica          text,
  cidade                text,
  bairro                text,
  estado                text,
  latitude              double precision,
  longitude             double precision,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint salas_tem_contato check (contato_whatsapp is not null or contato_email is not null)
);
comment on table public.salas is 'Salas alugáveis. anfitriao_id=auth.uid do dono. Contato de locação é DEDICADO (contato_*), revelado só após aprovação. Campos desnormalizados são derivados do endereço por trigger.';

create table if not exists public.solicitacoes_reserva (
  id                    uuid primary key default gen_random_uuid(),
  sala_id               uuid not null references public.salas(id) on delete cascade,
  anfitriao_id          uuid not null,                 -- preenchido pela RPC a partir da sala
  locatario_id          uuid not null default auth.uid()
                          references public.curadentespro(id) on delete cascade,
  data                  date not null,
  hora_inicio           time not null,
  hora_fim              time not null,
  mensagem              text check (length(mensagem) <= 1000),
  status                text not null default 'pendente'
                          check (status in ('pendente','aprovada','recusada','cancelada')),
  observacao_anfitriao  text check (length(observacao_anfitriao) <= 1000),
  contato_liberado      boolean not null default false,
  created_at            timestamptz not null default now(),
  decidida_em           timestamptz,
  check (hora_fim > hora_inicio),
  check (locatario_id <> anfitriao_id)
);
comment on table public.solicitacoes_reserva is 'Pedido de reserva pontual. Escritas SÓ via RPC gated (sem policy de insert/update/delete).';

-- ─── 2. ÍNDICES ──────────────────────────────────────────────────────────────────
create index if not exists salas_status_idx        on public.salas(status);
create index if not exists salas_anfitriao_idx      on public.salas(anfitriao_id);
create index if not exists salas_cidade_idx         on public.salas(lower(cidade));
create index if not exists salas_geo_idx            on public.salas(latitude, longitude);
create index if not exists sol_anfitriao_status_idx on public.solicitacoes_reserva(anfitriao_id, status);
create index if not exists sol_locatario_status_idx on public.solicitacoes_reserva(locatario_id, status);
create index if not exists sol_sala_idx             on public.solicitacoes_reserva(sala_id);
-- Anti-spam: impede solicitação pendente DUPLICADA idêntica do mesmo locatário p/ a mesma sala/horário.
create unique index if not exists sol_pendente_unica
  on public.solicitacoes_reserva(sala_id, locatario_id, data, hora_inicio, hora_fim)
  where status = 'pendente';

-- ─── 3. TRIGGER: deriva os campos do endereço E valida posse (fecha 2 furos) ──────
-- O cliente NÃO envia nome_clinica/cidade/bairro/estado/latitude/longitude — eles são
-- copiados aqui do endereço REAL, e só se o endereço pertencer ao anfitrião. Isso impede
-- (a) trocar endereco_id pelo de outro dentista (vazaria contato/posição) e
-- (b) forjar nome/cidade/coordenadas no card e na busca geográfica.
create or replace function public.salas_sync_endereco()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare e record;
begin
  select nome_clinica, cidade, bairro, estado, latitude, longitude
    into e
    from public.curadentespro_enderecos
   where id = new.endereco_id and curadentespro_id = new.anfitriao_id;
  if e is null then
    raise exception 'Endereco invalido ou nao pertence ao anfitriao.';
  end if;
  new.nome_clinica := e.nome_clinica;
  new.cidade       := e.cidade;
  new.bairro       := e.bairro;
  new.estado       := e.estado;
  new.latitude     := e.latitude;
  new.longitude    := e.longitude;
  new.updated_at   := now();
  return new;
end; $$;

drop trigger if exists salas_sync_endereco_trg on public.salas;
create trigger salas_sync_endereco_trg
  before insert or update on public.salas
  for each row execute function public.salas_sync_endereco();

-- ─── 4. RLS + VIEW PÚBLICA ────────────────────────────────────────────────────────
alter table public.salas                enable row level security;
alter table public.solicitacoes_reserva enable row level security;

-- salas: leitura da BASE só pelo dono (ou superuser). O público lê pela VIEW abaixo,
-- que não expõe endereco_id nem anfitriao_id (impede colher contato cruzando o perfil).
drop policy if exists salas_select on public.salas;
create policy salas_select on public.salas for select to authenticated
  using (anfitriao_id = auth.uid() or public.is_superuser());

-- salas: criar exige ser o dono + CRO verificado (posse do endereço é garantida pelo trigger).
drop policy if exists salas_insert on public.salas;
create policy salas_insert on public.salas for insert to authenticated
  with check (
    anfitriao_id = auth.uid()
    and exists (select 1 from public.curadentespro c
                where c.id = auth.uid() and c.cro_verificado is true and c.deleted_at is null)
  );

-- salas: editar só o dono; reativar (status='ativa') exige CRO válido (não reativa sem CRO).
drop policy if exists salas_update on public.salas;
create policy salas_update on public.salas for update to authenticated
  using (anfitriao_id = auth.uid())
  with check (
    anfitriao_id = auth.uid()
    and (status <> 'ativa'
         or exists (select 1 from public.curadentespro c
                    where c.id = auth.uid() and c.cro_verificado is true and c.deleted_at is null))
  );

drop policy if exists salas_delete on public.salas;
create policy salas_delete on public.salas for delete to authenticated
  using (anfitriao_id = auth.uid());

-- VIEW pública: só colunas seguras das salas ATIVAS (sem endereco_id/anfitriao_id/contato).
-- Roda com privilégio do dono (security_invoker desligado, default PG15+), então ignora a
-- RLS owner-only acima e devolve as ativas. É a fonte de leitura do /salas e /salas/[id].
drop view if exists public.salas_publicas;
create view public.salas_publicas as
  select id, titulo, descricao, equipamentos, preco_valor, preco_unidade,
         disponibilidade, politica_cancelamento, fotos,
         nome_clinica, cidade, bairro, estado, latitude, longitude, created_at
    from public.salas
   where status = 'ativa';
grant select on public.salas_publicas to anon, authenticated;

-- solicitacoes_reserva: SÓ leitura, e só pelas duas partes (ou superuser).
-- Sem policy de insert/update/delete → toda escrita é via RPC SECURITY DEFINER.
drop policy if exists sol_select on public.solicitacoes_reserva;
create policy sol_select on public.solicitacoes_reserva for select to authenticated
  using (locatario_id = auth.uid() or anfitriao_id = auth.uid() or public.is_superuser());

-- ─── 5. RPCs (regra de negócio gated; SECURITY DEFINER + search_path fixo) ────────

-- 5a. Locatário cria solicitação. Valida CRO do LOCATÁRIO e do ANFITRIÃO + sala ativa.
create or replace function public.criar_solicitacao_reserva(
  p_sala_id uuid, p_data date, p_hora_inicio time, p_hora_fim time, p_mensagem text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_anfitriao uuid; v_status text; v_id uuid;
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Apenas dentistas com CRO verificado podem solicitar.';
  end if;
  select s.anfitriao_id, s.status into v_anfitriao, v_status from public.salas s where s.id = p_sala_id;
  if v_anfitriao is null then raise exception 'Sala inexistente.'; end if;
  if v_status <> 'ativa' then raise exception 'Sala indisponivel.'; end if;
  if v_anfitriao = v_uid then raise exception 'Nao e possivel solicitar a propria sala.'; end if;
  -- o ANFITRIÃO também precisa seguir apto (CRO/ conta) no momento da solicitação:
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_anfitriao and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Anfitriao indisponivel.';
  end if;
  if p_data < current_date then raise exception 'Data no passado.'; end if;
  if p_hora_fim <= p_hora_inicio then raise exception 'Intervalo de horario invalido.'; end if;
  insert into public.solicitacoes_reserva
    (sala_id, anfitriao_id, locatario_id, data, hora_inicio, hora_fim, mensagem)
  values
    (p_sala_id, v_anfitriao, v_uid, p_data, p_hora_inicio, p_hora_fim, nullif(btrim(p_mensagem), ''))
  returning id into v_id;
  return v_id;
end; $$;

-- 5b. Anfitrião aprova/recusa. Revalida CRO do anfitrião na APROVAÇÃO (evento sensível).
create or replace function public.decidir_solicitacao_reserva(
  p_id uuid, p_decisao text, p_observacao text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_anfitriao uuid; v_status text;
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  if p_decisao not in ('aprovada','recusada') then raise exception 'Decisao invalida.'; end if;
  select anfitriao_id, status into v_anfitriao, v_status
    from public.solicitacoes_reserva where id = p_id;
  if v_anfitriao is null then raise exception 'Solicitacao inexistente.'; end if;
  if v_anfitriao <> v_uid then raise exception 'Apenas o anfitriao da sala pode decidir.'; end if;
  if v_status <> 'pendente' then raise exception 'Solicitacao ja decidida.'; end if;
  if p_decisao = 'aprovada' and not exists (
       select 1 from public.curadentespro c
        where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'CRO do anfitriao invalido — nao e possivel aprovar.';
  end if;
  update public.solicitacoes_reserva
     set status               = p_decisao,
         observacao_anfitriao = nullif(btrim(p_observacao), ''),
         contato_liberado     = (p_decisao = 'aprovada'),
         decidida_em          = now()
   where id = p_id;
end; $$;

-- 5c. Locatário cancela a PRÓPRIA solicitação, só enquanto pendente.
create or replace function public.cancelar_solicitacao(p_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_locatario uuid; v_status text;
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  select locatario_id, status into v_locatario, v_status
    from public.solicitacoes_reserva where id = p_id;
  if v_locatario is null then raise exception 'Solicitacao inexistente.'; end if;
  if v_locatario <> v_uid then raise exception 'Apenas o solicitante pode cancelar.'; end if;
  if v_status <> 'pendente' then raise exception 'So da para cancelar enquanto pendente.'; end if;
  update public.solicitacoes_reserva set status = 'cancelada', decidida_em = now() where id = p_id;
end; $$;

-- 5d. Contato da CONTRAPARTE — só se você é parte E a solicitação está aprovada.
--     Anfitrião → revela o contato DEDICADO da sala (contato_whatsapp/email, privado).
--     Locatário → revela telefone/e-mail do dentista (PII, via curadentespro; nunca REST).
create or replace function public.contato_da_reserva(p_id uuid)
returns table (papel text, nome text, telefone text, whatsapp text, email text)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_loc uuid; v_anf uuid; v_status text; v_lib boolean;
  v_nome_clinica text; v_cwhats text; v_cemail text;
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  select sr.locatario_id, sr.anfitriao_id, sr.status, sr.contato_liberado,
         s.nome_clinica, s.contato_whatsapp, s.contato_email
    into v_loc, v_anf, v_status, v_lib, v_nome_clinica, v_cwhats, v_cemail
    from public.solicitacoes_reserva sr
    join public.salas s on s.id = sr.sala_id
   where sr.id = p_id;
  if v_loc is null then raise exception 'Solicitacao inexistente.'; end if;
  if v_uid <> v_loc and v_uid <> v_anf then raise exception 'Sem acesso.'; end if;
  if v_status <> 'aprovada' or v_lib is not true then
    raise exception 'Contato liberado apenas apos a aprovacao.';
  end if;
  if v_uid = v_loc then
    -- locatário recebe o contato DEDICADO da locação (anfitrião)
    return query select 'anfitriao'::text, v_nome_clinica, null::text, v_cwhats, v_cemail;
  else
    -- anfitrião recebe o contato do locatário (telefone/email do dentista, PII)
    return query
      select 'locatario'::text, c.nome, c.telefone, null::text, c.email
        from public.curadentespro c where c.id = v_loc;
  end if;
end; $$;

-- 5e. Busca de salas por proximidade. SECURITY DEFINER (a base é owner-only); só ativas, só colunas seguras.
create or replace function public.get_salas_proximas(
  lat double precision, lng double precision, raio_km double precision default 30
) returns table (
  id uuid, titulo text, preco_valor numeric, preco_unidade text,
  nome_clinica text, cidade text, bairro text,
  latitude double precision, longitude double precision,
  equipamentos text[], fotos text[], distancia_km double precision
) language sql stable security definer set search_path = public, pg_temp
as $$
  select s.id, s.titulo, s.preco_valor, s.preco_unidade, s.nome_clinica, s.cidade, s.bairro,
         s.latitude, s.longitude, s.equipamentos, s.fotos,
         (6371 * acos(greatest(-1, least(1,
            cos(radians(lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(lng))
          + sin(radians(lat)) * sin(radians(s.latitude)))))) as distancia_km
    from public.salas s
   where s.status = 'ativa' and s.latitude is not null and s.longitude is not null
     and (6371 * acos(greatest(-1, least(1,
            cos(radians(lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(lng))
          + sin(radians(lat)) * sin(radians(s.latitude)))))) <= raio_km
   order by distancia_km asc
   limit 200;
$$;

-- ─── 6. GRANTS (mínimo necessário) ───────────────────────────────────────────────
revoke all on function public.criar_solicitacao_reserva(uuid,date,time,time,text) from public;
revoke all on function public.decidir_solicitacao_reserva(uuid,text,text)         from public;
revoke all on function public.cancelar_solicitacao(uuid)                          from public;
revoke all on function public.contato_da_reserva(uuid)                            from public;
revoke all on function public.get_salas_proximas(double precision,double precision,double precision) from public;
grant execute on function public.criar_solicitacao_reserva(uuid,date,time,time,text) to authenticated;
grant execute on function public.decidir_solicitacao_reserva(uuid,text,text)         to authenticated;
grant execute on function public.cancelar_solicitacao(uuid)                          to authenticated;
grant execute on function public.contato_da_reserva(uuid)                            to authenticated;
grant execute on function public.get_salas_proximas(double precision,double precision,double precision) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════════
-- 7. ROTEIRO DE TESTE DE RLS (rode DEPOIS, simulando dois dentistas A e B)
-- ════════════════════════════════════════════════════════════════════════════════
-- Pegue dois dentistas com CRO verificado e um endereço de A:
--   select id from curadentespro where cro_verificado and deleted_at is null limit 5;   -- A, B
--   select id from curadentespro_enderecos where curadentespro_id = 'UUID_A';            -- END_A
--   select id from curadentespro_enderecos where curadentespro_id = 'UUID_B';            -- END_B
--
-- Como A (cria sala válida; tenta forjar):
--   set local role authenticated;
--   select set_config('request.jwt.claims', json_build_object('sub','UUID_A','email','a@x.com')::text, true);
--   insert into salas (endereco_id, titulo, preco_valor, contato_whatsapp)
--     values ('END_A','Sala teste',100,'5515999999999');               -- PASSA (nome/cidade vêm do trigger)
--   update salas set endereco_id = 'END_B' where titulo='Sala teste';   -- FALHA (trigger: endereço não é seu)
--   reset role;
--
-- Como B (pede sala de A; tenta furar):
--   set local role authenticated;
--   select set_config('request.jwt.claims', json_build_object('sub','UUID_B','email','b@x.com')::text, true);
--   select criar_solicitacao_reserva('SALA_A', current_date+1, '09:00','10:00','oi');   -- PASSA
--   select decidir_solicitacao_reserva('SOLIC_ID','aprovada');                           -- FALHA (B não é anfitrião)
--   select * from contato_da_reserva('SOLIC_ID');                                        -- FALHA (não aprovada)
--   select count(*) from solicitacoes_reserva;                                           -- vê só as dele
--   select endereco_id from salas_publicas limit 1;                                      -- FALHA (coluna não existe na view)
--   reset role;
--
-- Como A (aprova; confere liberação):
--   set local role authenticated;
--   select set_config('request.jwt.claims', json_build_object('sub','UUID_A','email','a@x.com')::text, true);
--   select decidir_solicitacao_reserva('SOLIC_ID','aprovada');                           -- PASSA
--   select * from contato_da_reserva('SOLIC_ID');                                        -- PASSA (contato do locatário B)
--   reset role;
--
-- ════════════════════════════════════════════════════════════════════════════════
-- 8. ROLLBACK
-- ════════════════════════════════════════════════════════════════════════════════
--   drop function if exists public.get_salas_proximas(double precision,double precision,double precision);
--   drop function if exists public.contato_da_reserva(uuid);
--   drop function if exists public.cancelar_solicitacao(uuid);
--   drop function if exists public.decidir_solicitacao_reserva(uuid,text,text);
--   drop function if exists public.criar_solicitacao_reserva(uuid,date,time,time,text);
--   drop view if exists public.salas_publicas;
--   drop trigger if exists salas_sync_endereco_trg on public.salas;
--   drop function if exists public.salas_sync_endereco();
--   drop table if exists public.solicitacoes_reserva;
--   drop table if exists public.salas;
