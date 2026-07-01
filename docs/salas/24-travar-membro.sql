-- ════════════════════════════════════════════════════════════════════════════════
-- Salas — TRAVAR dados da clínica para MEMBROS (não-donos).
--
-- Motivo: a trava de adesão no formulário só valia durante a interação (onBlur do
-- CEP/número). Ao REABRIR o perfil, um dentista MEMBRO (que aderiu a uma clínica de
-- OUTRO dono) conseguia editar os dados que definem a clínica (nome, fotos, estrutura).
-- Esses dados pertencem ao DONO e devem ficar bloqueados para quem não é dono.
--
-- Esta RPC é READ-ONLY (sem efeito colateral, diferente de sincronizar_clinica): diz
-- quais dos MEUS endereços pertencem a uma clínica cujo dono é OUTRO (= sou membro).
-- Requer clinica_key_de() (17) e clinicas_donos (19). Idempotente.
-- ════════════════════════════════════════════════════════════════════════════════

create or replace function public.enderecos_membro()
returns table(endereco_id uuid)
language sql stable security definer set search_path = public, pg_temp as $$
  select e.id
    from public.curadentespro_enderecos e
    join public.clinicas_donos d
      on d.clinica_key = public.clinica_key_de(e.cep, e.numero, e.complemento)
   where e.curadentespro_id = auth.uid()
     and d.dono_id <> auth.uid();
$$;
revoke all on function public.enderecos_membro() from public;
grant execute on function public.enderecos_membro() to authenticated;

-- Conferência (opcional): meus endereços que são de clínica de outro dono
-- select * from public.enderecos_membro();
