// A redefinição de senha é um Client Component (não pode exportar metadata). Este
// layout (Server Component) define o noindex — página de fluxo, não de busca.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redefinir senha",
  robots: { index: false },
};

export default function RedefinirSenhaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
