"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// UploadFotos — grade de upload de fotos (1..max). Converte a imagem para WebP
// redimensionada no navegador (canvas) antes de enviar, e guarda as URLs públicas.
// Reusado por salas e por fachada/recepção da clínica.
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { uploadFotoSala } from "@/lib/upload-sala";

async function paraWebP(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    const r = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * r);
    height = Math.round(height * r);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/webp", quality),
  );
}

export default function UploadFotos({
  fotos,
  onChange,
  max,
  escopo = "salas",
  label,
  readOnly = false,
}: {
  fotos: string[];
  onChange: (fotos: string[]) => void;
  max: number;
  escopo?: "salas" | "clinicas";
  label?: string;
  /** Só exibe as fotos (sem adicionar/remover) — usado quando o campo está travado (adesão). */
  readOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErro("");
    setOcupado(true);
    try {
      const webp = await paraWebP(file);
      const fd = new FormData();
      fd.append("foto", new File([webp], "foto.webp", { type: "image/webp" }));
      fd.append("escopo", escopo);
      const res = await uploadFotoSala(fd);
      if (!res.ok || !res.url) {
        setErro(res.erro || "Não foi possível enviar.");
        return;
      }
      onChange([...fotos, res.url]);
    } catch {
      setErro("Não foi possível processar a imagem.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-[13px] font-semibold text-ink-soft">{label}</p>}
      <div className="flex flex-wrap gap-2.5">
        {fotos.length === 0 && readOnly && (
          <div className="flex h-20 w-full items-center rounded-[10px] border border-dashed border-black/15 px-3 text-[12px] text-ink-muted">Sem foto cadastrada</div>
        )}
        {fotos.map((url, i) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-[10px] border border-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange(fotos.filter((_, idx) => idx !== i))}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="Remover foto"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        {!readOnly && fotos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={ocupado}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-black/25 text-ink-muted transition-colors hover:bg-black/[0.03] disabled:opacity-50"
          >
            {ocupado ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            <span className="text-[10px] font-medium">Foto</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={aoEscolher} className="hidden" />
      {erro && <p className="mt-1.5 text-[12px] text-danger">{erro}</p>}
    </div>
  );
}
