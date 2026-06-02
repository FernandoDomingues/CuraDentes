import { create } from "zustand";
import type { Session, Subscription, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ============================================================================
// DEFINIÇÃO DO TIPO DE USUÁRIO (CLIENTE) NO FRONTEND
// ============================================================================
export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface AuthState {
  user: User | null;
  isInitializing: boolean;
  initialized: boolean;
  signInWithGoogle: (latitude?: number | null, longitude?: number | null) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
}

// ============================================================================
// CACHE LOCAL (localStorage) — RESTAURAÇÃO INSTANTÂNEA AO ABRIR O NAVEGADOR
// ============================================================================
const CACHE_KEY = "curadentes_user_cache";

// Subscription de onAuthStateChange mantida em escopo de módulo para que
// initialize() possa cancelar a anterior antes de registrar uma nova
// (necessário em dev com React.StrictMode, que monta o App duas vezes).
let authSubscription: Subscription | null = null;

function saveUserCache(user: User) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(user)); }
  catch (err) { console.warn("[useAuth] Falha ao salvar cache do usuário:", err); }
}

function readUserCache(): User | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch (_) { return null; }
}

function clearUserCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    // Wipes all Supabase authentication tokens from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.toLowerCase().includes("supabase"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log("[useAuth] Cache e tokens do Supabase removidos com sucesso.");
  } catch (err) {
    console.error("[useAuth] Erro ao limpar tokens do localStorage:", err);
  }
}

// ============================================================================
// ESTADO GLOBAL DE AUTENTICAÇÃO (ZUSTAND STORE)
// ============================================================================
export const useAuth = create<AuthState>((set, get) => ({
  // Carrega do cache LOCAL DE FORMA SÍNCRONA — aparece logado instantaneamente
  user: readUserCache(),
  isInitializing: true,
  initialized: false,

  signInWithGoogle: async (latitude, longitude) => {
    if (latitude && longitude) {
      localStorage.setItem("curadentes_pending_loc", JSON.stringify({ latitude, longitude }));
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { console.error("Erro no login com Supabase:", error); throw error; }
  },

  logout: async () => {
    console.log("[useAuth] Iniciando logout...");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[useAuth] Erro retornado pelo signOut do Supabase:", error);
      }
    } catch (err) {
      console.error("[useAuth] Exceção ao executar signOut do Supabase:", err);
    } finally {
      console.log("[useAuth] Limpando cache e estado local...");
      clearUserCache();
      set({ user: null });
    }
  },

  initialize: () => {
    if (get().initialized) return;
    set({ initialized: true });

    // Cancela subscription anterior caso initialize() seja chamado novamente
    // (ex.: React.StrictMode monta o App duas vezes em dev)
    authSubscription?.unsubscribe();
    authSubscription = null;

    const setAndCache = (userObj: User) => {
      saveUserCache(userObj);
      set({ user: userObj, isInitializing: false });
    };

    // Restaura do banco (somente quando o cache não existe)
    const restoreFromDB = async (authUser: SupabaseUser) => {
      if (!authUser) { set({ isInitializing: false }); return; }
      
      // 1. Ação Agressiva: Mostra o usuário como logado imediatamente com dados básicos
      const basicUser: User = {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email,
        email: authUser.email,
        picture: authUser.user_metadata?.avatar_url || "",
        createdAt: new Date().toISOString(), // Fallback
      };
      setAndCache(basicUser);

      // 2. Busca dados complementares no banco em background
      try {
        const { data: cliente } = await supabase
          .from("clientes").select("*").eq("id", authUser.id).single();
        if (cliente) {
          setAndCache({
            id: cliente.id, name: cliente.nome, email: cliente.email,
            picture: cliente.foto, createdAt: cliente.criado_em,
            latitude: cliente.latitude, longitude: cliente.longitude,
          });
        }
      } catch (err) {
        console.error("Erro ao puxar dados extras do banco:", err);
      }
    };

    // Login real: cria/atualiza o registro do cliente no banco
    const signInAndSync = async (session: Session) => {
      const authUser = session.user;
      if (!authUser) return;

      const pendingLocStr = localStorage.getItem("curadentes_pending_loc");
      let lat: number | null = null, lng: number | null = null;
      if (pendingLocStr) {
        try {
          const parsed = JSON.parse(pendingLocStr) as { latitude?: number | null; longitude?: number | null };
          lat = parsed.latitude ?? null; lng = parsed.longitude ?? null;
          localStorage.removeItem("curadentes_pending_loc");
        } catch (err) {
          console.warn("[useAuth] Falha ao ler localização pendente:", err);
        }
      }

      // 1. Ação Agressiva: O frontend precisa mostrar o usuário logado AGORA, não importa o banco
      const basicUser: User = {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email,
        email: authUser.email,
        picture: authUser.user_metadata?.avatar_url || "",
        createdAt: new Date().toISOString(),
        latitude: lat,
        longitude: lng
      };
      setAndCache(basicUser);

      // 2. Tenta sincronizar em background com a tabela 'clientes'
      try {
        const { data: cliente } = await supabase
          .from("clientes")
          .upsert({
            id: authUser.id,
            nome: basicUser.name,
            email: basicUser.email,
            foto: basicUser.picture,
            ...(lat && lng ? { latitude: lat, longitude: lng } : {}),
          }, { onConflict: "id" })
          .select().single();

        if (cliente) {
          setAndCache({
            id: cliente.id, name: cliente.nome, email: cliente.email,
            picture: cliente.foto, createdAt: cliente.criado_em,
            latitude: cliente.latitude, longitude: cliente.longitude,
          });
        }
      } catch (err) { console.error("Erro background upsert:", err); }
    };

    // Escuta todos os eventos de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[useAuth] Evento de Autenticação Supabase:", event, session ? `Sessão Ativa (User ID: ${session.user.id})` : "Sem Sessão");
      if (event === "SIGNED_IN" && session) {
        // Login real (vindo do Google): sincroniza/cria no banco
        await signInAndSync(session);

      } else if (event === "INITIAL_SESSION") {
        if (session) {
          // O cache já restaurou o usuário? Apenas finaliza a inicialização.
          // Caso contrário, vai buscar no banco.
          if (get().user) {
            set({ isInitializing: false });
          } else {
            await restoreFromDB(session.user);
          }
        } else {
          // Sem sessão no Supabase: limpa o cache caso estivesse desatualizado
          clearUserCache();
          set({ user: null, isInitializing: false });
        }

      } else if (event === "SIGNED_OUT") {
        clearUserCache();
        set({ user: null, isInitializing: false });

      } else if (event === "TOKEN_REFRESHED" && session) {
        // Token renovado automaticamente em background — sem ação necessária
        set({ isInitializing: false });
      }
    });
    authSubscription = subscription;
  },
}));
