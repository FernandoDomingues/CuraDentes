// ═══════════════════════════════════════════════════════════════════════════════
// Cliente Supabase (back-end do CuraDentes — o MESMO projeto do site-k11)
//
// Este cliente usa a ANON KEY (pública) e serve para LEITURAS PÚBLICAS (dentistas,
// especialidades, avaliações), tanto no servidor (SSR/SSG) quanto no navegador.
// As regras de RLS no banco é que decidem o que cada um pode ler.
//
// OBS (próximas fases): para AUTENTICAÇÃO com cookies no Next.js (login persistido
// entre servidor e cliente), na Fase 2 adicionamos o pacote `@supabase/ssr`
// (createBrowserClient / createServerClient). Por enquanto, só leitura pública.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Falha cedo e com mensagem clara se esquecermos de configurar o .env.local.
if (!url || !anonKey) {
  throw new Error(
    "Faltam variáveis de ambiente do Supabase. Copie .env.example para .env.local e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(url, anonKey);
