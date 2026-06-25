"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// CADASTRO DO DENTISTA — /cadastro (wizard de 6 etapas, Client Component).
//
// Fica FORA de /pro de propósito: o dentista começa ANÔNIMO (ainda não tem conta).
// A Etapa 1 verifica o e-mail por código (OTP de 8 dígitos), o que CRIA a sessão;
// a senha é definida em seguida (updateUser). A partir daí o dentista está logado e
// o cadastro salva PROGRESSIVAMENTE no banco a cada etapa. O perfil só fica público
// quando o LGPD é aceito (Etapa 6). Ao reabrir com sessão, retoma de onde parou.
//
// Reusa as validações (lib/validacao), o editor de endereços (EnderecosEditor) e o
// geocoding na conclusão. Portado do site-k11 (NovoCadastro.tsx).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, Eye, EyeOff, Check, Upload, Shield, AlertCircle, X,
  Mail, Phone, User, FileText, Info, Loader2,
} from "lucide-react";
import EnderecosEditor, { novoEndereco, DIAS_SEMANA, POLITICA_PADRAO, type EnderecoForm } from "@/components/pro/EnderecosEditor";
import type { EnderecoRow } from "@/lib/dentistas";
import { ESPECIALIDADES, nomeAmigavel } from "@/lib/especialidades";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { isSuperuserEmail } from "@/lib/superuser";
import { extrairUserInstagram, formatarInstagram, INSTAGRAM_BASE } from "@/lib/instagram";
import { geocodeEnderecoComFallback } from "@/lib/geocoding";
import {
  validarTelefone, validarCpf, validarCro, validarAnoFormacao, validarEnderecos,
  formatarTelefone, formatarCpf, formatarCro,
} from "@/lib/validacao";
import { forcaSenha, senhaValida } from "@/lib/senha";

// Etapas com ícone e label (estilo k11: indicador circular + label embaixo).
const ETAPAS = [
  { id: 1, label: "Conta", icone: User },
  { id: 2, label: "Telefone", icone: Phone },
  { id: 3, label: "Identidade", icone: Shield },
  { id: 4, label: "Endereços", icone: FileText },
  { id: 5, label: "Bio", icone: FileText },
  { id: 6, label: "Consentimento", icone: Check },
] as const;

// ─── Estilos inline copiados verbatim do k11 ──────────────────────────────────
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

// Normaliza a agenda do banco (aceita os dois formatos de chave) para 7 dias fixos.
function normalizarAgenda(raw: unknown) {
  const arr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  return DIAS_SEMANA.map((dia) => {
    const achou = arr.find((a) => (a.dia ?? a.dia_semana) === dia);
    return {
      dia,
      inicio: (achou?.inicio as string) || (achou?.horario_inicio as string) || "08:00",
      fim: (achou?.fim as string) || (achou?.horario_fim as string) || "18:00",
      ativo: achou ? achou.ativo !== false : false,
    };
  });
}

// Converte uma linha de endereço do banco no formato do formulário (sem _isNew).
function rowParaEndereco(e: EnderecoRow): EnderecoForm {
  return {
    id: e.id,
    nome_clinica: e.nome_clinica ?? "",
    logradouro: e.logradouro ?? "",
    numero: e.numero ?? "",
    complemento: e.complemento ?? "",
    bairro: e.bairro ?? "",
    cidade: e.cidade ?? "",
    estado: e.estado ?? "",
    cep: e.cep ?? "",
    telefone: e.telefone ?? "",
    whatsapp: e.whatsapp ?? "",
    atende_urgencias: !!e.atende_urgencias,
    aceita_urgencia_termo: !!(e as { aceita_urgencia_termo?: boolean }).aceita_urgencia_termo,
    estacionamento: !!e.estacionamento,
    atividades: e.atividades ?? [],
    convenios: e.convenios ?? [],
    formas_pagamento: e.formas_pagamento ?? [],
    politica_cancelamento: (e as { politica_cancelamento?: string }).politica_cancelamento ?? POLITICA_PADRAO,
    observacoes: e.observacoes ?? "",
    agenda: normalizarAgenda(e.agenda),
  };
}

export default function CadastroPage() {
  const router = useRouter();
  const supabase = criarClienteNavegador();

  const [carregando, setCarregando] = useState(true);
  const [etapa, setEtapa] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  // Etapa 1 — conta
  const [nome, setNome] = useState("");
  const [tratamento, setTratamento] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [otpEnviado, setOtpEnviado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [emailVerificado, setEmailVerificado] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirma, setMostrarConfirma] = useState(false);
  const [senhaSincronizada, setSenhaSincronizada] = useState(false);

  // Etapas 2/3
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cro, setCro] = useState("");
  const [anoFormacao, setAnoFormacao] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Etapa 3 — Foto: ao escolher o arquivo, grava o dataURL (base64) em
  // sessionStorage e navega para o editor, que abre JÁ com a foto carregada
  // (paridade com o k11, que passava o File via router state).
  function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem("curadentes_foto_pendente", reader.result as string);
      } catch {
        toast.error("Imagem muito grande para abrir no editor. Escolha um arquivo menor.");
        return;
      }
      router.push("/pro/editor-de-fotos");
    };
    reader.readAsDataURL(file);
  }

  // Etapa 4
  const [enderecos, setEnderecos] = useState<EnderecoForm[]>([novoEndereco()]);

  // Etapa 5
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");

  // Etapa 6
  const [lgpd, setLgpd] = useState(false);
  const [cobranca, setCobranca] = useState(false);
  const [prefDesempenho, setPrefDesempenho] = useState(false);
  const [prefNovidades, setPrefNovidades] = useState(false);
  const [prefParceiros, setPrefParceiros] = useState(false);

  // Modal "Cadastro incompleto" (portado do k11): exibido ao concluir com campos
  // obrigatórios faltando, com a lista de pendências e a opção de ir ao painel.
  const [exibirModalIncompleto, setExibirModalIncompleto] = useState(false);

  // ─── Retomada: se já há sessão, carrega o que existe e posiciona na etapa ──────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (isSuperuserEmail(user.email)) {
          router.replace("/pro/dashboard");
          return;
        }
        setUserId(user.id);
        setEmail(user.email ?? "");
        setEmailVerificado(true);
        const { data: pro } = await supabase
          .from("curadentespro")
          .select("nome, tratamento, nome_completo, cro, ano_formacao, foto_url, bio, instagram, especialidade, google_review_url, lgpd_aceito")
          .eq("id", user.id)
          .is("deleted_at", null)
          .maybeSingle();
        if (pro) {
          if (pro.lgpd_aceito) {
            router.replace("/pro/dashboard");
            return;
          }
          setNome(pro.nome ?? "");
          setTratamento(pro.tratamento ?? "");
          setNomeCompleto(pro.nome_completo ?? "");
          // telefone vem por RPC (coluna não é mais legível via REST)
          const { data: tel } = await supabase.rpc("meu_telefone");
          setTelefone(typeof tel === "string" ? tel : "");
          setCro(pro.cro ?? "");
          setAnoFormacao(pro.ano_formacao ? String(pro.ano_formacao) : "");
          setEspecialidade(pro.especialidade ?? "");
          setFotoUrl(pro.foto_url ?? "");
          setBio(pro.bio ?? "");
          setInstagram(extrairUserInstagram(pro.instagram ?? ""));
          setGoogleReviewUrl(pro.google_review_url ?? "");
          setSenhaSincronizada(true);
          const { data: cpfData } = await supabase.rpc("meu_cpf");
          if (typeof cpfData === "string") setCpf(cpfData);

          // IMPORTANTE: recarregar os endereços já salvos. Sem isso, o estado fica
          // num endereço vazio e o save (delete-all + reinsert) APAGARIA os endereços
          // existentes — bug de perda de dados pego no review.
          const { data: ends } = await supabase
            .from("curadentespro_enderecos")
            .select("*")
            .eq("curadentespro_id", user.id);
          if (ends && ends.length > 0) {
            setEnderecos((ends as EnderecoRow[]).map(rowParaEndereco));
          }

          // Preferências de e-mail (para não sobrescrever com tudo desmarcado).
          const { data: prefRow } = await supabase
            .from("curadentespro_email")
            .select("prefs")
            .eq("curadentespro_id", user.id)
            .maybeSingle();
          const prefs = (prefRow?.prefs ?? {}) as { desempenho?: boolean; novidades?: boolean; parceiros?: boolean };
          setPrefDesempenho(!!prefs.desempenho);
          setPrefNovidades(!!prefs.novidades);
          setPrefParceiros(!!prefs.parceiros);

          setEtapa(2);
        }
      }
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Etapa 1: OTP por e-mail ───────────────────────────────────────────────────
  async function enviarCodigo() {
    setErro("");
    if (!email.includes("@")) { setErro("Informe um e-mail válido."); return; }
    setOcupado(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setOcupado(false);
    if (error) { setErro("Não foi possível enviar o código. Tente novamente."); return; }
    setOtpEnviado(true);
  }

  async function verificarCodigo() {
    setErro("");
    if (codigo.trim().length !== 8) { setErro("O código tem 8 dígitos."); return; }
    setOcupado(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: codigo.trim(), type: "email" });
    setOcupado(false);
    if (error || !data.user) { setErro("Código inválido ou expirado."); return; }
    setUserId(data.user.id);
    setEmailVerificado(true);
  }

  async function avancar1() {
    setErro("");
    if (!nome.trim() || !tratamento) { setErro("Preencha o nome e escolha Dr./Dra."); return; }
    if (!emailVerificado || !userId) { setErro("Verifique seu e-mail com o código."); return; }
    // Senha obrigatória só se ainda não sincronizada. Se já sincronizada, validar
    // apenas quando o dentista digitou algo (re-edição opcional).
    const trocandoSenha = !senhaSincronizada || senha.length > 0;
    if (trocandoSenha) {
      if (!senhaValida(senha)) { setErro("A senha precisa ter ao menos 8 caracteres."); return; }
      if (senha !== confirma) { setErro("As senhas não coincidem."); return; }
    }
    setOcupado(true);
    try {
      if (trocandoSenha && senha) {
        const { error: sErr } = await supabase.auth.updateUser({ password: senha });
        if (sErr) throw sErr;
        setSenhaSincronizada(true);
      }
      const { error } = await supabase.from("curadentespro").upsert(
        { id: userId, user_id: userId, nome, tratamento: tratamento || null, nome_completo: nomeCompleto, email: email.trim() },
        { onConflict: "id" },
      );
      if (error) throw error;
      setEtapa(2);
    } catch (e) {
      setErro(traduzErro(e, "Não foi possível salvar a etapa."));
    } finally {
      setOcupado(false);
    }
  }

  // ─── Saves das etapas 2..5 (row já existe) ─────────────────────────────────────
  async function avancar2() {
    setErro("");
    // Telefone é OPCIONAL: só bloqueia se houver algo digitado em formato inválido.
    if (telefone.trim() && !validarTelefone(telefone)) { setErro("Telefone inválido (DDD + 9 dígitos)."); return; }
    await salvar({ telefone }, 3);
  }
  async function avancar3() {
    setErro("");
    if (!validarCpf(cpf)) { setErro("CPF inválido."); return; }
    if (!validarCro(cro)) { setErro("CRO inválido (ex.: CRO-SP12345)."); return; }
    if (!validarAnoFormacao(anoFormacao)) { setErro("Ano de formação inválido."); return; }
    if (!especialidade) { setErro("Escolha sua especialidade principal."); return; }
    setOcupado(true);
    try {
      const { error } = await supabase.from("curadentespro").update({ cro, ano_formacao: anoFormacao ? parseInt(anoFormacao, 10) : null, especialidade }).eq("id", userId!);
      if (error) throw error;
      const { error: cpfErr } = await supabase.from("curadentespro_cpf").upsert({ curadentespro_id: userId, cpf: cpf.replace(/\D/g, "") }, { onConflict: "curadentespro_id" });
      if (cpfErr) throw cpfErr;
      setEtapa(4);
    } catch (e) {
      setErro(traduzErro(e, "Não foi possível salvar a identidade."));
    } finally {
      setOcupado(false);
    }
  }
  async function avancar4() {
    setErro("");
    const v = validarEnderecos(enderecos);
    if (!v.valido) { setErro("Complete os campos obrigatórios: " + v.erros.slice(0, 3).join("; ")); return; }
    setOcupado(true);
    try {
      await persistirEnderecos(false);
      setEtapa(5);
    } catch (e) {
      setErro(traduzErro(e, "Não foi possível salvar os endereços."));
    } finally {
      setOcupado(false);
    }
  }
  async function avancar5() {
    setErro("");
    const instagramUrl = formatarInstagram(instagram);
    if (instagram && !instagramUrl) { setErro("Instagram inválido."); return; }
    await salvar({ bio, instagram: instagramUrl, google_review_url: googleReviewUrl.trim() || null }, 6);
  }

  // "Deixar para depois": salva o que estiver VÁLIDO na etapa atual e vai ao painel
  // (não perde o que o dentista digitou; não grava dado inválido).
  async function deixarParaDepois() {
    setOcupado(true);
    try {
      if (etapa === 2 && validarTelefone(telefone)) {
        await supabase.from("curadentespro").update({ telefone }).eq("id", userId!);
      } else if (etapa === 3 && validarCpf(cpf) && validarCro(cro) && validarAnoFormacao(anoFormacao)) {
        await supabase.from("curadentespro").update({ cro, ano_formacao: anoFormacao ? parseInt(anoFormacao, 10) : null, especialidade: especialidade || null }).eq("id", userId!);
        await supabase.from("curadentespro_cpf").upsert({ curadentespro_id: userId, cpf: cpf.replace(/\D/g, "") }, { onConflict: "curadentespro_id" });
      } else if (etapa === 4 && validarEnderecos(enderecos).valido) {
        await persistirEnderecos(false);
      } else if (etapa === 5) {
        const url = formatarInstagram(instagram);
        if (!instagram || url) await supabase.from("curadentespro").update({ bio, instagram: url, google_review_url: googleReviewUrl.trim() || null }).eq("id", userId!);
      }
    } catch (e) {
      console.warn("[cadastro] salvar parcial:", e);
    }
    router.push("/pro/dashboard");
  }

  // Update genérico + avanço.
  async function salvar(campos: Record<string, unknown>, proxima: number) {
    setOcupado(true);
    try {
      const { error } = await supabase.from("curadentespro").update(campos).eq("id", userId!);
      if (error) throw error;
      setEtapa(proxima);
    } catch (e) {
      setErro(traduzErro(e, "Não foi possível salvar a etapa."));
    } finally {
      setOcupado(false);
    }
  }

  // Endereços: apaga todos e reinsere (geocodifica só na conclusão).
  async function persistirEnderecos(comGeo: boolean) {
    const { error: delErr } = await supabase.from("curadentespro_enderecos").delete().eq("curadentespro_id", userId!);
    if (delErr) throw delErr; // não seguir para o insert se o delete falhou (evita duplicar)
    for (const end of enderecos) {
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (comGeo && end.cidade) {
        const coord = await geocodeEnderecoComFallback(end);
        if (coord) { latitude = coord.latitude; longitude = coord.longitude; }
      }
      const { error } = await supabase.from("curadentespro_enderecos").insert({
        curadentespro_id: userId,
        nome_clinica: end.nome_clinica, logradouro: end.logradouro, numero: end.numero,
        complemento: end.complemento, bairro: end.bairro, cidade: end.cidade, estado: end.estado,
        cep: end.cep, telefone: end.telefone, whatsapp: end.whatsapp,
        atende_urgencias: end.atende_urgencias, aceita_urgencia_termo: end.aceita_urgencia_termo,
        estacionamento: end.estacionamento, atividades: end.atividades, convenios: end.convenios,
        formas_pagamento: end.formas_pagamento, politica_cancelamento: end.politica_cancelamento,
        observacoes: end.observacoes, agenda: end.agenda, latitude, longitude,
      });
      if (error) throw error;
    }
  }

  // Lista de campos obrigatórios pendentes (portado do k11). Telefone é OPCIONAL —
  // só conta como pendência se foi digitado em formato inválido.
  function camposFaltantes(): string[] {
    const faltando: string[] = [];
    if (!nome.trim()) faltando.push("Nome para exibição");
    if (!nomeCompleto.trim()) faltando.push("Nome completo (para verificação do CRO)");
    if (!emailVerificado) faltando.push("Verificação de e-mail");
    const precisaSenha = !senhaSincronizada || senha.length > 0;
    if (precisaSenha && !senhaValida(senha)) faltando.push("Senha (mín. 8 caracteres)");
    if (telefone.trim() && !validarTelefone(telefone)) faltando.push("Telefone");
    if (!validarCpf(cpf)) faltando.push("CPF");
    if (!validarCro(cro)) faltando.push("CRO");
    if (!lgpd) faltando.push("Aceite da LGPD");
    if (!cobranca) faltando.push("Ciência da cobrança a partir de 01/07/2027");
    const { valido: endOk, erros: endErros } = validarEnderecos(enderecos);
    if (!endOk) faltando.push(...endErros);
    return faltando;
  }
  const camposFaltando = camposFaltantes();

  // Vai para o painel mesmo com o cadastro incompleto (o perfil não fica público).
  function continuarIncompleto() {
    setExibirModalIncompleto(false);
    router.push("/pro/dashboard");
  }

  async function concluir() {
    setErro("");
    // Se faltarem obrigatórios, abre o modal de pendências em vez de só barrar.
    if (camposFaltantes().length > 0) { setExibirModalIncompleto(true); return; }
    if (!lgpd) { setErro("É preciso aceitar os termos (LGPD) para concluir."); return; }
    if (!cobranca) { setErro("Confirme que está ciente do aviso de cobrança futura."); return; }
    setOcupado(true);
    try {
      // ORDEM IMPORTA (review): gravar os endereços (com geocoding) ANTES de tornar
      // o perfil público. Se o insert falhasse depois do lgpd_aceito=true, o perfil
      // apareceria na busca sem nenhum endereço.
      await persistirEnderecos(true);

      const { error: prefErr } = await supabase.from("curadentespro_email").upsert(
        { curadentespro_id: userId, prefs: { desempenho: prefDesempenho, novidades: prefNovidades, parceiros: prefParceiros } },
        { onConflict: "curadentespro_id" },
      );
      if (prefErr) console.warn("[cadastro] prefs e-mail:", prefErr.message);

      // Por último: marca o cadastro como completo (passa a ser público).
      const { error } = await supabase
        .from("curadentespro")
        .update({ lgpd_aceito: true, cobranca_aviso_aceita: true, cobranca_aviso_aceita_em: new Date().toISOString() })
        .eq("id", userId!);
      if (error) throw error;

      router.replace("/pro/dashboard");
      router.refresh();
    } catch (e) {
      setErro(traduzErro(e, "Não foi possível concluir o cadastro."));
      setOcupado(false);
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
        <div className="container mx-auto max-w-3xl px-5 py-20 text-center text-ink-muted">Carregando…</div>
      </div>
    );
  }

  const forca = forcaSenha(senha);
  const progresso = ((etapa - 1) / (ETAPAS.length - 1)) * 100;
  // Sinaliza obrigatórios pendentes em laranja só quando há algum progresso depois.
  const temProgressoPosterior = !!(
    telefone || cpf || cro || anoFormacao || fotoUrl || bio ||
    enderecos.some((end) => end.nome_clinica.trim() || end.logradouro.trim() || end.cep.trim())
  );

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
      {/* Header sticky do wizard (logo + "Etapa N de 6") */}
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
        <div className="container mx-auto max-w-3xl px-5 md:px-8">
          <div className="flex items-center justify-between" style={{ height: "60px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo-pro.png" alt="CuraDentes Pro" className="h-8 w-auto" />
            <span className="text-[13px]" style={{ color: "#8E8E93" }}>
              Etapa {etapa} de {ETAPAS.length}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-5 md:px-8 py-8">
        {/* ─── Stepper: indicadores circulares (32px) + label embaixo ─── */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            {ETAPAS.map((e) => {
              const concluida = e.id < etapa;
              const atual = etapa === e.id;
              const podeNavegar = e.id < etapa && !ocupado;
              const bgColor = concluida ? "#34C759" : atual ? "#007AFF" : "#C7C7CC";
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={!podeNavegar}
                  onClick={() => { if (podeNavegar) { setErro(""); setEtapa(e.id); } }}
                  aria-current={atual ? "step" : undefined}
                  className="flex flex-1 flex-col items-center gap-1 transition-opacity"
                  style={{ cursor: podeNavegar ? "pointer" : "default", opacity: podeNavegar || atual ? 1 : 0.5, background: "none", border: "none", padding: 0 }}
                >
                  <div
                    className="flex items-center justify-center rounded-full text-[12px] font-bold transition-all duration-300"
                    style={{
                      width: "32px",
                      height: "32px",
                      background: bgColor,
                      color: "#fff",
                      border: atual ? "2px solid #ffffff" : "none",
                      boxShadow: atual ? "0 0 0 4px rgba(0, 122, 255, 0.25)" : "none",
                    }}
                  >
                    {concluida ? <Check size={14} /> : <span className="text-[13px] font-bold">{e.id}</span>}
                  </div>
                  <span
                    className="hidden text-center text-[10px] sm:block"
                    style={{ color: concluida ? "#34C759" : atual ? "#007AFF" : "#8E8E93", fontWeight: atual ? "bold" : 600 }}
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

        {erro && <p className="mb-5 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}

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
          {/* ── Etapa 1: Conta ── */}
          {etapa === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="mb-1 text-[22px] font-bold" style={{ color: "#0A2A66" }}>Criar sua conta</h1>
                <p className="text-[14px]" style={{ color: "#8E8E93" }}>Informações básicas de acesso à plataforma</p>
              </div>

              <div>
                <label style={labelStyle}>Nome para exibição *</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} placeholder="João Silva" />
              </div>

              <div>
                <label style={labelStyle}>Como aparece no seu perfil *</label>
                <div className="flex gap-2">
                  {(["Dr.", "Dra."] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTratamento(t)}
                      className="flex-1 rounded-[12px] py-2.5 text-[14px] font-semibold transition-all"
                      style={tratamento === t
                        ? { background: "#007AFF", color: "#fff" }
                        : { background: "rgba(60,60,67,0.06)", color: "#3A3A3C", border: "0.5px solid rgba(60,60,67,0.12)" }}
                    >
                      {t} {nome.trim() ? nome.trim().split(" ")[0] : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  <span className="flex items-center gap-1.5">
                    <Shield size={13} />
                    Nome completo (para verificação do CRO) *
                  </span>
                </label>
                <input value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} style={inputStyle} placeholder="João Silva Santos (igual ao documento)" />
                <p className="mt-1 text-[11px]" style={{ color: "#8E8E93" }}>
                  Este nome será usado para conferência com o CRO no sistema CFO e não poderá ser alterado depois.
                </p>
              </div>

              {/* E-mail + OTP */}
              <div>
                <label style={labelStyle}>
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} />
                    E-mail *
                    {emailVerificado && (
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(52,199,89,0.10)", color: "#34C759" }}>
                        <Check size={10} /> Verificado
                      </span>
                    )}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      // Reeditar o e-mail destrava a verificação: zera os flags para
                      // o dentista reenviar/reconfirmar o código (paridade k11).
                      setEmail(e.target.value);
                      if (emailVerificado) setEmailVerificado(false);
                      if (otpEnviado) setOtpEnviado(false);
                      setCodigo("");
                    }}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="seu@email.com.br"
                  />
                  {!emailVerificado && (
                    <button
                      onClick={enviarCodigo}
                      disabled={ocupado || !email.includes("@")}
                      className="flex-shrink-0 rounded-[12px] px-4 py-3 text-[13px] font-semibold text-white transition-all duration-200"
                      style={{ background: email.includes("@") && !ocupado ? "#007AFF" : "rgba(0,122,255,0.25)", cursor: email.includes("@") ? "pointer" : "not-allowed", minHeight: "44px" }}
                    >
                      {otpEnviado ? "Reenviar" : "Enviar código"}
                    </button>
                  )}
                </div>

                {otpEnviado && !emailVerificado && (
                  <div className="mt-3 flex flex-col gap-3 rounded-[12px] p-4" style={{ background: "rgba(0,122,255,0.06)", border: "0.5px solid rgba(0,122,255,0.15)" }}>
                    <p className="text-[13px]" style={{ color: "#007AFF" }}>
                      Enviamos um código de 8 dígitos para <strong>{email}</strong>. Verifique sua caixa de entrada.
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="00000000"
                        className="text-center text-[20px] font-bold tracking-[0.3em]"
                        style={{ ...inputStyle, flex: 1, letterSpacing: "0.3em" }}
                      />
                      <button
                        onClick={verificarCodigo}
                        disabled={ocupado || codigo.length !== 8}
                        className="flex-shrink-0 rounded-[12px] px-4 py-3 text-[13px] font-semibold text-white transition-all duration-200"
                        style={{ background: codigo.length === 8 && !ocupado ? "#34C759" : "rgba(52,199,89,0.4)", cursor: codigo.length === 8 ? "pointer" : "not-allowed" }}
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

              {/* Senha. Quando já sincronizada (retomada de cadastro), a seção
                  continua visível com placeholder indicando que a senha está
                  salva — deixar em branco mantém a senha; digitar algo a troca. */}
              <>
                <div>
                  <label style={labelStyle}>Senha {senhaSincronizada ? "" : "*"}</label>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder={senhaSincronizada ? "Sua senha já está salva (deixe em branco para manter)" : "Mínimo 8 caracteres"}
                      autoComplete="new-password"
                      style={{ ...inputStyle, paddingRight: "48px" }}
                    />
                    <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8E8E93" }}>
                      {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {senha.length > 0 && (
                    <div className="mt-2">
                      <div className="mb-1 flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: "4px",
                              borderRadius: "2px",
                              background: i < forca.nivel ? forca.cor : "rgba(60,60,67,0.10)",
                              transition: "background 0.3s ease",
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-[12px] font-medium" style={{ color: forca.nivel > 0 ? forca.cor : "#8E8E93" }}>
                        {forca.nivel > 0 ? forca.rotulo : ""}
                      </p>
                    </div>
                  )}
                </div>
                {/* Confirmação só faz sentido ao definir/trocar a senha. */}
                {(!senhaSincronizada || senha.length > 0) && (
                  <div>
                    <label style={labelStyle}>Confirmar senha {senhaSincronizada ? "" : "*"}</label>
                    <div className="relative">
                      <input
                        type={mostrarConfirma ? "text" : "password"}
                        value={confirma}
                        onChange={(e) => setConfirma(e.target.value)}
                        placeholder="Repita a senha"
                        autoComplete="new-password"
                        style={{ ...inputStyle, paddingRight: "48px", borderColor: confirma && confirma !== senha ? "#FF3B30" : undefined }}
                      />
                      <button type="button" onClick={() => setMostrarConfirma(!mostrarConfirma)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8E8E93" }}>
                        {mostrarConfirma ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {confirma && confirma !== senha && (
                      <p className="mt-1 text-[12px]" style={{ color: "#FF3B30" }}>As senhas não coincidem.</p>
                    )}
                  </div>
                )}
              </>

              {/* Navegação Etapa 1 (sem "Deixar para depois" — e-mail deve ser verificado) */}
              <NavEtapa
                voltarLabel="Cancelar"
                onVoltar={() => router.push("/")}
                onAvancar={avancar1}
                ocupado={ocupado}
                podeAvancar={nome.trim() !== "" && emailVerificado && (
                  senhaSincronizada
                    ? (senha.length === 0 || (senha.length >= 8 && senha === confirma))
                    : (senha.length >= 8 && senha === confirma)
                )}
              />
            </div>
          )}

          {/* ── Etapa 2: Telefone ── */}
          {etapa === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="mb-1 text-[22px] font-bold" style={{ color: "#0A2A66" }}>Telefone de contato</h1>
                <p className="text-[14px]" style={{ color: "#8E8E93" }}>
                  Usaremos para notificações e segurança da conta.
                  A verificação por SMS/WhatsApp será habilitada em uma versão futura — por enquanto o campo é opcional.
                </p>
              </div>
              <div>
                <label style={labelStyle}>
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} />
                    Número de telefone (opcional)
                    {validarTelefone(telefone) && (
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(52,199,89,0.10)", color: "#34C759" }}>
                        <Check size={10} /> Válido
                      </span>
                    )}
                  </span>
                </label>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                  placeholder="(11) 99999-8888"
                  maxLength={15}
                  style={{
                    ...inputStyle,
                    borderColor: temProgressoPosterior && !validarTelefone(telefone)
                      ? "#FF9500"
                      : (telefone.replace(/\D/g, "").length === 11 && !validarTelefone(telefone) ? "#FF3B30" : "rgba(60,60,67,0.18)"),
                    boxShadow: temProgressoPosterior && !validarTelefone(telefone) ? "0 0 0 3px rgba(255,149,0,0.15)" : undefined,
                  }}
                />
                {temProgressoPosterior && !validarTelefone(telefone) && (
                  <p className="mt-1 text-[12px] font-medium" style={{ color: "#FF9500" }}>
                    Telefone obrigatório pendente. Insira um celular válido (ex.: (11) 99999-9999).
                  </p>
                )}
                {telefone.replace(/\D/g, "").length === 11 && !validarTelefone(telefone) && !temProgressoPosterior && (
                  <p className="mt-1 text-[12px]" style={{ color: "#FF3B30" }}>
                    Número inválido. O celular deve conter DDD e começar com 9.
                  </p>
                )}
                <p className="mt-1 text-[12px]" style={{ color: "#8E8E93" }}>
                  Opcional. Formato: DDD + 9 dígitos (ex.: (11) 99999-9999).
                </p>
              </div>
              <NavEtapa onVoltar={() => setEtapa(1)} onAvancar={avancar2} onDepois={deixarParaDepois} ocupado={ocupado} podeAvancar />
            </div>
          )}

          {/* ── Etapa 3: Identidade ── */}
          {etapa === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="mb-1 text-[22px] font-bold" style={{ color: "#0A2A66" }}>Identidade profissional</h1>
                <p className="text-[14px]" style={{ color: "#8E8E93" }}>Seus dados profissionais garantem a credibilidade do seu perfil</p>
              </div>

              {/* Foto de perfil */}
              <div>
                <label style={labelStyle}>Foto de perfil</label>
                <div className="flex items-center gap-4">
                  <div
                    className="flex flex-shrink-0 items-center justify-center overflow-hidden"
                    style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(0,122,255,0.08)", border: "2px dashed rgba(0,122,255,0.25)" }}
                  >
                    {fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoUrl} alt="Foto" className="h-full w-full object-cover" />
                    ) : (
                      <User size={28} style={{ color: "rgba(0,122,255,0.40)" }} />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-semibold transition-all duration-200"
                      style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF", border: "0.5px solid rgba(0,122,255,0.20)", minHeight: "40px" }}
                    >
                      <Upload size={14} />
                      Fazer upload
                    </button>
                    <p className="text-[12px]" style={{ color: "#8E8E93" }}>JPG, PNG ou WEBP · máx. 5 MB</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={escolherFoto}
                />
              </div>

              {/* CPF */}
              <div>
                <label style={labelStyle}>CPF *</label>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  style={{
                    ...inputStyle,
                    borderColor: temProgressoPosterior && !validarCpf(cpf)
                      ? "#FF9500"
                      : (cpf.length === 14 && !validarCpf(cpf) ? "#FF3B30" : "rgba(60,60,67,0.18)"),
                    boxShadow: temProgressoPosterior && !validarCpf(cpf) ? "0 0 0 3px rgba(255,149,0,0.15)" : undefined,
                  }}
                />
                {temProgressoPosterior && !validarCpf(cpf) && (
                  <p className="mt-1 text-[12px] font-medium" style={{ color: "#FF9500" }}>CPF obrigatório pendente. Informe um CPF válido.</p>
                )}
                {cpf.length === 14 && !validarCpf(cpf) && !temProgressoPosterior && (
                  <p className="mt-1 text-[12px]" style={{ color: "#FF3B30" }}>CPF inválido. Verifique os dígitos digitados.</p>
                )}
              </div>

              {/* CRO */}
              <div>
                <label style={labelStyle}>
                  <span className="flex items-center gap-1.5">
                    <Shield size={13} />
                    CRO (Conselho Regional de Odontologia) *
                  </span>
                </label>
                <input
                  value={cro}
                  onChange={(e) => setCro(formatarCro(e.target.value))}
                  placeholder="CRO-SP123456"
                  maxLength={12}
                  style={{
                    ...inputStyle,
                    borderColor: temProgressoPosterior && !validarCro(cro)
                      ? "#FF9500"
                      : (cro.length > 4 && !validarCro(cro) ? "#FF3B30" : "rgba(60,60,67,0.18)"),
                    boxShadow: temProgressoPosterior && !validarCro(cro) ? "0 0 0 3px rgba(255,149,0,0.15)" : undefined,
                  }}
                />
                {temProgressoPosterior && !validarCro(cro) && (
                  <p className="mt-1 text-[12px] font-medium" style={{ color: "#FF9500" }}>CRO obrigatório pendente. Informe o CRO no formato CRO-SP123456.</p>
                )}
                {cro.length > 4 && !validarCro(cro) && !temProgressoPosterior && (
                  <p className="mt-1 text-[12px]" style={{ color: "#FF3B30" }}>CRO inválido. Deve conter sigla do estado e 3 a 6 números (ex: CRO-SP123456).</p>
                )}
                <p className="mt-1 text-[12px]" style={{ color: "#8E8E93" }}>Formato: CRO-UF seguido do número de registro</p>
              </div>

              {/* Ano de formação */}
              <div>
                <label style={labelStyle}>Ano de formação (opcional)</label>
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

              {/* Especialidade principal (campo próprio do dentista, aparece junto ao nome no site) */}
              <div>
                <label style={labelStyle}>Especialidade principal *</label>
                <select
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: temProgressoPosterior && !especialidade ? "#FF9500" : "rgba(60,60,67,0.18)",
                    boxShadow: temProgressoPosterior && !especialidade ? "0 0 0 3px rgba(255,149,0,0.15)" : undefined,
                  }}
                >
                  <option value="" disabled>Selecione sua especialidade</option>
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp} value={esp}>{nomeAmigavel(esp)}</option>
                  ))}
                </select>
                <p className="mt-1 text-[12px]" style={{ color: "#8E8E93" }}>
                  É a especialidade que aparece junto ao seu nome no site. As atividades de cada local você escolhe no próximo passo.
                </p>
                {temProgressoPosterior && !especialidade && (
                  <p className="mt-1 text-[12px] font-medium" style={{ color: "#FF9500" }}>Especialidade obrigatória pendente.</p>
                )}
              </div>

              <NavEtapa onVoltar={() => setEtapa(2)} onAvancar={avancar3} onDepois={deixarParaDepois} ocupado={ocupado} podeAvancar={validarCpf(cpf) && validarCro(cro) && !!especialidade} />
            </div>
          )}

          {/* ── Etapa 4: Endereços ── */}
          {etapa === 4 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="mb-1 text-[22px] font-bold" style={{ color: "#0A2A66" }}>Locais de atendimento</h1>
                <p className="text-[14px]" style={{ color: "#8E8E93" }}>
                  Cadastre de 1 a 8 endereços. Você poderá editar essas informações após o cadastro.
                </p>
              </div>
              <EnderecosEditor
                enderecos={enderecos}
                onChange={setEnderecos}
                mostrarPendencias={temProgressoPosterior}
                onSalvarProgresso={async () => {
                  // Salva o progresso dos endereços sem geocodificar (a geocodificação
                  // roda só na conclusão). Persiste apenas se válidos — caso contrário
                  // o EnderecosEditor mostra só o feedback visual local.
                  if (userId && validarEnderecos(enderecos).valido) {
                    await persistirEnderecos(false);
                  }
                }}
              />
              <NavEtapa onVoltar={() => setEtapa(3)} onAvancar={avancar4} onDepois={deixarParaDepois} ocupado={ocupado} podeAvancar={enderecos.length > 0 && validarEnderecos(enderecos).valido} />
            </div>
          )}

          {/* ── Etapa 5: Bio ── */}
          {etapa === 5 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="mb-1 text-[22px] font-bold" style={{ color: "#0A2A66" }}>Sua bio profissional</h1>
                <p className="text-[14px]" style={{ color: "#8E8E93" }}>Opcional — ajuda pacientes a conhecerem seu trabalho</p>
              </div>

              <div className="flex items-start gap-2 rounded-[12px] p-3" style={{ background: "rgba(0,122,255,0.06)", border: "0.5px solid rgba(0,122,255,0.15)" }}>
                <Info size={14} style={{ color: "#007AFF", marginTop: "2px", flexShrink: 0 }} />
                <p className="text-[13px]" style={{ color: "#007AFF", lineHeight: 1.6 }}>
                  Uma boa bio aumenta a taxa de contato dos pacientes. Conte sobre sua experiência, formação e diferenciais.
                </p>
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: "8px" }}>
                  Bio (opcional)
                  <span className="ml-1 text-[11px] font-normal" style={{ color: "#8E8E93" }}>(máx. 500 caracteres)</span>
                </label>
                <textarea
                  value={bio}
                  maxLength={500}
                  onChange={(e) => { if (e.target.value.length <= 500) setBio(e.target.value); }}
                  rows={6}
                  placeholder="Ex: Especialista em odontologia estética com mais de 10 anos de experiência. Formado pela USP, com pós-graduação em Harmonização Orofacial..."
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                />
                <p className="mt-1 text-right text-[12px]" style={{ color: "#8E8E93" }}>{bio.length}/500</p>
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: "8px" }}>Instagram (opcional)</label>
                <div className="flex items-center gap-0 overflow-hidden rounded-[12px]" style={{ border: "1px solid rgba(60,60,67,0.18)", background: "#fff" }}>
                  <span className="flex-shrink-0 px-3 py-3 text-[13px]" style={{ color: "#8E8E93", background: "#F2F2F7", borderRight: "1px solid rgba(60,60,67,0.12)", fontFamily: "monospace" }}>
                    {INSTAGRAM_BASE}
                  </span>
                  <input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value.replace(/[^a-zA-Z0-9_.@-]/g, ""))}
                    placeholder="@seu-perfil"
                    style={{ ...inputStyle, border: "none", borderRadius: 0, padding: "12px 12px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: "8px" }}>Avaliações no Google (opcional)</label>
                <div className="flex items-stretch gap-2">
                  <input
                    value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                    placeholder="Cole o link de avaliação do seu Google Meu Negócio"
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  />
                  <Link
                    href="/ajuda/avaliacoes-google"
                    target="_blank"
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[13px] font-semibold whitespace-nowrap"
                    style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF", border: "0.5px solid rgba(0,122,255,0.20)" }}
                  >
                    <Info size={14} /> Passo-a-Passo
                  </Link>
                </div>
                <p className="mt-1 text-[12px]" style={{ color: "#8E8E93", lineHeight: 1.5 }}>
                  Depois de avaliarem você aqui, os pacientes verão um botão para avaliar também no Google. Não sabe pegar o link? Veja o <strong>Passo-a-Passo</strong>.
                </p>
              </div>

              <NavEtapa onVoltar={() => setEtapa(4)} onAvancar={avancar5} onDepois={deixarParaDepois} ocupado={ocupado} podeAvancar />
            </div>
          )}

          {/* ── Etapa 6: Conclusão (LGPD) ── */}
          {etapa === 6 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="mb-1 text-[22px] font-bold" style={{ color: "#0A2A66" }}>Consentimento e privacidade</h1>
                <p className="text-[14px]" style={{ color: "#8E8E93" }}>Revise e aceite os termos para concluir o cadastro</p>
              </div>

              {/* Card de resumo do cadastro */}
              <div className="flex flex-col gap-3 rounded-[16px] p-4" style={{ background: "rgba(52,199,89,0.06)", border: "0.5px solid rgba(52,199,89,0.20)" }}>
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
                          : <AlertCircle size={13} style={{ color: "#FF9500" }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checkbox LGPD (verde quando aceito) */}
              <label
                className="flex cursor-pointer items-start gap-3 rounded-[14px] p-4 transition-colors"
                style={{
                  border: lgpd ? "1px solid rgba(52,199,89,0.30)" : "1px solid rgba(60,60,67,0.15)",
                  background: lgpd ? "rgba(52,199,89,0.04)" : "rgba(60,60,67,0.02)",
                }}
              >
                <input type="checkbox" checked={lgpd} onChange={(e) => setLgpd(e.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer accent-[#34C759]" />
                <span className="text-[14px]" style={{ color: "#3A3A3C", lineHeight: 1.7 }}>
                  Li e concordo com a{" "}
                  <Link href="/privacidade" target="_blank" className="font-semibold underline" style={{ color: "#007AFF" }}>Política de Privacidade</Link>{" "}
                  e os{" "}
                  <Link href="/termos" target="_blank" className="font-semibold underline" style={{ color: "#007AFF" }}>Termos de Uso</Link>{" "}
                  do CuraDentes Pro, incluindo o tratamento dos meus dados conforme a LGPD (Lei nº 13.709/2018).{" "}
                  <span className="font-semibold" style={{ color: "#E6004C" }}>*</span>
                </span>
              </label>

              {/* Checkbox cobrança (laranja se não aceito) */}
              <label
                className="flex cursor-pointer items-start gap-3 rounded-[14px] p-4 transition-colors"
                style={{
                  border: cobranca ? "1px solid rgba(52,199,89,0.30)" : "1px solid rgba(255,149,0,0.40)",
                  background: cobranca ? "rgba(52,199,89,0.04)" : "rgba(255,149,0,0.06)",
                }}
              >
                <input type="checkbox" checked={cobranca} onChange={(e) => setCobranca(e.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer accent-[#34C759]" />
                <span className="text-[14px]" style={{ color: "#3A3A3C", lineHeight: 1.7 }}>
                  Estou ciente de que o CuraDentes Pro é gratuito durante o Beta e que, a partir de{" "}
                  <strong>1º de julho de 2027</strong>, passará a ter um plano mensal de{" "}
                  <strong>R$ 49,99 por mês</strong> por dentista. Serei avisado por e-mail com antecedência
                  e nenhum valor será cobrado sem o meu aceite expresso, conforme a seção 5 dos{" "}
                  <Link href="/termos" target="_blank" className="font-semibold underline" style={{ color: "#007AFF" }}>Termos de Uso</Link>.{" "}
                  <span className="font-semibold" style={{ color: "#E6004C" }}>*</span>
                </span>
              </label>

              {/* Preferências de e-mail (opcionais, opt-in) */}
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-semibold" style={{ color: "#0A2A66" }}>
                  Quero receber por e-mail{" "}
                  <span className="font-normal" style={{ color: "#8E8E93" }}>(opcional)</span>
                </p>
                {[
                  { v: prefDesempenho, set: setPrefDesempenho, titulo: "Desempenho do meu perfil", desc: "Resumos de visualizações, contatos e novas avaliações." },
                  { v: prefNovidades, set: setPrefNovidades, titulo: "Novidades e dicas", desc: "Novos recursos, dicas para atrair pacientes e ofertas do CuraDentes." },
                  { v: prefParceiros, set: setPrefParceiros, titulo: "Ofertas de parceiros", desc: "Comunicações de empresas parceiras selecionadas." },
                ].map((opt) => (
                  <label
                    key={opt.titulo}
                    className="flex cursor-pointer items-start gap-3 rounded-[12px] p-3"
                    style={{ border: "1px solid rgba(60,60,67,0.12)", background: "rgba(60,60,67,0.02)" }}
                  >
                    <input type="checkbox" checked={opt.v} onChange={(e) => opt.set(e.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer accent-[#007AFF]" />
                    <span style={{ lineHeight: 1.4 }}>
                      <span className="block text-[14px] font-medium" style={{ color: "#1C1C1E" }}>{opt.titulo}</span>
                      <span className="text-[12px]" style={{ color: "#8E8E93" }}>{opt.desc}</span>
                    </span>
                  </label>
                ))}
                <p className="text-[12px]" style={{ color: "#8E8E93", lineHeight: 1.5 }}>
                  Você pode alterar ou cancelar essas comunicações a qualquer momento. E-mails essenciais
                  (conta, segurança e avisos do serviço) são enviados independentemente desta escolha.
                </p>
              </div>

              {/* Navegação final */}
              <div className="mt-8 flex items-center justify-between pt-6" style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)" }}>
                <button
                  onClick={() => setEtapa(5)}
                  disabled={ocupado}
                  className="flex items-center gap-2 rounded-[12px] px-4 py-3 text-[14px] font-medium transition-all duration-200"
                  style={{ color: "#007AFF", background: "rgba(0,122,255,0.06)", border: "0.5px solid rgba(0,122,255,0.18)", minHeight: "44px" }}
                >
                  <ChevronLeft size={16} />
                  Voltar
                </button>
                <button
                  onClick={concluir}
                  disabled={ocupado || !lgpd || !cobranca}
                  className="flex items-center gap-2 rounded-[14px] px-6 py-3 text-[15px] font-semibold text-white transition-all duration-200"
                  style={{
                    background: lgpd && cobranca && !ocupado ? "#34C759" : "rgba(52,199,89,0.35)",
                    boxShadow: lgpd && cobranca && !ocupado ? "0 4px 16px rgba(52,199,89,0.30)" : "none",
                    cursor: lgpd && cobranca && !ocupado ? "pointer" : "not-allowed",
                    minHeight: "44px",
                  }}
                >
                  {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {ocupado ? "Concluindo…" : "Concluir cadastro"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: "#8E8E93" }}>
          Já tem conta? <Link href="/entrar" className="font-semibold hover:underline" style={{ color: "#007AFF" }}>Entrar</Link>
        </p>
      </main>

      {/* Modal: cadastro incompleto (portado do k11) */}
      {exibirModalIncompleto && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: "rgba(10,42,102,0.45)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="flex w-full max-w-[420px] flex-col gap-5 rounded-[24px] p-7"
            style={{ background: "#fff", boxShadow: "0 24px 64px rgba(10,42,102,0.25)" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(255,149,0,0.10)" }}>
                <AlertCircle size={24} style={{ color: "#FF9500" }} />
              </div>
              <button type="button" onClick={() => setExibirModalIncompleto(false)} style={{ color: "#8E8E93" }} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div>
              <h3 className="mb-2 text-[19px] font-bold" style={{ color: "#0A2A66" }}>Cadastro incompleto</h3>
              <p className="text-[14px]" style={{ color: "#3A3A3C", lineHeight: 1.7 }}>
                Sua conta foi criada, mas <strong>não será exibida para os pacientes</strong> até que todas as informações obrigatórias sejam preenchidas.
              </p>
              {camposFaltando.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {camposFaltando.map((campo) => (
                    <li key={campo} className="flex items-center gap-2 text-[13px]" style={{ color: "#FF3B30" }}>
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "#FF3B30" }} />
                      {campo}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setExibirModalIncompleto(false)}
                className="min-h-[48px] w-full rounded-[14px] py-3 text-[15px] font-semibold transition-all duration-200"
                style={{ background: "#007AFF", color: "#fff" }}
              >
                Completar agora
              </button>
              <button
                type="button"
                onClick={continuarIncompleto}
                className="min-h-[48px] w-full rounded-[14px] py-3 text-[15px] font-semibold transition-all duration-200"
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

// Navegação entre etapas no estilo k11 (Voltar/Cancelar à esquerda; Deixar para
// depois + Continuar à direita).
function NavEtapa({
  onVoltar, onAvancar, onDepois, ocupado, podeAvancar, voltarLabel = "Voltar",
}: {
  onVoltar: () => void;
  onAvancar: () => void;
  onDepois?: () => void;
  ocupado: boolean;
  podeAvancar: boolean;
  voltarLabel?: string;
}) {
  const ehCancelar = voltarLabel === "Cancelar";
  return (
    <div className="mt-8 flex items-center justify-between pt-6" style={{ borderTop: "0.5px solid rgba(60,60,67,0.10)" }}>
      <button
        onClick={onVoltar}
        disabled={ocupado}
        className="flex items-center gap-2 rounded-[12px] px-4 py-3 text-[14px] font-medium transition-all duration-200"
        style={ehCancelar
          ? { color: "#8E8E93", background: "rgba(60,60,67,0.05)", border: "0.5px solid rgba(60,60,67,0.12)", minHeight: "44px" }
          : { color: "#007AFF", background: "rgba(0,122,255,0.06)", border: "0.5px solid rgba(0,122,255,0.18)", minHeight: "44px" }}
      >
        <ChevronLeft size={16} />
        {voltarLabel}
      </button>
      <div className="flex items-center gap-2">
        {onDepois && (
          <button
            onClick={onDepois}
            disabled={ocupado}
            className="rounded-[12px] px-4 py-3 text-[13px] font-medium transition-all duration-200"
            style={{ color: "#8E8E93", background: "transparent", minHeight: "44px" }}
          >
            Deixar para mais tarde
          </button>
        )}
        <button
          onClick={onAvancar}
          disabled={ocupado || !podeAvancar}
          className="flex items-center gap-2 rounded-[14px] px-6 py-3 text-[15px] font-semibold text-white transition-all duration-200"
          style={{
            background: podeAvancar && !ocupado ? "#007AFF" : "rgba(0,122,255,0.30)",
            boxShadow: podeAvancar && !ocupado ? "0 4px 16px rgba(0,122,255,0.28)" : "none",
            cursor: podeAvancar && !ocupado ? "pointer" : "not-allowed",
            minHeight: "44px",
          }}
        >
          {ocupado ? <Loader2 size={16} className="animate-spin" /> : null}
          {ocupado ? "Salvando…" : "Continuar"}
          {!ocupado && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}

// Traduz erros comuns do Postgres (constraint única) em mensagens amigáveis.
function traduzErro(e: unknown, padrao: string): string {
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code;
  if (code === "23505" || /duplicate key|already exists/i.test(msg)) {
    if (/cpf/i.test(msg)) return "Este CPF já está cadastrado.";
    if (/cro/i.test(msg)) return "Este CRO já está cadastrado. Fale com o suporte.";
    if (/email/i.test(msg)) return "Este e-mail já tem cadastro. Faça login.";
    return "Já existe um cadastro com esses dados.";
  }
  return padrao;
}
