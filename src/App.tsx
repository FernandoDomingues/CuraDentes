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
//   /pro/redefinir-senha    → Landing do link de redefinição de senha (público, requer sessão de recovery)
//   *                       → 404 (público)
//
// IMPORTANTE: useAuth.initialize() é idempotente (checa `initialized`
// antes de re-executar). Pode ser chamado múltiplas vezes sem efeito.
// Ver src/hooks/useAuth.ts para detalhes do cleanup de subscription.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import RequireSuperuser from "@/components/auth/RequireSuperuser";

const Index = lazy(() => import("@/pages/Index"));
const Pesquisa = lazy(() => import("@/pages/Pesquisa"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const DentistProfile = lazy(() => import("@/pages/DentistProfile"));
const NovoCadastro = lazy(() => import("@/pages/pro/NovoCadastro"));
const Dashboard = lazy(() => import("@/pages/pro/Dashboard"));
const MeuPerfil = lazy(() => import("@/pages/pro/MeuPerfil"));
const RedefinirSenha = lazy(() => import("@/pages/pro/RedefinirSenha"));
const EditorDeFotos = lazy(() => import("@/pages/pro/EditorDeFotos"));
const DashboardAnalytics = lazy(() => import("@/pages/pro/DashboardAnalytics"));
const VerificarCro = lazy(() => import("@/pages/pro/VerificarCro"));
const VerificarCroDetalhe = lazy(() => import("@/pages/pro/VerificarCroDetalhe"));
const Privacidade = lazy(() => import("@/pages/Privacidade"));
const TermosDeUso = lazy(() => import("@/pages/TermosDeUso"));
const Sobre = lazy(() => import("@/pages/Sobre"));
const Especialidade = lazy(() => import("@/pages/Especialidade"));
const PreferenciasEmail = lazy(() => import("@/pages/PreferenciasEmail"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { initialize } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="top-right" richColors />
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/pesquisa" element={<Pesquisa />} />
          <Route path="/dentista/:id" element={<DentistProfile />} />
          <Route path="/pro/novo-cadastro" element={<NovoCadastro />} />
          <Route path="/pro/dashboard" element={<Dashboard />} />
          <Route path="/pro/perfil" element={<MeuPerfil />} />
          <Route path="/pro/editor-de-fotos" element={<EditorDeFotos />} />
          <Route path="/pro/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/pro/dashboard-analytics" element={<RequireSuperuser><DashboardAnalytics /></RequireSuperuser>} />
          <Route path="/pro/verificar-cro" element={<RequireSuperuser><VerificarCro /></RequireSuperuser>} />
          <Route path="/pro/verificar-cro/:id" element={<RequireSuperuser><VerificarCroDetalhe /></RequireSuperuser>} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/termos" element={<TermosDeUso />} />
          <Route path="/descadastro" element={<PreferenciasEmail />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/especialidade/:slug" element={<Especialidade />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
