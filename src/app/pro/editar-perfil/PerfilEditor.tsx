"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// MEU PERFIL (editor cliente) — dados pessoais + CRUD de endereços.
//
// Portado do site-k11 (MeuPerfil.tsx). Edição diferida: tudo muda no estado React
// e só persiste no "Salvar tudo" (update do perfil + insert/update/delete de
// endereços, geocodificando cada um). Campos read-only (nome completo, CRO, CPF,
// e-mail) só mudam via suporte. A UI de endereços vem do EnderecosEditor (compartilhado).
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2, ShieldCheck, Mail, KeyRound } from "lucide-react";
import Container from "@/components/Container";
import EnderecosEditor, { type EnderecoForm, type SalaResumoClinica } from "@/components/pro/EnderecosEditor";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { excluirContaDentista } from "@/lib/conta-acoes";
import { salvarPerfil } from "./acoes";
import { formatarInstagram, extrairUserInstagram, INSTAGRAM_BASE } from "@/lib/instagram";
import { validarTelefone, validarAnoFormacao } from "@/lib/validacao";
import { geocodeEnderecoComFallback } from "@/lib/geocoding";
import { ESPECIALIDADES, nomeAmigavel } from "@/lib/especialidades";

export type { EnderecoForm };

export interface PerfilForm {
  id: string;
  nome: string;
  tratamento: string;
  nomeCompleto: string;
  email: string;
  telefone: string;
  cpf: string;
  cro: string;
  anoFormacao: string;
  especialidade: string;
  bio: string;
  instagram: string;
  googleReviewUrl: string;
  fotoUrl: string;
  lgpdAceito: boolean;
  prefsEmail: { desempenho: boolean; novidades: boolean; parceiros: boolean };
}

const labelCls = "mb-1 block text-xs font-semibold text-ink-soft";
const inputCls = "w-full rounded-[10px] border border-black/15 px-3.5 py-2.5 text-sm outline-none focus:border-brand-blue";

export default function PerfilEditor({
  perfil,
  enderecosIniciais,
  salasResumo = [],
}: {
  perfil: PerfilForm;
  enderecosIniciais: EnderecoForm[];
  salasResumo?: SalaResumoClinica[];
}) {
  const router = useRouter();
  const supabase = criarClienteNavegador();

  const [nome, setNome] = useState(perfil.nome);
  const [tratamento, setTratamento] = useState(perfil.tratamento);
  const [telefone, setTelefone] = useState(perfil.telefone);
  const [anoFormacao, setAnoFormacao] = useState(perfil.anoFormacao);
  const [especialidade, setEspecialidade] = useState(perfil.especialidade);
  const [bio, setBio] = useState(perfil.bio);
  const [instagram, setInstagram] = useState(perfil.instagram);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(perfil.googleReviewUrl);

  const [enderecos, setEnderecos] = useState<EnderecoForm[]>(enderecosIniciais);
  const [removidos, setRemovidos] = useState<string[]>([]);

  // Preferências de e-mail (opt-in; LGPD: o titular pode revogar a qualquer momento).
  const [prefDesempenho, setPrefDesempenho] = useState(perfil.prefsEmail.desempenho);
  const [prefNovidades, setPrefNovidades] = useState(perfil.prefsEmail.novidades);
  const [prefParceiros, setPrefParceiros] = useState(perfil.prefsEmail.parceiros);

  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviandoSenha, setEnviandoSenha] = useState(false);
  const [modoExclusao, setModoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [modalSair, setModalSair] = useState(false);

  const snapshotRef = useRef<string>("");
  function snapshot() {
    return JSON.stringify({ nome, tratamento, telefone, anoFormacao, especialidade, googleReviewUrl, bio, instagram, enderecos, prefDesempenho, prefNovidades, prefParceiros });
  }
  useEffect(() => {
    if (!snapshotRef.current) snapshotRef.current = snapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function temAlteracoes() {
    return snapshotRef.current !== snapshot();
  }

  async function salvar() {
    setMsg(null);
    // Validações (alinhadas ao cadastro): telefone e ano de formação.
    if (telefone.trim() && !validarTelefone(telefone)) {
      setMsg({ tipo: "erro", texto: "Telefone inválido (DDD + 9 dígitos)." });
      return;
    }
    if (!validarAnoFormacao(anoFormacao)) {
      setMsg({ tipo: "erro", texto: "Ano de formação inválido." });
      return;
    }
    if (!especialidade) {
      setMsg({ tipo: "erro", texto: "Escolha sua especialidade principal." });
      return;
    }
    setSalvando(true);
    try {
      const instagramUrl = formatarInstagram(instagram);
      if (instagram && !instagramUrl) {
        setMsg({ tipo: "erro", texto: "Instagram inválido. Use só letras, números, ponto, traço e underscore." });
        setSalvando(false);
        return;
      }
      const instaNorm = extrairUserInstagram(instagramUrl || "");
      setInstagram(instaNorm);

      // Geocodifica cada endereço NO CLIENTE (preserva o comportamento atual) e
      // delega TODAS as gravações autenticadas para a Server Action salvarPerfil.
      const enderecosComCoord: (EnderecoForm & { latitude: number | null; longitude: number | null })[] = [];
      for (const end of enderecos) {
        let latitude: number | null = null;
        let longitude: number | null = null;
        if (end.cidade) {
          const coord = await geocodeEnderecoComFallback(end);
          if (coord) {
            latitude = coord.latitude;
            longitude = coord.longitude;
          }
        }
        enderecosComCoord.push({ ...end, latitude, longitude });
      }

      const res = await salvarPerfil({
        nome,
        tratamento: tratamento || null,
        telefone,
        anoFormacao: anoFormacao ? parseInt(anoFormacao, 10) : null,
        especialidade,
        bio,
        instagramUrl,
        googleReviewUrl: googleReviewUrl.trim() || null,
        prefs: { desempenho: prefDesempenho, novidades: prefNovidades, parceiros: prefParceiros },
        enderecos: enderecosComCoord,
        removidos: removidos.filter((id) => !id.startsWith("end-")),
      });
      if (!res.ok) {
        setMsg({ tipo: "erro", texto: res.erro || "Erro ao salvar o perfil." });
        setSalvando(false);
        return;
      }

      // Aplica os ids reais dos endereços novos e marca todos como salvos.
      const enderecosSalvos = enderecos.map((x) => {
        const m = res.novosIds?.find((n) => n.tempId === x.id);
        return m ? { ...x, id: m.id, _isNew: false } : { ...x, _isNew: false };
      });
      setEnderecos(enderecosSalvos);

      // Snapshot pós-save com o instagram já normalizado (evita falso "alterações
      // não salvas" logo após salvar — o setState do instagram é assíncrono).
      snapshotRef.current = JSON.stringify({ nome, tratamento, telefone, anoFormacao, especialidade, googleReviewUrl, bio, instagram: instaNorm, enderecos: enderecosSalvos, prefDesempenho, prefNovidades, prefParceiros });
      setMsg({ tipo: "ok", texto: "Perfil atualizado com sucesso!" });
      setTimeout(() => {
        router.push("/pro/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      setMsg({ tipo: "erro", texto: err instanceof Error ? err.message : "Erro ao salvar o perfil." });
      setSalvando(false);
    }
  }

  async function trocarSenha() {
    setEnviandoSenha(true);
    setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(perfil.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    setEnviandoSenha(false);
    setMsg(
      error
        ? { tipo: "erro", texto: "Não foi possível enviar o e-mail. Tente novamente." }
        : { tipo: "ok", texto: `Link enviado para ${perfil.email}. Verifique sua caixa de entrada.` },
    );
  }

  async function excluirConta() {
    setExcluindo(true);
    const res = await excluirContaDentista();
    if (!res.ok) {
      setMsg({ tipo: "erro", texto: res.erro || "Erro ao excluir a conta. Tente novamente." });
      setExcluindo(false);
      return;
    }
    try {
      localStorage.removeItem("cd_user");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("curadentes:auth"));
    router.replace("/");
    router.refresh();
  }

  function sairSemSalvar() {
    if (temAlteracoes()) setModalSair(true);
    else router.push("/pro/dashboard");
  }

  return (
    <Container className="py-8 md:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy">Meu perfil</h1>
        <div className="flex gap-2">
          <button onClick={salvar} disabled={salvando} className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-blue-600 disabled:opacity-60">
            {salvando ? "Salvando…" : "Salvar tudo"}
          </button>
          <button onClick={sairSemSalvar} className="rounded-full bg-danger/10 px-5 py-2.5 text-sm font-bold text-danger hover:bg-danger/20">
            Sair
          </button>
        </div>
      </div>

      {msg && (
        <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${msg.tipo === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
          {msg.texto}
        </p>
      )}

      <div className="mb-8 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-ink-soft">
        <strong className="text-brand-navy">Lembrete:</strong> o CuraDentes Pro está em fase Beta
        gratuita. A partir de 1º de julho de 2027 passa a R$ 49,99/mês por dentista, com aviso por
        e-mail 30 dias antes. Detalhes nos{" "}
        <Link href="/termos" className="font-semibold text-brand-blue hover:underline">Termos de Uso</Link>.
      </div>

      <div className="flex flex-col gap-8">
        {/* Dados pessoais */}
        <section className="rounded-3xl border border-black/8 bg-white p-6">
          <h2 className="mb-6 text-lg font-bold text-brand-navy">Dados pessoais e profissionais</h2>
          <div className="flex flex-col gap-8 md:flex-row md:items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-[#F2F2F7]">
                {perfil.fotoUrl ? (
                  <Image src={perfil.fotoUrl} alt="Sua foto" width={112} height={112} className="h-full w-full object-cover" />
                ) : (
                  <img src="/logos/logo-pro-alt.png" alt="Sem foto" className="h-16 w-16 object-contain opacity-40" />
                )}
              </div>
              <Link href="/pro/editor-de-fotos" className="text-sm font-semibold text-brand-blue hover:underline">Trocar foto</Link>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelCls}>Nome de exibição</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Como aparece no seu perfil</label>
                <div className="flex gap-2">
                  {(["Dr.", "Dra."] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTratamento(t)} className={`flex-1 rounded-[12px] py-2.5 text-sm font-semibold transition-all ${tratamento === t ? "bg-brand-blue text-white" : "border border-black/10 bg-black/5 text-ink-soft"}`}>
                      {t} {nome.trim() ? nome.trim().split(" ")[0] : ""}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Nome completo (verificação do CRO)</label>
                <input value={perfil.nomeCompleto} disabled className={`${inputCls} bg-[#F2F2F7] text-[#8E8E93]`} />
                <p className="mt-1 text-[11px] text-ink-muted">Para alterar, envie e-mail para <strong>suporte@curadentes.com.br</strong></p>
              </div>
              <div>
                <label className={labelCls}>Telefone / Celular</label>
                <input type="tel" inputMode="numeric" value={telefone} onChange={(e) => setTelefone(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ano de formação</label>
                <input type="number" value={anoFormacao} onChange={(e) => setAnoFormacao(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Especialidade principal</label>
                <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className={inputCls}>
                  <option value="" disabled>Selecione</option>
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp} value={esp}>{nomeAmigavel(esp)}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-ink-muted">Aparece junto ao seu nome em todo o site.</p>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Sobre mim (bio)</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} className={`${inputCls} resize-none`} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Instagram (opcional)</label>
                <div className="flex overflow-hidden rounded-[12px] border border-black/15">
                  <span className="flex-shrink-0 bg-black/3 px-3 py-2.5 font-mono text-[13px] text-ink-muted">{INSTAGRAM_BASE}</span>
                  <input value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/[^a-zA-Z0-9_.@-]/g, ""))} placeholder="@seu-perfil" className="flex-1 px-3 py-2.5 text-sm outline-none" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Avaliações no Google (opcional)</label>
                <div className="flex items-stretch gap-2">
                  <input
                    value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                    placeholder="Link de avaliação do seu Google Meu Negócio"
                    className={`${inputCls} flex-1 min-w-0`}
                  />
                  <Link
                    href="/ajuda/avaliacoes-google"
                    target="_blank"
                    className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-brand-blue/20 bg-brand-blue/5 px-3 text-[13px] font-semibold text-brand-blue"
                  >
                    Passo-a-Passo
                  </Link>
                </div>
                <p className="mt-1 text-[11px] text-ink-muted">
                  Após avaliarem você no CuraDentes, os pacientes veem um botão para avaliar também no Google. Não sabe pegar o link? Veja o <strong>Passo-a-Passo</strong>.
                </p>
              </div>
              <div>
                <label className={labelCls}>CPF (visualização)</label>
                <input value={perfil.cpf} disabled className={`${inputCls} bg-[#F2F2F7] text-[#8E8E93]`} />
              </div>
              <div>
                <label className={labelCls}>CRO (visualização)</label>
                <input value={perfil.cro} disabled className={`${inputCls} bg-[#F2F2F7] text-[#8E8E93]`} />
                <p className="mt-1 text-[11px] text-ink-muted">Para alterar, envie e-mail para <strong>suporte@curadentes.com.br</strong></p>
              </div>
            </div>
          </div>
        </section>

        {/* Endereços */}
        <section className="flex flex-col gap-5">
          <h2 className="text-lg font-bold text-brand-navy">Locais de atendimento</h2>
          <EnderecosEditor
            enderecos={enderecos}
            onChange={setEnderecos}
            onRemover={(id) => setRemovidos((prev) => [...prev, id])}
            mostrarFotos
            salas={salasResumo}
          />
        </section>

        {/* Preferências de e-mail (LGPD: revogável a qualquer momento) */}
        <section className="rounded-3xl border border-black/8 bg-white p-6">
          <h2 className="mb-1 text-lg font-bold text-brand-navy">Preferências de e-mail</h2>
          <p className="mb-4 text-sm text-ink-soft">
            E-mails essenciais (segurança, cadastro) você sempre recebe. Os opcionais abaixo são sua escolha.
          </p>
          <div className="flex flex-col gap-3">
            {[
              { v: prefDesempenho, set: setPrefDesempenho, t: "Desempenho do meu perfil" },
              { v: prefNovidades, set: setPrefNovidades, t: "Novidades e dicas" },
              { v: prefParceiros, set: setPrefParceiros, t: "Ofertas de parceiros" },
            ].map((p) => (
              <label key={p.t} className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={p.v} onChange={(e) => p.set(e.target.checked)} className="h-5 w-5 accent-brand-blue" />
                <span className="text-sm text-ink-soft">{p.t}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-muted">As mudanças são gravadas ao clicar em “Salvar tudo”.</p>
        </section>

        {/* Segurança */}
        <section className="rounded-3xl border border-black/8 bg-white p-6">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={20} className="text-success" />
            <h2 className="text-lg font-bold text-brand-navy">Segurança</h2>
          </div>
          <p className="mb-4 text-sm text-ink-soft">Para trocar a senha, enviaremos um link de confirmação para o seu e-mail (uso único).</p>
          <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-[#F2F2F7] p-4 sm:flex-row sm:items-center sm:gap-4">
            <Mail size={18} className="shrink-0 text-ink-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">E-mail da conta</p>
              <p className="truncate font-semibold text-brand-navy">{perfil.email || "—"}</p>
            </div>
            <button onClick={trocarSenha} disabled={enviandoSenha || !perfil.email} className="flex shrink-0 items-center justify-center gap-2 rounded-[12px] bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-700 disabled:opacity-50">
              {enviandoSenha ? "Enviando…" : (<><KeyRound size={14} /> Trocar senha</>)}
            </button>
          </div>
        </section>

        {/* Zona de perigo */}
        <section className="rounded-3xl border border-danger/15 bg-white p-6">
          <div className="mb-3 flex items-center gap-2">
            <Trash2 size={20} className="text-danger" />
            <h2 className="text-lg font-bold text-danger">Excluir conta</h2>
          </div>
          <p className="mb-4 text-sm text-ink-soft">Seu perfil deixa de aparecer no site imediatamente e seus dados sensíveis são removidos.</p>
          {!modoExclusao ? (
            <button onClick={() => setModoExclusao(true)} className="flex items-center gap-2 rounded-[12px] border border-danger/20 bg-danger/5 px-5 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10">
              <Trash2 size={14} /> Excluir minha conta
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-[12px] border border-danger/20 bg-danger/5 p-4">
              <p className="text-sm font-semibold text-brand-navy">Tem certeza? Esta ação é irreversível.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={excluirConta} disabled={excluindo} className="flex items-center justify-center gap-2 rounded-[12px] bg-danger px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                  {excluindo ? "Excluindo…" : (<><Trash2 size={14} /> Sim, excluir minha conta</>)}
                </button>
                <button onClick={() => setModoExclusao(false)} disabled={excluindo} className="rounded-[12px] border border-black/15 px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-black/5">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {modalSair && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-navy/45 p-4" onClick={(e) => { if (e.target === e.currentTarget) setModalSair(false); }}>
          <div className="flex w-full max-w-[400px] flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-brand-navy">Sair sem salvar?</h3>
            <p className="text-sm leading-relaxed text-ink-soft">As alterações feitas nesta página serão perdidas. Deseja sair mesmo assim?</p>
            <div className="flex gap-3">
              <button onClick={() => setModalSair(false)} className="flex-1 rounded-[12px] border border-black/15 py-2.5 text-sm font-semibold text-ink-soft hover:bg-black/5">Continuar editando</button>
              <button onClick={() => { setModalSair(false); router.push("/pro/dashboard"); }} className="flex-1 rounded-[12px] bg-brand-magenta py-2.5 text-sm font-semibold text-white hover:bg-brand-magenta-700">Sair sem salvar</button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
