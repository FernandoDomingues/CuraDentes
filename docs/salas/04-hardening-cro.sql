-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — HARDENING de CRO (aditivo; rode no SQL Editor do Supabase do projeto)
--
-- Motivo: na Fase 0, o CRO é exigido só na ESCRITA (criar sala, ativar, solicitar,
-- aprovar). Mas a VISIBILIDADE/uso dependiam só de status='ativa' / contato_liberado,
-- nunca do CRO VIGENTE. Logo, se o CRO de um dentista for REVOGADO depois, a sala dele
-- continuava pública e o contato seguia liberado — violando a regra "só visível/
-- utilizável para dentista com CRO aprovado".
--
-- Este script revalida o cro_verificado ATUAL nos pontos de leitura/uso:
--   1. view salas_publicas        → só salas de anfitrião com CRO verificado (núcleo)
--   2. get_salas_proximas         → idem na busca por proximidade            (núcleo)
--   3. decidir_solicitacao_reserva→ revalida CRO do LOCATÁRIO ao aprovar     (extra)
--   4. contato_da_reserva         → revalida CRO das DUAS partes ao revelar   (extra)
--
-- É idempotente (create or replace / drop view if exists). Não toca dados.
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 1. View pública: só anfitrião com CRO verificado e não excluído ──────────────
drop view if exists public.salas_publicas;
create view public.salas_publicas as
  select s.id, s.titulo, s.descricao, s.equipamentos, s.preco_valor, s.preco_unidade,
         s.disponibilidade, s.politica_cancelamento, s.fotos,
         s.nome_clinica, s.cidade, s.bairro, s.estado, s.latitude, s.longitude, s.created_at
    from public.salas s
    join public.curadentespro c on c.id = s.anfitriao_id
   where s.status = 'ativa'
     and c.cro_verificado is true
     and c.deleted_at is null;
grant select on public.salas_publicas to anon, authenticated;

-- ─── 2. Busca por proximidade: mesmo filtro de CRO vigente ────────────────────────
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
    join public.curadentespro c on c.id = s.anfitriao_id
   where s.status = 'ativa' and s.latitude is not null and s.longitude is not null
     and c.cro_verificado is true and c.deleted_at is null
     and (6371 * acos(greatest(-1, least(1,
            cos(radians(lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(lng))
          + sin(radians(lat)) * sin(radians(s.latitude)))))) <= raio_km
   order by distancia_km asc
   limit 200;
$$;
revoke all on function public.get_salas_proximas(double precision,double precision,double precision) from public;
grant execute on function public.get_salas_proximas(double precision,double precision,double precision) to anon, authenticated;

-- ─── 3. Aprovar: revalida o CRO do LOCATÁRIO (além do anfitrião) ───────────────────
create or replace function public.decidir_solicitacao_reserva(
  p_id uuid, p_decisao text, p_observacao text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_anfitriao uuid; v_locatario uuid; v_status text;
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  if p_decisao not in ('aprovada','recusada') then raise exception 'Decisao invalida.'; end if;
  select anfitriao_id, locatario_id, status into v_anfitriao, v_locatario, v_status
    from public.solicitacoes_reserva where id = p_id;
  if v_anfitriao is null then raise exception 'Solicitacao inexistente.'; end if;
  if v_anfitriao <> v_uid then raise exception 'Apenas o anfitriao da sala pode decidir.'; end if;
  if v_status <> 'pendente' then raise exception 'Solicitacao ja decidida.'; end if;
  if p_decisao = 'aprovada' then
    if not exists (select 1 from public.curadentespro c
                   where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null) then
      raise exception 'CRO do anfitriao invalido — nao e possivel aprovar.';
    end if;
    if not exists (select 1 from public.curadentespro c
                   where c.id = v_locatario and c.cro_verificado is true and c.deleted_at is null) then
      raise exception 'O solicitante nao esta mais com o CRO verificado.';
    end if;
  end if;
  update public.solicitacoes_reserva
     set status               = p_decisao,
         observacao_anfitriao = nullif(btrim(p_observacao), ''),
         contato_liberado     = (p_decisao = 'aprovada'),
         decidida_em          = now()
   where id = p_id;
end; $$;
revoke all on function public.decidir_solicitacao_reserva(uuid,text,text) from public;
grant execute on function public.decidir_solicitacao_reserva(uuid,text,text) to authenticated;

-- ─── 4. Revelar contato: revalida o CRO das DUAS partes (não só status aprovado) ──
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
  -- ambas as partes precisam seguir com CRO verificado para o contato continuar visível
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_loc and c.cro_verificado is true and c.deleted_at is null)
     or not exists (select 1 from public.curadentespro c
                    where c.id = v_anf and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Contato indisponivel: uma das partes nao esta mais com o CRO verificado.';
  end if;
  if v_uid = v_loc then
    return query select 'anfitriao'::text, v_nome_clinica, null::text, v_cwhats, v_cemail;
  else
    return query
      select 'locatario'::text, c.nome, c.telefone, null::text, c.email
        from public.curadentespro c where c.id = v_loc;
  end if;
end; $$;
revoke all on function public.contato_da_reserva(uuid) from public;
grant execute on function public.contato_da_reserva(uuid) to authenticated;

-- ─── Verificação rápida (opcional) ───────────────────────────────────────────────
-- Deve listar só salas de anfitriões com CRO verificado:
--   select sp.id, sp.titulo from salas_publicas sp;
-- Conferir que uma sala de anfitrião NÃO verificado não aparece:
--   select s.id, s.status, c.cro_verificado
--     from salas s join curadentespro c on c.id = s.anfitriao_id
--    where c.cro_verificado is not true;   -- estas NÃO podem estar em salas_publicas
