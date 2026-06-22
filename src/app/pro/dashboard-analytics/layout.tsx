// Área administrativa (Análise/DBA) — EXCLUSIVA do superuser (guarda no servidor).
import { requireSuperuser } from "@/lib/auth";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  await requireSuperuser();
  return <>{children}</>;
}
