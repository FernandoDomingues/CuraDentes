-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — ADESÃO À CLÍNICA COM APROVAÇÃO DO DONO (Parte 3, passo 1: BANCO aditivo).
--
-- A clínica (clinica_key) tem um DONO = quem a criou primeiro. Quando OUTRO dentista
-- se registra no mesmo endereço/unidade, vira uma ADESÃO pendente: o endereço dele só
-- entra na clínica (catálogo) após o dono aprovar.
--
-- Este arquivo é ADITIVO (tabelas + backfill + RPCs). NÃO altera as funções do
-- catálogo — o filtro que esconde pendentes vem no 20-adesao-filtro.sql. Rodar este
-- não tem risco de quebrar o catálogo atual. Idempotente.
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabelas ───────────────────────────────────────────────────────────────────
create table if not exists public.clinicas_donos (
  clinica_key text primary key,
  dono_id     uuid not null references public.curadentespro(id) on delete cascade,
  criada_em   timestamptz not null default now()
);
alter table public.clinicas_donos enable row level security;  -- acesso só via RPC (definer)

create table if not exists public.clinica_adesoes (
  id             uuid primary key default gen_random_uuid(),
  clinica_key    text not null,
  solicitante_id uuid not null references public.curadentespro(id) on delete cascade,
  endereco_id    uuid not null references public.curadentespro_enderecos(id) on delete cascade,
  status         text not null default 'pendente' check (status in ('pendente','aprovada','recusada')),
  criada_em      timestamptz not null default now(),
  decidida_em    timestamptz,
  unique (clinica_key, solicitante_id)
);
alter table public.clinica_adesoes enable row level security;
create index if not exists clinica_adesoes_key_idx on public.clinica_adesoes(clinica_key);

-- ─── 2. Backfill (grandfather dos dados existentes — NADA fica pendente) ───────────
-- Dono de cada chave = endereço REPRESENTATIVO (tem foto de fachada; senão menor id).
insert into public.clinicas_donos (clinica_key, dono_id)
select distinct on (k) k, dono
from (
  select public.clinica_key_de(e.cep, e.numero, e.complemento) as k,
         e.curadentespro_id as dono, e.foto_fachada, e.id
  from public.curadentespro_enderecos e
  where public.clinica_key_de(e.cep, e.numero, e.complemento) <> '-'
) t
order by k, (foto_fachada is null or foto_fachada = ''), id
on conflict (clinica_key) do nothing;

-- Demais endereços que compartilham uma chave (mas não são o dono) entram como APROVADOS.
insert into public.clinica_adesoes (clinica_key, solicitante_id, endereco_id, status, decidida_em)
select public.clinica_key_de(e.cep, e.numero, e.complemento), e.curadentespro_id, e.id, 'aprovada', now()
from public.curadentespro_enderecos e
join public.clinicas_donos d
  on d.clinica_key = public.clinica_key_de(e.cep, e.numero, e.complemento)
 and d.dono_id <> e.curadentespro_id
on conflict (clinica_key, solicitante_id) do nothing;

-- ─── 3. clinica_endereco_ativo: endereço já "vale" na clínica? (dono ou aprovado) ─
-- Usado pelo filtro do catálogo (20-adesao-filtro.sql). Aqui só define a função.
create or replace function public.clinica_endereco_ativo(p_endereco_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.curadentespro_enderecos e
    where e.id = p_endereco_id
      and ( exists (select 1 from public.clinicas_donos d
                    where d.clinica_key = public.clinica_key_de(e.cep, e.numero, e.complemento)
                      and d.dono_id = e.curadentespro_id)
         or exists (select 1 from public.clinica_adesoes a
                    where a.clinica_key = public.clinica_key_de(e.cep, e.numero, e.complemento)
                      and a.solicitante_id = e.curadentespro_id and a.status = 'aprovada') )
  );
$$;

-- ─── 4. sincronizar_clinica: chamada após salvar um endereço (define dono OU cria adesão)
-- Retorna: 'dono' | 'membro' (já aprovado) | 'pendente' | 'sem_chave'.
create or replace function public.sincronizar_clinica(p_endereco_id uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_key text; v_dono uuid;
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  select public.clinica_key_de(e.cep, e.numero, e.complemento) into v_key
    from public.curadentespro_enderecos e
   where e.id = p_endereco_id and e.curadentespro_id = v_uid;  -- só endereço do próprio dentista
  if v_key is null or v_key = '-' then return 'sem_chave'; end if;

  select dono_id into v_dono from public.clinicas_donos where clinica_key = v_key;
  if v_dono is null then
    insert into public.clinicas_donos (clinica_key, dono_id) values (v_key, v_uid)
      on conflict (clinica_key) do nothing;
    return 'dono';
  elsif v_dono = v_uid then
    return 'dono';
  elsif exists (select 1 from public.clinica_adesoes
                where clinica_key = v_key and solicitante_id = v_uid and status = 'aprovada') then
    return 'membro';
  else
    insert into public.clinica_adesoes (clinica_key, solicitante_id, endereco_id, status)
      values (v_key, v_uid, p_endereco_id, 'pendente')
    on conflict (clinica_key, solicitante_id)
      do update set endereco_id = excluded.endereco_id, status = 'pendente', criada_em = now();
    return 'pendente';
  end if;
end; $$;
revoke all on function public.sincronizar_clinica(uuid) from public;
grant execute on function public.sincronizar_clinica(uuid) to authenticated;

-- ─── 5. dados_clinica_para_adesao: dados do DONO p/ auto-preencher o formulário ───
-- Authenticated (o dentista que adere pode ainda não ter CRO). Devolve só dado da clínica.
create or replace function public.dados_clinica_para_adesao(p_chave text)
returns table (nome_clinica text, foto_fachada text, fotos_recepcao text[], estrutura text[], estrutura_extra text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  return query
  select e.nome_clinica::text, e.foto_fachada::text, e.fotos_recepcao, e.estrutura, e.estrutura_extra::text
    from public.curadentespro_enderecos e
    join public.clinicas_donos d
      on d.clinica_key = public.clinica_key_de(e.cep, e.numero, e.complemento)
     and d.dono_id = e.curadentespro_id
   where public.clinica_key_de(e.cep, e.numero, e.complemento) = p_chave
   limit 1;
end; $$;
revoke all on function public.dados_clinica_para_adesao(text) from public;
grant execute on function public.dados_clinica_para_adesao(text) to authenticated;

-- ─── 6. listar_adesoes_pendentes: o DONO vê os pedidos das suas clínicas ──────────
create or replace function public.listar_adesoes_pendentes()
returns table (id uuid, clinica_key text, nome_clinica text, solicitante_nome text, complemento text, criada_em timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  return query
  select a.id, a.clinica_key,
         (select e.nome_clinica::text from public.curadentespro_enderecos e where e.id = a.endereco_id),
         (select c.nome::text          from public.curadentespro c          where c.id = a.solicitante_id),
         (select e.complemento::text   from public.curadentespro_enderecos e where e.id = a.endereco_id),
         a.criada_em
    from public.clinica_adesoes a
    join public.clinicas_donos d on d.clinica_key = a.clinica_key and d.dono_id = v_uid
   where a.status = 'pendente'
   order by a.criada_em asc;
end; $$;
revoke all on function public.listar_adesoes_pendentes() from public;
grant execute on function public.listar_adesoes_pendentes() to authenticated;

-- ─── 7. decidir_adesao: o DONO aprova/recusa ──────────────────────────────────────
create or replace function public.decidir_adesao(p_id uuid, p_aprovar boolean)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_key text;
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  select clinica_key into v_key from public.clinica_adesoes where id = p_id and status = 'pendente';
  if v_key is null then return false; end if;
  if not exists (select 1 from public.clinicas_donos where clinica_key = v_key and dono_id = v_uid) then
    raise exception 'Apenas o dono da clinica pode decidir.';
  end if;
  update public.clinica_adesoes
     set status = case when p_aprovar then 'aprovada' else 'recusada' end, decidida_em = now()
   where id = p_id;
  return true;
end; $$;
revoke all on function public.decidir_adesao(uuid, boolean) from public;
grant execute on function public.decidir_adesao(uuid, boolean) to authenticated;

-- ─── 8. contar_adesoes_pendentes: p/ o badge (quantos pedidos o dono tem) ──────────
create or replace function public.contar_adesoes_pendentes()
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int
    from public.clinica_adesoes a
    join public.clinicas_donos d on d.clinica_key = a.clinica_key and d.dono_id = auth.uid()
   where a.status = 'pendente';
$$;
revoke all on function public.contar_adesoes_pendentes() from public;
grant execute on function public.contar_adesoes_pendentes() to authenticated;
