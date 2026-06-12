// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: EditorDeFotos (/pro/editor-de-fotos)
//
// Editor de foto de perfil do dentista com:
//   - Upload de nova foto (validação de tamanho/tipo via uploadService)
//   - Recorte e redimensionamento via react-avatar-editor
//   - Salvamento no Storage Supabase
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from "react";
import AvatarEditor, { AvatarEditorRef } from "react-avatar-editor";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { uploadFotoDentista } from "@/lib/uploadService";
import { toast } from "sonner";
import { 
  Upload, 
  RotateCw, 
  ZoomIn, 
  Crop, 
  ArrowLeft, 
  Loader2
} from "lucide-react";

export default function EditorDeFotos() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<AvatarEditorRef | null>(null);

  const [image, setImage] = useState<File | string>("");
  const [scale, setScale] = useState<number>(1.2);
  const [rotate, setRotate] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Rota de retorno (padrão é perfil se não especificado)
  const fromPath = location.state?.from || "/pro/perfil";
  // Etapa de origem (quando vem do cadastro) — devolvida para retomar no passo certo
  const voltarParaEtapa = location.state?.etapa;

  useEffect(() => {
    // Carregar usuário autenticado
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/pro/perfil");
        return;
      }
      setUserId(session.user.id);
    }
    checkUser();

    // Se uma imagem foi passada por state, usa ela
    if (location.state?.imageFile) {
      setImage(location.state.imageFile);
    } else if (location.state?.imageSrc) {
      setImage(location.state.imageSrc);
    }
  }, [location, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImage(e.target.files[0]);
    }
  };

  const handleConfirmCrop = async () => {
    if (!editorRef.current || !userId) return;

    setSaving(true);
    const toastId = toast.loading("Processando e enviando foto de perfil...");
    try {
      const canvas = editorRef.current.getImageScaledToCanvas();
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Falha ao gerar imagem cortada.", { id: toastId });
          setSaving(false);
          return;
        }

        try {
          // 1. Upload para o Supabase Storage
          const publicUrl = await uploadFotoDentista(blob, userId);

          // 2. Atualiza curadentespro
          const { error } = await supabase
            .from("curadentespro")
            .update({ foto_url: publicUrl })
            .eq("id", userId);

          if (error) throw error;

          toast.success("Foto de perfil atualizada!", { id: toastId });
          
          // Se veio do rascunho de cadastro, atualiza o rascunho local também
          const rascunho = localStorage.getItem("curadentes_pro_cadastro_rascunho");
          if (rascunho) {
            try {
              const dados = JSON.parse(rascunho);
              dados.fotoUrl = publicUrl;
              localStorage.setItem("curadentes_pro_cadastro_rascunho", JSON.stringify(dados));
            } catch (e) {
              console.error(e);
            }
          }

          // Retorna
          setTimeout(() => navigate(fromPath, { state: { voltarParaEtapa } }), 1000);
        } catch (err) {
          toast.error("Erro ao salvar foto: " + (err instanceof Error ? err.message : err), { id: toastId });
          setSaving(false);
        }
      }, "image/webp", 0.85);

    } catch (error) {
      toast.error("Erro ao processar imagem.", { id: toastId });
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "#F2F2F7" }}>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 md:px-8 h-[60px] flex items-center justify-between">
          <button 
            onClick={() => navigate(fromPath, { state: { voltarParaEtapa } })} 
            disabled={saving}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <ArrowLeft size={16} /> Cancelar e Voltar
          </button>
          <h1 className="font-bold text-[16px] text-[#0A2A66]">Ajustar Foto de Perfil</h1>
          <div className="w-[100px]" /> {/* Spacer */}
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8 max-w-xl flex flex-col gap-6">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center gap-6">
          {image ? (
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="bg-[#F2F2F7] p-4 rounded-[20px] border border-gray-200 overflow-hidden max-w-full flex items-center justify-center">
                <AvatarEditor
                  ref={editorRef}
                  image={image}
                  width={300}
                  height={300}
                  border={100}
                  borderRadius={150} // 300 / 2 = 150 (círculo perfeito)
                  color={[242, 242, 247, 0.8]} // Fundo cinza suave combinando com o design
                  scale={scale}
                  rotate={rotate}
                />
              </div>

              {/* Controles de Zoom */}
              <div className="w-full flex flex-col gap-2">
                <div className="flex justify-between text-[13px] font-semibold text-[#3A3A3C]">
                  <span className="flex items-center gap-1"><ZoomIn size={16} /> Zoom</span>
                  <span className="text-[#007AFF] font-mono">{scale.toFixed(1)}x</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    accentColor: "#007AFF",
                    background: `linear-gradient(to right, #007AFF ${((scale - 1) / 2) * 100}%, #E5E7EB ${((scale - 1) / 2) * 100}%)`,
                  }}
                />
              </div>

              {/* Controles de Rotação */}
              <div className="w-full flex flex-col gap-2">
                <div className="flex justify-between text-[13px] font-semibold text-[#3A3A3C]">
                  <span className="flex items-center gap-1"><RotateCw size={16} /> Rotação</span>
                  <span className="text-[#007AFF] font-mono">{rotate}°</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={rotate}
                  onChange={(e) => setRotate(parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    accentColor: "#007AFF",
                    background: `linear-gradient(to right, #007AFF ${(rotate / 360) * 100}%, #E5E7EB ${(rotate / 360) * 100}%)`,
                  }}
                />
              </div>

              {/* Botões Rápidos */}
              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => setRotate((prev) => (prev + 90) % 360)}
                  className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Girar 90°
                </button>
                <button 
                  onClick={() => { setScale(1.2); setRotate(0); }}
                  className="py-2 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 text-xs font-bold rounded-xl transition-colors"
                >
                  Resetar
                </button>
              </div>

              <div className="w-full border-t border-gray-100 pt-4 flex flex-col gap-2">
                <button 
                  onClick={handleConfirmCrop}
                  disabled={saving}
                  className="w-full py-3 bg-[#007AFF] hover:bg-[#0062CC] disabled:opacity-50 text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Crop size={18} />}
                  Salvar Foto de Perfil
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-full text-sm transition-colors"
                >
                  Escolher Outra Foto
                </button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 hover:border-[#007AFF]/50 bg-gray-50 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
            >
              <div className="p-4 bg-white rounded-2xl mb-4 border border-gray-200 shadow-sm text-[#007AFF]">
                <Upload size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-800">Selecione uma foto</h3>
              <p className="text-xs text-gray-500 mt-1">
                Clique para navegar pelos arquivos do seu dispositivo.
              </p>
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </main>
    </div>
  );
}
