import { create } from "zustand";
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
  signInWithGoogle: (latitude?: number | null, longitude?: number | null) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
}

// ============================================================================
// CACHE LOCAL (localStorage) — RESTAURAÇÃO INSTANTÂNEA AO ABRIR O NAVEGADOR
// ============================================================================
const CACHE_KEY = "curadentes_user_cache";

function saveUserCache(user: User) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(user)); } catch (_) {}
}

function readUserCache(): User | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch (_) { return null; }
}

function clearUserCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
}

// ============================================================================
// ESTADO GLOBAL DE AUTENTICAÇÃO (ZUSTAND STORE)
// ============================================================================
export const useAuth = create<AuthState>((set, get) => ({
  // Carrega do cache LOCAL DE FORMA SÍNCRONA — aparece logado instantaneamente
  user: readUserCache(),
  isInitializing: true,

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
    await supabase.auth.signOut();
    clearUserCache();
    set({ user: null });
  },

  initialize: () => {
    const setAndCache = (userObj: User) => {
      saveUserCache(userObj);
      set({ user: userObj, isInitializing: false });
    };

    // Restaura do banco (somente quando o cache não existe)
    const restoreFromDB = async (authUser: any) => {
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
    const signInAndSync = async (session: any) => {
      const authUser = session.user;
      if (!authUser) return;

      const pendingLocStr = localStorage.getItem("curadentes_pending_loc");
      let lat = null, lng = null;
      if (pendingLocStr) {
        try {
          const parsed = JSON.parse(pendingLocStr);
          lat = parsed.latitude; lng = parsed.longitude;
          localStorage.removeItem("curadentes_pending_loc");
        } catch (e) {}
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
    supabase.auth.onAuthStateChange(async (event, session) => {
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
  },
}));
