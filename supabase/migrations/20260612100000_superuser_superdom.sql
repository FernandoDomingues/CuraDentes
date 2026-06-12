-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Troca o superuser para SuperDom (superdom@curadentes.com.br)
--
-- A conta SuperDom é criada direto em auth.users (fora do versionamento, sem
-- expor a senha). Aqui apenas apontamos a fonte da verdade de autorização —
-- public.is_superuser() — para o email dela, substituindo o admin anterior.
--
-- Como is_superuser() é usado por todas as policies de admin (cro_verificacoes,
-- logs_busca) e pela função marcar_verificacao_cro, esta única alteração troca
-- o admin em todo o sistema.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    LOWER(COALESCE(
      auth.jwt() ->> 'email',
      auth.jwt() -> 'user_metadata' ->> 'email',
      auth.jwt() -> 'app_metadata' ->> 'email'
    )) = 'superdom@curadentes.com.br',
    false
  );
$$;
