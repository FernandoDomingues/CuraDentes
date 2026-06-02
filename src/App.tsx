// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE RAIZ DA APLICAÇÃO
//
// Responsabilidades:
//   1. Inicializar o estado de autenticação (useAuth.initialize) uma vez
//      na montagem. Isso dispara o listener de onAuthStateChange do
//      Supabase Auth e restaura a sessão salva no localStorage.
//   2. Configurar o router (BrowserRouter + Routes).
//   3. Renderizar o Toaster global (Sonner) para notificações.
//
// Mapa de rotas:
//   /                       → Home (público, com busca e geolocalização opt-in)
//   /pesquisa               → Resultados de busca (público)
//   /dentista/:id           → Perfil completo do dentista (público)
//   /pro/novo-cadastro      → Signup Pro em 6 etapas (público, vira autenticado)
//   /pro/dashboard          → Painel principal (autenticado: dentista)
//   /pro/perfil             → Editor de perfil (autenticado: dentista)
//   *                       → 404 (público)
//
// IMPORTANTE: useAuth.initialize() é idempotente (checa `initialized`
// antes de re-executar). Pode ser chamado múltiplas vezes sem efeito.
// Ver src/hooks/useAuth.ts para detalhes do cleanup de subscription.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/useAuth";

import Index from "@/pages/Index";
import Pesquisa from "@/pages/Pesquisa";
import NotFound from "@/pages/NotFound";
import DentistProfile from "@/pages/DentistProfile";
import NovoCadastro from "@/pages/pro/NovoCadastro";
import Dashboard from "@/pages/pro/Dashboard";
import MeuPerfil from "@/pages/pro/MeuPerfil";

export default function App() {
  const { initialize } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/pesquisa" element={<Pesquisa />} />
        <Route path="/dentista/:id" element={<DentistProfile />} />
        <Route path="/pro/novo-cadastro" element={<NovoCadastro />} />
        <Route path="/pro/dashboard" element={<Dashboard />} />
        <Route path="/pro/perfil" element={<MeuPerfil />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
