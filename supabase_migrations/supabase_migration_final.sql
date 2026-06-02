CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE TABLE public.clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    foto text,
    criado_em timestamp with time zone DEFAULT now(),
    latitude numeric(9,6),
    longitude numeric(9,6)
);
ALTER TABLE public.clientes OWNER TO postgres;
CREATE TABLE public.curadentespro (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(150) NOT NULL,
    email character varying(255),
    telefone character varying(20),
    telefone_verificado boolean DEFAULT false,
    cpf character varying(14),
    cro character varying(30) NOT NULL,
    ano_formacao integer,
    foto_url text,
    bio character varying(500),
    lgpd_aceito boolean DEFAULT false NOT NULL,
    criado_em timestamp with time zone DEFAULT now()
);
ALTER TABLE public.curadentespro OWNER TO postgres;
CREATE TABLE public.curadentespro_enderecos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    curadentespro_id uuid NOT NULL,
    nome_clinica character varying(150) NOT NULL,
    logradouro character varying(255) NOT NULL,
    numero character varying(20),
    complemento character varying(100),
    bairro character varying(100) NOT NULL,
    cidade character varying(100) NOT NULL,
    estado character(2) NOT NULL,
    cep character varying(10),
    telefone character varying(20),
    whatsapp character varying(20),
    atende_urgencias boolean DEFAULT false,
    aceita_urgencia_termo boolean DEFAULT false,
    politica_cancelamento character varying(500),
    observacoes character varying(500),
    atividades text[],
    convenios text[],
    formas_pagamento text[],
    agenda jsonb,
    criado_em timestamp with time zone DEFAULT now()
);
ALTER TABLE public.curadentespro_enderecos OWNER TO postgres;
-- ============================================================
-- SEEDS REMOVIDOS DO VERSIONAMENTO POR LGPD/PRIVACIDADE
-- 50 INSERTs de curadentespro + 50 INSERTs de curadentespro_enderecos
-- continham dados pessoais reais (nomes, CROs, enderecos de clinicas).
-- Os dados continuam no banco Supabase de desenvolvimento; foram
-- apenas excluidos deste arquivo para nao irem para o GitHub.
-- Se precisar recriar do zero, exporte via:
--   pg_dump --data-only --inserts --table=public.curadentespro
--   pg_dump --data-only --inserts --table=public.curadentespro_enderecos
-- ============================================================

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_email_key UNIQUE (email);
ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.curadentespro
    ADD CONSTRAINT curadentespro_cpf_key UNIQUE (cpf);
ALTER TABLE ONLY public.curadentespro
    ADD CONSTRAINT curadentespro_cro_key UNIQUE (cro);
ALTER TABLE ONLY public.curadentespro
    ADD CONSTRAINT curadentespro_email_key UNIQUE (email);
ALTER TABLE ONLY public.curadentespro_enderecos
    ADD CONSTRAINT curadentespro_enderecos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.curadentespro
    ADD CONSTRAINT curadentespro_pkey PRIMARY KEY (id);
CREATE INDEX idx_curadentespro_cpf ON public.curadentespro USING btree (cpf);
CREATE INDEX idx_curadentespro_cro ON public.curadentespro USING btree (cro);
CREATE INDEX idx_curadentespro_enderecos_id ON public.curadentespro_enderecos USING btree (curadentespro_id);
ALTER TABLE ONLY public.curadentespro_enderecos
    ADD CONSTRAINT curadentespro_enderecos_curadentespro_id_fkey FOREIGN KEY (curadentespro_id) REFERENCES public.curadentespro(id) ON DELETE CASCADE;

-- RLS POLICIES FOR SUPABASE --
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso público à tabela clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.curadentespro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso público à tabela curadentespro" ON public.curadentespro FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.curadentespro_enderecos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso público à tabela curadentespro_enderecos" ON public.curadentespro_enderecos FOR ALL USING (true) WITH CHECK (true);
