// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR DE PERFIL — CURADENTES PRO
//
// Permite ao dentista autenticado editar seu perfil completo:
//   - Foto de perfil (upload pro Supabase Storage via uploadService)
//   - Dados pessoais (nome, email, telefone, bio, ano de formação)
//   - Lista de endereços (CRUD: adicionar, editar, remover, reordenar)
//   - Agenda por endereço (horários por dia da semana)
//   - Convênios aceitos (multi-select)
//   - Formas de pagamento aceitas (multi-select)
//
// Acesso: requer autenticação. Após carregar, valida se o dentista
// logado tem `curadentespro.user_id = auth.uid()`. Se não, redireciona
// para a home (proteção contra edição de perfil alheio via URL).
//
// Persistência: usa `upsert` no Supabase com `onConflict: "id"`.
// Para novos endereços, gera UUID local antes de enviar.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { uploadFotoDentista } from "@/lib/uploadService";
import { getCoordenadas } from "@/lib/geocoding";
import {
  User, Building2, Save, ArrowLeft, Loader2,
  Camera, Plus, Trash2, ShieldCheck, Mail, KeyRound
} from "lucide-react";
import logoProUrl from "@/assets/logos/logo-pro.png";
import { CepInputComBusca } from "@/components/ui/CepInputComBusca";
import logoProAltUrl from "@/assets/logos/logo-pro-alt.png";

// --- Constantes ---
const ESPECIALIDADES = [
  "Clareamento dental", "Lentes de contato dental", "Facetas de porcelana",
  "Limpeza e profilaxia", "Ortodontia (aparelho)", "Implante dentário",
  "Tratamento de canal", "Prótese dentária", "Cirurgia oral",
  "Periodontia", "Odontopediatria", "Botox odontológico",
  "Harmonização orofacial", "Clareamento a laser",
];
const CONVENIOS_OPCOES = [
  "Amil Dental", "Bradesco Dental", "SulAmérica Odonto", "Hapvida Odonto",
  "Odontoprev", "Unimed Odonto", "Porto Seguro Saúde", "NotreDame Intermédica",
  "Ameplan", "Metlife Odonto",
];
const PAGAMENTOS_OPCOES = [
  "Dinheiro", "PIX", "Cartão de débito", "Cartão de crédito (à vista)",
  "Cartão de crédito (parcelado 3x)", "Cartão de crédito (parcelado 6x)",
  "Cartão de crédito (parcelado 12x)", "Boleto bancário", "Transferência bancária",
];
const DIAS_SEMANA = [
  "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
  "Sexta-feira", "Sábado", "Domingo",
];
const POLITICA_CANCELAMENTO_PADRAO =
  "Cancelamentos devem ser feitos com no mínimo 24 horas de antecedência. Faltas sem aviso prévio poderão ser cobradas uma taxa administrativa.";

interface EnderecoForm {
  id: string;
  nome_clinica: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  whatsapp: string;
  atende_urgencias: boolean;
  aceita_urgencia_termo: boolean;
  atividades: string[];
  convenios: string[];
  formas_pagamento: string[];
  politica_cancelamento: string;
  observacoes: string;
  agenda: { dia: string; inicio: string; fim: string; ativo: boolean }[];
  _isNew?: boolean;
}

function novoEndereco(): EnderecoForm {
  return {
    id: `end-${Date.now()}`,
    nome_clinica: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    telefone: "",
    whatsapp: "",
    atende_urgencias: false,
    aceita_urgencia_termo: false,
    atividades: [],
    convenios: [],
    formas_pagamento: [],
    politica_cancelamento: POLITICA_CANCELAMENTO_PADRAO,
    observacoes: "",
    agenda: DIAS_SEMANA.map((dia) => ({
      dia,
      inicio: "08:00",
      fim: "18:00",
      ativo: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"].includes(dia),
    })),
    _isNew: true
  };
}

export default function MeuPerfil() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [enviandoLinkSenha, setEnviandoLinkSenha] = useState(false);

  // Dados Pessoais
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cro, setCro] = useState("");
  const [anoFormacao, setAnoFormacao] = useState("");
  const [bio, setBio] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Endereços
  const [enderecos, setEnderecos] = useState<EnderecoForm[]>([]);
  const [enderecosRemovidos, setEnderecosRemovidos] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPerfil() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/pro/dashboard");
          return;
        }

        const uid = session.user.id;
        setUserId(uid);
        setUserEmail(session.user.email ?? null);

        const { data: perfil, error: perfilError } = await supabase
          .from("curadentespro")
          .select("*")
          .eq("id", uid)
          .single();

        if (perfilError) throw perfilError;

        setNome(perfil.nome || "");
        setTelefone(perfil.telefone || "");
        setCpf(perfil.cpf || "");
        setCro(perfil.cro || "");
        setAnoFormacao(perfil.ano_formacao ? perfil.ano_formacao.toString() : "");
        setBio(perfil.bio || "");
        setFotoUrl(perfil.foto_url || "");

        const { data: ends, error: endsError } = await supabase
          .from("curadentespro_enderecos")
          .select("*")
          .eq("curadentespro_id", uid);

        if (endsError) throw endsError;
        
        if (ends && ends.length > 0) {
          setEnderecos(ends.map(e => ({
            id: e.id,
            nome_clinica: e.nome_clinica || "",
            logradouro: e.logradouro || "",
            numero: e.numero || "",
            complemento: e.complemento || "",
            bairro: e.bairro || "",
            cidade: e.cidade || "",
            estado: e.estado || "",
            cep: e.cep || "",
            telefone: e.telefone || "",
            whatsapp: e.whatsapp || "",
            atende_urgencias: e.atende_urgencias || false,
            aceita_urgencia_termo: e.aceita_urgencia_termo || false,
            atividades: e.atividades || [],
            convenios: e.convenios || [],
            formas_pagamento: e.formas_pagamento || [],
            politica_cancelamento: e.politica_cancelamento || POLITICA_CANCELAMENTO_PADRAO,
            observacoes: e.observacoes || "",
            agenda: e.agenda || DIAS_SEMANA.map((dia) => ({ dia, inicio: "08:00", fim: "18:00", ativo: false })),
          })));
        } else {
          setEnderecos([novoEndereco()]);
        }

      } catch (error) {
        console.error("Erro ao carregar perfil", error);
        toast.error("Não foi possível carregar seus dados.");
      } finally {
        setLoading(false);
      }
    }
    fetchPerfil();
  }, [navigate]);

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      setIsUploadingFoto(true);
      const toastId = toast.loading("Enviando foto...");
      const publicUrl = await uploadFotoDentista(file, userId);
      setFotoUrl(publicUrl);
      toast.success("Foto atualizada com sucesso!", { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar foto.";
      toast.error(message);
    } finally {
      setIsUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSalvar() {
    if (!userId) return;
    setSaving(true);
    const toastId = toast.loading("Salvando alterações...");

    try {
      const { error: perfilError } = await supabase
        .from("curadentespro")
        .update({
          nome,
          telefone,
          ano_formacao: anoFormacao ? parseInt(anoFormacao) : null,
          bio,
        })
        .eq("id", userId);

      if (perfilError) throw perfilError;

      // Deletar removidos
      if (enderecosRemovidos.length > 0) {
        const idsToRem = enderecosRemovidos.filter(id => !id.startsWith("end-")); // ignorar locais não salvos ainda
        if (idsToRem.length > 0) {
          const { error: delErr } = await supabase
            .from("curadentespro_enderecos")
            .delete()
            .in("id", idsToRem);
          if (delErr) throw delErr;
        }
      }

      // Salvar/Atualizar locais
      for (const end of enderecos) {
        // Obter coordenadas se possível
        const enderecoBusca = `${end.logradouro}, ${end.numero}, ${end.bairro}, ${end.cidade}, ${end.estado}`;
        let lat = null;
        let lng = null;
        
        // Evita geocodificar endereços muito incompletos
        if (end.logradouro && end.bairro && end.cidade) {
          const coord = await getCoordenadas(enderecoBusca);
          if (coord) {
            lat = coord.latitude;
            lng = coord.longitude;
          }
        }

        const dataPayload = {
          curadentespro_id: userId,
          nome_clinica: end.nome_clinica,
          logradouro: end.logradouro,
          numero: end.numero,
          complemento: end.complemento,
          bairro: end.bairro,
          cidade: end.cidade,
          estado: end.estado,
          cep: end.cep,
          telefone: end.telefone,
          whatsapp: end.whatsapp,
          atende_urgencias: end.atende_urgencias,
          aceita_urgencia_termo: end.aceita_urgencia_termo,
          atividades: end.atividades,
          convenios: end.convenios,
          formas_pagamento: end.formas_pagamento,
          politica_cancelamento: end.politica_cancelamento,
          observacoes: end.observacoes,
          agenda: end.agenda,
          latitude: lat,
          longitude: lng
        };

        if (end._isNew) {
          const { error: insErr } = await supabase.from("curadentespro_enderecos").insert(dataPayload);
          if (insErr) throw insErr;
        } else {
          const { error: updErr } = await supabase.from("curadentespro_enderecos").update(dataPayload).eq("id", end.id);
          if (updErr) throw updErr;
        }
      }

      toast.success("Perfil atualizado com sucesso!", { id: toastId });
      setTimeout(() => navigate("/pro/dashboard"), 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar o perfil.";
      toast.error(message, { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Envia email com link de redefinição de senha.
  // O Supabase dispara o template "Password recovery" e redireciona o link
  // para /pro/redefinir-senha, onde o dentista define a nova senha.
  // ─────────────────────────────────────────────────────────────────────────
  async function handleTrocarSenha() {
    if (!userEmail) {
      toast.error("Não foi possível identificar o e-mail da sua conta.");
      return;
    }
    setEnviandoLinkSenha(true);
    const toastId = toast.loading("Enviando link de confirmação...");
    try {
      const redirectTo = window.location.origin + "/pro/redefinir-senha";
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo,
      });
      if (error) throw error;
      toast.success(
        "Link enviado! Verifique o e-mail " + userEmail + " e clique no botão para definir a nova senha.",
        { id: toastId, duration: 8000 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar o link.";
      toast.error(message, { id: toastId });
    } finally {
      setEnviandoLinkSenha(false);
    }
  }

  const atualizarEndereco = (idx: number, campo: keyof EnderecoForm, valor: string | number | boolean | null) => {
    setEnderecos(prev => {
      const novos = [...prev];
      novos[idx] = { ...novos[idx], [campo]: valor };
      return novos;
    });
  };

  const toggleOpcaoEndereco = (idx: number, campo: "atividades" | "convenios" | "formas_pagamento", valor: string) => {
    setEnderecos(prev => {
      const novos = [...prev];
      const listaAtual = novos[idx][campo];
      if (listaAtual.includes(valor)) {
        novos[idx] = { ...novos[idx], [campo]: listaAtual.filter((i) => i !== valor) };
      } else {
        novos[idx] = { ...novos[idx], [campo]: [...listaAtual, valor] };
      }
      return novos;
    });
  };

  const atualizarAgenda = (idxEndereco: number, idxDia: number, campo: "ativo" | "inicio" | "fim", valor: string | boolean) => {
    setEnderecos(prev => {
      const novos = [...prev];
      const novaAgenda = [...novos[idxEndereco].agenda];
      novaAgenda[idxDia] = { ...novaAgenda[idxDia], [campo]: valor };
      novos[idxEndereco] = { ...novos[idxEndereco], agenda: novaAgenda };
      return novos;
    });
  };

  const adicionarEndereco = () => {
    setEnderecos([...enderecos, novoEndereco()]);
  };

  const removerEndereco = (idx: number) => {
    const endId = enderecos[idx].id;
    setEnderecosRemovidos([...enderecosRemovidos, endId]);
    setEnderecos(prev => prev.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7]">
        <Loader2 className="animate-spin text-[#007AFF]" size={32} />
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1px solid rgba(60,60,67,0.18)",
    borderRadius: "10px", fontSize: "14px", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "12px", fontWeight: 600, color: "#3A3A3C", marginBottom: "4px",
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "#F2F2F7" }}>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200">
        <div className="container mx-auto px-4 md:px-8 h-[60px] flex items-center justify-between">
          <button onClick={() => navigate("/pro/dashboard")} className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
          <img src={logoProUrl} alt="CuraDentes Pro" className="h-6 w-auto opacity-50 hidden sm:block" />
          <button 
            onClick={handleSalvar} 
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-[13px] text-white transition-all disabled:opacity-50"
            style={{ background: "#007AFF" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar Tudo
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 mt-8 max-w-5xl flex flex-col gap-8">
        
        {/* Seção 1: Dados Pessoais e Foto */}
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col gap-6">
          <h2 className="text-[20px] font-bold text-[#0A2A66]">Dados Pessoais e Profissionais</h2>
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Foto de Perfil */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-[120px] h-[120px] rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                {isUploadingFoto ? (
                  <Loader2 className="animate-spin text-[#007AFF]" size={24} />
                ) : fotoUrl ? (
                  <img src={fotoUrl || logoProAltUrl} alt="Sua foto" className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-gray-300" />
                )}
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
                >
                  <Camera size={24} />
                  <span className="text-[10px] font-bold mt-1">Trocar Foto</span>
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFotoUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Formulário */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="md:col-span-2">
                <label style={labelStyle}>Nome Completo</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telefone / Celular</label>
                <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ano de Formação</label>
                <input type="number" value={anoFormacao} onChange={(e) => setAnoFormacao(e.target.value)} style={inputStyle} />
              </div>
              <div className="md:col-span-2">
                <label style={labelStyle}>Sobre mim (Bio)</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} style={{ ...inputStyle, minHeight: "80px", resize: "none" }} />
              </div>
              <div>
                <label style={labelStyle}>CPF (Visualização)</label>
                <input type="text" value={cpf} disabled style={{ ...inputStyle, background: "#F2F2F7", color: "#8E8E93" }} />
              </div>
              <div>
                <label style={labelStyle}>CRO (Visualização)</label>
                <input type="text" value={cro} disabled style={{ ...inputStyle, background: "#F2F2F7", color: "#8E8E93" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2: Locais de Atendimento */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[20px] font-bold text-[#0A2A66]">Locais de Atendimento</h2>
              <p className="text-[14px] text-gray-500">Gerencie todos os seus endereços, horários e formas de pagamento.</p>
            </div>
            <button 
              onClick={adicionarEndereco}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-bold text-[13px] hover:bg-blue-100 transition-colors"
            >
              <Plus size={16} /> Adicionar Local
            </button>
          </div>

          {enderecos.map((end, idx) => (
            <div key={end.id} className="bg-white rounded-[24px] shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0A2A66]">
                  <Building2 size={18} />
                  <h3 className="font-bold text-[16px]">Endereço {idx + 1} {end.nome_clinica ? `- ${end.nome_clinica}` : ""}</h3>
                </div>
                {enderecos.length > 1 && (
                  <button onClick={() => removerEndereco(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors" title="Excluir Endereço">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="p-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Nome da clínica / consultório *</label>
                    <input type="text" value={end.nome_clinica} onChange={(e) => atualizarEndereco(idx, "nome_clinica", e.target.value)} placeholder="Clínica Sorriso..." style={inputStyle} />
                  </div>
                  <div>
                    <CepInputComBusca
                      value={end.cep}
                      onChange={(cep) => atualizarEndereco(idx, "cep", cep)}
                      onResolved={(d) => {
                        setEnderecos((prev) => {
                          const novos = [...prev];
                          novos[idx] = {
                            ...novos[idx],
                            logradouro: d.logradouro,
                            bairro: d.bairro,
                            cidade: d.cidade,
                            estado: d.estado,
                          };
                          return novos;
                        });
                      }}
                      inputStyle={inputStyle}
                      labelStyle={labelStyle}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label style={labelStyle}>Logradouro *</label>
                    <input type="text" value={end.logradouro} onChange={(e) => atualizarEndereco(idx, "logradouro", e.target.value)} placeholder="Rua, Avenida..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Número *</label>
                    <input type="text" value={end.numero} onChange={(e) => atualizarEndereco(idx, "numero", e.target.value)} placeholder="123" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Complemento</label>
                    <input type="text" value={end.complemento} onChange={(e) => atualizarEndereco(idx, "complemento", e.target.value)} placeholder="Sala 42" style={inputStyle} />
                  </div>
                  <div className="md:col-span-2">
                    <label style={labelStyle}>Bairro *</label>
                    <input type="text" value={end.bairro} onChange={(e) => atualizarEndereco(idx, "bairro", e.target.value)} placeholder="Centro" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Cidade *</label>
                    <input type="text" value={end.cidade} onChange={(e) => atualizarEndereco(idx, "cidade", e.target.value)} placeholder="São Paulo" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Estado *</label>
                    <input type="text" value={end.estado} onChange={(e) => atualizarEndereco(idx, "estado", e.target.value)} placeholder="SP" maxLength={2} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Telefone Fixo</label>
                    <input type="tel" value={end.telefone} onChange={(e) => atualizarEndereco(idx, "telefone", e.target.value)} placeholder="(11) 3333-3333" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>WhatsApp</label>
                    <input type="tel" value={end.whatsapp} onChange={(e) => atualizarEndereco(idx, "whatsapp", e.target.value)} placeholder="+5511999999999" style={inputStyle} />
                  </div>
                </div>

                {/* Urgências */}
                <div className="bg-red-50/50 p-4 rounded-[12px] border border-red-100 flex flex-col gap-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={end.atende_urgencias} onChange={(e) => atualizarEndereco(idx, "atende_urgencias", e.target.checked)} className="w-5 h-5 accent-red-600" />
                    <span className="font-bold text-red-600 text-[14px]">Atenderei urgências neste endereço</span>
                  </label>
                  {end.atende_urgencias && (
                    <label className="flex items-start gap-2 cursor-pointer pl-8">
                      <input type="checkbox" checked={end.aceita_urgencia_termo} onChange={(e) => atualizarEndereco(idx, "aceita_urgencia_termo", e.target.checked)} className="w-4 h-4 accent-red-600 mt-0.5" />
                      <span className="text-[12px] text-gray-600">Estou ciente e concordo em realizar encaixes de pacientes em urgência no meu horário de atendimento.</span>
                    </label>
                  )}
                </div>

                {/* Agenda */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: "8px" }}>Horários de Atendimento</label>
                  <div className="flex flex-col gap-2">
                    {end.agenda.map((diaAg, idxDia) => (
                      <div key={diaAg.dia} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <label className="flex items-center gap-2 w-[140px] cursor-pointer">
                          <input type="checkbox" checked={diaAg.ativo} onChange={(e) => atualizarAgenda(idx, idxDia, "ativo", e.target.checked)} className="w-4 h-4" />
                          <span className={`text-[13px] font-medium ${diaAg.ativo ? "text-gray-900" : "text-gray-400"}`}>{diaAg.dia}</span>
                        </label>
                        {diaAg.ativo ? (
                          <div className="flex items-center gap-2">
                            <input type="time" value={diaAg.inicio} onChange={(e) => atualizarAgenda(idx, idxDia, "inicio", e.target.value)} className="text-[13px] p-1 border rounded" />
                            <span className="text-gray-400 text-[12px]">às</span>
                            <input type="time" value={diaAg.fim} onChange={(e) => atualizarAgenda(idx, idxDia, "fim", e.target.value)} className="text-[13px] p-1 border rounded" />
                          </div>
                        ) : (
                          <span className="text-[12px] text-gray-400 italic">Fechado</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Atividades */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: "8px" }}>Procedimentos realizados neste local</label>
                  <div className="flex flex-wrap gap-2">
                    {ESPECIALIDADES.map((esp) => (
                      <button key={esp} onClick={() => toggleOpcaoEndereco(idx, "atividades", esp)}
                        className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
                        style={end.atividades.includes(esp) ? { background: "#007AFF", color: "#fff" } : { background: "#F2F2F7", color: "#3A3A3C" }}
                      >
                        {esp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Convênios */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: "8px" }}>Convênios aceitos</label>
                  <div className="flex flex-wrap gap-2">
                    {CONVENIOS_OPCOES.map((conv) => (
                      <button key={conv} onClick={() => toggleOpcaoEndereco(idx, "convenios", conv)}
                        className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
                        style={end.convenios.includes(conv) ? { background: "#34C759", color: "#fff" } : { background: "#F2F2F7", color: "#3A3A3C" }}
                      >
                        {conv}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formas de Pagamento */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: "8px" }}>Formas de Pagamento</label>
                  <div className="flex flex-wrap gap-2">
                    {PAGAMENTOS_OPCOES.map((pag) => (
                      <button key={pag} onClick={() => toggleOpcaoEndereco(idx, "formas_pagamento", pag)}
                        className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
                        style={end.formas_pagamento.includes(pag) ? { background: "#5856D6", color: "#fff" } : { background: "#F2F2F7", color: "#3A3A3C" }}
                      >
                        {pag}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* Seção 3: Segurança */}
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#34C759]" />
            <h2 className="text-[20px] font-bold text-[#0A2A66]">Segurança</h2>
          </div>
          <p className="text-[14px] text-gray-600">
            Para trocar a senha, enviaremos um link de confirmação para o seu e-mail.
            O link é válido por tempo limitado e só pode ser usado uma vez.
          </p>

          <div className="bg-gray-50 p-4 rounded-[12px] border border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Mail size={18} className="text-gray-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">E-mail da conta</p>
              <p className="text-[15px] font-semibold text-[#0A2A66] truncate">{userEmail || "—"}</p>
            </div>
            <button
              onClick={handleTrocarSenha}
              disabled={enviandoLinkSenha || !userEmail}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] font-semibold text-[14px] text-white transition-all disabled:opacity-50 shrink-0"
              style={{ background: "#0A2A66" }}
            >
              {enviandoLinkSenha ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <KeyRound size={14} /> Trocar senha
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
