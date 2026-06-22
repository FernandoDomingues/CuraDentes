// Injeta um (ou vários) objeto JSON-LD na página, dentro de
// <script type="application/ld+json">. É assim que os dados estruturados chegam
// ao Google e às IAs. Renderizado no servidor — já sai no HTML.
//
// Segurança: o conteúdo vem dos NOSSOS geradores (lib/jsonld.ts) com dados do
// banco; ainda assim escapamos "<" para evitar fechar o <script> por engano.

import type { JsonLd as JsonLdObj } from "@/lib/jsonld";

export default function JsonLd({ data }: { data: JsonLdObj | JsonLdObj[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
