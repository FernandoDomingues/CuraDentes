-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Corrige o trigger que cria a verificacao de CRO
--
-- PROBLEMA: a funcao on_cro_update_create_verificacao() (trigger AFTER UPDATE OF
-- cro em curadentespro) insere em cro_verificacoes. Como NAO era SECURITY DEFINER,
-- rodava com as permissoes do usuario que disparou o UPDATE — um dentista comum.
-- A RLS de cro_verificacoes so permite INSERT do superuser, entao o trigger
-- falhava com "new row violates row-level security policy", e isso fazia o upsert
-- da curadentespro inteiro retornar 403 no Passo 3 do cadastro.
--
-- (So aparecia agora porque, antes, todos os upserts ja falhavam por outro motivo
--  — a protecao de cpf — e a linha nunca chegava a existir para virar UPDATE.)
--
-- CORRECAO: a criacao da verificacao e uma acao do sistema (nao do usuario), entao
-- a funcao passa a ser SECURITY DEFINER (roda como dona, ignora a RLS de insert).
-- Tambem passa a disparar no INSERT, para que um dentista novo que ja entra com CRO
-- tenha a verificacao criada.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.on_cro_update_create_verificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cro IS NOT NULL AND NEW.cro <> ''
     AND (TG_OP = 'INSERT' OR OLD.cro IS DISTINCT FROM NEW.cro) THEN
    INSERT INTO public.cro_verificacoes (dentista_id, cro, uf, status)
    VALUES (
      NEW.id,
      NEW.cro,
      upper(split_part(NEW.cro, '-', 2)),
      'pendente'
    )
    ON CONFLICT (dentista_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cro_update_verificacao ON public.curadentespro;
CREATE TRIGGER trg_cro_update_verificacao
  AFTER INSERT OR UPDATE OF cro ON public.curadentespro
  FOR EACH ROW
  EXECUTE FUNCTION public.on_cro_update_create_verificacao();
