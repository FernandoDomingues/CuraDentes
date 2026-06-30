-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — SUGESTÃO DE CLÍNICA no cadastro ("você quis dizer?").
--
-- Ao preencher CEP + número, o app oferece reusar o NOME de uma clínica que JÁ
-- existe naquele prédio (de OUTRO dentista) — padronizando o nome na fonte e
-- evitando "Villa"/"Vila". Se a clínica do dentista for OUTRA no mesmo prédio, ele
-- distingue pelo complemento (sala/conjunto). Camada preventiva do clinica_key (17).
--
-- RPC clinicas_no_predio(cep, numero): agrupa por clinica_key as clínicas naquele
-- prédio (mesmo CEP+número), exceto as do próprio dentista. So nome + complemento
-- (sem PII). Authenticated (o dentista ja tem sessao no cadastro). Idempotente.
-- ════════════════════════════════════════════════════════════════════════════════

create or replace function public.clinicas_no_predio(p_cep text, p_numero text)
returns table (clinica_key text, nome_clinica text, complemento text, qtd integer)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
declare v_cep text := regexp_replace(coalesce(p_cep, ''), '\D', '', 'g');
declare v_num text := regexp_replace(lower(coalesce(p_numero, '')), '[^a-z0-9]+', '', 'g');
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  -- Sem CEP/numero validos nao ha o que sugerir.
  if length(v_cep) < 8 or v_num = '' then return; end if;
  return query
  select
    public.clinica_key_de(e.cep, e.numero, e.complemento) as clinica_key,
    (mode() within group (order by e.nome_clinica))::text as nome_clinica,
    (array_agg(e.complemento order by e.id) filter (where coalesce(e.complemento,'') <> ''))[1]::text as complemento,
    count(*)::int as qtd
  from public.curadentespro_enderecos e
  where regexp_replace(coalesce(e.cep, ''), '\D', '', 'g') = v_cep
    and regexp_replace(lower(coalesce(e.numero, '')), '[^a-z0-9]+', '', 'g') = v_num
    and coalesce(btrim(e.nome_clinica), '') <> ''
    and e.curadentespro_id <> v_uid          -- so clinicas de OUTROS dentistas
  group by public.clinica_key_de(e.cep, e.numero, e.complemento)
  order by count(*) desc
  limit 8;
end; $$;
revoke all on function public.clinicas_no_predio(text, text) from public;
grant execute on function public.clinicas_no_predio(text, text) to authenticated;
