-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Corrige o registro de visualização (INSERT ... RETURNING + RLS)
--
-- O cliente supabase-js faz INSERT ... RETURNING ao registrar a visualização.
-- O RETURNING le a linha de volta, sujeito à policy de SELECT — que era owner-only
-- (só o dentista). Como o VISITANTE não é o dono, o RETURNING violava o RLS e o
-- insert falhava silenciosamente ("new row violates row-level security policy").
--
-- Correção: o visitante pode ler o PRÓPRIO registro de visualização
-- (viewer_id = auth.uid()), o que faz o RETURNING passar. Continua sem expor
-- as visualizações de um dentista para outros.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "owner_select_visualizacoes" ON public.perfil_visualizacoes;
CREATE POLICY "owner_select_visualizacoes" ON public.perfil_visualizacoes
  FOR SELECT TO authenticated
  USING (
    dentista_id = auth.uid()    -- o dono vê as visualizações do seu perfil
    OR viewer_id = auth.uid()   -- o visitante vê (e registra) a própria visualização
    OR public.is_superuser()
  );
