-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — DETALHE MEMBERS-ONLY (aditivo; rode no SQL Editor do Supabase)
--
-- Contexto: a comunidade de salas é fechada a dentistas com CRO verificado. Dentro
-- dela, endereço completo + contato da clínica PODEM aparecer (decisão de produto).
-- A view pública salas_publicas NÃO pode expor isso (é concedida a 'anon' → qualquer
-- um leria via REST). Então o detalhe completo vem desta RPC com PORTEIRO de CRO.
--
-- get_sala_detalhe(p_id): só executa se o chamador for dentista com CRO verificado;
-- devolve a sala ativa (de anfitrião verificado) com endereço (logradouro/número/
-- complemento/CEP via curadentespro_enderecos) + contato dedicado (whatsapp/email).
-- Idempotente. Não toca dados.
-- ════════════════════════════════════════════════════════════════════════════════

create or replace function public.get_sala_detalhe(p_id uuid)
returns table (
  id uuid, titulo text, descricao text, equipamentos text[],
  preco_valor numeric, preco_unidade text, disponibilidade jsonb,
  politica_cancelamento text, fotos text[],
  nome_clinica text, cidade text, bairro text, estado text,
  latitude double precision, longitude double precision, created_at timestamptz,
  contato_whatsapp text, contato_email text,
  logradouro text, numero text, complemento text, cep text
) language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  -- Porteiro members-only: só dentista com CRO verificado vê o detalhe completo.
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Apenas dentistas com CRO verificado podem ver os detalhes da sala.';
  end if;
  return query
    select s.id, s.titulo, s.descricao, s.equipamentos,
           s.preco_valor, s.preco_unidade::text, s.disponibilidade,
           s.politica_cancelamento, s.fotos,
           s.nome_clinica, s.cidade, s.bairro, s.estado,
           s.latitude, s.longitude, s.created_at,
           s.contato_whatsapp, s.contato_email,
           e.logradouro::text, e.numero::text, e.complemento::text, e.cep::text
      from public.salas s
      join public.curadentespro c on c.id = s.anfitriao_id
      left join public.curadentespro_enderecos e on e.id = s.endereco_id
     where s.id = p_id
       and s.status = 'ativa'
       and c.cro_verificado is true
       and c.deleted_at is null;
end; $$;

revoke all on function public.get_sala_detalhe(uuid) from public;
grant execute on function public.get_sala_detalhe(uuid) to authenticated;

-- Verificação (logado como dentista verificado, troque o UUID por uma sala ativa):
--   select titulo, cidade, contato_whatsapp, logradouro, numero from get_sala_detalhe('UUID_SALA');
