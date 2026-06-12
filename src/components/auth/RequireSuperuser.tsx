// ═══════════════════════════════════════════════════════════════════════════════
// GUARDA DE ROTA: RequireSuperuser
//
// Envolve rotas que só o superuser (SuperDom) pode acessar:
//   /pro/dashboard-analytics, /pro/verificar-cro, /pro/verificar-cro/:id
//
// Enquanto a auth inicializa, mostra loader. Se não for superuser, redireciona
// para a home. A autorização real dos DADOS continua no RLS (is_superuser());
// esta guarda é a camada de UX que impede a tela de aparecer.
// ═══════════════════════════════════════════════════════════════════════════════

import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function RequireSuperuser({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const isInitializing = useAuth((s) => s.isInitializing);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (user?.role !== "superuser") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
