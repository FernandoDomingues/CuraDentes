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
import { redirect } from "next/navigation";
import { getUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { montarEndereco, nomeExibicao, type DentistaRow, type EnderecoRow } from "@/lib/dentistas";
import BioEditor from "./BioEditor";
import AcoesConta from "./AcoesConta";

const AVATAR_PADRAO =
  "https://dsnzgxjuqlalysyfiion.supabase.co/storage/v1/object/public/fotos-dentistas/default-avatar.webp";

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
      .select("id, nome, tratamento, nome_completo, cro, cro_verificado, foto_url, bio, instagram, telefone, lgpd_aceito, deleted_at")
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

  return (
    <Container className="py-10 md:py-12">
      {/* Cadastro incompleto */}
      {!completo && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <p className="font-semibold text-brand-navy">Seu cadastro está incompleto</p>
          <p className="mt-1 text-sm text-ink-soft">
            Conclua o cadastro para que seu perfil apareça nas buscas.
          </p>
          <Link href="/cadastro" className="mt-3 inline-block text-sm font-semibold text-brand-blue hover:underline">
            Completar cadastro →
          </Link>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Image
          src={foto}
          alt={`Foto de ${nome}`}
          width={96}
          height={96}
          className="h-24 w-24 flex-shrink-0 rounded-2xl border border-black/10 object-cover"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-brand-navy">{nome || "Bem-vindo"}</h1>
            {pro.cro_verificado && (
              <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">CRO verificado</span>
            )}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${completo ? "bg-success/10 text-success" : "bg-warning/15 text-warning"}`}>
              {completo ? "Perfil ativo" : "Cadastro incompleto"}
            </span>
          </div>
          {pro.cro && <p className="mt-1 text-sm text-ink-muted">{(pro.cro || "").replace(/\s/g, "")}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pro/perfil" className="rounded-[12px] bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-600">
            Meu perfil
          </Link>
          <Link href="/pro/editor-de-fotos" className="rounded-[12px] border border-black/15 px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-black/5">
            Trocar foto
          </Link>
        </div>
      </div>

      {/* Aviso de transição Beta → pago */}
      <div className="mt-6 rounded-2xl border border-brand-blue/15 bg-brand-soft/60 p-4 text-sm text-ink-soft">
        Você está na <strong>fase Beta gratuita</strong>. A partir de 1º de julho de 2027, o
        CuraDentes Pro passa a R$ 49,99/mês — avisaremos por e-mail com 30 dias de antecedência.{" "}
        <Link href="/termos" className="font-semibold text-brand-blue hover:underline">Ver termos</Link>.
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Coluna principal */}
        <div className="flex flex-col gap-8">
          {/* Métricas */}
          {resumo && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-brand-navy">Métricas do perfil</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Metrica titulo="Visualizações" total={resumo.total_visualizacoes} ult30={resumo.visualizacoes_30d} />
                <Metrica titulo="Cliques no WhatsApp" total={resumo.total_whatsapp} ult30={resumo.whatsapp_30d} />
                <Metrica titulo="Cliques em ligar" total={resumo.total_telefone} ult30={resumo.telefone_30d} />
              </div>
            </section>
          )}

          {/* Pontuação por atividade */}
          {temAvaliacoes && resumo && (
            <section className="rounded-2xl border border-black/8 bg-white p-5">
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-brand-navy">{resumo.media_geral.toFixed(1)}</span>
                <span className="text-sm text-ink-muted">/ 5 · {resumo.total_avaliacoes} avaliações</span>
              </div>
              <div className="flex flex-col gap-3">
                {(resumo.por_atividade ?? [])
                  .slice()
                  .sort((a, b) => b.media_nota - a.media_nota)
                  .map((a) => (
                    <div key={a.nome_atividade}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-ink-soft">{a.nome_atividade}</span>
                        <span className="font-semibold text-ink">{a.media_nota.toFixed(1)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/8">
                        <div className="h-full rounded-full bg-brand-blue" style={{ width: `${(a.media_nota / 5) * 100}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Endereços */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-brand-navy">Seus endereços</h2>
              <Link href="/pro/perfil" className="text-sm font-semibold text-brand-blue hover:underline">Gerenciar</Link>
            </div>
            {enderecos.length === 0 ? (
              <p className="text-ink-muted">Nenhum endereço cadastrado ainda.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {enderecos.map((e) => (
                  <div key={e.id} className={`rounded-2xl border bg-white p-4 ${e.atende_urgencias ? "border-brand-magenta/30" : "border-black/8"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {e.nome_clinica && <p className="font-semibold text-brand-navy">{e.nome_clinica}</p>}
                        <p className="text-sm text-ink-muted">{[e.bairro, e.cidade].filter(Boolean).join(", ")}</p>
                      </div>
                      {e.atende_urgencias && (
                        <span className="rounded-full bg-brand-magenta/10 px-3 py-1 text-xs font-semibold text-brand-magenta">Urgências</span>
                      )}
                    </div>
                    {e.atividades.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {e.atividades.slice(0, 4).map((a) => (
                          <span key={a} className="rounded-lg bg-brand-soft px-2 py-0.5 text-xs text-brand-navy">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Barra lateral */}
        <aside className="flex flex-col gap-6">
          <section className="rounded-2xl border border-black/8 bg-white p-5">
            <h2 className="mb-3 text-lg font-bold text-brand-navy">Sua bio</h2>
            <BioEditor id={pro.id} bioInicial={pro.bio ?? ""} />
          </section>

          <section className="rounded-2xl border border-black/8 bg-white p-5">
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

function Metrica({ titulo, total, ult30 }: { titulo: string; total: number; ult30: number }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-5">
      <p className="text-sm text-ink-muted">{titulo}</p>
      <p className="mt-1 text-3xl font-bold text-brand-navy">{total ?? 0}</p>
      <p className="mt-1 text-xs text-ink-muted">{ult30 ?? 0} nos últimos 30 dias</p>
    </div>
  );
}
