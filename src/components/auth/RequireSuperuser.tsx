// ═══════════════════════════════════════════════════════════════════════════════
// GUARDA DE ROTA: RequireSuperuser
//
// Envolve rotas que só o superuser (SuperDom) pode acessar:
//   /pro/dashboard-analytics, /pro/dashboard-analytics/dba, /pro/verificar-cro[/:id]
//
// Enquanto a auth inicializa, mostra loader. Se não for superuser, redireciona
// para a home. IMPORTANTE: esta guarda é só UX. A proteção real dos dados depende
// da fonte: as RPCs sensíveis (dba_estatisticas / dba_series) e as tabelas de
// evento (logs_*, perfil_*) são restritas por is_superuser(); já curadentespro e
// clientes têm policies próprias (pública / dono), então dados dessas tabelas não
// devem ser tratados como restritos ao superuser.
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
