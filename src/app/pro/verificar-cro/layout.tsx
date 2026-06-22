// Área de verificação de CRO — EXCLUSIVA do superuser (guarda no servidor).
import { requireSuperuser } from "@/lib/auth";

export default async function VerificarCroLayout({ children }: { children: React.ReactNode }) {
  await requireSuperuser();
  return <>{children}</>;
}
