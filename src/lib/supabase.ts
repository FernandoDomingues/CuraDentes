import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltam as variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // Mantém o usuário logado via localStorage
    autoRefreshToken: true,     // Renova o token automaticamente no plano de fundo
    detectSessionInUrl: true,   // Necessário para login OAuth (Google)
    storage: window.localStorage // Força o uso seguro do storage local do navegador
  }
});
