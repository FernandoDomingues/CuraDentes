// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR DE FOTOS — /pro/editor-de-fotos (Server Component → casca).
//
// O acesso já foi garantido pelo layout /pro. O editor interativo (Client Component)
// faz crop + upload; o upload é uma Server Action que pega o id do dentista da SESSÃO
// (não precisamos mais passar o id por prop — refactor do C1).
// ═══════════════════════════════════════════════════════════════════════════════

import Container from "@/components/Container";
import EditorFotos from "./EditorFotos";

export default function EditorDeFotosPage() {
  return (
    <Container className="py-10 md:py-12">
      <h1 className="text-2xl font-bold text-brand-navy">Foto de perfil</h1>
      <p className="mt-2 text-ink-soft">
        Escolha uma imagem, ajuste o enquadramento e salve. A foto fica quadrada e em alta
        qualidade (WebP).
      </p>
      <div className="mt-8 max-w-xl">
        <EditorFotos />
      </div>
    </Container>
  );
}
