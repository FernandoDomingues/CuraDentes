"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR DE FOTOS (cliente) — escolher → enquadrar (crop 1:1 + zoom) → salvar.
//
// Usa react-image-crop para a seleção e um <canvas> para exportar a foto final em
// 400×400 WebP (qualidade 0.85), enviada ao Storage por upload-foto.ts. Mesma
// matemática de crop do site-k11.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { uploadFotoDentista } from "@/lib/upload-foto";

const TAMANHO_FINAL = 400; // px do lado da foto exportada

/** Quadrado central (90%) em PIXELS, para o tamanho RENDERIZADO atual. */
function quadradoCentral(larguraRender: number, alturaRender: number): PixelCrop {
  const lado = Math.round(Math.min(larguraRender, alturaRender) * 0.9);
  return {
    unit: "px",
    width: lado,
    height: lado,
    x: Math.round((larguraRender - lado) / 2),
    y: Math.round((alturaRender - lado) / 2),
  };
}

export default function EditorFotos({ dentistaId }: { dentistaId: string }) {
  const router = useRouter();
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [srcImagem, setSrcImagem] = useState<string | null>(null);
  const [base, setBase] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotacao, setRotacao] = useState(0); // graus, múltiplos de 90
  const [crop, setCrop] = useState<Crop>();
  const [completo, setCompleto] = useState<PixelCrop | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  // Ao chegar do cadastro (Etapa 3), a foto escolhida foi gravada como dataURL em
  // sessionStorage. Lê a chave após o mount (não no init, para não divergir do HTML
  // do SSR e evitar hydration mismatch), carrega a imagem e limpa a chave — abrindo
  // o editor JÁ com a foto pronta para enquadrar (paridade com o k11).
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
      setZoom(1);
      setRotacao(0);
      setSrcImagem(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Centraliza o recorte na imagem recém-carregada (zoom = 1 nesse momento).
  function aoCarregarImagem(e: React.SyntheticEvent<HTMLImageElement>) {
    const w = e.currentTarget.width;
    const h = e.currentTarget.height;
    setBase({ w, h });
    const px = quadradoCentral(w, h);
    setCrop(px);
    setCompleto(px);
  }

  // Ao mudar o zoom, recentraliza o recorte sobre o novo tamanho renderizado —
  // sem isto o `completo` (em px) ficaria defasado e a foto exportada sairia da
  // região errada (bug pego no review). Feito no handler (não em efeito).
  function mudarZoom(z: number) {
    setZoom(z);
    if (base) {
      const px = quadradoCentral(base.w * z, base.h * z);
      setCrop(px);
      setCompleto(px);
    }
  }

  async function salvar() {
    if (!imgRef.current || !completo) {
      setErro("Selecione a área da foto antes de salvar.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const image = imgRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível preparar a imagem.");

      canvas.width = TAMANHO_FINAL;
      canvas.height = TAMANHO_FINAL;

      // Escala dos pixels naturais em relação ao tamanho renderizado (com zoom).
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Rotação: gira o destino em torno do centro antes de desenhar, para a
      // foto final sair girada igual ao preview (CSS transform). Como o recorte
      // é sempre o quadrado central, basta rotacionar o canvas no seu centro.
      const ang = ((rotacao % 360) + 360) % 360;
      if (ang !== 0) {
        ctx.translate(TAMANHO_FINAL / 2, TAMANHO_FINAL / 2);
        ctx.rotate((ang * Math.PI) / 180);
        ctx.translate(-TAMANHO_FINAL / 2, -TAMANHO_FINAL / 2);
      }

      ctx.drawImage(
        image,
        completo.x * scaleX,
        completo.y * scaleY,
        completo.width * scaleX,
        completo.height * scaleY,
        0,
        0,
        TAMANHO_FINAL,
        TAMANHO_FINAL,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.85),
      );
      if (!blob) throw new Error("Falha ao gerar a imagem.");

      await uploadFotoDentista(blob, dentistaId);
      setOk(true);
      setTimeout(() => {
        router.push("/pro/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar a foto.");
      setSalvando(false);
    }
  }

  const larguraRenderizada = base ? base.w * zoom : undefined;

  if (ok) {
    return (
      <div className="rounded-2xl bg-success/10 p-6 text-center text-success">
        Foto atualizada! Voltando ao painel…
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
          <div className="overflow-auto rounded-2xl border border-black/8 bg-black/3 p-3">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompleto(c)}
              aspect={1}
              circularCrop
              keepSelection
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={srcImagem}
                alt="Pré-visualização para recorte"
                onLoad={aoCarregarImagem}
                style={{
                  ...(larguraRenderizada ? { width: larguraRenderizada } : {}),
                  transform: rotacao ? `rotate(${rotacao}deg)` : undefined,
                }}
              />
            </ReactCrop>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => mudarZoom(Number(e.target.value))}
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
              onClick={() => { setRotacao(0); mudarZoom(1); }}
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
              onClick={() => { setSrcImagem(null); setErro(""); }}
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
