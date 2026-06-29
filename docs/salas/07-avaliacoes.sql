-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — AVALIAÇÃO MÚTUA da locação (aditivo). Rodar no SQL Editor do Supabase.
--
-- Após uma reserva APROVADA cuja DATA já passou, as duas partes (locador e locatário)
-- avaliam uma à outra: educação, pontualidade, limpeza (1–5) + "voltaria a fazer
-- negócio" (sim/não). Cada parte avalia 1x. Vira histórico no banco.
-- Compacto: smallint (1 byte) + boolean. Idempotente.
-- ════════════════════════════════════════════════════════════════════════════════

create table if not exists public.avaliacoes_locacao (
  id              uuid primary key default gen_random_uuid(),
  solicitacao_id  uuid not null references public.solicitacoes_reserva(id) on delete cascade,
  avaliador_id    uuid not null,                 -- quem avalia
  avaliado_id     uuid not null,                 -- quem é avaliado
  papel_avaliador text not null check (papel_avaliador in ('locador','locatario')),
  educacao        smallint not null check (educacao between 1 and 5),
  pontualidade    smallint not null check (pontualidade between 1 and 5),
  limpeza         smallint not null check (limpeza between 1 and 5),
  voltaria        boolean  not null,
  created_at      timestamptz not null default now(),
  unique (solicitacao_id, avaliador_id)          -- 1 avaliação por avaliador por reserva
);

alter table public.avaliacoes_locacao enable row level security;

-- Leitura: as duas partes da reserva (e superuser). Escrita só via RPC (sem policy de insert).
drop policy if exists av_select on public.avaliacoes_locacao;
create policy av_select on public.avaliacoes_locacao for select to authenticated
  using (auth.uid() = avaliador_id or auth.uid() = avaliado_id or public.is_superuser());

-- avaliar_locacao: valida parte + reserva aprovada + data passada; deriva papel/avaliado.
create or replace function public.avaliar_locacao(
  p_solicitacao uuid,
  p_educacao smallint, p_pontualidade smallint, p_limpeza smallint, p_voltaria boolean
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_anf uuid; v_loc uuid; v_status text; v_data date;
  v_papel text; v_avaliado uuid;
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  if p_educacao not between 1 and 5 or p_pontualidade not between 1 and 5 or p_limpeza not between 1 and 5 then
    raise exception 'Notas devem ser de 1 a 5.';
  end if;
  select anfitriao_id, locatario_id, status, data
    into v_anf, v_loc, v_status, v_data
    from public.solicitacoes_reserva where id = p_solicitacao;
  if v_anf is null then raise exception 'Solicitacao inexistente.'; end if;
  if v_uid <> v_anf and v_uid <> v_loc then raise exception 'Sem acesso a esta reserva.'; end if;
  if v_status <> 'aprovada' then raise exception 'So reservas aprovadas podem ser avaliadas.'; end if;
  if v_data >= current_date then raise exception 'A avaliacao e liberada apos a data da reserva.'; end if;

  if v_uid = v_anf then v_papel := 'locador'; v_avaliado := v_loc;
  else v_papel := 'locatario'; v_avaliado := v_anf; end if;

  -- mensagem amigável (o unique abaixo é a rede de segurança)
  if exists (select 1 from public.avaliacoes_locacao
             where solicitacao_id = p_solicitacao and avaliador_id = v_uid) then
    raise exception 'Voce ja avaliou esta reserva.';
  end if;

  insert into public.avaliacoes_locacao
    (solicitacao_id, avaliador_id, avaliado_id, papel_avaliador, educacao, pontualidade, limpeza, voltaria)
  values
    (p_solicitacao, v_uid, v_avaliado, v_papel, p_educacao, p_pontualidade, p_limpeza, p_voltaria);
end; $$;
revoke all on function public.avaliar_locacao(uuid,smallint,smallint,smallint,boolean) from public;
grant execute on function public.avaliar_locacao(uuid,smallint,smallint,smallint,boolean) to authenticated;
