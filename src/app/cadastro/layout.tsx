// O wizard de cadastro é um Client Component (não pode exportar metadata). Este
// layout (Server Component) define o noindex — não é uma página de busca.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastro de dentista",
  robots: { index: false },
};

export default function CadastroLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
