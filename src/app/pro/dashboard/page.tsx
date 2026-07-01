// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD DO DENTISTA — /pro/dashboard (Server Component).
//
// O acesso já foi garantido pelo layout /pro (só dentista/superuser chegam aqui).
// Busca no servidor (cliente autenticado por cookies): perfil, endereços e o
// resumo de métricas/avaliações (RPC meu_dashboard_resumo). Mutations (bio,
// excluir conta, sair) ficam em ilhas cliente.
// ═══════════════════════════════════════════════════════════════════════════════

import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import Estrelas from "@/components/Estrelas";
import { Eye, MessageCircle, Phone, Check, AlertCircle, Trophy, CalendarClock, Building2, MapPin, Settings, DoorOpen, UserPlus, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { getUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { contarPendencias } from "../negocios/acoes";
import { contarAdesoesPendentes } from "../adesoes/acoes";
import { montarEndereco, nomeExibicao, type DentistaRow, type EnderecoRow } from "@/lib/dentistas";
import BioEditor from "./BioEditor";
import AcoesConta from "./AcoesConta";
import EnderecoCard from "./EnderecoCard";
import { AVATAR_PADRAO } from "@/lib/site";

// Sempre dinâmico (área logada lê cookies).
export const dynamic = "force-dynamic";

interface PorAtividade {
  nome_atividade: string;
  media_nota: number;
  total_avaliacoes: number;
  posicao: number | null;
}
interface ResumoDashboard {
  media_geral: number;
  total_avaliacoes: number;
  posicao_geral: number | null;
  por_atividade: PorAtividade[] | null;
  total_visualizacoes: number;
  visualizacoes_30d: number;
  total_whatsapp: number;
  whatsapp_30d: number;
  total_telefone: number;
  telefone_30d: number;
}

export default async function DashboardPage() {
  const usuario = await getUsuario();

  // Superuser não tem painel de dentista: vai para a área administrativa.
  if (usuario?.papel === "superuser") redirect("/pro/dashboard-analytics");

  const supabase = await criarClienteServidor();

  const [perfilRes, endsRes, resumoRes] = await Promise.all([
    supabase
      .from("curadentespro")
      .select("id, nome, tratamento, nome_completo, cro, cro_verificado, foto_url, bio, instagram, lgpd_aceito, deleted_at")
      .eq("id", usuario!.id)
      .is("deleted_at", null)
      .maybeSingle<DentistaRow & { nome_completo: string | null; lgpd_aceito: boolean | null }>(),
    supabase.from("curadentespro_enderecos").select("*").eq("curadentespro_id", usuario!.id),
    supabase.rpc("meu_dashboard_resumo"),
  ]);

  const pro = perfilRes.data;
  const enderecos = ((endsRes.data as EnderecoRow[]) ?? []).map(montarEndereco);
  const resumo = (resumoRes.data as ResumoDashboard | null) ?? null;

  // Perfil não encontrado (não deveria, pois o guard liberou): mensagem segura.
  if (!pro) {
    return (
      <Container className="py-16">
        <h1 className="text-2xl font-bold text-brand-navy">Perfil não encontrado</h1>
        <p className="mt-3 text-ink-soft">Tente sair e entrar novamente.</p>
        <div className="mt-6"><AcoesConta /></div>
      </Container>
    );
  }

  const nome = nomeExibicao({ nome: pro.nome_completo || pro.nome || "", tratamento: pro.tratamento });
  const foto = pro.foto_url && !pro.foto_url.startsWith("blob:") ? pro.foto_url : AVATAR_PADRAO;
  const completo = !!pro.lgpd_aceito;
  const temAvaliacoes = !!resumo && resumo.total_avaliacoes > 0;
  const pendencias = pro.cro_verificado
    ? await contarPendencias()
    : { total: 0, recebidasPendentes: 0, pagamentosPendentes: 0 };
  // Pedidos de adesão à clínica deste dono — NÃO depende de CRO (qualquer dentista
  // que tenha criado uma clínica pode receber pedidos).
  const adesoesPendentes = await contarAdesoesPendentes();

  return (
    <Container className="py-10 md:py-12">
      {/* Cadastro incompleto */}
      {!completo && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: "#FF9500" }} />
          <div>
            <p className="font-semibold text-brand-navy">Seu cadastro está incompleto</p>
            <p className="mt-1 text-sm text-ink-soft">
              Conclua o cadastro para que seu perfil apareça nas buscas.
            </p>
            <Link href="/cadastro" className="mt-3 inline-block text-sm font-semibold text-brand-blue hover:underline">
              Completar cadastro →
            </Link>
          </div>
        </div>
      )}

      {/* Cabeçalho — gradiente navy com foto circular e texto branco (estilo k11) */}
      <div
        className="flex flex-col items-center gap-5 rounded-3xl p-6 sm:flex-row sm:items-center md:p-9"
        style={{
          background: "linear-gradient(135deg, #0A2A66 0%, #1a4b99 100%)",
          boxShadow: "0 12px 40px rgba(10,42,102,0.25)",
        }}
      >
        <Image
          src={foto}
          alt={`Foto de ${nome}`}
          width={96}
          height={96}
          className="h-24 w-24 flex-shrink-0 rounded-full object-cover"
          style={{
            border: "3px solid rgba(255,255,255,0.30)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.30)",
          }}
        />
        <div className="flex-1 text-center sm:text-left">
          <p className="mb-1 text-sm font-medium text-white/65">Bem-vindo(a) de volta!</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-bold text-white">{nome || "Bem-vindo"}</h1>
            {pro.cro_verificado && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">CRO verificado</span>
            )}
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={
                completo
                  ? { background: "rgba(52,199,89,0.20)", color: "#34C759", border: "0.5px solid rgba(52,199,89,0.30)" }
                  : { background: "rgba(255,149,0,0.20)", color: "#FF9500", border: "0.5px solid rgba(255,149,0,0.30)" }
              }
            >
              {completo ? <Check size={11} /> : <AlertCircle size={11} />}
              {completo ? "Perfil ativo" : "Cadastro incompleto"}
            </span>
          </div>
          {pro.cro && <p className="mt-1 text-sm text-white/65">{(pro.cro || "").replace(/\s/g, "")}</p>}
        </div>
        <div className="flex justify-center">
          {/* Engrenagem → edição de perfil (lá também se troca a foto). */}
          <Link
            href="/pro/editar-perfil"
            aria-label="Meu perfil"
            title="Meu perfil"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-navy transition-colors hover:bg-white/90"
          >
            <Settings size={20} />
          </Link>
        </div>
      </div>

      {/* Aviso de transição Beta → pago (amarelo k11 com ícone CalendarClock) */}
      <div
        className="mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm"
        style={{ background: "#FFF8E1", borderColor: "rgba(255,149,0,0.35)" }}
      >
        <CalendarClock size={20} className="mt-0.5 flex-shrink-0" style={{ color: "#FF9500" }} />
        <p className="leading-relaxed text-ink-soft">
          <strong className="text-brand-navy">Lembrete:</strong> você está na <strong>fase Beta gratuita</strong>. A partir de
          1º de julho de 2027, o CuraDentes Pro passa a R$ 49,99/mês — avisaremos por e-mail com 30 dias de antecedência.{" "}
          <Link href="/termos" className="font-semibold text-brand-blue hover:underline">Ver termos</Link>.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Coluna principal */}
        <div className="flex flex-col gap-8">
          {/* Métricas */}
          {resumo && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-brand-navy">Métricas do perfil</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Metrica
                  titulo="Visualizações"
                  total={resumo.total_visualizacoes}
                  ult30={resumo.visualizacoes_30d}
                  icone={<Eye size={14} style={{ color: "#007AFF" }} />}
                  fundo="rgba(0,122,255,0.06)"
                />
                <Metrica
                  titulo="Cliques no WhatsApp"
                  total={resumo.total_whatsapp}
                  ult30={resumo.whatsapp_30d}
                  icone={<MessageCircle size={14} style={{ color: "#34C759" }} />}
                  fundo="rgba(52,199,89,0.08)"
                />
                <Metrica
                  titulo="Cliques em ligar"
                  total={resumo.total_telefone}
                  ult30={resumo.telefone_30d}
                  icone={<Phone size={14} style={{ color: "#007AFF" }} />}
                  fundo="rgba(0,122,255,0.06)"
                />
              </div>
            </section>
          )}

          {/* Pontuação por atividade */}
          {temAvaliacoes && resumo && (
            <section className="rounded-2xl border border-white/60 bg-white/90 shadow-[0_2px_8px_rgba(16,24,64,0.05)] backdrop-blur p-5">
              <div className="mb-4 flex items-center gap-2">
                <Trophy size={18} style={{ color: "#FFD700" }} />
                <span className="text-3xl font-bold text-brand-navy">{resumo.media_geral.toFixed(1)}</span>
                <span className="text-sm text-ink-muted">/ 5 · {resumo.total_avaliacoes} avaliações</span>
              </div>
              <div className="flex flex-col gap-3">
                {(resumo.por_atividade ?? [])
                  .slice()
                  .sort((a, b) => b.media_nota - a.media_nota)
                  .map((a) => {
                    const cor = a.media_nota >= 4.5 ? "#34C759" : a.media_nota >= 3.5 ? "#FF9500" : "#FF3B30";
                    return (
                      <div key={a.nome_atividade}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-ink-soft">{a.nome_atividade}</span>
                          <span className="font-bold" style={{ color: cor }}>{a.media_nota.toFixed(1)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-black/8">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${(a.media_nota / 5) * 100}%`, background: cor }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Endereços — cards ricos (igual k11) */}
          <section>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <MapPin size={16} style={{ color: "#007AFF" }} />
              <h2 className="text-xl font-bold text-brand-navy">Locais de atendimento</h2>
              <span className="ml-auto rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: "rgba(0,122,255,0.10)", color: "#007AFF" }}>
                {enderecos.length} {enderecos.length === 1 ? "endereço" : "endereços"}
              </span>
              <Link
                href="/pro/editar-perfil#adicionar-endereco"
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold text-white transition-[filter] hover:brightness-110"
                style={{ background: "#007AFF" }}
                title="Adicionar endereço"
              >
                <Plus size={13} /> Adicionar endereço
              </Link>
            </div>
            {enderecos.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[20px] py-12 text-center" style={{ background: "#fff", border: "1.5px dashed rgba(60,60,67,0.15)" }}>
                <Building2 size={32} style={{ color: "rgba(0,122,255,0.30)" }} />
                <p className="text-[15px] font-semibold" style={{ color: "#0A2A66" }}>Nenhum endereço cadastrado</p>
                <p className="text-[13px]" style={{ color: "#8E8E93" }}>Adicione seus locais de atendimento para aparecer na busca.</p>
                <Link href="/cadastro" className="mt-2 rounded-[14px] px-6 py-3 text-[14px] font-semibold text-white" style={{ background: "#007AFF" }}>Adicionar endereço</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {enderecos.map((e) => (
                  <EnderecoCard key={e.id} endereco={e} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Barra lateral */}
        <aside className="flex flex-col gap-6">
          {/* Pedidos de adesão à clínica — destaque no topo quando houver pendência.
              Independe de CRO (o dono pode não ter CRO e mesmo assim decidir quem entra). */}
          {adesoesPendentes > 0 && (
            <Link
              href="/pro/adesoes"
              className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border p-4 transition-colors"
              style={{ background: "rgba(0,122,255,0.06)", borderColor: "rgba(0,122,255,0.25)" }}
            >
              <span className="flex items-center gap-2.5">
                <UserPlus size={18} style={{ color: "#007AFF" }} />
                <span>
                  <span className="block text-[15px] font-bold text-brand-navy">Pedidos de adesão</span>
                  <span className="block text-[12px] text-ink-muted">Dentistas querem entrar na sua clínica</span>
                </span>
              </span>
              <span
                className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-[13px] font-bold text-white"
                style={{ background: "#e6004c" }}
              >
                {adesoesPendentes}
              </span>
            </Link>
          )}

          <section className="rounded-2xl border border-white/60 bg-white/90 shadow-[0_2px_8px_rgba(16,24,64,0.05)] backdrop-blur p-5">
            <h2 className="mb-3 text-lg font-bold text-brand-navy">Sua bio</h2>
            <BioEditor bioInicial={pro.bio ?? ""} />
          </section>

          {/* Locação de salas (B2B) — SÓ com CRO aprovado. Botão único → painel, com
              badge de pendências (recebidas pendentes + pagamentos a resolver). */}
          {pro.cro_verificado && (
            <section className="rounded-2xl border border-white/60 bg-white/90 shadow-[0_2px_8px_rgba(16,24,64,0.05)] backdrop-blur p-5">
              <div className="mb-3 flex items-center gap-2">
                <DoorOpen size={18} style={{ color: "#007AFF" }} />
                <h2 className="text-lg font-bold text-brand-navy">Locação de Salas</h2>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/pro/negocios"
                  className="flex min-h-[48px] items-center justify-between gap-3 rounded-[14px] px-4 py-3 text-[14px] font-semibold text-white transition-all hover:brightness-110"
                  style={{ background: "#007AFF", boxShadow: "0 4px 16px rgba(0,122,255,0.22)" }}
                >
                  <span className="flex items-center gap-2">
                    <Settings size={16} /> Gerenciamento
                  </span>
                  {pendencias.total > 0 && (
                    <span
                      className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[12px] font-bold text-white"
                      style={{ background: "#e6004c" }}
                      title="Pendências"
                    >
                      {pendencias.total}
                    </span>
                  )}
                </Link>
                <Link
                  href="/coworking"
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-[14px] font-semibold text-brand-blue transition-colors hover:bg-brand-blue/5"
                  style={{ borderColor: "rgba(0,122,255,0.35)" }}
                >
                  Procurar salas para alugar
                </Link>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-white/60 bg-white/90 shadow-[0_2px_8px_rgba(16,24,64,0.05)] backdrop-blur p-5">
            <h2 className="mb-3 text-lg font-bold text-brand-navy">Conta</h2>
            <AcoesConta />
          </section>

          <Link href="/" className="text-center text-sm font-medium text-ink-muted hover:text-ink">
            ← Voltar para o site
          </Link>
        </aside>
      </div>

      {/* Avaliações nota: usa Estrelas para coerência visual com o resto do site */}
      {temAvaliacoes && resumo && (
        <div className="mt-8">
          <Estrelas nota={resumo.media_geral} total={resumo.total_avaliacoes} />
        </div>
      )}
    </Container>
  );
}

function Metrica({
  titulo,
  total,
  ult30,
  icone,
  fundo,
}: {
  titulo: string;
  total: number;
  ult30: number;
  icone: React.ReactNode;
  fundo: string;
}) {
  return (
    <div className="rounded-[14px] p-4" style={{ background: fundo }}>
      <div className="mb-1 flex items-center gap-1.5">
        {icone}
        <p className="text-xs font-semibold text-ink-muted">{titulo}</p>
      </div>
      <p className="text-3xl font-bold leading-none text-brand-navy">{total ?? 0}</p>
      <p className="mt-1.5 text-xs text-ink-muted">{ult30 ?? 0} nos últimos 30 dias</p>
    </div>
  );
}
