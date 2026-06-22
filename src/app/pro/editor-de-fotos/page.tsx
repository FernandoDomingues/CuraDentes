// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR DE FOTOS — /pro/editor-de-fotos (Server Component → casca + id do dentista).
//
// O acesso já foi garantido pelo layout /pro. Pegamos o id do dentista no servidor
// e passamos para o editor interativo (Client Component), que faz crop + upload.
// ═══════════════════════════════════════════════════════════════════════════════

import Container from "@/components/Container";
import { getUsuario } from "@/lib/auth";
import EditorFotos from "./EditorFotos";

export const dynamic = "force-dynamic";

export default async function EditorDeFotosPage() {
  const usuario = await getUsuario();
  // O guard de /pro garante dentista/superuser; o superuser não tem foto de perfil.
  return (
    <Container className="py-10 md:py-12">
      <h1 className="text-2xl font-bold text-brand-navy">Foto de perfil</h1>
      <p className="mt-2 text-ink-soft">
        Escolha uma imagem, ajuste o enquadramento e salve. A foto fica quadrada e em alta
        qualidade (WebP).
      </p>
      <div className="mt-8 max-w-xl">
        <EditorFotos dentistaId={usuario!.id} />
      </div>
    </Container>
  );
}
