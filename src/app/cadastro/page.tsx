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
// geocoding na conclusão. Portado do site-k11 (NovoCadastro.tsx), enxuto.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import EnderecosEditor, { novoEndereco, DIAS_SEMANA, POLITICA_PADRAO, type EnderecoForm } from "@/components/pro/EnderecosEditor";
import type { EnderecoRow } from "@/lib/dentistas";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { isSuperuserEmail } from "@/lib/superuser";
import { extrairUserInstagram, formatarInstagram, INSTAGRAM_BASE } from "@/lib/instagram";
import { geocodeEnderecoComFallback } from "@/lib/geocoding";
import {
  validarTelefone, validarCpf, validarCro, validarAnoFormacao, validarEnderecos,
  formatarTelefone, formatarCpf, formatarCro,
} from "@/lib/validacao";
import { forcaSenha, senhaValida } from "@/lib/senha";

const ETAPAS = ["Conta", "Telefone", "Identidade", "Endereços", "Bio", "Conclusão"];
const labelCls = "mb-1 block text-xs font-semibold text-ink-soft";
const inputCls = "w-full rounded-[10px] border border-black/15 px-3.5 py-2.5 text-sm outline-none focus:border-brand-blue";

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
  const [senhaSincronizada, setSenhaSincronizada] = useState(false);

  // Etapas 2/3
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cro, setCro] = useState("");
  const [anoFormacao, setAnoFormacao] = useState("");

  // Etapa 4
  const [enderecos, setEnderecos] = useState<EnderecoForm[]>([novoEndereco()]);

  // Etapa 5
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");

  // Etapa 6
  const [lgpd, setLgpd] = useState(false);
  const [cobranca, setCobranca] = useState(false);
  const [prefDesempenho, setPrefDesempenho] = useState(false);
  const [prefNovidades, setPrefNovidades] = useState(false);
  const [prefParceiros, setPrefParceiros] = useState(false);

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
          .select("nome, tratamento, nome_completo, telefone, cro, ano_formacao, bio, instagram, lgpd_aceito")
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
          setTelefone(pro.telefone ?? "");
          setCro(pro.cro ?? "");
          setAnoFormacao(pro.ano_formacao ? String(pro.ano_formacao) : "");
          setBio(pro.bio ?? "");
          setInstagram(extrairUserInstagram(pro.instagram ?? ""));
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
    if (!senhaSincronizada) {
      if (!senhaValida(senha)) { setErro("A senha precisa ter ao menos 8 caracteres."); return; }
      if (senha !== confirma) { setErro("As senhas não coincidem."); return; }
    }
    setOcupado(true);
    try {
      if (!senhaSincronizada && senha) {
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
    if (!validarTelefone(telefone)) { setErro("Telefone inválido (DDD + 9 dígitos)."); return; }
    await salvar({ telefone }, 3);
  }
  async function avancar3() {
    setErro("");
    if (!validarCpf(cpf)) { setErro("CPF inválido."); return; }
    if (!validarCro(cro)) { setErro("CRO inválido (ex.: CRO-SP12345)."); return; }
    if (!validarAnoFormacao(anoFormacao)) { setErro("Ano de formação inválido."); return; }
    setOcupado(true);
    try {
      const { error } = await supabase.from("curadentespro").update({ cro, ano_formacao: anoFormacao ? parseInt(anoFormacao, 10) : null }).eq("id", userId!);
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
    await salvar({ bio, instagram: instagramUrl }, 6);
  }

  // "Deixar para depois": salva o que estiver VÁLIDO na etapa atual e vai ao painel
  // (não perde o que o dentista digitou; não grava dado inválido).
  async function deixarParaDepois() {
    setOcupado(true);
    try {
      if (etapa === 2 && validarTelefone(telefone)) {
        await supabase.from("curadentespro").update({ telefone }).eq("id", userId!);
      } else if (etapa === 3 && validarCpf(cpf) && validarCro(cro) && validarAnoFormacao(anoFormacao)) {
        await supabase.from("curadentespro").update({ cro, ano_formacao: anoFormacao ? parseInt(anoFormacao, 10) : null }).eq("id", userId!);
        await supabase.from("curadentespro_cpf").upsert({ curadentespro_id: userId, cpf: cpf.replace(/\D/g, "") }, { onConflict: "curadentespro_id" });
      } else if (etapa === 4 && validarEnderecos(enderecos).valido) {
        await persistirEnderecos(false);
      } else if (etapa === 5) {
        const url = formatarInstagram(instagram);
        if (!instagram || url) await supabase.from("curadentespro").update({ bio, instagram: url }).eq("id", userId!);
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

  async function concluir() {
    setErro("");
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
    return <Container className="py-20 text-center text-ink-muted">Carregando…</Container>;
  }

  const forca = forcaSenha(senha);

  return (
    <Container className="py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        <Image src="/logos/logo-pro.png" alt="CuraDentes Pro" width={2480} height={926} className="mb-6 h-10 w-auto" />

        {/* Stepper — etapas já alcançadas são clicáveis (voltar direto a uma delas) */}
        <div className="mb-8 flex flex-wrap gap-2">
          {ETAPAS.map((nomeEtapa, i) => {
            const n = i + 1;
            const estado = n === etapa ? "atual" : n < etapa ? "feita" : "futura";
            const podeIr = n < etapa && !ocupado;
            return (
              <button
                key={nomeEtapa}
                type="button"
                onClick={() => { if (podeIr) { setErro(""); setEtapa(n); } }}
                disabled={!podeIr}
                aria-current={estado === "atual" ? "step" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${estado === "atual" ? "bg-brand-blue text-white" : estado === "feita" ? "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 cursor-pointer" : "bg-black/5 text-ink-muted cursor-default"}`}
              >
                <span>{n}</span> {nomeEtapa}
              </button>
            );
          })}
        </div>

        {erro && <p className="mb-5 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{erro}</p>}

        <div className="rounded-3xl border border-black/8 bg-white p-6 md:p-8">
          {/* ── Etapa 1: Conta ── */}
          {etapa === 1 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-xl font-bold text-brand-navy">Crie sua conta</h1>
              <div>
                <label className={labelCls}>Nome de exibição *</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="Ana Silva" />
              </div>
              <div>
                <label className={labelCls}>Como aparece no seu perfil *</label>
                <div className="flex gap-2">
                  {(["Dr.", "Dra."] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTratamento(t)} className={`flex-1 rounded-[12px] py-2.5 text-sm font-semibold transition-all ${tratamento === t ? "bg-brand-blue text-white" : "border border-black/10 bg-black/5 text-ink-soft"}`}>
                      {t} {nome.trim() ? nome.trim().split(" ")[0] : ""}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Nome completo (verificação do CRO) *</label>
                <input value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} className={inputCls} />
                <p className="mt-1 text-[11px] text-ink-muted">Depois só pode ser alterado via suporte.</p>
              </div>

              {/* E-mail + OTP */}
              <div>
                <label className={labelCls}>E-mail *</label>
                <div className="flex gap-2">
                  <input type="email" value={email} disabled={emailVerificado} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} ${emailVerificado ? "bg-black/3 text-ink-muted" : ""}`} placeholder="seu@email.com" />
                  {!emailVerificado && (
                    <button onClick={enviarCodigo} disabled={ocupado || !email.includes("@")} className="flex-shrink-0 rounded-[10px] bg-brand-navy px-4 text-sm font-semibold text-white disabled:opacity-50">
                      {otpEnviado ? "Reenviar" : "Enviar código"}
                    </button>
                  )}
                </div>
              </div>
              {otpEnviado && !emailVerificado && (
                <div>
                  <label className={labelCls}>Código de 8 dígitos (enviado ao e-mail)</label>
                  <div className="flex gap-2">
                    <input value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" className={inputCls} placeholder="00000000" />
                    <button onClick={verificarCodigo} disabled={ocupado || codigo.length !== 8} className="flex-shrink-0 rounded-[10px] bg-brand-blue px-4 text-sm font-semibold text-white disabled:opacity-50">
                      Verificar
                    </button>
                  </div>
                </div>
              )}
              {emailVerificado && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">E-mail verificado ✓</p>}

              {/* Senha (só se ainda não sincronizada) */}
              {!senhaSincronizada && (
                <>
                  <div>
                    <label className={labelCls}>Senha (mín. 8 caracteres) *</label>
                    <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className={inputCls} autoComplete="new-password" />
                    {senha && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8">
                          <div className="h-full rounded-full" style={{ width: `${(forca.nivel / 4) * 100}%`, background: forca.cor }} />
                        </div>
                        <span className="text-xs text-ink-muted">{forca.rotulo}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Confirmar senha *</label>
                    <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} className={inputCls} autoComplete="new-password" />
                  </div>
                </>
              )}

              <div className="mt-2 flex justify-between">
                <Link href="/" className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink-muted hover:text-ink">Cancelar</Link>
                <button onClick={avancar1} disabled={ocupado} className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-blue-600 disabled:opacity-60">
                  {ocupado ? "Salvando…" : "Avançar"}
                </button>
              </div>
            </div>
          )}

          {/* ── Etapa 2: Telefone ── */}
          {etapa === 2 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-xl font-bold text-brand-navy">Telefone de contato</h1>
              <div>
                <label className={labelCls}>Celular (com DDD) *</label>
                <input value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} className={inputCls} placeholder="(11) 99999-8888" />
              </div>
              <NavEtapa onVoltar={() => setEtapa(1)} onAvancar={avancar2} onDepois={deixarParaDepois} ocupado={ocupado} />
            </div>
          )}

          {/* ── Etapa 3: Identidade ── */}
          {etapa === 3 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-xl font-bold text-brand-navy">Identidade profissional</h1>
              <div>
                <label className={labelCls}>CPF *</label>
                <input value={cpf} onChange={(e) => setCpf(formatarCpf(e.target.value))} className={inputCls} placeholder="000.000.000-00" />
              </div>
              <div>
                <label className={labelCls}>CRO *</label>
                <input value={cro} onChange={(e) => setCro(formatarCro(e.target.value))} className={inputCls} placeholder="CRO-SP12345" />
              </div>
              <div>
                <label className={labelCls}>Ano de formação (opcional)</label>
                <input type="number" value={anoFormacao} onChange={(e) => setAnoFormacao(e.target.value)} className={inputCls} placeholder="2015" />
              </div>
              <p className="text-xs text-ink-muted">A foto de perfil você adiciona depois, no painel.</p>
              <NavEtapa onVoltar={() => setEtapa(2)} onAvancar={avancar3} onDepois={deixarParaDepois} ocupado={ocupado} />
            </div>
          )}

          {/* ── Etapa 4: Endereços ── */}
          {etapa === 4 && (
            <div className="flex flex-col gap-5">
              <h1 className="text-xl font-bold text-brand-navy">Locais de atendimento</h1>
              <EnderecosEditor enderecos={enderecos} onChange={setEnderecos} />
              <NavEtapa onVoltar={() => setEtapa(3)} onAvancar={avancar4} onDepois={deixarParaDepois} ocupado={ocupado} />
            </div>
          )}

          {/* ── Etapa 5: Bio ── */}
          {etapa === 5 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-xl font-bold text-brand-navy">Sobre você (opcional)</h1>
              <div>
                <label className={labelCls}>Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={500} className={`${inputCls} resize-none`} placeholder="Conte sobre seu atendimento (opcional)." />
              </div>
              <div>
                <label className={labelCls}>Instagram (opcional)</label>
                <div className="flex overflow-hidden rounded-[12px] border border-black/15">
                  <span className="flex-shrink-0 bg-black/3 px-3 py-2.5 font-mono text-[13px] text-ink-muted">{INSTAGRAM_BASE}</span>
                  <input value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/[^a-zA-Z0-9_.@-]/g, ""))} placeholder="@seu-perfil" className="flex-1 px-3 py-2.5 text-sm outline-none" />
                </div>
              </div>
              <NavEtapa onVoltar={() => setEtapa(4)} onAvancar={avancar5} onDepois={deixarParaDepois} ocupado={ocupado} />
            </div>
          )}

          {/* ── Etapa 6: Conclusão (LGPD) ── */}
          {etapa === 6 && (
            <div className="flex flex-col gap-4">
              <h1 className="text-xl font-bold text-brand-navy">Quase lá!</h1>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4">
                <input type="checkbox" checked={lgpd} onChange={(e) => setLgpd(e.target.checked)} className="mt-0.5 h-5 w-5 accent-brand-blue" />
                <span className="text-sm text-ink-soft">
                  Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-brand-blue underline">Termos de Uso</Link> e a{" "}
                  <Link href="/privacidade" target="_blank" className="font-semibold text-brand-blue underline">Política de Privacidade</Link> (LGPD).
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4">
                <input type="checkbox" checked={cobranca} onChange={(e) => setCobranca(e.target.checked)} className="mt-0.5 h-5 w-5 accent-brand-blue" />
                <span className="text-sm text-ink-soft">
                  Estou ciente de que o CuraDentes Pro é gratuito na fase Beta e passará a R$ 49,99/mês a
                  partir de 1º de julho de 2027, com aviso por e-mail 30 dias antes (seção 5 dos Termos).
                </span>
              </label>

              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">E-mails opcionais (você escolhe)</p>
              {[
                { v: prefDesempenho, set: setPrefDesempenho, t: "Desempenho do meu perfil" },
                { v: prefNovidades, set: setPrefNovidades, t: "Novidades e dicas" },
                { v: prefParceiros, set: setPrefParceiros, t: "Ofertas de parceiros" },
              ].map((p) => (
                <label key={p.t} className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={p.v} onChange={(e) => p.set(e.target.checked)} className="h-4 w-4 accent-brand-blue" />
                  <span className="text-sm text-ink-soft">{p.t}</span>
                </label>
              ))}

              <div className="mt-2 flex justify-between">
                <button onClick={() => setEtapa(5)} disabled={ocupado} className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink-muted hover:text-ink">Voltar</button>
                <button onClick={concluir} disabled={ocupado || !lgpd || !cobranca} className="rounded-full bg-brand-magenta px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-magenta-700 disabled:opacity-50">
                  {ocupado ? "Concluindo…" : "Concluir cadastro"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Já tem conta? <Link href="/entrar" className="font-semibold text-brand-blue hover:underline">Entrar</Link>
        </p>
      </div>
    </Container>
  );
}

function NavEtapa({ onVoltar, onAvancar, onDepois, ocupado }: { onVoltar: () => void; onAvancar: () => void; onDepois: () => void; ocupado: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-between">
      <button onClick={onVoltar} disabled={ocupado} className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink-muted hover:text-ink">Voltar</button>
      <div className="flex gap-2">
        <button onClick={onDepois} disabled={ocupado} className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-black/5">Deixar para depois</button>
        <button onClick={onAvancar} disabled={ocupado} className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-blue-600 disabled:opacity-60">
          {ocupado ? "Salvando…" : "Avançar"}
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
