import { supabase } from "./supabase";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB em bytes
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Faz o upload da foto de perfil de um dentista para o Supabase Storage
 * e atualiza o banco de dados com a nova URL pública.
 * 
 * @param file O arquivo da imagem escolhido no input
 * @param dentistaId O ID (UUID) do dentista (curadentespro_id)
 * @returns A URL pública da imagem recém enviada
 */
export async function uploadFotoDentista(file: File | Blob, dentistaId: string): Promise<string> {
  // 1. Validação do tamanho do arquivo (Trava de segurança no Front-end)
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A foto é muito grande! Por favor, escolha uma imagem de até 2MB.");
  }

  // 2. Validação do tipo do arquivo
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Formato de imagem inválido. Use JPG, PNG ou WEBP.");
  }

  try {
    // 3. Criar um nome único para o arquivo para evitar cache ou sobreposição acidental
    // Sempre salva como .webp se o tipo for image/webp, ou detecta do nome/tipo
    let fileExt = "webp";
    if (file instanceof File && file.name) {
      fileExt = file.name.split('.').pop() || "webp";
    } else if (file.type) {
      fileExt = file.type.split('/').pop() || "webp";
    }

    // Forçar extensão webp se o tipo for image/webp
    if (file.type === "image/webp") {
      fileExt = "webp";
    }

    const fileName = `${dentistaId}/${Date.now()}_foto.${fileExt}`;
    const filePath = `${fileName}`;

    // 4. Enviar a imagem para o bucket "fotos-dentistas"
    const { error: uploadError } = await supabase.storage
      .from('fotos-dentistas')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Se já existir um arquivo com esse exato nome, ele sobrescreve
        contentType: file.type // Define o MIME-type adequado no storage
      });

    if (uploadError) {
      console.error("Erro no Supabase Storage:", uploadError);
      throw new Error("Falha ao enviar a imagem para o servidor.");
    }

    // 5. Pegar a URL pública da imagem recém enviada
    const { data } = supabase.storage
      .from('fotos-dentistas')
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    // 6. Atualizar a coluna foto_url na tabela curadentespro
    const { error: updateError } = await supabase
      .from('curadentespro')
      .update({ foto_url: publicUrl })
      .eq('id', dentistaId);

    if (updateError) {
      console.error("Erro ao atualizar o perfil do dentista:", updateError);
      throw new Error("A foto foi salva, mas falhamos ao vincular ao seu perfil.");
    }

    // Retorna o link final para a tela poder exibir a nova foto imediatamente
    return publicUrl;

  } catch (error) {
    console.error("Erro no processo de upload:", error);
    const message = error instanceof Error ? error.message : "Ocorreu um erro inesperado ao alterar a foto.";
    throw new Error(message);
  }
}
