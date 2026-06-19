
/**
 * Edge Function: upload-foto-dentista
 * POST /functions/v1/upload-foto-dentista
 *
 * Body (multipart/form-data):
 *   file            - imagem original (PNG, JPG, WEBP, HEIC, GIF, etc.)
 *   dentista_id     - UUID do dentista
 *   crop?           - JSON { x, y, width, height } em pixels da imagem original
 *   brightness?     - número -100 a +100 (padrão 0)
 *   contrast?     - número -100 a +100 (padrão 0)
 *   rotate?         - 0 | 90 | 180 | 270
 *   flip_horizontal? - "true" | "false"
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import sharp from 'npm:@img/sharp-wasm';
import { corsHeaders } from '../_shared/cors.ts';

// ─── Constantes ────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
]);

const OUTPUT_SIZE = 400;
const OUTPUT_QUALITY = 82;
const BUCKET = 'fotos-dentistas';

// ─── Handler ───────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonError('Método não permitido. Use POST.', 405);
  }

  try {
    // ── 1. Parse multipart/form-data ─────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return jsonError('Body deve ser multipart/form-data.', 400);
    }

    const file = formData.get('file');
    const dentistaId = formData.get('dentista_id');

    if (!(file instanceof File)) {
      return jsonError('Campo "file" é obrigatório e deve ser um arquivo.', 400);
    }
    if (typeof dentistaId !== 'string' || !dentistaId.trim()) {
      return jsonError('Campo "dentista_id" é obrigatório.', 400);
    }

    // ── 2. Validação de tamanho e tipo ───────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return jsonError(
        `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)} MB. Máximo permitido: 10 MB.`,
        400,
      );
    }

    // Normaliza MIME (alguns dispositivos enviam "image/jpg")
    const mimeType = file.type.toLowerCase().replace('image/jpg', 'image/jpeg');
    if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
      return jsonError(
        `Tipo de arquivo não aceito: "${file.type}". Aceitos: JPEG, PNG, WEBP, HEIC, HEIF, GIF.`,
        400,
      );
    }

    // ── 3. Parâmetros opcionais de edição ────────────────────────────────────
    const cropRaw = formData.get('crop');
    const brightnessRaw = formData.get('brightness');
    const contrastRaw = formData.get('contrast');
    const rotateRaw = formData.get('rotate');
    const flipHorizontal = formData.get('flip_horizontal') === 'true';

    // Crop
    let crop: { x: number; y: number; width: number; height: number } | null = null;
    if (cropRaw && typeof cropRaw === 'string') {
      try {
        crop = JSON.parse(cropRaw);
        if (
          typeof crop?.x !== 'number' ||
          typeof crop?.y !== 'number' ||
          typeof crop?.width !== 'number' ||
          typeof crop?.height !== 'number'
        ) {
          return jsonError('Parâmetro "crop" inválido. Use { x, y, width, height } em pixels.', 400);
        }
      } catch {
        return jsonError('Parâmetro "crop" não é um JSON válido.', 400);
      }
    }

    // Brightness (-100..+100)
    const brightness = clamp(parseFloat(brightnessRaw as string || '0'), -100, 100);

    // Contrast (-100..+100)
    const contrast = clamp(parseFloat(contrastRaw as string || '0'), -100, 100);

    // Rotate (0 | 90 | 180 | 270)
    const rotateAngle = parseInt((rotateRaw as string) || '0', 10);
    const rotate = ([0, 90, 180, 270] as number[]).includes(rotateAngle) ? rotateAngle : 0;

    // ── 4. Processamento de imagem com Sharp ─────────────────────────────────
    console.log(`[upload-foto-dentista] Processando imagem: ${file.name} (${(file.size / 1024).toFixed(1)} KB, ${file.type})`);

    const buffer = await file.arrayBuffer();

    // Inicia pipeline — failOnError:false tolera alguns formatos parcialmente corrompidos
    let pipeline = sharp(new Uint8Array(buffer), { failOnError: false });

    // 4.1 Crop manual (antes de qualquer transformação)
    if (crop) {
      pipeline = pipeline.extract({
        left: Math.round(crop.x),
        top: Math.round(crop.y),
        width: Math.round(crop.width),
        height: Math.round(crop.height),
      });
    }

    // 4.2 Rotação
    if (rotate !== 0) {
      pipeline = pipeline.rotate(rotate);
    }

    // 4.3 Flip horizontal
    if (flipHorizontal) {
      pipeline = pipeline.flop(); // flop = espelhar horizontalmente
    }

    // 4.4 Resize para 400×400 com crop central (cover)
    pipeline = pipeline.resize(OUTPUT_SIZE, OUTPUT_SIZE, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: false,
    });

    // 4.5 Brilho via modulate (0.0..2.0 onde 1.0 = normal)
    if (brightness !== 0) {
      const brightnessMod = Math.max(0.01, 1 + brightness / 100);
      pipeline = pipeline.modulate({ brightness: brightnessMod });
    }

    // 4.6 Contraste via linear: output = slope * input + intercept
    //     Para manter o ponto médio (128) constante: intercept = 128 * (1 - slope)
    if (contrast !== 0) {
      const slope = clamp((100 + contrast) / 100, 0.01, 3.0);
      const intercept = 128 * (1 - slope);
      pipeline = pipeline.linear(slope, intercept);
    }

    // 4.7 Converte para WebP, remove metadados EXIF
    const { data: processedBuffer, info } = await pipeline
      .webp({ quality: OUTPUT_QUALITY, effort: 4 })
      // NÃO chamar .withMetadata() = EXIF é removido por padrão
      .toBuffer({ resolveWithObject: true });

    const tamanhoKB = Math.round((processedBuffer as Uint8Array).byteLength / 1024);
    console.log(`[upload-foto-dentista] Processado: ${tamanhoKB} KB, ${info.width}×${info.height}`);

    // ── 5. Upload para Supabase Storage ──────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const timestamp = Date.now();
    const filePath = `${dentistaId.trim()}/${timestamp}_foto.webp`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, processedBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-foto-dentista] Erro no Storage:', uploadError);
      return jsonError(`Storage: ${uploadError.message}`, 500);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    console.log(`[upload-foto-dentista] Upload concluído: ${publicUrl}`);

    // ── 6. Resposta de sucesso ───────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        publicUrl,
        tamanhoKB,
        dimensoes: {
          width: info.width as number,
          height: info.height as number,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[upload-foto-dentista] Erro inesperado:', message);
    return jsonError(`Erro interno: ${message}`, 500);
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clamp(value: number, min: number, max: number): number {
  return Number.isNaN(value) ? min : Math.min(Math.max(value, min), max);
}
