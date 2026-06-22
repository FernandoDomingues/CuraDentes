// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTE SUPABASE — PÚBLICO (anon, SEM sessão).
//
// Para LEITURAS PÚBLICAS (dentistas, especialidades, avaliações), tanto no servidor
// (SSR/SSG, sitemap) quanto no navegador. NÃO carrega/persiste sessão de login —
// é um leitor anônimo puro; quem cuida de autenticação é client.ts/server.ts.
// As regras de RLS no banco decidem o que pode ser lido.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltam variáveis de ambiente do Supabase. Copie .env.example para .env.local e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
