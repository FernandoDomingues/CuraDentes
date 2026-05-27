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

// Interface que descreve quais dados e funções estarão disponíveis globalmente no site.
interface AuthState {
  user: User | null; // Armazena o usuário que está logado atualmente
  login: (userData: { 
    name: string; 
    email: string; 
    picture: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => Promise<User>; // Função assíncrona para cadastrar/entrar
  logout: () => void; // Função para desconectar o usuário
}

// 1. Carrega a sessão do usuário que já estava logado antes (Cache local rápido)
const getPersistedSession = (): User | null => {
  try {
    const session = localStorage.getItem("curadentes_session_user");
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error("Erro ao carregar sessão persistida:", error);
    return null;
  }
};

// ============================================================================
// ESTADO GLOBAL DE AUTENTICAÇÃO (ZUSTAND STORE)
// ============================================================================
export const useAuth = create<AuthState>((set) => ({
  user: getPersistedSession(),

  // Função disparada no momento em que o login com o Google é finalizado com sucesso
  login: async (userData) => {
    
    // Procura por um cliente existente no Supabase pelo e-mail
    const { data: clienteExistente, error: searchError } = await supabase
      .from('clientes')
      .select('*')
      .eq('email', userData.email.toLowerCase())
      .single();

    // Esta variável vai armazenar os dados exatos do banco
    let dbRow: any;

    if (!clienteExistente && searchError?.code === 'PGRST116') {
      // PGRST116 significa "nenhuma linha retornada" (usuário não existe)
      // SE O USUÁRIO FOR INÉDITO (NOVO CADASTRO):
      // No banco de dados, usamos nome, foto e criado_em
      const novoCliente = {
        nome: userData.name,
        email: userData.email.toLowerCase(),
        foto: userData.picture,
        latitude: userData.latitude || null,
        longitude: userData.longitude || null,
      };
      
      const { data: insertedData, error: insertError } = await supabase
        .from('clientes')
        .insert([novoCliente])
        .select()
        .single();

      if (insertError) {
        console.error("Erro ao criar usuário no Supabase:", insertError);
        throw new Error("Erro ao criar usuário no Supabase");
      }
      
      dbRow = insertedData;

    } else if (clienteExistente) {
      // SE O USUÁRIO JÁ EXISTIR EM NOSSO BANCO:
      // Atualizamos a foto de perfil, o nome ou a localização caso ela tenha mudado
      let needsUpdate = false;
      const updates: any = {};

      if (clienteExistente.foto !== userData.picture) {
        updates.foto = userData.picture;
        needsUpdate = true;
      }
      if (clienteExistente.nome !== userData.name) {
        updates.nome = userData.name;
        needsUpdate = true;
      }
      if (userData.latitude !== undefined && userData.latitude !== null && clienteExistente.latitude !== userData.latitude) {
        updates.latitude = userData.latitude;
        needsUpdate = true;
      }
      if (userData.longitude !== undefined && userData.longitude !== null && clienteExistente.longitude !== userData.longitude) {
        updates.longitude = userData.longitude;
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { data: updatedData, error: updateError } = await supabase
          .from('clientes')
          .update(updates)
          .eq('id', clienteExistente.id)
          .select()
          .single();

        if (updateError) {
          console.error("Erro ao atualizar usuário no Supabase:", updateError);
          dbRow = { ...clienteExistente, ...updates }; // fallback
        } else {
          dbRow = updatedData;
        }
      } else {
        dbRow = clienteExistente;
      }

    } else {
      console.error("Erro desconhecido ao buscar cliente no Supabase:", searchError);
      throw new Error("Erro de banco de dados");
    }

    // Convertendo a linha do Banco de Dados (Português) para o formato esperado pelo Frontend (Inglês)
    const clienteFinal: User = {
      id: dbRow.id,
      name: dbRow.nome,
      email: dbRow.email,
      picture: dbRow.foto,
      createdAt: dbRow.criado_em,
      latitude: dbRow.latitude,
      longitude: dbRow.longitude,
    };

    // Salva na memória do navegador que este cliente está com a sessão ativa
    try {
      localStorage.setItem("curadentes_session_user", JSON.stringify(clienteFinal));
    } catch (error) {
      console.error("Erro ao salvar sessão:", error);
    }

    set({ user: clienteFinal });
    return clienteFinal;
  },

  logout: () => {
    try {
      localStorage.removeItem("curadentes_session_user");
    } catch (error) {
      console.error("Erro ao remover sessão:", error);
    }
    set({ user: null });
  },
}));
