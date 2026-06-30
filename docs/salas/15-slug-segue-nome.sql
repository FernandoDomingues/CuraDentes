-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — SLUG SEGUE O NOME. Antes o slug era CONGELADO (gerado uma vez, não mudava
-- ao renomear). Agora ele é REGENERADO quando o nome_clinica ou o CEP mudam — assim
-- a URL /coworking/clinica/<slug> reflete o nome atual da clínica. (Escolha do usuário.)
--
-- TRADEOFF: links antigos para o slug anterior deixam de resolver (404). Como a
-- feature ainda NÃO está em produção, não há impacto real.
--
-- Substitui o trigger endereco_slug() e regenera os slugs já existentes a partir do
-- nome atual de cada clínica. Aditivo, idempotente. Rode no SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════

create or replace function public.endereco_slug() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_base text; v_cand text; v_n int := 1;
begin
  -- Mantém o slug atual SÓ quando nada que o compõe mudou: no UPDATE com nome e CEP
  -- iguais e slug já preenchido. No INSERT — ou quando o nome/CEP muda — (re)gera.
  if tg_op = 'UPDATE'
     and new.nome_clinica is not distinct from old.nome_clinica
     and new.cep          is not distinct from old.cep
     and new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;
  v_base := lower(unaccent(coalesce(nullif(btrim(new.nome_clinica), ''), 'clinica')));
  v_base := btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-');
  v_base := v_base || '-' || regexp_replace(coalesce(new.cep, ''), '\D', '', 'g');
  v_base := btrim(v_base, '-');
  v_cand := v_base;
  -- Garante unicidade (acrescenta -2, -3, … se colidir com OUTRA clínica).
  while exists (select 1 from public.curadentespro_enderecos where slug = v_cand and id <> new.id) loop
    v_n := v_n + 1;
    v_cand := v_base || '-' || v_n;
  end loop;
  new.slug := v_cand;
  return new;
end; $$;

-- Regenera os slugs já existentes a partir do nome ATUAL (1 a 1 → unicidade correta).
-- Zerar o slug força o trigger a recalcular (nome inalterado, mas slug vazio → regera).
do $$
declare r record;
begin
  for r in select id from public.curadentespro_enderecos order by created_at loop
    update public.curadentespro_enderecos set slug = null where id = r.id;
  end loop;
end $$;
