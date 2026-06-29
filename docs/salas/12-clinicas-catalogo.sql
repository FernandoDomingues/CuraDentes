-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — CATÁLOGO POR CLÍNICA (aditivo). O resultado da busca passa a ser a CLÍNICA
-- (não salas soltas): cada clínica com fachada + nº de salas + preço mínimo. Ao entrar
-- na clínica, as salas vêm de salas_publicas (filtrando clinica_slug). Members-only.
-- Rode no SQL Editor. Idempotente.
-- ════════════════════════════════════════════════════════════════════════════════

create or replace function public.get_clinicas_publicas(p_cidade text default null)
returns table (
  slug text, nome_clinica text, cidade text, bairro text, estado text,
  latitude double precision, longitude double precision,
  foto_fachada text, qtd_salas bigint, preco_min numeric
) language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  if not exists (select 1 from public.curadentespro c
                 where c.id = v_uid and c.cro_verificado is true and c.deleted_at is null) then
    raise exception 'Apenas dentistas com CRO verificado.';
  end if;
  return query
    select e.slug, e.nome_clinica, e.cidade, e.bairro, e.estado,
           e.latitude, e.longitude, e.foto_fachada,
           count(s.id) as qtd_salas, min(s.preco_valor) as preco_min
      from public.curadentespro_enderecos e
      join public.curadentespro c on c.id = e.curadentespro_id
      join public.salas s        on s.endereco_id = e.id and s.status = 'ativa'
     where c.cro_verificado is true and c.deleted_at is null
       and (p_cidade is null or btrim(p_cidade) = '' or e.cidade ilike '%' || p_cidade || '%')
     group by e.slug, e.nome_clinica, e.cidade, e.bairro, e.estado, e.latitude, e.longitude, e.foto_fachada
     order by count(s.id) desc, e.nome_clinica asc
     limit 100;
end; $$;
revoke all on function public.get_clinicas_publicas(text) from public;
grant execute on function public.get_clinicas_publicas(text) to authenticated;
