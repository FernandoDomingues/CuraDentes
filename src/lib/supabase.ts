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

async function fetchWithTimeout(url: string, options: RequestInit, ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function supabaseRest<T = any>(
  table: string,
  params: Record<string, string>
): Promise<T[]> {
  const qs = new URLSearchParams();
  qs.set("select", "*");
  for (const [key, value] of Object.entries(params)) {
    qs.set(key, value);
  }
  const url = `${supabaseUrl}/rest/v1/${table}?${qs.toString()}`;
  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: "application/json",
    },
  }, 15000);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase REST error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T[]>;
}
