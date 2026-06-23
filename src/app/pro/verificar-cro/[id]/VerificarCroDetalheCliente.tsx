"use client";

// Detalhe da verificação de CRO (parte interativa): embute a busca do CFO, oferece
// copiar UF/número e marca verificado/falhou via RPC marcar_verificacao_cro (fonte
// da verdade no banco), além de reabrir verificações que falharam. Portado do k11.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { lerSessaoDoCookie } from "@/lib/sessao-cookie";
import { numeroDoCro, ufDoCro, nomeUf } from "@/lib/cro";
import {
  ArrowLeft, ExternalLink, RefreshCw, ShieldAlert, CheckCircle, Copy, Loader2,
} from "lucide-react";

export interface VerificacaoDetalhe {
  id: string;
  dentista_id: string;
  cro: string;
  uf: string | null;
  status: string;
  erro: string | null;
  observacao: string | null;
  criado_em: string;
  atualizado_em: string;
  curadentespro: { nome: string; email: string; cro: string; cro_verificado: boolean; foto_url: string | null };
}

export default function VerificarCroDetalheCliente({ verificacao: inicial }: { verificacao: VerificacaoDetalhe }) {
  const router = useRouter();
  const supabase = criarClienteNavegador();
  const [verificacao, setVerificacao] = useState(inicial);
  const [observacao, setObservacao] = useState(inicial.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const pro = verificacao.curadentespro;
  const jaVerificado = verificacao.status === "verificado";
  const numero = numeroDoCro(verificacao.cro);
  const ufSigla = ufDoCro(verificacao.cro);
  const ufNomeCompleto = nomeUf(ufSigla) || verificacao.uf || ufSigla;

  function copiar(texto: string, qual: string) {
    navigator.clipboard.writeText(texto);
    setCopiado(qual);
    setTimeout(() => setCopiado(""), 2000);
  }

  // Dispara o e-mail oficial de regularização (suporte@) via edge function.
  // Best-effort: usa o token da sessão (cookie) para não depender do supabase-js,
  // que trava no navegador. Retorna true se o e-mail foi aceito pelo servidor.
  async function notificarDentista(): Promise<boolean> {
    try {
      const sessao = lerSessaoDoCookie();
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!sessao?.accessToken || !url || !anon || !pro?.email) return false;
      const res = await fetch(`${url}/functions/v1/notificar-cro-inativa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessao.accessToken}`,
          apikey: anon,
        },
        body: JSON.stringify({ email: pro.email, nome: pro.nome, cro: verificacao.cro }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function marcar(verificado: boolean) {
    // Rejeitar/inativar é consequente: oculta o perfil e e-mail o dentista. Confirma.
    if (!verificado) {
      const confirma = window.confirm(
        `Marcar a CRO de ${pro?.nome ?? "este dentista"} como REJEITADA / INATIVA?\n\n` +
          `• O perfil deixa de ser exibido em qualquer lugar do site.\n` +
          `• O dentista recebe um e-mail de suporte@curadentes.com.br pedindo a regularização do CRO.\n\n` +
          `Para reativar depois, marque o CRO como "Verificado" (reexibe o perfil).`,
      );
      if (!confirma) return;
    }

    setSalvando(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("marcar_verificacao_cro", {
      p_dentista_id: verificacao.dentista_id,
      p_verificado: verificado,
      p_observacao: observacao || null,
    });
    const ok = !error && (data as { success?: boolean } | null)?.success;
    if (!ok) {
      setSalvando(false);
      const detalhe = (data as { error?: string } | null)?.error || error?.message || "Erro desconhecido";
      setMsg({ tipo: "erro", texto: `Erro ao salvar: ${detalhe}` });
      return;
    }
    setVerificacao((v) => ({ ...v, status: verificado ? "verificado" : "falhou" }));

    if (verificado) {
      setMsg({ tipo: "ok", texto: "CRO verificado com sucesso!" });
    } else {
      // Perfil já foi ocultado pela RPC (deleted_at); agora avisamos o dentista.
      const enviado = await notificarDentista();
      setMsg({
        // Rejeição é sempre exibida em VERMELHO (ação negativa), mesmo com o e-mail enviado.
        tipo: "erro",
        texto: enviado
          ? "Perfil marcado como inativo e e-mail de regularização enviado ao dentista."
          : "Perfil marcado como inativo, mas NÃO foi possível enviar o e-mail ao dentista. Avise o suporte manualmente.",
      });
    }
    setSalvando(false);
    router.refresh();
  }

  async function reabrir() {
    const { error } = await supabase.from("cro_verificacoes").update({ status: "pendente", erro: null }).eq("id", verificacao.id);
    if (error) {
      setMsg({ tipo: "erro", texto: "Não foi possível reabrir." });
      return;
    }
    setVerificacao((v) => ({ ...v, status: "pendente", erro: null }));
    router.refresh();
  }

  return (
    <Container className="max-w-4xl space-y-6 py-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start gap-3">
        <Link href="/pro/verificar-cro" className="shrink-0 rounded-xl bg-white p-2 hover:bg-black/3" aria-label="Voltar">
          <ArrowLeft size={20} className="text-brand-blue" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-brand-navy">Verificar CRO</h1>
          <p className="text-sm text-ink-muted">{pro?.nome}</p>
          <p className="font-mono text-sm text-ink-muted">{verificacao.cro}</p>
        </div>
        {jaVerificado && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
            <CheckCircle size={16} /> Verificado em {new Date(verificacao.atualizado_em).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm ${msg.tipo === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{msg.texto}</p>
      )}

      {/* Consulta no CFO */}
      <section className="rounded-2xl border border-black/8 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-navy">Consultar no CFO</h2>
            <p className="text-sm text-ink-muted">Selecione a UF, cole o nº abaixo, resolva o captcha e clique em Pesquisar.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => copiar(ufNomeCompleto, "uf")} className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/3">
              <span className="text-ink-muted">CRO/UF:</span>
              <span className="font-semibold text-brand-navy">{ufNomeCompleto}{ufSigla ? ` (${ufSigla})` : ""}</span>
              <Copy size={13} className="text-ink-muted" />
            </button>
            <button onClick={() => copiar(numero, "num")} className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/3">
              <span className="text-ink-muted">Nº:</span>
              <span className="font-mono font-semibold text-brand-navy">{numero || "—"}</span>
              <Copy size={13} className="text-ink-muted" />
            </button>
          </div>
        </div>
        {copiado && <p className="mb-2 text-xs text-success">{copiado === "uf" ? "CRO/UF copiado!" : "Nº inscrição copiado!"}</p>}

        {/* iframe em largura de celular força o layout mobile do CFO (coluna única). */}
        <div className="mx-auto overflow-hidden rounded-xl border border-black/10 bg-white" style={{ maxWidth: 420, height: 1040 }}>
          <iframe src="https://busca-profissionais.cfo.org.br/" title="Busca de profissionais CFO" className="h-full w-full border-0" />
        </div>
        <a href="https://busca-profissionais.cfo.org.br/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:underline">
          <ExternalLink size={15} /> Abrir em nova aba (se não carregar acima)
        </a>
      </section>

      {/* Observação + ações (só quando ainda não verificado) */}
      {!jaVerificado && (
        <section className="rounded-2xl border border-black/8 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-brand-navy">Verificação</h2>
          <p className="mb-4 text-xs leading-relaxed text-ink-muted">
            <strong>CRO Rejeitada / Inativa</strong> oculta o perfil em todo o site e envia ao dentista um
            e-mail de <strong>suporte@curadentes.com.br</strong> pedindo a regularização do CRO. Para
            reativar depois, marque o CRO como &ldquo;Verificado&rdquo;.
          </p>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            placeholder="Observação (opcional)"
            className="mb-4 w-full rounded-[10px] border border-black/15 px-3.5 py-2.5 text-sm outline-none focus:border-brand-blue"
          />
          <div className="space-y-3">
            <button onClick={() => marcar(true)} disabled={salvando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-success px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {salvando ? "Salvando…" : "Marcar como Verificado"}
            </button>
            <button onClick={() => marcar(false)} disabled={salvando} className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/20 bg-danger/5 px-6 py-3 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50">
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
              Marcar como CRO Rejeitada / Inativa
            </button>
            {verificacao.status === "falhou" && (
              <button onClick={reabrir} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue/5 px-6 py-3 text-sm font-semibold text-brand-blue hover:bg-brand-blue/10">
                <RefreshCw size={16} /> Reabrir verificação
              </button>
            )}
          </div>
        </section>
      )}
    </Container>
  );
}
