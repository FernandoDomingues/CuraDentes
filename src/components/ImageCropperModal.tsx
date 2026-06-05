import React, { useState, useRef, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => Promise<void>;
}

// Auxiliar para centralizar o crop 1:1 inicial
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropperModal({
  isOpen,
  onClose,
  imageSrc,
  onConfirm,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  // Dimensões renderizadas da imagem em zoom=1 (base)
  const [baseSize, setBaseSize] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reseta o zoom e crop toda vez que uma nova imagem é aberta
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setBaseSize(null);
      setCrop(undefined);
      setCompletedCrop(null);
    }
  }, [isOpen, imageSrc]);

  // Reposiciona o crop centralizado toda vez que o zoom muda
  useEffect(() => {
    if (baseSize) {
      const zoomedW = baseSize.w * zoom;
      const zoomedH = baseSize.h * zoom;
      setCrop(centerAspectCrop(zoomedW, zoomedH, 1));
    }
  }, [zoom, baseSize]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setBaseSize({ w: width, h: height });
    setCrop(centerAspectCrop(width, height, 1));
  }

  async function handleSave() {
    if (!imgRef.current || !completedCrop) return;

    try {
      setLoading(true);

      const image = imgRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Não foi possível obter o contexto 2D do Canvas.");
      }

      // Resolução ideal: 400x400
      const targetSize = 400;
      canvas.width = targetSize;
      canvas.height = targetSize;

      // Como a imagem é renderizada com width = baseSize.w * zoom,
      // a escala para os pixels naturais é: naturalWidth / (baseSize.w * zoom)
      // Isso é exatamente naturalWidth / image.width já que image.width = baseSize.w * zoom
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        targetSize,
        targetSize
      );

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setLoading(false);
            console.error("Canvas vazio ou falha na conversão");
            return;
          }
          try {
            await onConfirm(blob);
            setLoading(false);
            onClose();
          } catch (err) {
            setLoading(false);
            console.error("Erro durante a confirmação do crop:", err);
          }
        },
        "image/webp",
        0.85
      );
    } catch (error) {
      setLoading(false);
      console.error("Erro ao processar imagem:", error);
    }
  }

  const renderedW = baseSize ? baseSize.w * zoom : undefined;
  const renderedH = baseSize ? baseSize.h * zoom : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] md:max-w-xl bg-white rounded-[24px] overflow-hidden p-6 border border-gray-100 shadow-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-[#0A2A66]">
            Ajustar Foto de Perfil
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Use o <strong>slider de zoom</strong> para ampliar a imagem e a grade para posicionar o recorte.
          </DialogDescription>
        </DialogHeader>

        {/* Área de crop com scroll para acomodar o zoom */}
        <div
          className="flex justify-center items-start bg-[#F2F2F7] rounded-[16px] border border-gray-200 overflow-auto"
          style={{ maxHeight: "42vh", minHeight: "220px" }}
        >
          {imageSrc ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              keepSelection
              circularCrop
              ruleOfThirds
            >
              <img
                ref={imgRef}
                alt="Foto original"
                src={imageSrc}
                onLoad={onImageLoad}
                style={{
                  width: renderedW,
                  height: renderedH,
                  maxWidth: "none",
                  maxHeight: "none",
                  display: "block",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            </ReactCrop>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
              <p className="text-[13px] font-medium">Carregando imagem...</p>
            </div>
          )}
        </div>

        {/* Slider de zoom */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, parseFloat((z - 0.1).toFixed(1))))}
            disabled={zoom <= 1}
            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Reduzir zoom"
          >
            <ZoomOut size={18} />
          </button>

          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              accentColor: "#007AFF",
              background: `linear-gradient(to right, #007AFF ${((zoom - 1) / 2) * 100}%, #E5E7EB ${((zoom - 1) / 2) * 100}%)`,
            }}
            aria-label="Zoom da imagem"
          />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, parseFloat((z + 0.1).toFixed(1))))}
            disabled={zoom >= 3}
            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Aumentar zoom"
          >
            <ZoomIn size={18} />
          </button>

          <span className="text-[12px] font-semibold text-gray-400 w-10 text-right flex-shrink-0">
            {zoom.toFixed(1)}×
          </span>
        </div>

        <DialogFooter className="mt-5 gap-2 sm:gap-0 flex flex-col sm:flex-row justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="rounded-full px-6 text-gray-500 font-semibold border-gray-200 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || !completedCrop}
            className="rounded-full px-6 font-semibold bg-[#007AFF] hover:bg-[#0062CC] text-white flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Cortar e Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
