// ═══════════════════════════════════════════════════════════════════════════════
// AJUDA — Passo a passo: link de avaliações do Google (Google Meu Negócio).
//
// Página pública (acessível durante o cadastro, que é pré-login). Ensina o dentista
// a obter o link de avaliação do Perfil da Empresa para colar no campo "Avaliações
// no Google". Conteúdo estático — Server Component.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import {
  Search, MousePointerClick, Copy, ClipboardPaste, Smartphone, Hash,
  CheckCircle2, ExternalLink, ArrowLeft, AlertCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Passo a passo: link de avaliações do Google",
  description:
    "Como pegar o link de avaliação do seu Google Meu Negócio para os pacientes avaliarem você também no Google.",
  robots: { index: false },
};

const PASSOS = [
  {
    icon: Search,
    titulo: "Pesquise o seu consultório no Google",
    texto:
      'No computador, logado na conta Google dona do seu Perfil da Empresa, pesquise o nome do consultório (ex.: "Consultório Dr. Fulano, Sorocaba"). O painel do seu Perfil da Empresa aparece no lado direito.',
  },
  {
    icon: MousePointerClick,
    titulo: 'Clique em "Pedir avaliações"',
    texto:
      'No painel do seu Perfil da Empresa, procure o botão "Pedir avaliações" (em inglês, "Get more reviews"). O Google vai gerar um link curto exclusivo do seu consultório.',
  },
  {
    icon: Copy,
    titulo: "Copie o link de avaliação",
    texto:
      "Copie o link que aparece — costuma ser algo como https://g.page/r/…/review. É esse link que abre direto a janelinha de “escrever avaliação” do seu consultório.",
  },
  {
    icon: ClipboardPaste,
    titulo: "Cole no CuraDentes e salve",
    texto:
      'Volte ao seu cadastro (ou a "Meu Perfil") e cole o link no campo "Avaliações no Google". Pronto: depois que um paciente avaliar você aqui, ele verá um botão para avaliar também no Google.',
  },
];

function Passo({
  n, icon: Icon, titulo, texto,
}: {
  n: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
        style={{ background: "#007AFF" }}
      >
        {n}
      </div>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-brand-navy">
          <Icon size={16} className="text-brand-blue" /> {titulo}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{texto}</p>
      </div>
    </div>
  );
}

export default function AjudaAvaliacoesGooglePage() {
  return (
    <Container className="max-w-2xl space-y-6 py-8">
      <Link href="/pro/editar-perfil" className="inline-flex items-center gap-1 text-sm text-brand-blue hover:underline">
        <ArrowLeft size={15} /> Voltar ao meu perfil
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Passo a passo: link de avaliações do Google</h1>
        <p className="mt-1 text-ink-muted">
          Pegue o link de avaliação do seu Google Meu Negócio e cole no campo
          &ldquo;Avaliações no Google&rdquo;. Assim, quem te avalia no CuraDentes pode avaliar também no Google.
        </p>
      </div>

      {/* Pré-requisito */}
      <div className="flex items-start gap-3 rounded-2xl border p-4" style={{ background: "#FFF8E1", borderColor: "rgba(255,149,0,0.35)" }}>
        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: "#FF9500" }} />
        <p className="text-sm leading-relaxed text-ink-soft">
          <strong>Pré-requisito:</strong> você precisa ter um <strong>Perfil da Empresa</strong> (Google Meu Negócio)
          verificado. Ainda não tem?{" "}
          <a href="https://www.google.com/business/" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-blue hover:underline">
            Crie o seu aqui <ExternalLink size={12} className="inline" />
          </a>.
        </p>
      </div>

      {/* Passos no computador */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">No computador</h2>
        {PASSOS.map((p, i) => (
          <Passo key={i} n={i + 1} icon={p.icon} titulo={p.titulo} texto={p.texto} />
        ))}
      </div>

      {/* Pelo celular */}
      <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-brand-navy">
          <Smartphone size={16} className="text-brand-blue" /> Pelo celular (alternativa)
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Abra o app <strong>Google Maps</strong> → toque na sua foto (canto superior) →{" "}
          <strong>&ldquo;Seu perfil de empresa&rdquo;</strong> → <strong>&ldquo;Avaliações&rdquo;</strong> ou{" "}
          <strong>&ldquo;Promover&rdquo;</strong> → <strong>&ldquo;Pedir avaliações&rdquo;</strong> /
          {" "}&ldquo;Compartilhar formulário de avaliação&rdquo; → copie o link.
        </p>
      </div>

      {/* Place ID (alternativa técnica) */}
      <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-brand-navy">
          <Hash size={16} className="text-brand-blue" /> Não achou o link? Use o Place ID
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Acesse o{" "}
          <a
            href="https://developers.google.com/maps/documentation/places/web-service/place-id"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-blue hover:underline"
          >
            localizador de Place ID do Google <ExternalLink size={12} className="inline" />
          </a>
          , pesquise o seu consultório e copie o <strong>Place ID</strong> (começa com <code>ChIJ…</code>).
          Cole esse código no campo &ldquo;Avaliações no Google&rdquo; — o CuraDentes monta o link de avaliação
          automaticamente.
        </p>
      </div>

      {/* Dica final */}
      <div className="flex items-start gap-3 rounded-2xl border p-4" style={{ background: "rgba(52,199,89,0.08)", borderColor: "rgba(52,199,89,0.30)" }}>
        <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" style={{ color: "#34C759" }} />
        <p className="text-sm leading-relaxed text-ink-soft">
          <strong>Dica:</strong> depois de colar, teste abrindo o link — ele deve abrir a janela de
          &ldquo;escrever avaliação&rdquo; do seu consultório. Ficou com dúvida? Fale com a gente em{" "}
          <a href="mailto:suporte@curadentes.com.br" className="font-semibold text-brand-blue hover:underline">
            suporte@curadentes.com.br
          </a>.
        </p>
      </div>
    </Container>
  );
}
