// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useAuth — Estado global de autenticação (Zustand)
//
// Responsabilidades:
//   1. Gerenciar sessão do Supabase Auth (login, logout, refresh)
//   2. Cachear sessão no localStorage para login instantâneo
//   3. Escutar eventos onAuthStateChange (login, logout, token refresh)
//   4. Gerenciar login com email/senha e Google OAuth
//   5. Cleanup explícito da subscription no onUnmount (necessário pelo StrictMode)
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from "zustand";
import type { Session, Subscription, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isSuperuserEmail } from "@/utils/superuser";
import { detectarOrigemLogin } from "@/utils/origemLogin";

// ============================================================================
// DEFINIÇÃO DO TIPO DE USUÁRIO NO FRONTEND
// ============================================================================
export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  createdAt: string;
  role: 'paciente' | 'dentista' | 'superuser';
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
  setUser: (user: User | null) => void;
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

/**
 * Registra a ORIGEM do login (navegador/dispositivo) na tabela logs_login.
 * Uma vez por sessão de aba (guarda em sessionStorage), limpa no logout — assim
 * SIGNED_IN re-disparado (foco/refresh) nao conta login duplicado.
 */
function registrarLogin(userId: string | null) {
  try {
    if (sessionStorage.getItem("curadentes_login_logged")) return;
    sessionStorage.setItem("curadentes_login_logged", "1");
    const o = detectarOrigemLogin();
    supabase
      .from("logs_login")
      .insert({
        origem: o.origem,
        plataforma: o.plataforma,
        navegador: o.navegador,
        is_app: o.is_app,
        user_agent: o.user_agent,
        user_id: userId,
      })
      .then(({ error }) => {
        if (error) console.warn("[useAuth] Falha ao registrar origem do login:", error.message);
      });
  } catch (err) {
    console.warn("[useAuth] registrarLogin falhou:", err);
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
      // Sem query/hash na URL de retorno (#12): evita repassar parametros
      // arbitrarios para o fluxo OAuth. Volta para a mesma rota, limpa.
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) { console.error("Erro no login com Supabase:", error); throw error; }
  },

  logout: async () => {
    console.log("[useAuth] Iniciando logout...");
    clearUserCache();
    set({ user: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[useAuth] Erro retornado pelo signOut do Supabase:", error);
      }
    } catch (err) {
      console.error("[useAuth] Exceção ao executar signOut do Supabase:", err);
    }
  },

  setUser: (user: User | null) => {
    if (user) {
      saveUserCache(user);
    } else {
      clearUserCache();
    }
    set({ user });
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

    // Verifica se o usuário autenticado é um dentista (tabela curadentespro)
    const checkIfDentista = async (authUser: SupabaseUser) => {
      try {
        const { data: dentista } = await supabase
          .from('curadentespro')
          .select('id, nome, email, foto_url')
          .eq('id', authUser.id)
          .is('deleted_at', null)
          .maybeSingle();
        return dentista;
      } catch {
        return null;
      }
    };

    // Restaura do banco (somente quando o cache não existe)
    const restoreFromDB = async (authUser: SupabaseUser) => {
      if (!authUser) { set({ isInitializing: false }); return; }

      // 0. Superuser (SuperDom): não é dentista nem paciente — não cria nada no banco
      if (isSuperuserEmail(authUser.email)) {
        setAndCache({
          id: authUser.id, name: "SuperDom", email: authUser.email,
          picture: "", createdAt: new Date().toISOString(), role: 'superuser',
        });
        return;
      }

      // 1. Verifica se é dentista
      const dentista = await checkIfDentista(authUser);
      if (dentista) {
        setAndCache({
          id: dentista.id,
          name: dentista.nome,
          email: dentista.email || authUser.email,
          picture: dentista.foto_url || "",
          createdAt: new Date().toISOString(),
          role: 'dentista',
        });
        return;
      }

      // 2. Ação Agressiva: Mostra o usuário como logado imediatamente com dados básicos
      const basicUser: User = {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email,
        email: authUser.email,
        picture: authUser.user_metadata?.avatar_url || "",
        createdAt: new Date().toISOString(),
        role: 'paciente',
      };
      setAndCache(basicUser);

      // 3. Busca dados complementares no banco em background
      try {
        const { data: cliente } = await supabase
          .from("clientes").select("*").eq("id", authUser.id).is("deleted_at", null).single();
        if (cliente) {
          setAndCache({
            id: cliente.id, name: cliente.nome, email: cliente.email,
            picture: cliente.foto, createdAt: cliente.criado_em,
            latitude: cliente.latitude, longitude: cliente.longitude,
            role: 'paciente',
          });
        }
      } catch (err) {
        console.error("Erro ao puxar dados extras do banco:", err);
      }
    };

    // Login real: detecta dentista ou cria/atualiza o registro do cliente no banco
    const signInAndSync = async (session: Session) => {
      const authUser = session.user;
      if (!authUser) return;

      // 0. Superuser (SuperDom): não é dentista nem paciente — não cria nada no banco
      if (isSuperuserEmail(authUser.email)) {
        setAndCache({
          id: authUser.id, name: "SuperDom", email: authUser.email,
          picture: "", createdAt: new Date().toISOString(), role: 'superuser',
        });
        return;
      }

      // 1. Verifica se é dentista
      const dentista = await checkIfDentista(authUser);
      if (dentista) {
        setAndCache({
          id: dentista.id,
          name: dentista.nome,
          email: dentista.email || authUser.email,
          picture: dentista.foto_url || "",
          createdAt: new Date().toISOString(),
          role: 'dentista',
        });
        return;
      }

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

      // 2. Ação Agressiva: O frontend precisa mostrar o usuário logado AGORA, não importa o banco
      const basicUser: User = {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email,
        email: authUser.email,
        picture: authUser.user_metadata?.avatar_url || "",
        createdAt: new Date().toISOString(),
        latitude: lat,
        longitude: lng,
        role: 'paciente',
      };
      setAndCache(basicUser);

      // 3. Tenta sincronizar em background com a tabela 'clientes'
      try {
        const { data: cliente } = await supabase
          .from("clientes")
          .upsert({
            id: authUser.id,
            user_id: authUser.id,
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
            role: 'paciente',
          });
        }
      } catch (err) { console.error("Erro background upsert:", err); }
    };

    // Escuta todos os eventos de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[useAuth] Evento de Autenticação Supabase:", event, session ? `Sessão Ativa (User ID: ${session.user.id})` : "Sem Sessão");
      if (event === "SIGNED_IN" && session) {
        // Registra a origem do login (uma vez por sessao) e sincroniza/cria no banco
        registrarLogin(session.user.id);
        setTimeout(() => {
          signInAndSync(session);
        }, 0);

      } else if (event === "INITIAL_SESSION") {
        if (session) {
          // O cache já restaurou o usuário? Apenas finaliza a inicialização.
          // Caso contrário, vai buscar no banco.
          if (get().user) {
            set({ isInitializing: false });
          } else {
            setTimeout(() => {
              restoreFromDB(session.user);
            }, 0);
          }
        } else {
          // Sem sessão no Supabase: limpa o cache caso estivesse desatualizado
          clearUserCache();
          set({ user: null, isInitializing: false });
        }

      } else if (event === "SIGNED_OUT") {
        clearUserCache();
        sessionStorage.removeItem("curadentes_login_logged");
        set({ user: null, isInitializing: false });

      } else if (event === "TOKEN_REFRESHED" && session) {
        // Token renovado automaticamente em background — sem ação necessária
        set({ isInitializing: false });
      }
    });
    authSubscription = subscription;
  },
}));
