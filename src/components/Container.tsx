// Largura central padrão das páginas. Mantém o conteúdo legível e alinhado.
// Uso: <Container>...</Container> ou <Container className="py-12">...</Container>.

import type { ReactNode } from "react";

export default function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 md:px-8 ${className}`}>
      {children}
    </div>
  );
}
