// ═══════════════════════════════════════════════════════════════════════════════
// /login-necessario — parede de acesso para quem tenta abrir a área /pro SEM sessão.
// Fica FORA de /pro de propósito: assim o cabeçalho é o mínimo (só "Home"), sem
// expor "Sair"/"Voltar ao meu Perfil" (controles de sessão) a quem não está logado.
// O corpo oferece o login de DENTISTA (a área /pro é exclusiva de dentista).
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import MuroDentista from "@/components/MuroDentista";

export const metadata: Metadata = {
  title: "Entrar como dentista",
  description: "Esta área é exclusiva para dentistas. Entre com sua conta para continuar.",
  robots: { index: false, follow: false },
};

export default function LoginNecessarioPage() {
  return <MuroDentista />;
}
