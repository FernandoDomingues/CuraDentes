-- ==============================================================================
-- 1. CRIAR TABELA DE AVALIAÇÕES (RATING DE 1 A 5)
-- ==============================================================================
-- Obs: A coluna de texto 'comentario' foi deliberadamente omitida por 
-- solicitação para economia de espaço no banco de dados.

CREATE TABLE IF NOT EXISTS public.avaliacoes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id uuid NOT NULL, -- ID do usuário logado via Google (auth.users)
    dentista_id uuid NOT NULL REFERENCES public.curadentespro(id) ON DELETE CASCADE,
    nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
    atividade character varying(100), -- Serviço ou especialidade avaliada
    criado_em timestamp with time zone DEFAULT now()
);

-- Habilitar RLS (Segurança a nível de linha)
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública das avaliações (para compor a média)
CREATE POLICY "Permitir leitura publica de avaliacoes" 
ON public.avaliacoes FOR SELECT 
USING (true);

-- Permitir que usuários autenticados insiram avaliações
CREATE POLICY "Permitir insercao de avaliacoes por pacientes autenticados" 
ON public.avaliacoes FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Permitir que apenas o dono altere/delete sua própria avaliação (se necessário no futuro)
CREATE POLICY "Permitir modificacao apenas pelo proprio paciente" 
ON public.avaliacoes FOR UPDATE 
USING (auth.uid() = paciente_id);

CREATE POLICY "Permitir exclusao apenas pelo proprio paciente" 
ON public.avaliacoes FOR DELETE 
USING (auth.uid() = paciente_id);

-- ==============================================================================
-- 2. FUNÇÃO/TRIGGER PARA ATUALIZAR MÉDIA DO DENTISTA (Opcional, porém útil)
-- ==============================================================================
-- Nota: Como ainda não há a coluna 'avaliacao_media' em curadentespro,
-- vamos calculá-la dinamicamente nas consultas ou implementar depois.
