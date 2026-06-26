"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR DE FOTOS (cliente) — escolher → enquadrar (zoom + pan sob círculo fixo) → salvar.
//
// Usa react-easy-crop: um VISOR de tamanho FIXO onde a imagem é ampliada/arrastada
// por baixo de um círculo de recorte central fixo (o quadrado/visor NUNCA cresce; o
// zoom só amplia a imagem). onCropComplete devolve a área recortada em PIXELS
// NATURAIS da imagem (já considerando a rotação), que exportamos via <canvas> para
// 400×400 WebP (qualidade 0.85) e enviamos ao Storage por upload-foto.ts.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { uploadFotoDentista } from "@/lib/upload-foto";

const TAMANHO_FINAL = 400; // px do lado da foto exportada
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

// ─── Geração da foto final (canvas) ────────────────────────────────────────────

function grausParaRadianos(graus: number): number {
  return (graus * Math.PI) / 180;
}

/** Tamanho da caixa que envolve a imagem após rotacioná-la (mesma base do react-easy-crop). */
function tamanhoRotacionado(w: number, h: number, rotacao: number): { width: number; height: number } {
  const r = grausParaRadianos(rotacao);
  return {
    width: Math.abs(Math.cos(r) * w) + Math.abs(Math.sin(r) * h),
    height: Math.abs(Math.sin(r) * w) + Math.abs(Math.cos(r) * h),
  };
}

function criarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.src = url;
  });
}

/**
 * Desenha a `area` recortada (em pixels naturais, relativa à imagem JÁ rotacionada,
 * exatamente como o react-easy-crop devolve) num canvas final de 400×400 e exporta WebP.
 */
async function gerarFotoBlob(imageSrc: string, area: Area, rotacao: number): Promise<Blob | null> {
  const image = await criarImagem(imageSrc);
  const rad = grausParaRadianos(rotacao);
  const { width: bBoxW, height: bBoxH } = tamanhoRotacionado(image.naturalWidth, image.naturalHeight, rotacao);

  // 1) Canvas temporário com a imagem inteira já rotacionada (mesmo espaço da `area`).
  const tmp = document.createElement("canvas");
  const tctx = tmp.getContext("2d");
  if (!tctx) throw new Error("Não foi possível preparar a imagem.");
  tmp.width = bBoxW;
  tmp.height = bBoxH;
  tctx.translate(bBoxW / 2, bBoxH / 2);
  tctx.rotate(rad);
  tctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  tctx.drawImage(image, 0, 0);

  // 2) Canvas final 400×400: recorta a `area` e escala para o tamanho de saída.
  const out = document.createElement("canvas");
  out.width = TAMANHO_FINAL;
  out.height = TAMANHO_FINAL;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Não foi possível preparar a imagem.");
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(
    tmp,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    TAMANHO_FINAL,
    TAMANHO_FINAL,
  );

  return new Promise((resolve) => out.toBlob(resolve, "image/webp", 0.85));
}

export default function EditorFotos({ dentistaId }: { dentistaId: string }) {
  const router = useRouter();

  const [srcImagem, setSrcImagem] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotacao, setRotacao] = useState(0); // graus, múltiplos de 90
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  // Ao chegar do cadastro (Etapa 3), a foto escolhida foi gravada como dataURL em
  // sessionStorage. Lê a chave após o mount (não no init, para não divergir do HTML
  // do SSR e evitar hydration mismatch), carrega a imagem e limpa a chave — abrindo
  // o editor JÁ com a foto pronta para enquadrar.
  useEffect(() => {
    let pendente: string | null = null;
    try {
      pendente = sessionStorage.getItem("curadentes_foto_pendente");
      if (pendente) sessionStorage.removeItem("curadentes_foto_pendente");
    } catch {
      pendente = null;
    }
    // Leitura única de sessionStorage no mount (sistema externo); por design não roda no init/SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pendente) setSrcImagem(pendente);
  }, []);

  function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    setErro("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErro("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      reenquadrarDoZero();
      setSrcImagem(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Zera o enquadramento (zoom/posição/rotação) — usado ao trocar de foto e no "Resetar".
  function reenquadrarDoZero() {
    setZoom(1);
    setRotacao(0);
    setCrop({ x: 0, y: 0 });
    setAreaPixels(null);
  }

  async function salvar() {
    if (!srcImagem || !areaPixels) {
      setErro("Selecione a área da foto antes de salvar.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const blob = await gerarFotoBlob(srcImagem, areaPixels, rotacao);
      if (!blob) throw new Error("Falha ao gerar a imagem.");

      await uploadFotoDentista(blob, dentistaId);
      setOk(true);
      // Se a foto veio do CADASTRO, volta para o cadastro (a retomada posiciona na
      // etapa correta); caso contrário, vai para o painel (fluxo normal do editor).
      let destino = "/pro/dashboard";
      try {
        if (sessionStorage.getItem("curadentes_foto_retorno")) destino = "/cadastro";
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        router.push(destino);
        router.refresh();
      }, 1200);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar a foto.");
      setSalvando(false);
    }
  }

  if (ok) {
    return (
      <div className="rounded-2xl bg-success/10 p-6 text-center text-success">
        Foto atualizada! Voltando…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!srcImagem ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 bg-white p-10 text-center transition-colors hover:border-brand-blue/40">
          <span className="text-[15px] font-semibold text-brand-navy">Escolher foto</span>
          <span className="text-sm text-ink-muted">JPG, PNG ou WEBP — até 2MB</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={escolherArquivo} className="hidden" />
        </label>
      ) : (
        <>
          {/* VISOR de tamanho FIXO: a imagem é ampliada/arrastada por baixo do círculo
              central fixo. O quadrado nunca cresce; o zoom só amplia a imagem. */}
          <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl border border-black/8 bg-black/80">
            <Cropper
              image={srcImagem}
              crop={crop}
              zoom={zoom}
              rotation={rotacao}
              aspect={1}
              minZoom={ZOOM_MIN}
              maxZoom={ZOOM_MAX}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotacao}
              onCropComplete={(_, pixels) => setAreaPixels(pixels)}
            />
          </div>

          <p className="text-center text-xs text-ink-muted">Arraste para reposicionar e use o zoom para enquadrar.</p>

          {/* Zoom */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted">Zoom</span>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: "#007AFF" }}
              aria-label="Zoom da foto"
            />
            <span className="w-10 text-right font-mono text-sm text-brand-blue">{zoom.toFixed(1)}x</span>
          </div>

          {/* Rotação */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRotacao((r) => (r + 90) % 360)}
              className="flex items-center gap-1.5 rounded-[14px] border border-black/15 px-4 py-2 text-sm font-medium text-ink-soft hover:bg-black/5"
            >
              <RotateCw size={16} /> Girar 90°
            </button>
            <button
              type="button"
              onClick={reenquadrarDoZero}
              className="rounded-[14px] border border-black/15 px-4 py-2 text-sm font-medium text-ink-soft hover:bg-black/5"
            >
              Resetar
            </button>
          </div>

          {erro && <p className="text-sm text-danger">{erro}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={salvar}
              disabled={salvando}
              className="rounded-[14px] bg-brand-blue px-6 py-2.5 font-semibold text-white hover:bg-brand-blue-600 disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar foto"}
            </button>
            <button
              onClick={() => {
                // Zera TODO o estado ao trocar de foto.
                setSrcImagem(null);
                reenquadrarDoZero();
                setErro("");
              }}
              disabled={salvando}
              className="rounded-[14px] border border-black/15 px-6 py-2.5 font-medium text-ink-soft hover:bg-black/5"
            >
              Escolher outra
            </button>
          </div>
        </>
      )}
    </div>
  );
}
