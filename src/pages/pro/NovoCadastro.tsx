// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA DE NOVO CADASTRO — CURADENTES PRO
//
// Fluxo de registro em etapas para dentistas com barra de progresso:
//   Etapa 1: Conta (nome, email com token, senha com validação de força)
//   Etapa 2: Telefone (E.164, verificação por SMS ou WhatsApp)
//   Etapa 3: Identidade profissional (CPF, CRO, foto, ano de formação)
//   Etapa 4: Endereços + horários + convênios + formas de pagamento
//   Etapa 5: Bio (opcional)
//   Etapa 6: Consentimento LGPD
//
// O dentista pode "Deixar para mais tarde" a partir da Etapa 2 (Etapa 1 é obrigatória e não pode ser pulada).
// Ao finalizar com dados incompletos, exibe popup de aviso.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Check,
  Upload,
  Plus,
  Trash2,
  X,
  Shield,
  AlertCircle,
  Mail,
  Phone,
  User,
  Building2,
  Clock,
  FileText,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { geocodeEnderecoComFallback } from "@/lib/geocoding";
import { CepInputComBusca } from "@/components/ui/CepInputComBusca";
import { formatarInstagram, extrairUserInstagram, INSTAGRAM_BASE } from "@/utils/instagram";

import logoProUrl from "@/assets/logos/logo-pro.png";
import { ESPECIALIDADES } from "@/constants/data";


import {
  validarTelefone,
  validarCpf,
  validarCro,
  validarEnderecos,
  isEtapaConcluida,
  type EtapaValidationParams,
} from "@/utils/cadastroValidation";

// ─── URL do logo CuraDentes Pro ───────────────────────────────────────────────
const LOGO_PRO = logoProUrl;

// ─── Especialidades: importadas de @/constants/data (fonte canônica) ──────────

// ─── Convênios disponíveis para seleção ──────────────────────────────────────
const CONVENIOS_OPCOES = [
  "Amil Dental",
  "Bradesco Dental",
  "SulAmérica Odonto",
  "Hapvida Odonto",
  "Odontoprev",
  "Unimed Odonto",
  "Porto Seguro Saúde",
  "NotreDame Intermédica",
  "Ameplan",
  "Metlife Odonto",
  "Uniodonto",
];

// ─── Formas de pagamento disponíveis ─────────────────────────────────────────
const PAGAMENTOS_OPCOES = [
  "Dinheiro",
  "PIX",
  "Cartão de débito",
  "Cartão de crédito (à vista)",
  "Cartão de crédito (parcelado 3x)",
  "Cartão de crédito (parcelado 6x)",
  "Cartão de crédito (parcelado 12x)",
  "Boleto bancário",
  "Transferência bancária",
];

// ─── Dias da semana disponíveis para agenda ───────────────────────────────────
const DIAS_SEMANA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

// ─── Texto padrão de política de cancelamento ────────────────────────────────
const POLITICA_CANCELAMENTO_PADRAO =
  "Cancelamentos devem ser feitos com no mínimo 24 horas de antecedência. Faltas sem aviso prévio poderão ser cobradas uma taxa administrativa.";


// ─── Definição das etapas ────────────────────────────────────────────────────
const ETAPAS = [
  { id: 1, label: "Conta", icone: User },
  { id: 2, label: "Telefone", icone: Phone },
  { id: 3, label: "Identidade", icone: Shield },
  { id: 4, label: "Endereços", icone: Building2 },
  { id: 5, label: "Bio", icone: FileText },
  { id: 6, label: "Consentimento", icone: Check },
];

// ─── Estrutura de um endereço cadastrado pelo dentista ────────────────────────
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
}

/** Cria um endereço vazio com ID único */
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
  };
}

// ─── Calcula a força da senha (0=fraca, 1=regular, 2=boa, 3=forte) ───────────
function calcularForcaSenha(senha: string): number {
  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (/[A-Z]/.test(senha)) pontos++;
  if (/[0-9]/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;
  return pontos;
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function NovoCadastro() {
  const navigate = useNavigate();
  const location = useLocation();

  // ─ Estado da etapa atual ──────────────────────────────────────────────────
  const [etapa, setEtapa] = useState(1);
  const [salvoFeedbackIdx, setSalvoFeedbackIdx] = useState<number | null>(null);

  // ─ Restauração automática: localStorage + banco de dados ───────────────────
  //
  // Prioridade: banco de dados > localStorage.
  // Se houver uma sessão ativa (dentista já passou pela Etapa 1 nesta ou em
  // outra aba/dispositivo), buscamos os dados salvos no banco e posicionamos
  // o formulário na primeira etapa ainda incompleta.
  // Se não houver sessão mas existir rascunho local, usamos o localStorage.
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function restaurar() {
      // Ao voltar de outra rota (ex.: editor de fotos), retoma na etapa de origem
      // em vez de cair no passo 2 (a regra "incompleto → passo 2" vale só quando
      // o usuário ABRE o cadastro do zero, não em navegações internas).
      const etapaForcada = (location.state as { voltarParaEtapa?: number } | null)?.voltarParaEtapa;

      // 1. Verifica sessão ativa no Supabase
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Sessão encontrada: busca dados já salvos no banco
        const { data: pro } = await supabase
          .from('curadentespro')
          // cpf é lido à parte via RPC meu_cpf() (coluna protegida — LGPD)
          .select('id, nome, tratamento, nome_completo, email, telefone, cro, ano_formacao, foto_url, bio, instagram, lgpd_aceito')
          .eq('id', user.id)
          .is('deleted_at', null)
          .maybeSingle();

        if (pro) {
          // Preenche os campos com os dados do banco
          if (pro.nome) setNome(pro.nome);
          if (pro.tratamento) setTratamento(pro.tratamento);
          if (pro.nome_completo) setNomeCompleto(pro.nome_completo);
          if (pro.email) setEmail(pro.email);
          if (pro.telefone) setTelefone(pro.telefone);
          const { data: cpfProprio } = await supabase.rpc("meu_cpf");
          if (typeof cpfProprio === "string" && cpfProprio) setCpf(cpfProprio);
          if (pro.cro) setCro(pro.cro);
          if (pro.ano_formacao) setAnoFormacao(String(pro.ano_formacao));
          if (pro.foto_url) setFotoUrl(pro.foto_url);
          if (pro.bio) setBio(pro.bio);
          if (pro.instagram) setInstagram(extrairUserInstagram(pro.instagram));
          if (pro.lgpd_aceito) setLgpdAceito(pro.lgpd_aceito);
          setEmailVerificado(true);
          setSenhaSincronizada(true);

          // Busca endereços salvos
          const { data: ends } = await supabase
            .from('curadentespro_enderecos')
            .select('*')
            .eq('curadentespro_id', user.id);

          if (ends && ends.length > 0) {
            // Mapeia os endereços do banco para o formato do formulário
            setEnderecos(ends.map((e: Partial<EnderecoForm>) => ({
              id: e.id || `end-${Date.now()}-${Math.random()}`,
              nome_clinica: e.nome_clinica || '',
              logradouro: e.logradouro || '',
              numero: e.numero || '',
              complemento: e.complemento || '',
              bairro: e.bairro || '',
              cidade: e.cidade || '',
              estado: e.estado || '',
              cep: e.cep || '',
              telefone: e.telefone || '',
              whatsapp: e.whatsapp || '',
              atende_urgencias: e.atende_urgencias || false,
              aceita_urgencia_termo: e.aceita_urgencia_termo || false,
              atividades: e.atividades || [],
              convenios: e.convenios || [],
              formas_pagamento: e.formas_pagamento || [],
              politica_cancelamento: e.politica_cancelamento || POLITICA_CANCELAMENTO_PADRAO,
              observacoes: e.observacoes || '',
              agenda: e.agenda || DIAS_SEMANA.map((dia) => ({
                dia,
                inicio: '08:00',
                fim: '18:00',
                ativo: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'].includes(dia),
              })),
            })));
          }

          // Determina a primeira etapa incompleta para retomar
          if (pro.lgpd_aceito) {
            // Cadastro completo → redireciona para o painel do dentista
            navigate('/pro/perfil');
            return;
          } else {
            setEtapa(etapaForcada ?? 2); // Incompleto → passo 2 (ou a etapa de origem)
          }

          return; // Dados do banco têm prioridade, ignora localStorage
        }
      }

      // 2. Sem sessão ativa → tenta restaurar rascunho local
      const rascunhoSalvo = localStorage.getItem('curadentes_pro_cadastro_rascunho');
      if (rascunhoSalvo) {
        try {
          const dados = JSON.parse(rascunhoSalvo);
          if (dados.lgpdAceito) {
            navigate('/pro/perfil');
            return;
          } else if (dados.emailVerificado) {
            setEtapa(etapaForcada ?? 2); // Incompleto → passo 2 (ou a etapa de origem)
          } else {
            setEtapa(1);
          }
          if (dados.nome) setNome(dados.nome);
          if (dados.tratamento) setTratamento(dados.tratamento);
          if (dados.nomeCompleto) setNomeCompleto(dados.nomeCompleto);
          if (dados.email) setEmail(dados.email);
          if (dados.emailVerificado) setEmailVerificado(dados.emailVerificado);
          if (dados.telefone) setTelefone(dados.telefone);
          if (dados.telefoneVerificado) setTelefoneVerificado(dados.telefoneVerificado);
          if (dados.cpf) setCpf(dados.cpf);
          if (dados.cro) setCro(dados.cro);
          if (dados.anoFormacao) setAnoFormacao(dados.anoFormacao);
          if (dados.fotoUrl) setFotoUrl(dados.fotoUrl);
          if (dados.enderecos) setEnderecos(dados.enderecos);
          if (dados.bio) setBio(dados.bio);
          if (dados.instagram) setInstagram(extrairUserInstagram(dados.instagram));
          if (dados.lgpdAceito) setLgpdAceito(dados.lgpdAceito);
          if (dados.senhaSincronizada) setSenhaSincronizada(dados.senhaSincronizada);
        } catch (e) {
          console.error('Erro ao recuperar rascunho de cadastro:', e);
        }
      }
    }

    restaurar();
  }, []);

  // ─ Etapa 1: Conta ─────────────────────────────────────────────────────────
  const [nome, setNome] = useState("");
  const [tratamento, setTratamento] = useState(""); // "Dr." ou "Dra."
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [emailVerificado, setEmailVerificado] = useState(false);
  const [tokenEmailInput, setTokenEmailInput] = useState("");
  const [aguardandoTokenEmail, setAguardandoTokenEmail] = useState(false);
  // Email para o qual o signUp foi feito nesta sessao.
  // Quando igual ao `email` atual, usamos resend() (senao, signUp).
  const [emailSignUp, setEmailSignUp] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirma, setMostrarConfirma] = useState(false);
  // Evita re-sincronizar a senha no Supabase ao voltar da etapa 6 para a 1
  const [senhaSincronizada, setSenhaSincronizada] = useState(false);

  // ─ Etapa 2: Telefone ──────────────────────────────────────────────────────
  const [telefone, setTelefone] = useState("");
  const [telefoneVerificado, setTelefoneVerificado] = useState(false);

  // ─ Etapa 3: Identidade profissional ──────────────────────────────────────
  const [cpf, setCpf] = useState("");
  const [cro, setCro] = useState("");
  const [anoFormacao, setAnoFormacao] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [isUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─ Etapa 4: Endereços ─────────────────────────────────────────────────────
  const [enderecos, setEnderecos] = useState<EnderecoForm[]>([novoEndereco()]);

  // ─ Etapa 5: Bio ───────────────────────────────────────────────────────────
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");

  // ─ Etapa 6: LGPD ──────────────────────────────────────────────────────────
  const [lgpdAceito, setLgpdAceito] = useState(false);

  // ─ Modal de cadastro incompleto ───────────────────────────────────────────
  const [exibirModalIncompleto, setExibirModalIncompleto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Se o usuario editar a senha depois de ja sincronizada, re-sincroniza no proximo avanco
  useEffect(() => {
    if (senhaSincronizada && senha.length > 0) setSenhaSincronizada(false);
  }, [senha]);

  // ─ Auto-save: persiste o rascunho no localStorage a cada mudança de estado ─
  // Garante que ao pressionar F5 o formulário seja restaurado exatamente como estava.
  // ⚠️ A senha NÃO é salva por segurança — o dentista precisará digitá-la novamente.
  useEffect(() => {
    // Evita sobrescrever o rascunho enquanto o carregamento inicial ainda não terminou
    // (etapa=1 e todos os campos vazios significa que o estado inicial ainda está sendo populado)
    const rascunho = {
      etapa,
      nome,
      tratamento,
      nomeCompleto,
      email,
      emailVerificado,
      telefone,
      telefoneVerificado,
      // cpf e cro NAO sao persistidos no localStorage (LGPD/#10) — ficam so no
      // estado em memoria ate o upsert no banco. Se houver sessao, sao restaurados
      // do banco (cpf via RPC meu_cpf).
      anoFormacao,
      fotoUrl,
      enderecos,
      bio,
      instagram,
      lgpdAceito,
      senhaSincronizada,
    };
    localStorage.setItem("curadentes_pro_cadastro_rascunho", JSON.stringify(rascunho));
  }, [
    etapa, nome, tratamento, nomeCompleto, email, emailVerificado,
    telefone, telefoneVerificado,
    cpf, cro, anoFormacao, fotoUrl,
    enderecos, bio, instagram, lgpdAceito,
    senhaSincronizada,
  ]);

  // ─ Verifica se o cadastro está completo ───────────────────────────────────
  function camposFaltantes(): string[] {
    const faltando: string[] = [];
    if (!nome.trim()) faltando.push("Nome para exibição");
    if (!nomeCompleto.trim()) faltando.push("Nome completo (para verificação do CRO)");
    if (!emailVerificado) faltando.push("Verificação de e-mail");
    
    // Se a senha já estiver sincronizada e o usuário não digitou nada para alterar, não é obrigatório preencher
    const precisaSenha = !senhaSincronizada || senha.length > 0;
    if (precisaSenha && senha.length < 8) faltando.push("Senha (mín. 8 caracteres)");

    if (!validarTelefone(telefone)) faltando.push("Telefone");
    if (!validarCpf(cpf)) faltando.push("CPF");
    if (!validarCro(cro)) faltando.push("CRO");
    if (!lgpdAceito) faltando.push("Aceite da LGPD");
    const { valido: endOk, erros: endErros } = validarEnderecos(enderecos);
    if (!endOk) faltando.push(...endErros);
    return faltando;
  }

  const camposFaltando = camposFaltantes();
  const cadastroCompleto = camposFaltando.length === 0;

  const temProgressoPosterior = !!(
    telefone ||
    cpf ||
    cro ||
    anoFormacao ||
    fotoUrl ||
    bio ||
    enderecos.some(end => end.nome_clinica.trim() || end.logradouro.trim() || end.cep.trim())
  );

  // ─ Calcula progresso da barra ─────────────────────────────────────────────
  const progresso = ((etapa - 1) / (ETAPAS.length - 1)) * 100;

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Envia token de verificação de email
  //
  // Usa signInWithOtp + shouldCreateUser: true (cria um user "stub" em
  // auth.users se nao existir).
  //
  // Para REENVIAR, basta chamar signInWithOtp de novo: o client GoTrue
  // gera um OTP novo e desconsidera o anterior (padrao recomendado pela
  // documentacao oficial do Supabase).
  //
  // Diferenca pro signUp antigo: o template "Confirm sign up" tem uma
  // restricao interna de "uma vez por endereco" no GoTrue (o usuario ja
  // foi criado, entao o reenvio trava). O fluxo de OTP via signInWithOtp
  // nao tem essa restricao.
  //
  // A senha e definida DEPOIS, via updateUser, quando o usuario avanca
  // da Etapa 1.
  // ─────────────────────────────────────────────────────────────────────────
  async function enviarTokenEmail() {
    const isResend = emailSignUp === email;
    const toastId = toast.loading(isResend ? "Reenviando código..." : "Enviando código...");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      toast.error(
        (isResend ? "Erro ao reenviar: " : "Erro ao enviar: ") + error.message,
        { id: toastId }
      );
      return;
    }

    setEmailSignUp(email);
    toast.success(
      isResend ? "Código reenviado para o seu e-mail!" : "Código enviado para o seu e-mail!",
      { id: toastId }
    );
    setAguardandoTokenEmail(true);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Valida o token de email inserido pelo usuário
  //
  // type: "email" casa com o template OTP disparado por signInWithOtp /
  // resend({type:"email"}). (Era "signup" no fluxo antigo, vindo de signUp.)
  // ─────────────────────────────────────────────────────────────────────────
  async function validarTokenEmail() {
    if (tokenEmailInput.length !== 8) {
      toast.error('Digite o código de 8 dígitos recebido por e-mail.');
      return;
    }

    const toastId = toast.loading("Validando código...");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: tokenEmailInput,
      type: "email"
    });

    if (error) {
      toast.error("Código inválido ou expirado. Tente novamente.", { id: toastId });
      return;
    }

    toast.success("E-mail verificado com sucesso!", { id: toastId });
    setEmailVerificado(true);
    setAguardandoTokenEmail(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Handler: Avançar da Etapa 1
  //
  // Sincroniza a senha real com o Supabase via updateUser. Necessário porque
  // o fluxo de email usa signInWithOtp (sem senha) e o usuario define a
  // senha aqui na Etapa 1. Idempotente: pode ser chamado quantas vezes
  // forem necessarias sem efeito colateral.
  // ─────────────────────────────────────────────────────────────────────────
  async function avancarEtapa1() {
    if (!emailVerificado) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    if (senhaSincronizada) {
      await salvarEtapa1NoBanco(user.id);
      return;
    }
    
    if (senha.length < 8) return;
    
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      toast.error("Erro ao salvar a senha: " + error.message);
      throw error;
    }
    setSenhaSincronizada(true);
    await salvarEtapa1NoBanco(user.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Salvamento progressivo no banco de dados por etapa
  //
  // Cada função faz um upsert parcial da tabela curadentespro (e endereços
  // na Etapa 4). O perfil só fica visível ao público quando lgpd_aceito=true,
  // o que só ocorre ao concluir o cadastro na Etapa 6.
  // ─────────────────────────────────────────────────────────────────────────

  /** Salva o CPF na tabela separada curadentespro_cpf (RLS owner-only, LGPD). */
  async function salvarCpf(userId: string) {
    if (!cpf) return;
    const { error } = await supabase.from('curadentespro_cpf')
      .upsert({ curadentespro_id: userId, cpf }, { onConflict: 'curadentespro_id' });
    if (error) {
      console.error('[cpf]', error);
      toast.error(
        error.code === '23505'
          ? 'Este CPF já está cadastrado na plataforma.'
          : 'Erro ao salvar o CPF: ' + error.message,
      );
      throw error;
    }
  }

  /** Etapa 1 → banco: nome + email (pré-cadastro mínimo) */
  async function salvarEtapa1NoBanco(userId: string) {
    const { error } = await supabase.from('curadentespro').upsert({
      id: userId,
      user_id: userId,
      nome,
      tratamento: tratamento || null,
      nome_completo: nomeCompleto,
      email,
    }, { onConflict: 'id' });
    if (error) {
      console.error('[pré-cadastro etapa1]', error);
      toast.error('Erro ao salvar conta no servidor: ' + error.message);
      throw error;
    }
  }

  /** Etapa 2 → banco: telefone */
  async function salvarEtapa2NoBanco() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('curadentespro').upsert({
      id: user.id,
      user_id: user.id,
      nome,
      tratamento: tratamento || null,
      nome_completo: nomeCompleto,
      email,
      telefone,
      telefone_verificado: validarTelefone(telefone),
    }, { onConflict: 'id' });
    if (error) {
      console.error('[pré-cadastro etapa2]', error);
      toast.error('Erro ao salvar telefone: ' + error.message);
      throw error;
    }
  }

  /** Etapa 3 → banco: cpf, cro, ano_formacao, foto_url */
  async function salvarEtapa3NoBanco() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('curadentespro').upsert({
      id: user.id,
      user_id: user.id,
      nome,
      tratamento: tratamento || null,
      nome_completo: nomeCompleto,
      email,
      cro: cro || null,
      ano_formacao: anoFormacao ? parseInt(anoFormacao) : null,
      foto_url: fotoUrl || null,
    }, { onConflict: 'id' });
    if (error) {
      console.error('[pré-cadastro etapa3]', error);
      toast.error('Erro ao salvar identidade profissional: ' + error.message);
      throw error;
    }
    // CPF vai para a tabela separada curadentespro_cpf (LGPD — dado sensivel)
    await salvarCpf(user.id);
  }

  /** Etapa 4 → banco: endereços (apaga e reinserc para manter sincronia) */
  async function salvarEtapa4NoBanco() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Remove endereços anteriores e reinserc os atuais
    const { error: delErr } = await supabase
      .from('curadentespro_enderecos')
      .delete()
      .eq('curadentespro_id', user.id);
    if (delErr) {
      console.error('[pré-cadastro etapa4 delete]', delErr);
      toast.error('Erro ao atualizar endereços: ' + delErr.message);
      throw delErr;
    }
    for (const end of enderecos) {
      const { error: insErr } = await supabase.from('curadentespro_enderecos').insert({
        curadentespro_id: user.id,
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
        politica_cancelamento: end.politica_cancelamento,
        observacoes: end.observacoes,
        atividades: end.atividades,
        convenios: end.convenios,
        formas_pagamento: end.formas_pagamento,
        agenda: end.agenda,
      });
      if (insErr) {
        console.error('[pré-cadastro etapa4 insert]', insErr);
        toast.error('Erro ao salvar endereços: ' + insErr.message);
        throw insErr;
      }
    }
  }

  /** Etapa 5 → banco: bio + instagram */
  async function salvarEtapa5NoBanco() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const instagramUrl = formatarInstagram(instagram);
    if (instagram && !instagramUrl) {
      toast.error('Nome de usuário do Instagram inválido. Use apenas letras, números, ponto, traço e underscore (ex: @seuperfil).');
      throw new Error('Instagram inválido');
    }
    setInstagram(extrairUserInstagram(instagramUrl || ""));

    const { error } = await supabase.from('curadentespro').upsert({
      id: user.id,
      user_id: user.id,
      nome,
      tratamento: tratamento || null,
      nome_completo: nomeCompleto,
      email,
      bio: bio || null,
      instagram: instagramUrl,
    }, { onConflict: 'id' });
    if (error) {
      console.error('[pré-cadastro etapa5]', error);
      toast.error('Erro ao salvar bio: ' + error.message);
      throw error;
    }
  }


  // ─────────────────────────────────────────────────────────────────────────
  // (formatarCep e CepInputComBusca movidos para src/components/ui/CepInputComBusca)
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Formata o CPF enquanto o usuário digita (###.###.###-##)
  // ─────────────────────────────────────────────────────────────────────────
  function formatarCpf(valor: string) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);
    return numeros
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Formata o telefone em tempo real ((##) #####-####)
  // ─────────────────────────────────────────────────────────────────────────
  function formatarTelefone(valor: string) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);
    if (numeros.length <= 2) {
      return numeros.replace(/^(\d{0,2})/, "($1");
    }
    if (numeros.length <= 7) {
      return numeros.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    }
    return numeros.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Formata o CRO em tempo real (CRO-UF XXXXXX)
  // ─────────────────────────────────────────────────────────────────────────
  function formatarCro(valor: string) {
    let limpo = valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (limpo.startsWith("CRO")) {
      limpo = limpo.slice(3);
    }
    const letras = limpo.replace(/[^A-Z]/g, "").slice(0, 2);
    const numeros = limpo.replace(/[^0-9]/g, "").slice(0, 6);

    if (letras.length === 0) {
      return "CRO-";
    }
    if (letras.length <= 2 && numeros.length === 0) {
      return `CRO-${letras}`;
    }
    return `CRO-${letras}${numeros}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Finaliza o cadastro e salva no banco de dados
  // ─────────────────────────────────────────────────────────────────────────
  async function finalizarCadastro() {
    if (!cadastroCompleto) {
      setExibirModalIncompleto(true);
      return;
    }

    if (salvando) return;
    setSalvando(true);

    const toastId = toast.loading("Salvando seus dados...");

    // Timeout de segurança: impede que a tela trave para sempre
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("O servidor demorou muito para responder. Verifique sua conexão e tente novamente.")), 45000)
    );

    try {
      // ─── Valida Instagram antes de prosseguir ──────────────────────────────
      const instagramUrl = formatarInstagram(instagram);
      if (instagram && !instagramUrl) {
        toast.error('Nome de usuário do Instagram inválido. Use apenas letras, números, ponto, traço e underscore (ex: @seuperfil).', { id: toastId });
        return;
      }
      if (instagramUrl) setInstagram(extrairUserInstagram(instagramUrl));

      await Promise.race([
        timeoutPromise,
        (async () => {
          // 1. Obter usuário logado atual
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            throw new Error("Sessão não encontrada. Por favor, valide seu e-mail novamente na Etapa 1.");
          }

          // 2. Inserir perfil na tabela curadentespro
          const { error: errorPro } = await supabase.from('curadentespro').upsert({
            id: user.id,
            user_id: user.id,
            nome: nome,
            tratamento: tratamento || null,
            nome_completo: nomeCompleto,
            email: email,
            telefone: telefone,
            telefone_verificado: validarTelefone(telefone),
            cro: cro,
            ano_formacao: anoFormacao ? parseInt(anoFormacao) : null,
            foto_url: fotoUrl || null,
            bio: bio,
            instagram: instagramUrl,
            lgpd_aceito: lgpdAceito
          }, { onConflict: 'id' });

          if (errorPro) throw errorPro;

          // CPF na tabela separada (LGPD) — idempotente
          await salvarCpf(user.id);

          // 3. Deletar endereços existentes para evitar duplicações se for uma re-tentativa/atualização
          const { error: errorDelete } = await supabase
            .from('curadentespro_enderecos')
            .delete()
            .eq('curadentespro_id', user.id);

          if (errorDelete) throw errorDelete;

          // 4. Inserir endereços na tabela curadentespro_enderecos
          for (const end of enderecos) {
            // Geocodifica (com fallback p/ cidade) para o dentista aparecer no mapa
            const coordEnd = end.cidade ? await geocodeEnderecoComFallback(end) : null;
            const { error: errorEnd } = await supabase.from('curadentespro_enderecos').insert({
              curadentespro_id: user.id,
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
              politica_cancelamento: end.politica_cancelamento,
              observacoes: end.observacoes,
              atividades: end.atividades,
              convenios: end.convenios,
              formas_pagamento: end.formas_pagamento,
              agenda: end.agenda,
              latitude: coordEnd?.latitude ?? null,
              longitude: coordEnd?.longitude ?? null,
            });

            if (errorEnd) throw errorEnd;
          }

          toast.success("Cadastro concluído com sucesso!", { id: toastId });

          // Limpa rascunho
          localStorage.removeItem("curadentes_pro_cadastro_rascunho");

          // Invalida os caches da home para o dentista recém-cadastrado aparecer
          // de imediato na contagem total e na lista de "novos dentistas"
          localStorage.removeItem("curadentes_hero_stats_cache");
          localStorage.removeItem("curadentes_latest_dentists_cache");

          navigate("/pro/perfil");
        })()
      ]);
    } catch (error) {
      console.error("Erro ao salvar cadastro:", error);

      let message = "Ocorreu um erro ao salvar o cadastro.";
      const e = error as { code?: string; message?: string };

      if (error && typeof error === "object") {
        if (e.code === "23505") {
          const errMsg = e.message || "";
          if (errMsg.includes("curadentespro_cpf_key") || errMsg.includes("cpf")) {
            message = "Este CPF já está cadastrado na plataforma. Caso seja seu, acesse o painel com o e-mail que você utilizou anteriormente.";
          } else if (errMsg.includes("curadentespro_cro_key") || errMsg.includes("cro")) {
            message = "Este CRO já está cadastrado na plataforma. Caso seja seu, por favor entre em contato com o suporte.";
          } else if (errMsg.includes("curadentespro_email_key") || errMsg.includes("email")) {
            message = "Este e-mail já está cadastrado na plataforma. Por favor, faça login ou use outro e-mail.";
          } else {
            message = "Este CPF, CRO ou e-mail já está cadastrado em outra conta.";
          }
        } else if (e.message) {
          message = e.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      
      toast.error(message, { id: toastId });
    } finally {
      setSalvando(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Avança para o dashboard mesmo com cadastro incompleto
  // ─────────────────────────────────────────────────────────────────────────
  function continuarIncompleto() {
    setExibirModalIncompleto(false);
    navigate("/pro/perfil");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Adiciona um novo endereço ao formulário (máx. 8)
  // ─────────────────────────────────────────────────────────────────────────
  function adicionarEndereco() {
    if (enderecos.length < 8) {
      setEnderecos([...enderecos, novoEndereco()]);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Salva o rascunho atual com o progresso no localStorage
  // ─────────────────────────────────────────────────────────────────────────
  function salvarProgresso(idx: number) {
    const rascunho = {
      etapa,
      nome,
      tratamento,
      nomeCompleto,
      email,
      emailVerificado,
      telefone,
      telefoneVerificado,
      cpf,
      cro,
      anoFormacao,
      fotoUrl,
      enderecos,
      bio,
      lgpdAceito
    };
    localStorage.setItem("curadentes_pro_cadastro_rascunho", JSON.stringify(rascunho));

    setSalvoFeedbackIdx(idx);
    setTimeout(() => {
      setSalvoFeedbackIdx(null);
    }, 2500);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Remove um endereço pelo índice
  // ─────────────────────────────────────────────────────────────────────────
  function removerEndereco(idx: number) {
    setEnderecos(enderecos.filter((_, i) => i !== idx));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Atualiza um campo específico de um endereço pelo índice
  // ─────────────────────────────────────────────────────────────────────────
  function atualizarEndereco<K extends keyof EnderecoForm>(
    idx: number,
    campo: K,
    valor: EnderecoForm[K]
  ) {
    setEnderecos((prev) => {
      const novos = [...prev];
      novos[idx] = { ...novos[idx], [campo]: valor };
      return novos;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Alterna uma opção dentro de um array de checkboxes de endereço
  // (atividades, convênios ou formas de pagamento)
  // ─────────────────────────────────────────────────────────────────────────
  function toggleOpcaoEndereco(
    idx: number,
    campo: "atividades" | "convenios" | "formas_pagamento",
    opcao: string
  ) {
    setEnderecos((prev) => {
      const novos = [...prev];
      const lista = novos[idx][campo];
      novos[idx] = {
        ...novos[idx],
        [campo]: lista.includes(opcao)
          ? lista.filter((i) => i !== opcao)
          : [...lista, opcao],
      };
      return novos;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Alterna a atividade de um dia na agenda de um endereço
  // ─────────────────────────────────────────────────────────────────────────
  function toggleDiaAgenda(idxEnd: number, idxDia: number) {
    setEnderecos((prev) => {
      const novos = [...prev];
      novos[idxEnd] = {
        ...novos[idxEnd],
        agenda: novos[idxEnd].agenda.map((d, i) =>
          i === idxDia ? { ...d, ativo: !d.ativo } : d
        ),
      };
      return novos;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Função: Atualiza horário de início/fim de um dia da agenda
  // ─────────────────────────────────────────────────────────────────────────
  function atualizarHorario(
    idxEnd: number,
    idxDia: number,
    campo: "inicio" | "fim",
    valor: string
  ) {
    setEnderecos((prev) => {
      const novos = [...prev];
      novos[idxEnd] = {
        ...novos[idxEnd],
        agenda: novos[idxEnd].agenda.map((d, i) =>
          i === idxDia ? { ...d, [campo]: valor } : d
        ),
      };
      return novos;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Força da senha — para exibir barra de progresso visual
  // ─────────────────────────────────────────────────────────────────────────
  const forcaSenha = calcularForcaSenha(senha);
  const coresForca = ["#FF3B30", "#FF9500", "#FFCC00", "#34C759"];
  const labelsForca = ["Muito fraca", "Fraca", "Boa", "Forte"];

  // ─── Estilos reutilizáveis ────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid rgba(60,60,67,0.18)",
    borderRadius: "12px",
    fontSize: "15px",
    color: "#1C1C1E",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#3A3A3C",
    marginBottom: "6px",
  };

  // ─── Renderização da barra de progresso ──────────────────────────────────
  const renderBarraProgresso = () => {
    const validationParams: EtapaValidationParams = {
      nome,
      tratamento,
      emailVerificado,
      senhaSincronizada,
      senha,
      confirmaSenha,
      telefone,
      cpf,
      cro,
      enderecos,
      lgpdAceito,
    };

    return (
      <div className="mb-8">
        {/* Indicadores de etapa (clicaveis para etapas concluidas) */}
        <div className="flex items-center justify-between mb-3">
          {ETAPAS.map((e) => {
            const concluida = isEtapaConcluida(e.id, validationParams);
            const atual = etapa === e.id;
            const podeNavegar = emailVerificado || etapa > 1;

            const bgColor = concluida ? "#34C759" : "#FF9500";
            const textColor = "#fff";
            const ringStyle = atual ? "3px solid #007AFF" : "none";

            return (
              <button
                key={e.id}
                type="button"
                disabled={!podeNavegar}
                onClick={() => podeNavegar && setEtapa(e.id)}
                className="flex flex-col items-center gap-1 flex-1 transition-opacity"
                style={{ cursor: podeNavegar ? "pointer" : "default", opacity: podeNavegar ? 1 : 0.5, background: "none", border: "none", padding: 0 }}
              >
                <div
                  className="flex items-center justify-center rounded-full text-[12px] font-bold transition-all duration-300"
                  style={{
                    width: "32px",
                    height: "32px",
                    background: bgColor,
                    color: textColor,
                    border: ringStyle,
                    boxShadow: atual ? "0 0 0 4px rgba(0, 122, 255, 0.25)" : "none",
                  }}
                >
                  {concluida ? <Check size={14} /> : <span className="font-bold text-[14px]">!</span>}
                </div>
                <span
                  className="text-[10px] font-semibold hidden sm:block text-center"
                  style={{ color: concluida ? "#34C759" : "#FF9500", fontWeight: atual ? "bold" : "semibold" }}
                >
                  {e.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Barra de progresso contínua */}
        <div style={{ height: "4px", background: "rgba(60,60,67,0.10)", borderRadius: "2px" }}>
          <div
            style={{
              height: "100%",
              width: `${progresso}%`,
              background: "linear-gradient(90deg, #007AFF, #34C759)",
              borderRadius: "2px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>
    );
  };

  // ─── Botões de navegação entre etapas ────────────────────────────────────
  // onAvancar: callback opcional executado antes de mudar de etapa
  // (usado pela Etapa 1 para sincronizar a senha via updateUser).
  const renderNavegacao = (
    podeProsseguir = true,
    ultimaEtapa = false,
    ocultarPular = false,
    onAvancar?: () => Promise<void> | void
  ) => (
    <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)" }}>
      {/* Botão voltar */}
      {etapa > 1 ? (
        <button
          onClick={() => setEtapa(etapa - 1)}
          className="flex items-center gap-2 px-4 py-3 rounded-[12px] font-medium text-[14px] min-h-[44px] transition-all duration-200"
          style={{ color: "#007AFF", background: "rgba(0,122,255,0.06)", border: "0.5px solid rgba(0,122,255,0.18)" }}
        >
          <ChevronLeft size={16} />
          Voltar
        </button>
      ) : (
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-4 py-3 rounded-[12px] font-medium text-[14px] min-h-[44px] transition-all duration-200"
          style={{ color: "#8E8E93", background: "rgba(60,60,67,0.05)", border: "0.5px solid rgba(60,60,67,0.12)" }}
        >
          <ChevronLeft size={16} />
          Cancelar
        </button>
      )}

      <div className="flex items-center gap-2">
        {/* Opção de pular etapa — oculta na Etapa 1 pois o e-mail deve ser verificado */}
        {!ultimaEtapa && !ocultarPular && (
          <button
            onClick={() => setEtapa(etapa + 1)}
            className="px-4 py-3 rounded-[12px] font-medium text-[13px] min-h-[44px] transition-all duration-200"
            style={{ color: "#8E8E93", background: "transparent" }}
          >
            Deixar para mais tarde
          </button>
        )}

        {/* Botão de avançar ou finalizar */}
        {ultimaEtapa ? (
          <button
            onClick={finalizarCadastro}
            disabled={!lgpdAceito || salvando}
            className="flex items-center gap-2 px-6 py-3 rounded-[14px] font-semibold text-[15px] min-h-[44px] transition-all duration-200 text-white"
            style={{
              background: lgpdAceito && !salvando ? "#34C759" : "rgba(52,199,89,0.35)",
              boxShadow: lgpdAceito && !salvando ? "0 4px 16px rgba(52,199,89,0.30)" : "none",
              cursor: lgpdAceito && !salvando ? "pointer" : "not-allowed",
            }}
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {salvando ? "Salvando..." : "Concluir cadastro"}
          </button>
        ) : (
          <button
            onClick={async () => {
              if (salvando) return;
              setSalvando(true);
              try {
                if (onAvancar) await onAvancar();
                setEtapa(etapa + 1);
              } catch {
                return;
              } finally {
                setSalvando(false);
              }
            }}
            disabled={!podeProsseguir || salvando}
            className="flex items-center gap-2 px-6 py-3 rounded-[14px] font-semibold text-[15px] min-h-[44px] transition-all duration-200 text-white"
            style={{
              background: podeProsseguir && !salvando ? "#007AFF" : "rgba(0,122,255,0.30)",
              boxShadow: podeProsseguir && !salvando ? "0 4px 16px rgba(0,122,255,0.28)" : "none",
              cursor: podeProsseguir && !salvando ? "pointer" : "not-allowed",
            }}
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
            {salvando ? "Salvando..." : "Continuar"}
            {!salvando && <ChevronRight size={16} />}
          </button>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERIZAÇÃO DA ETAPA 1 — CONTA
  // ─────────────────────────────────────────────────────────────────────────
  const renderEtapa1 = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-bold mb-1" style={{ color: "#0A2A66" }}>Criar sua conta</h2>
        <p className="text-[14px]" style={{ color: "#8E8E93" }}>Informações básicas de acesso à plataforma</p>
      </div>

      {/* Nome para exibição */}
      <div>
        <label style={labelStyle}>Nome para exibição *</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="João Silva"
          style={inputStyle}
        />
      </div>

      {/* Pronome de tratamento (Dr. / Dra.) — exibido antes do nome no perfil */}
      <div>
        <label style={labelStyle}>Como aparece no seu perfil *</label>
        <div className="flex gap-2">
          {(["Dr.", "Dra."] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTratamento(t)}
              className="flex-1 py-2.5 rounded-[12px] font-semibold text-[14px] transition-all"
              style={tratamento === t
                ? { background: "#007AFF", color: "#fff" }
                : { background: "rgba(60,60,67,0.06)", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.12)" }}
            >
              {t} {nome.trim() ? nome.trim().split(" ")[0] : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Nome completo (para verificação do CRO) */}
      <div>
        <label style={labelStyle}>
          <span className="flex items-center gap-1.5">
            <Shield size={13} />
            Nome completo (para verificação do CRO) *
          </span>
        </label>
        <input
          type="text"
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          placeholder="João Silva Santos (igual ao documento)"
          style={inputStyle}
        />
        <p className="text-[11px] mt-1" style={{ color: "#8E8E93" }}>
          Este nome será usado para conferência com o CRO no sistema CFO e não poderá ser alterado depois.
        </p>
      </div>

      {/* Email + verificação por token */}
      <div>
        <label style={labelStyle}>
          <span className="flex items-center gap-1.5">
            <Mail size={13} />
            E-mail *
            {emailVerificado && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(52,199,89,0.10)", color: "#34C759" }}>
                <Check size={10} /> Verificado
              </span>
            )}
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailVerificado(false); }}
            placeholder="seu@email.com.br"
            disabled={emailVerificado}
            style={{ ...inputStyle, flex: 1, opacity: emailVerificado ? 0.6 : 1 }}
          />
          {!emailVerificado && (
            <button
              onClick={enviarTokenEmail}
              disabled={!email.includes("@")}
              className="px-4 py-3 rounded-[12px] font-semibold text-[13px] min-h-[44px] text-white flex-shrink-0 transition-all duration-200"
              style={{
                background: email.includes("@") ? "#007AFF" : "rgba(0,122,255,0.25)",
                cursor: email.includes("@") ? "pointer" : "not-allowed",
              }}
            >
              Enviar código
            </button>
          )}
        </div>

        {/* Campo do token de email */}
        {aguardandoTokenEmail && !emailVerificado && (
          <div className="mt-3 p-4 rounded-[12px] flex flex-col gap-3" style={{ background: "rgba(0,122,255,0.06)", border: "0.5px solid rgba(0,122,255,0.15)" }}>
            <p className="text-[13px]" style={{ color: "#007AFF" }}>
              Enviamos um código de 8 dígitos para <strong>{email}</strong>. Verifique sua caixa de entrada.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={tokenEmailInput}
                onChange={(e) => setTokenEmailInput(e.target.value.slice(0, 8))}
                placeholder="00000000"
                maxLength={8}
                className="text-center text-[20px] font-bold tracking-[0.3em]"
                style={{ ...inputStyle, flex: 1, letterSpacing: "0.3em" }}
              />
              <button
                onClick={validarTokenEmail}
                disabled={tokenEmailInput.length !== 8}
                className="px-4 py-3 rounded-[12px] font-semibold text-[13px] text-white flex-shrink-0 transition-all duration-200"
                style={{ background: tokenEmailInput.length === 8 ? "#34C759" : "rgba(52,199,89,0.4)", cursor: tokenEmailInput.length === 8 ? "pointer" : "not-allowed" }}
              >
                Confirmar
              </button>
            </div>
            <p className="text-[11px]" style={{ color: "#8E8E93" }}>
              Caso não encontre, verifique sua pasta de Spam ou Lixo Eletrônico.
            </p>
          </div>
        )}
      </div>

      {/* Senha */}
      <div>
        <label style={labelStyle}>Senha *</label>
        <div className="relative">
          <input
            type={mostrarSenha ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder={senhaSincronizada ? "Sua senha já está salva (deixe em branco)" : "Mínimo 8 caracteres"}
            style={{ ...inputStyle, paddingRight: "48px" }}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "#8E8E93" }}
          >
            {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Barra de força da senha */}
        {senha.length > 0 && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: "4px",
                    borderRadius: "2px",
                    background: i < forcaSenha ? coresForca[forcaSenha - 1] : "rgba(60,60,67,0.10)",
                    transition: "background 0.3s ease",
                  }}
                />
              ))}
            </div>
            <p className="text-[12px] font-medium" style={{ color: forcaSenha > 0 ? coresForca[forcaSenha - 1] : "#8E8E93" }}>
              {forcaSenha > 0 ? labelsForca[forcaSenha - 1] : ""}
            </p>
          </div>
        )}
      </div>

      {/* Confirmação de senha */}
      <div>
        <label style={labelStyle}>Confirmar senha *</label>
        <div className="relative">
          <input
            type={mostrarConfirma ? "text" : "password"}
            value={confirmaSenha}
            onChange={(e) => setConfirmaSenha(e.target.value)}
            placeholder={senhaSincronizada ? "Sua senha já está salva (deixe em branco)" : "Repita a senha"}
            style={{
              ...inputStyle,
              paddingRight: "48px",
              borderColor: confirmaSenha && confirmaSenha !== senha ? "#FF3B30" : undefined,
            }}
          />
          <button
            type="button"
            onClick={() => setMostrarConfirma(!mostrarConfirma)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "#8E8E93" }}
          >
            {mostrarConfirma ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {confirmaSenha && confirmaSenha !== senha && (
          <p className="text-[12px] mt-1" style={{ color: "#FF3B30" }}>As senhas não coincidem.</p>
        )}
        {senhaSincronizada && senha.length === 0 && (
          <p className="text-[12px] mt-1.5 text-blue-600 font-medium">
            Sua senha já foi definida de forma segura. Preencha os campos apenas se desejar alterá-la.
          </p>
        )}
      </div>

      {/* Separador ou Google DESATIVADO
      <div className="flex items-center gap-3">
        <div style={{ flex: 1, height: "0.5px", background: "rgba(60,60,67,0.15)" }} />
        <span className="text-[12px]" style={{ color: "#8E8E93" }}>ou continue com</span>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(60,60,67,0.15)" }} />
      </div>
      */}

      {/* Botão Google DESATIVADO
      <button
        className="w-full flex items-center justify-center gap-3 py-3 rounded-[12px] font-semibold text-[15px] min-h-[48px] transition-all duration-200"
        style={{ background: "#fff", border: "1px solid rgba(60,60,67,0.18)", color: "#1C1C1E" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(60,60,67,0.04)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
      >
        {/* SVG do Google 
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Entrar com Google
      </button>*/}

      {renderNavegacao(
        nome.trim() !== "" && 
          emailVerificado && 
          (senhaSincronizada || (senha.length >= 8 && senha === confirmaSenha)),
        false,
        true,  // Etapa 1: ocultar "Deixar para mais tarde" — e-mail deve ser verificado
        avancarEtapa1  // Sincroniza a senha real com o Supabase antes de avancar
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERIZAÇÃO DA ETAPA 2 — TELEFONE
  // ─────────────────────────────────────────────────────────────────────────
  const renderEtapa2 = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-bold mb-1" style={{ color: "#0A2A66" }}>Telefone de contato</h2>
        <p className="text-[14px]" style={{ color: "#8E8E93" }}>
          Usaremos para notificações e segurança da conta.
          A verificação por SMS/WhatsApp será habilitada em uma versão futura — por enquanto o campo é opcional.
        </p>
      </div>

      {/* Número de Telefone formatado sem +55 */}
      <div>
        <label style={labelStyle}>
          <span className="flex items-center gap-1.5">
            <Phone size={13} />
            Número de telefone (opcional)
            {validarTelefone(telefone) && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(52,199,89,0.10)", color: "#34C759" }}>
                <Check size={10} /> Válido
              </span>
            )}
          </span>
        </label>
        <input
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
          placeholder="(11) 99999-9999"
          maxLength={15}
          style={{
            ...inputStyle,
            borderColor: temProgressoPosterior && !validarTelefone(telefone)
              ? "#FF9500"
              : (telefone.replace(/\D/g, "").length === 11 && !validarTelefone(telefone) ? "#FF3B30" : "rgba(60,60,67,0.18)"),
            boxShadow: temProgressoPosterior && !validarTelefone(telefone)
              ? "0 0 0 3px rgba(255,149,0,0.15)"
              : undefined,
          }}
        />
        {temProgressoPosterior && !validarTelefone(telefone) && (
          <p className="text-[12px] mt-1 font-medium" style={{ color: "#FF9500" }}>
            Telefone obrigatório pendente. Por favor, insira um celular válido (ex.: (11) 99999-9999).
          </p>
        )}
        {telefone.replace(/\D/g, "").length === 11 && !validarTelefone(telefone) && !temProgressoPosterior && (
          <p className="text-[12px] mt-1" style={{ color: "#FF3B30" }}>
            Número inválido. O celular deve conter DDD e começar com 9.
          </p>
        )}
        <p className="text-[12px] mt-1" style={{ color: "#8E8E93" }}>
          Opcional. Formato: DDD + 9 dígitos (ex.: (11) 99999-9999).
        </p>
      </div>

      {/* Modo de verificação: SMS ou WhatsApp (Comentado para implementações futuras)
      {!telefoneVerificado && (
        <>
          <div>
            <label style={labelStyle}>Receber código de verificação por:</label>
            <div className="flex gap-3">
              {(["whatsapp", "sms"] as const).map((modo) => (
                <button
                  key={modo}
                  onClick={() => setModoVerifTel(modo)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] font-semibold text-[14px] min-h-[48px] transition-all duration-200"
                  style={
                    modoVerifTel === modo
                      ? { background: "#007AFF", color: "#fff", border: "0.5px solid transparent" }
                      : { background: "rgba(60,60,67,0.05)", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.15)" }
                  }
                >
                  {modo === "whatsapp" ? "WhatsApp" : "SMS"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={enviarTokenTelefone}
            disabled={!validarTelefone(telefone)}
            className="w-full py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] text-white transition-all duration-200"
            style={{
              background: validarTelefone(telefone) ? "#007AFF" : "rgba(0,122,255,0.25)",
              boxShadow: validarTelefone(telefone) ? "0 4px 16px rgba(0,122,255,0.28)" : "none",
              cursor: validarTelefone(telefone) ? "pointer" : "not-allowed",
            }}
          >
            Enviar código via {modoVerifTel === "whatsapp" ? "WhatsApp" : "SMS"}
          </button>
        </>
      )}

      {aguardandoTokenTel && !telefoneVerificado && (
        <div className="p-4 rounded-[12px] flex flex-col gap-3" style={{ background: "rgba(52,199,89,0.06)", border: "0.5px solid rgba(52,199,89,0.20)" }}>
          <p className="text-[13px]" style={{ color: "#34C759" }}>
            Código enviado via {modoVerifTel === "whatsapp" ? "WhatsApp" : "SMS"} para <strong>{telefone}</strong>.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={tokenTelInput}
              onChange={(e) => setTokenTelInput(e.target.value.slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-[20px] font-bold"
              style={{ ...inputStyle, flex: 1, letterSpacing: "0.3em" }}
            />
            <button
              onClick={validarTokenTelefone}
              className="px-4 py-3 rounded-[12px] font-semibold text-[13px] text-white flex-shrink-0"
              style={{ background: "#34C759" }}
            >
              Confirmar
            </button>
          </div>
          <p className="text-[11px]" style={{ color: "#8E8E93" }}>
            Modo demo: o código aparece no console do navegador (F12).
          </p>
        </div>
      )}
      */}

      {renderNavegacao(true, false, false, salvarEtapa2NoBanco)}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERIZAÇÃO DA ETAPA 3 — IDENTIDADE PROFISSIONAL
  // ─────────────────────────────────────────────────────────────────────────
  const renderEtapa3 = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-bold mb-1" style={{ color: "#0A2A66" }}>Identidade profissional</h2>
        <p className="text-[14px]" style={{ color: "#8E8E93" }}>Seus dados profissionais garantem a credibilidade do seu perfil</p>
      </div>

      {/* Foto de perfil */}
      <div>
        <label style={labelStyle}>Foto de perfil</label>
        <div className="flex items-center gap-4">
          <div
            className="flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(0,122,255,0.08)", border: "2px dashed rgba(0,122,255,0.25)" }}
          >
            {isUploadingFoto ? (
              <Loader2 className="animate-spin text-[#007AFF]" size={24} />
            ) : fotoUrl ? (
              <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <User size={28} style={{ color: "rgba(0,122,255,0.40)" }} />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingFoto}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] font-semibold text-[13px] min-h-[40px] transition-all duration-200 disabled:opacity-50"
              style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF", border: "0.5px solid rgba(0,122,255,0.20)" }}
            >
              {isUploadingFoto ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Fazer upload
                </>
              )}
            </button>
            <p className="text-[12px]" style={{ color: "#8E8E93" }}>JPG, PNG ou WEBP · máx. 5 MB</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (fileInputRef.current) fileInputRef.current.value = "";
              navigate("/pro/editor-de-fotos", { state: { imageFile: file, from: "/pro/novo-cadastro", etapa } });
            }
          }}
        />
      </div>

      {/* CPF */}
      <div>
        <label style={labelStyle}>CPF *</label>
        <input
          type="text"
          value={cpf}
          onChange={(e) => setCpf(formatarCpf(e.target.value))}
          placeholder="000.000.000-00"
          maxLength={14}
          style={{
            ...inputStyle,
            borderColor: temProgressoPosterior && !validarCpf(cpf)
              ? "#FF9500"
              : (cpf.length === 14 && !validarCpf(cpf) ? "#FF3B30" : "rgba(60,60,67,0.18)"),
            boxShadow: temProgressoPosterior && !validarCpf(cpf)
              ? "0 0 0 3px rgba(255,149,0,0.15)"
              : undefined,
          }}
        />
        {temProgressoPosterior && !validarCpf(cpf) && (
          <p className="text-[12px] mt-1 font-medium" style={{ color: "#FF9500" }}>
            CPF obrigatório pendente. Informe um CPF válido.
          </p>
        )}
        {cpf.length === 14 && !validarCpf(cpf) && !temProgressoPosterior && (
          <p className="text-[12px] mt-1" style={{ color: "#FF3B30" }}>
            CPF inválido. Verifique os dígitos digitados.
          </p>
        )}
      </div>

      {/* CRO com máscara e validação */}
      <div>
        <label style={labelStyle}>
          <span className="flex items-center gap-1.5">
            <Shield size={13} />
            CRO (Conselho Regional de Odontologia) *
          </span>
        </label>
        <input
          type="text"
          value={cro}
          onChange={(e) => setCro(formatarCro(e.target.value))}
          placeholder="CRO-SP123456"
          maxLength={12}
          style={{
            ...inputStyle,
            borderColor: temProgressoPosterior && !validarCro(cro)
              ? "#FF9500"
              : (cro.length > 4 && !validarCro(cro) ? "#FF3B30" : "rgba(60,60,67,0.18)"),
            boxShadow: temProgressoPosterior && !validarCro(cro)
              ? "0 0 0 3px rgba(255,149,0,0.15)"
              : undefined,
          }}
        />
        {temProgressoPosterior && !validarCro(cro) && (
          <p className="text-[12px] mt-1 font-medium" style={{ color: "#FF9500" }}>
            CRO obrigatório pendente. Informe o CRO no formato CRO-SP123456.
          </p>
        )}
        {cro.length > 4 && !validarCro(cro) && !temProgressoPosterior && (
          <p className="text-[12px] mt-1" style={{ color: "#FF3B30" }}>
            CRO inválido. Deve conter sigla do estado e 3 a 6 números (ex: CRO-SP123456).
          </p>
        )}
        <p className="text-[12px] mt-1" style={{ color: "#8E8E93" }}>Formato: CRO-UF seguido do número de registro</p>
      </div>

      {/* Ano de formação */}
      <div>
        <label style={labelStyle}>Ano de formação</label>
        <input
          type="number"
          value={anoFormacao}
          onChange={(e) => setAnoFormacao(e.target.value)}
          placeholder="Ex: 2015"
          min={1960}
          max={new Date().getFullYear()}
          style={inputStyle}
        />
      </div>

      {renderNavegacao(validarCpf(cpf) && validarCro(cro), false, false, salvarEtapa3NoBanco)}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERIZAÇÃO DA ETAPA 4 — ENDEREÇOS
  // ─────────────────────────────────────────────────────────────────────────
  const renderEtapa4 = () => (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[22px] font-bold mb-1" style={{ color: "#0A2A66" }}>Locais de atendimento</h2>
        <p className="text-[14px]" style={{ color: "#8E8E93" }}>
          Cadastre de 1 a 8 endereços. Você poderá editar essas informações após o cadastro.
        </p>
      </div>

      {/* Cards de endereço */}
      {enderecos.map((end, idx) => (
        <div
          key={end.id}
          style={{
            background: "#fff",
            border: "0.5px solid rgba(60,60,67,0.15)",
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          {/* Cabeçalho do card de endereço com salvamento de progresso */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ background: "rgba(0,122,255,0.04)", borderBottom: "0.5px solid rgba(60,60,67,0.10)" }}
          >
            <div className="flex items-center gap-2">
              <Building2 size={16} style={{ color: "#007AFF" }} />
              <span className="font-bold text-[15px]" style={{ color: "#0A2A66" }}>
                Endereço {idx + 1}
                {end.nome_clinica && ` — ${end.nome_clinica}`}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => salvarProgresso(idx)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] font-semibold text-[12px] transition-all duration-200"
                style={{
                  background: salvoFeedbackIdx === idx ? "rgba(52,199,89,0.10)" : "rgba(0,122,255,0.08)",
                  color: salvoFeedbackIdx === idx ? "#34C759" : "#007AFF",
                  border: salvoFeedbackIdx === idx ? "0.5px solid rgba(52,199,89,0.20)" : "0.5px solid rgba(0,122,255,0.15)",
                }}
              >
                {salvoFeedbackIdx === idx ? (
                  <>
                    <Check size={12} />
                    Salvo!
                  </>
                ) : (
                  <>
                    Salvar progresso
                  </>
                )}
              </button>

              {enderecos.length > 1 && (
                <button
                  onClick={() => removerEndereco(idx)}
                  className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                  style={{ color: "#FF3B30", background: "rgba(255,59,48,0.08)" }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* Nome da clínica + CEP lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Nome da clínica / consultório *</label>
                <input
                  type="text"
                  value={end.nome_clinica}
                  onChange={(e) => atualizarEndereco(idx, "nome_clinica", e.target.value)}
                  placeholder="Clínica Sorriso &amp; Estética"
                  style={{
                    ...inputStyle,
                    borderColor: temProgressoPosterior && !end.nome_clinica.trim() ? "#FF9500" : "rgba(60,60,67,0.18)",
                    boxShadow: temProgressoPosterior && !end.nome_clinica.trim() ? "0 0 0 3px rgba(255,149,0,0.15)" : undefined,
                  }}
                />
                {temProgressoPosterior && !end.nome_clinica.trim() && (
                  <p className="text-[11px] mt-1 font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>
                )}
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
            </div>

            {/* Endereço completo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label style={labelStyle}>Logradouro *</label>
                <input
                  type="text"
                  value={end.logradouro}
                  onChange={(e) => atualizarEndereco(idx, "logradouro", e.target.value)}
                  placeholder="Rua, Avenida..."
                  style={{
                    ...inputStyle,
                    borderColor: temProgressoPosterior && !end.logradouro.trim() ? "#FF9500" : "rgba(60,60,67,0.18)",
                    boxShadow: temProgressoPosterior && !end.logradouro.trim() ? "0 0 0 3px rgba(255,149,0,0.15)" : undefined,
                  }}
                />
                {temProgressoPosterior && !end.logradouro.trim() && (
                  <p className="text-[11px] mt-1 font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Número *</label>
                <input type="text" value={end.numero} onChange={(e) => atualizarEndereco(idx, "numero", e.target.value)} placeholder="123" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Complemento</label>
                <input type="text" value={end.complemento} onChange={(e) => atualizarEndereco(idx, "complemento", e.target.value)} placeholder="Sala 42" style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Bairro *</label>
                <input
                  type="text"
                  value={end.bairro}
                  onChange={(e) => atualizarEndereco(idx, "bairro", e.target.value)}
                  placeholder="Centro"
                  style={{
                    ...inputStyle,
                    borderColor: temProgressoPosterior && !end.bairro.trim() ? "#FF9500" : "rgba(60,60,67,0.18)",
                    boxShadow: temProgressoPosterior && !end.bairro.trim() ? "0 0 0 3px rgba(255,149,0,0.15)" : undefined,
                  }}
                />
                {temProgressoPosterior && !end.bairro.trim() && (
                  <p className="text-[11px] mt-1 font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Cidade *</label>
                <input
                  type="text"
                  value={end.cidade}
                  onChange={(e) => atualizarEndereco(idx, "cidade", e.target.value)}
                  placeholder="São Paulo"
                  style={{
                    ...inputStyle,
                    borderColor: temProgressoPosterior && !end.cidade.trim() ? "#FF9500" : "rgba(60,60,67,0.18)",
                    boxShadow: temProgressoPosterior && !end.cidade.trim() ? "0 0 0 3px rgba(255,149,0,0.15)" : undefined,
                  }}
                />
                {temProgressoPosterior && !end.cidade.trim() && (
                  <p className="text-[11px] mt-1 font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Estado *</label>
                <input
                  type="text"
                  value={end.estado}
                  onChange={(e) => atualizarEndereco(idx, "estado", e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  maxLength={2}
                  style={{
                    ...inputStyle,
                    borderColor: temProgressoPosterior && !end.estado.trim() ? "#FF9500" : "rgba(60,60,67,0.18)",
                    boxShadow: temProgressoPosterior && !end.estado.trim() ? "0 0 0 3px rgba(255,149,0,0.15)" : undefined,
                  }}
                />
                {temProgressoPosterior && !end.estado.trim() && (
                  <p className="text-[11px] mt-1 font-medium" style={{ color: "#FF9500" }}>Campo obrigatório pendente</p>
                )}
              </div>
            </div>

            {/* Contatos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Telefone</label>
                <input type="tel" value={end.telefone} onChange={(e) => atualizarEndereco(idx, "telefone", e.target.value)} placeholder="(11) 3456-7890" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp (E.164)</label>
                <input type="tel" value={end.whatsapp} onChange={(e) => atualizarEndereco(idx, "whatsapp", e.target.value)} placeholder="+5511999999999" style={inputStyle} />
              </div>
            </div>

            {/* Atendimento de urgências */}
            <div
              className="flex flex-col gap-3 p-4 rounded-[14px]"
              style={{ background: "rgba(230,0,76,0.04)", border: "0.5px solid rgba(230,0,76,0.15)" }}
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={end.atende_urgencias}
                  onChange={(e) => atualizarEndereco(idx, "atende_urgencias", e.target.checked)}
                  className="w-5 h-5 accent-[#E6004C] cursor-pointer"
                />
                <span className="font-semibold text-[14px]" style={{ color: "#E6004C" }}>
                  Atenderei urgências neste endereço
                </span>
              </label>

              {/* Termo de encaixe para urgências */}
              {end.atende_urgencias && (
                <label className="flex items-start gap-3 cursor-pointer pl-8">
                  <input
                    type="checkbox"
                    checked={end.aceita_urgencia_termo}
                    onChange={(e) => atualizarEndereco(idx, "aceita_urgencia_termo", e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#E6004C] cursor-pointer flex-shrink-0"
                  />
                  <span className="text-[13px]" style={{ color: "#3A3A3C", lineHeight: 1.6 }}>
                    Estou ciente e concordo em realizar encaixes de pacientes em urgência dentro do meu horário de atendimento informado neste endereço.
                  </span>
                </label>
              )}
            </div>

            {/* Atividades neste endereço */}
            <div>
              <label style={{ ...labelStyle, marginBottom: "10px" }}>Procedimentos realizados neste endereço *</label>
              <div className="flex flex-wrap gap-2">
                {ESPECIALIDADES.map((esp) => {
                  const marcado = end.atividades.includes(esp);
                  return (
                    <button
                      key={esp}
                      onClick={() => toggleOpcaoEndereco(idx, "atividades", esp)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                      style={
                        marcado
                          ? { background: "#007AFF", color: "#fff", border: "0.5px solid transparent" }
                          : { background: "rgba(60,60,67,0.06)", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.15)" }
                      }
                    >
                      {marcado && <Check size={10} style={{ display: "inline", marginRight: "4px" }} />}
                      {esp}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Convênios aceitos neste endereço */}
            <div>
              <label style={{ ...labelStyle, marginBottom: "10px" }}>Convênios aceitos neste endereço</label>
              <div className="flex flex-wrap gap-2">
                {CONVENIOS_OPCOES.map((conv) => {
                  const marcado = end.convenios.includes(conv);
                  return (
                    <button
                      key={conv}
                      onClick={() => toggleOpcaoEndereco(idx, "convenios", conv)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                      style={
                        marcado
                          ? { background: "#34C759", color: "#fff", border: "0.5px solid transparent" }
                          : { background: "rgba(60,60,67,0.06)", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.15)" }
                      }
                    >
                      {marcado && <Check size={10} style={{ display: "inline", marginRight: "4px" }} />}
                      {conv}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formas de pagamento aceitas neste endereço */}
            <div>
              <label style={{ ...labelStyle, marginBottom: "10px" }}>Formas de pagamento aceitas neste endereço</label>
              <div className="flex flex-wrap gap-2">
                {PAGAMENTOS_OPCOES.map((pag) => {
                  const marcado = end.formas_pagamento.includes(pag);
                  return (
                    <button
                      key={pag}
                      onClick={() => toggleOpcaoEndereco(idx, "formas_pagamento", pag)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                      style={
                        marcado
                          ? { background: "#FF9500", color: "#fff", border: "0.5px solid transparent" }
                          : { background: "rgba(60,60,67,0.06)", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.15)" }
                      }
                    >
                      {marcado && <Check size={10} style={{ display: "inline", marginRight: "4px" }} />}
                      {pag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horários de atendimento por dia da semana */}
            <div>
              <label style={{ ...labelStyle, marginBottom: "10px" }}>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  Horários de atendimento
                </span>
              </label>
              <div className="flex flex-col gap-2.5">
                {end.agenda.map((dia, idxDia) => (
                  <div
                    key={dia.dia}
                    className="flex flex-row flex-wrap sm:flex-nowrap items-center justify-between gap-3 py-2 transition-all duration-200"
                    style={{ borderBottom: "0.5px solid rgba(60,60,67,0.06)" }}
                  >
                    <label className="flex items-center gap-2 cursor-pointer w-[110px] sm:w-[130px] flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={dia.ativo}
                        onChange={() => toggleDiaAgenda(idx, idxDia)}
                        className="w-4 h-4 accent-[#007AFF] cursor-pointer"
                      />
                      <span className="text-[13.5px] font-semibold" style={{ color: dia.ativo ? "#1C1C1E" : "#8E8E93" }}>
                        {dia.dia.split("-")[0]}
                      </span>
                    </label>
                    {dia.ativo ? (
                      <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 justify-end">
                        <input
                          type="time"
                          value={dia.inicio}
                          onChange={(e) => atualizarHorario(idx, idxDia, "inicio", e.target.value)}
                          className="text-[13px] font-medium px-2.5 py-1.5 rounded-[8px]"
                          style={{ border: "0.5px solid rgba(60,60,67,0.18)", color: "#1C1C1E", background: "#fff" }}
                        />
                        <span className="text-[12px]" style={{ color: "#8E8E93" }}>até</span>
                        <input
                          type="time"
                          value={dia.fim}
                          onChange={(e) => atualizarHorario(idx, idxDia, "fim", e.target.value)}
                          className="text-[13px] font-medium px-2.5 py-1.5 rounded-[8px]"
                          style={{ border: "0.5px solid rgba(60,60,67,0.18)", color: "#1C1C1E", background: "#fff" }}
                        />
                      </div>
                    ) : (
                      <span className="text-[12px] font-semibold pr-2" style={{ color: "#AEAEB2" }}>
                        Fechado
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Política de cancelamento */}
            <div>
              <label style={labelStyle}>
                Política de cancelamento
                <span className="ml-1 text-[11px] font-normal" style={{ color: "#8E8E93" }}>
                  (máx. 500 caracteres)
                </span>
              </label>
              <textarea
                value={end.politica_cancelamento}
                maxLength={500}
                onChange={(e) => {
                  if (e.target.value.length <= 500) atualizarEndereco(idx, "politica_cancelamento", e.target.value);
                }}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
              <p className="text-[11px] mt-1 text-right" style={{ color: "#8E8E93" }}>
                {end.politica_cancelamento.length}/500
              </p>
            </div>

            {/* Observações */}
            <div>
              <label style={labelStyle}>
                Observações
                <span className="ml-1 text-[11px] font-normal" style={{ color: "#8E8E93" }}>
                  (opcional · máx. 500 caracteres)
                </span>
              </label>
              <textarea
                value={end.observacoes}
                maxLength={500}
                onChange={(e) => {
                  if (e.target.value.length <= 500) atualizarEndereco(idx, "observacoes", e.target.value);
                }}
                rows={2}
                placeholder="Informações adicionais para os pacientes..."
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
              <p className="text-[11px] mt-1 text-right" style={{ color: "#8E8E93" }}>
                {end.observacoes.length}/500
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Botão adicionar endereço (máx. 8) */}
      {enderecos.length < 8 && (
        <button
          onClick={adicionarEndereco}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-[16px] font-semibold text-[14px] min-h-[56px] transition-all duration-200"
          style={{
            border: "1.5px dashed rgba(0,122,255,0.30)",
            color: "#007AFF",
            background: "rgba(0,122,255,0.04)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,122,255,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,122,255,0.04)"; }}
        >
          <Plus size={18} />
          Adicionar endereço ({enderecos.length}/8)
        </button>
      )}

      {renderNavegacao(enderecos.length > 0 && validarEnderecos(enderecos).valido, false, false, salvarEtapa4NoBanco)}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERIZAÇÃO DA ETAPA 5 — BIO
  // ─────────────────────────────────────────────────────────────────────────
  const renderEtapa5 = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-bold mb-1" style={{ color: "#0A2A66" }}>Sua bio profissional</h2>
        <p className="text-[14px]" style={{ color: "#8E8E93" }}>Opcional — ajuda pacientes a conhecerem seu trabalho</p>
      </div>

      <div
        className="flex items-start gap-2 p-3 rounded-[12px]"
        style={{ background: "rgba(0,122,255,0.06)", border: "0.5px solid rgba(0,122,255,0.15)" }}
      >
        <Info size={14} style={{ color: "#007AFF", marginTop: "2px", flexShrink: 0 }} />
        <p className="text-[13px]" style={{ color: "#007AFF", lineHeight: 1.6 }}>
          Uma boa bio aumenta a taxa de contato dos pacientes. Conte sobre sua experiência, formação e diferenciais.
        </p>
      </div>

      <div>
        <label style={{ ...labelStyle, marginBottom: "8px" }}>
          Bio (opcional)
          <span className="ml-1 text-[11px] font-normal" style={{ color: "#8E8E93" }}>
            (máx. 500 caracteres)
          </span>
        </label>
        <textarea
          value={bio}
          maxLength={500}
          onChange={(e) => {
            if (e.target.value.length <= 500) setBio(e.target.value);
          }}
          rows={6}
          placeholder="Ex: Especialista em odontologia estética com mais de 10 anos de experiência. Formado pela USP, com pós-graduação em Harmonização Orofacial..."
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
        />
        <p className="text-[12px] mt-1 text-right" style={{ color: "#8E8E93" }}>
          {bio.length}/500
        </p>
      </div>

      <div>
        <label style={{ ...labelStyle, marginBottom: "8px" }}>
          Instagram (opcional)
        </label>
        <div
          className="flex items-center gap-0 rounded-[12px] overflow-hidden"
          style={{ border: "1px solid rgba(60,60,67,0.18)", background: "#fff" }}
        >
          <span
            className="flex-shrink-0 text-[13px] px-3 py-3"
            style={{ color: "#8E8E93", background: "#F2F2F7", borderRight: "1px solid rgba(60,60,67,0.12)", fontFamily: "monospace" }}
          >
            {INSTAGRAM_BASE}
          </span>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value.replace(/[^a-zA-Z0-9_.@-]/g, ""))}
            placeholder="@seu-perfil"
            style={{ ...inputStyle, border: "none", borderRadius: 0, padding: "12px 12px" }}
          />
        </div>
      </div>

      {renderNavegacao(true, false, false, salvarEtapa5NoBanco)}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERIZAÇÃO DA ETAPA 6 — CONSENTIMENTO LGPD
  // ─────────────────────────────────────────────────────────────────────────
  const renderEtapa6 = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-bold mb-1" style={{ color: "#0A2A66" }}>Consentimento e privacidade</h2>
        <p className="text-[14px]" style={{ color: "#8E8E93" }}>Revise e aceite os termos para concluir o cadastro</p>
      </div>

      {/* Card de resumo */}
      <div
        className="p-4 rounded-[16px] flex flex-col gap-3"
        style={{ background: "rgba(52,199,89,0.06)", border: "0.5px solid rgba(52,199,89,0.20)" }}
      >
        <p className="text-[13px] font-semibold" style={{ color: "#34C759" }}>Resumo do cadastro</p>
        <div className="flex flex-col gap-1.5">
          {[
            { label: "Nome para exibição", valor: nome || "—", ok: !!nome },
            { label: "Nome completo (CRO)", valor: nomeCompleto || "—", ok: !!nomeCompleto },
            { label: "E-mail", valor: email, ok: emailVerificado },
            { label: "Telefone", valor: telefone || "Não informado", ok: !telefone || validarTelefone(telefone) },
            { label: "CRO", valor: cro || "—", ok: !!cro },
            { label: "CPF", valor: cpf ? "Informado" : "—", ok: !!cpf },
            { label: "Endereços", valor: `${enderecos.length} cadastrado(s)`, ok: enderecos.length > 0 },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: "#3A3A3C" }}>{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium" style={{ color: "#1C1C1E" }}>{item.valor}</span>
                {item.ok
                  ? <Check size={13} style={{ color: "#34C759" }} />
                  : <AlertCircle size={13} style={{ color: "#FF9500" }} />
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checkbox LGPD */}
      <label
        className="flex items-start gap-3 cursor-pointer p-4 rounded-[14px] transition-colors"
        style={{
          border: lgpdAceito ? "1px solid rgba(52,199,89,0.30)" : "1px solid rgba(60,60,67,0.15)",
          background: lgpdAceito ? "rgba(52,199,89,0.04)" : "rgba(60,60,67,0.02)",
        }}
      >
        <input
          type="checkbox"
          checked={lgpdAceito}
          onChange={(e) => setLgpdAceito(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-[#34C759] cursor-pointer flex-shrink-0"
        />
        <span className="text-[14px]" style={{ color: "#3A3A3C", lineHeight: 1.7 }}>
          Li e concordo com a{" "}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: "#007AFF" }}>
            Política de Privacidade
          </a>{" "}
          e os{" "}
          <a href="/termos" target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: "#007AFF" }}>
            Termos de Uso
          </a>{" "}
          do CuraDentes Pro, incluindo o tratamento dos meus dados conforme a LGPD (Lei nº 13.709/2018).{" "}
          <span className="font-semibold" style={{ color: "#E6004C" }}>*</span>
        </span>
      </label>

      {renderNavegacao(lgpdAceito, true)}
    </div>
  );

  // ─── Mapa das etapas para suas funções de renderização ────────────────────
  const renderEtapa = () => {
    switch (etapa) {
      case 1: return renderEtapa1();
      case 2: return renderEtapa2();
      case 3: return renderEtapa3();
      case 4: return renderEtapa4();
      case 5: return renderEtapa5();
      case 6: return renderEtapa6();
      default: return null;
    }
  };

  // ─── Layout principal ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>

      {/* Topo fixo com logo */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "0.5px solid rgba(60,60,67,0.10)",
        }}
      >
        <div className="container mx-auto px-5 md:px-8 max-w-3xl">
          <div className="flex items-center justify-between h-[60px]">
            <img src={LOGO_PRO} alt="CuraDentes Pro" className="h-8 w-auto" />
            <span className="text-[13px]" style={{ color: "#8E8E93" }}>
              Etapa {etapa} de {ETAPAS.length}
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo do formulário */}
      <main className="container mx-auto px-5 md:px-8 max-w-3xl py-8">
        {/* Barra de progresso */}
        {renderBarraProgresso()}

        {/* Card do formulário */}
        <div
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "24px",
            border: "0.5px solid rgba(255,255,255,0.60)",
            boxShadow: "0 8px 32px rgba(16,24,64,0.08)",
            padding: "clamp(24px, 4vw, 40px)",
          }}
        >
          {renderEtapa()}
        </div>
      </main>

      {/* Modal: cadastro incompleto */}
      {exibirModalIncompleto && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[200] px-4"
          style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-[420px] rounded-[24px] p-7 flex flex-col gap-5"
            style={{
              background: "#fff",
              boxShadow: "0 24px 64px rgba(10,42,102,0.25)",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center w-12 h-12 rounded-full" style={{ background: "rgba(255,149,0,0.10)" }}>
                <AlertCircle size={24} style={{ color: "#FF9500" }} />
              </div>
              <button onClick={() => setExibirModalIncompleto(false)} style={{ color: "#8E8E93" }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <h3 className="text-[19px] font-bold mb-2" style={{ color: "#0A2A66" }}>Cadastro incompleto</h3>
              <p className="text-[14px]" style={{ color: "#3A3A3C", lineHeight: 1.7 }}>
                Sua conta foi criada, mas <strong>não será exibida para os pacientes</strong> até que todas as informações obrigatórias sejam preenchidas.
              </p>
              {camposFaltando.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {camposFaltando.map((campo) => (
                    <li key={campo} className="flex items-center gap-2 text-[13px]" style={{ color: "#FF3B30" }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#FF3B30" }} />
                      {campo}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={() => setExibirModalIncompleto(false)}
                className="w-full py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] transition-all duration-200"
                style={{ background: "#007AFF", color: "#fff" }}
              >
                Completar agora
              </button>
              <button
                onClick={continuarIncompleto}
                className="w-full py-3 rounded-[14px] font-semibold text-[15px] min-h-[48px] transition-all duration-200"
                style={{ background: "rgba(60,60,67,0.06)", color: "#8E8E93" }}
              >
                Ir para o painel assim mesmo
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
