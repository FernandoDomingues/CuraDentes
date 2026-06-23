// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: TermosDeUso (/termos) — Server Component.
//
// Termos e condições de uso da plataforma CuraDentes. Conteúdo jurídico portado
// do site-k11 palavra por palavra, com a mesma formatação visual (cores inline,
// bordas 0.5px, ícone FileText, sidebar de âncoras e menu mobile).
//
// A navegação interativa (sidebar + menu mobile com smooth-scroll) fica no
// client component TermosNav; todo o texto legal é renderizado no servidor.
// Header/Footer vêm do layout global — não são incluídos aqui.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import TermosNav from "./TermosNav";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos e condições de uso da plataforma CuraDentes para pacientes e dentistas (CuraDentes Pro).",
  alternates: { canonical: "/termos" },
};

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-[18px] font-bold text-[#0A2A66] mb-4">{titulo}</h2>
      <div className="text-[15px] leading-relaxed text-[#3A3A3C] space-y-3">{children}</div>
    </section>
  );
}

function Topico({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="font-semibold text-[#1C1C1E]">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="list-disc pl-6 space-y-1.5">
      {itens.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function TermosDeUso() {
  return (
    <main className="container mx-auto px-5 md:px-8 lg:px-16 py-8 md:py-12">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-[#E6004C]/10 flex items-center justify-center flex-shrink-0">
          <FileText size={20} style={{ color: "#E6004C" }} />
        </div>
        <div>
          <h1 className="text-[24px] md:text-[28px] font-bold text-[#0A2A66]">Termos de Uso</h1>
          <p className="text-[13px]" style={{ color: "#8E8E93" }}>Última atualização: 15 de junho de 2026</p>
        </div>
      </div>

      {/* Navegação (menu mobile + sidebar desktop) */}
      <TermosNav>
        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-[20px] p-6 md:p-10 flex flex-col gap-10" style={{ border: "0.5px solid rgba(60,60,67,0.08)" }}>

            <Secao id="aceitacao" titulo="1. Aceitação dos Termos">
              <p>
                Ao utilizar o <strong>CuraDentes</strong> (&quot;plataforma&quot;), você declara ter lido,
                compreendido e concordado com estes Termos de Uso. Se você não concorda com qualquer
                parte destes termos, não utilize a plataforma.
              </p>
              <p>
                Para dentistas (&quot;CuraDentes Pro&quot;), a aceitação formal ocorre na etapa de consentimento
                do cadastro. Para pacientes, o aceite ocorre no momento do login.
              </p>
            </Secao>

            <Secao id="definicoes" titulo="2. Definições">
              <div className="grid grid-cols-1 gap-2">
                {[
                  { termo: "Plataforma", def: "O site CuraDentes e todos os seus serviços, acessível através do endereço curadentes.com.br" },
                  { termo: "Paciente", def: "Usuário que busca dentistas para agendamento de consultas" },
                  { termo: "Dentista / Profissional", def: "Profissional de odontologia cadastrado no CuraDentes Pro" },
                  { termo: "CuraDentes Pro", def: "Plano de cadastro profissional que permite ao dentista gerenciar seu perfil e ser encontrado por pacientes" },
                  { termo: "LGPD", def: "Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)" },
                ].map((item) => (
                  <div key={item.termo} className="p-3 rounded-[10px]" style={{ background: "rgba(60,60,67,0.03)" }}>
                    <p className="text-[13px] font-semibold text-[#1C1C1E]">{item.termo}</p>
                    <p className="text-[13px] mt-0.5" style={{ color: "#8E8E93" }}>{item.def}</p>
                  </div>
                ))}
              </div>
            </Secao>

            <Secao id="cadastro-paciente" titulo="3. Cadastro do paciente">
              <p>
                Pacientes podem acessar a plataforma por meio de login social (Google). Ao fazê-lo,
                autorizam o CuraDentes a coletar nome, e-mail e foto do perfil do Google para fins
                de identificação e funcionamento da plataforma.
              </p>
              <p>
                O paciente é responsável pela veracidade das informações fornecidas e pela guarda
                de suas credenciais de acesso.
              </p>
            </Secao>

            <Secao id="cadastro-dentista" titulo="4. Cadastro do dentista (CuraDentes Pro)">
              <p>
                O cadastro de dentista é realizado em etapas e requer o preenchimento de dados
                pessoais e profissionais, conforme descrito na Política de Privacidade.
              </p>

              <Topico label="4.1. Veracidade das informações">
                <p>
                  O dentista declara, sob as penas da lei, que todas as informações fornecidas são
                  verdadeiras, especialmente o CRO (Conselho Regional de Odontologia). A plataforma
                  se reserva o direito de verificar a autenticidade dos dados e suspender contas
                  que contenham informações falsas.
                </p>
              </Topico>

              <Topico label="4.2. Responsabilidade pelo perfil">
                <p>
                  O dentista é o único responsável pelo conteúdo publicado em seu perfil, incluindo
                  textos, horários, convênios e formas de pagamento. A plataforma não se
                  responsabiliza por informações desatualizadas ou incorretas.
                </p>
              </Topico>

              <Topico label="4.3. Exclusividade de cadastro">
                <p>
                  Cada dentista pode possuir apenas uma conta ativa. Cadastros duplicados poderão
                  ser removidos sem aviso prévio.
                </p>
              </Topico>
            </Secao>

            <Secao id="planos" titulo="5. Planos, gratuidade e pagamento">
              <p>
                O acesso ao <strong>CuraDentes Pro</strong> encontra-se atualmente em fase
                <strong> Beta gratuita</strong>. Durante esse período, o dentista utiliza a
                plataforma sem qualquer cobrança.
              </p>

              <Topico label="5.1. Transição para plano pago">
                <p>
                  A partir de <strong>1º de julho de 2027</strong>, o acesso ao CuraDentes Pro
                  passará a ser um serviço pago, mediante <strong>plano mensal no valor de
                  R$ 49,99 (quarenta e nove reais e noventa e nove centavos) por mês</strong>, por dentista. A continuidade
                  do uso da plataforma a partir dessa data ficará condicionada à contratação e ao
                  pagamento do plano.
                </p>
              </Topico>

              <Topico label="5.2. Aviso prévio e direito de não contratar">
                <p>
                  O dentista será notificado por e-mail, com antecedência mínima de 30 (trinta)
                  dias do início da cobrança, sobre as condições do plano, a forma de pagamento e
                  os meios de contratação. Caso não deseje contratar, o dentista poderá deixar de
                  utilizar a plataforma e/ou solicitar a exclusão da sua conta, sem qualquer ônus,
                  antes do início da vigência da cobrança. <strong>Nenhum valor será cobrado sem o
                  aceite expresso do dentista ao plano.</strong>
                </p>
              </Topico>

              <Topico label="5.3. Reajustes e alterações de preço">
                <p>
                  O valor do plano poderá ser reajustado no máximo uma vez a cada 12 (doze) meses,
                  com base na variação de índice oficial de inflação (IPCA/IBGE) ou índice que o
                  substitua. Eventuais alterações de preço serão comunicadas com antecedência
                  mínima de 30 (trinta) dias, facultando ao dentista o cancelamento sem multa
                  antes da entrada em vigor do novo valor.
                </p>
              </Topico>

              <Topico label="5.4. Gratuidade para pacientes">
                <p>
                  O uso da plataforma pelos <strong>pacientes</strong> é e permanecerá gratuito.
                  A cobrança prevista nesta seção aplica-se exclusivamente ao plano profissional
                  (CuraDentes Pro).
                </p>
              </Topico>
            </Secao>

            <Secao id="uso-plataforma" titulo="6. Uso da plataforma">
              <p>A plataforma CuraDentes conecta pacientes a dentistas. Não realizamos agendamentos,
              não intermediamos consultas e não somos responsáveis pela qualidade do serviço
              prestado pelos profissionais cadastrados.</p>

              <Topico label="6.1. Papel do CuraDentes">
                <p>
                  O CuraDentes atua exclusivamente como um diretório e motor de busca de
                  profissionais de odontologia. Não somos uma clínica odontológica, não prestamos
                  serviços de saúde e não realizamos diagnósticos.
                </p>
              </Topico>

              <Topico label="6.2. Avaliações">
                <p>
                  Pacientes podem avaliar dentistas com base em suas experiências. As avaliações
                  refletem a opinião pessoal do paciente e não representam a posição do CuraDentes.
                  Reservamo-nos o direito de remover avaliações que violem estes termos (discurso
                  de ódio, informações falsas, spam).
                </p>
              </Topico>
            </Secao>

            <Secao id="obrigacoes" titulo="7. Obrigações dos usuários">
              <p>Ao utilizar a plataforma, você concorda em:</p>
              <Lista itens={[
                "Não fornecer informações falsas ou fraudulentas",
                "Não utilizar a plataforma para fins ilegais ou não autorizados",
                "Não reproduzir, distribuir ou modificar o conteúdo da plataforma sem autorização",
                "Não coletar dados de outros usuários de forma automatizada (scraping)",
                "Não publicar conteúdo ofensivo, difamatório, discriminatório ou que viole direitos de terceiros",
                "Não tentar acessar áreas restritas da plataforma sem autorização",
                "Manter seus dados de cadastro atualizados",
              ]} />
            </Secao>

            <Secao id="responsabilidade" titulo="8. Responsabilidade">
              <Topico label="8.1. Limitação de responsabilidade">
                <p>
                  O CuraDentes não se responsabiliza por danos diretos ou indiretos decorrentes de:
                </p>
                <Lista itens={[
                  "Atendimento odontológico prestado pelos profissionais cadastrados",
                  "Informações desatualizadas ou incorretas nos perfis dos dentistas",
                  "Indisponibilidade temporária da plataforma por manutenção ou falhas técnicas",
                  "Perda de dados decorrente de ação do usuário (limpeza de cache, exclusão de conta)",
                  "Atos de terceiros (hackers, malware) desde que adotadas as medidas de segurança cabíveis",
                ]} />
              </Topico>

              <Topico label="8.2. Responsabilidade do dentista">
                <p>
                  O dentista é civil e criminalmente responsável pelos serviços odontológicos que
                  presta. O CuraDentes não exerce qualquer controle ou supervisão sobre a atividade
                  profissional dos dentistas cadastrados.
                </p>
              </Topico>

              <Topico label="8.3. Indenização">
                <p>
                  O usuário concorda em indenizar o CuraDentes por quaisquer perdas, danos ou
                  custos decorrentes do uso inadequado da plataforma ou da violação destes termos.
                </p>
              </Topico>
            </Secao>

            <Secao id="propriedade-intelectual" titulo="9. Propriedade intelectual">
              <p>
                Todos os direitos de propriedade intelectual sobre a plataforma CuraDentes,
                incluindo código-fonte, design, logotipos, marcas e conteúdo editorial, são
                de propriedade exclusiva do CuraDentes.
              </p>
              <p>
                O conteúdo cadastrado pelos dentistas (fotos, textos, horários) é de propriedade
                do respectivo profissional, que concede ao CuraDentes uma licença não exclusiva
                para exibi-lo na plataforma.
              </p>
            </Secao>

            <Secao id="cancelamento" titulo="10. Cancelamento e suspensão">
              <Topico label="10.1. Pelo usuário">
                <p>
                  O dentista pode solicitar a exclusão de sua conta a qualquer momento, entrando
                  em contato conosco. Os dados serão anonimizados ou eliminados conforme a Política
                  de Privacidade.
                </p>
              </Topico>

              <Topico label="10.2. Pela plataforma">
                <p>
                  O CuraDentes se reserva o direito de suspender ou encerrar contas que violem
                  estes Termos de Uso, sem prejuízo das demais medidas legais cabíveis.
                </p>
              </Topico>
            </Secao>

            <Secao id="disposicoes" titulo="11. Disposições gerais">
              <Topico label="11.1. Legislação aplicável">
                <p>
                  Estes Termos de Uso são regidos pela legislação brasileira, em especial pelo
                  Código Civil (Lei nº 10.406/2002) e pelo Marco Civil da Internet (Lei nº
                  12.965/2014).
                </p>
              </Topico>

              <Topico label="11.2. Foro">
                <p>
                  Fica eleito o foro da comarca de [cidade/estado] para dirimir quaisquer
                  controvérsias decorrentes destes Termos, com renúncia a qualquer outro foro,
                  por mais privilegiado que seja.
                </p>
              </Topico>

              <Topico label="11.3. Alterações">
                <p>
                  Estes Termos podem ser alterados a qualquer momento. Dentistas cadastrados serão
                  notificados por e-mail sobre alterações significativas. O uso continuado da
                  plataforma após as alterações constitui aceitação dos novos termos.
                </p>
              </Topico>

              <Topico label="11.4. Nulidade parcial">
                <p>
                  Se qualquer cláusula destes Termos for considerada inválida ou inexequível, as
                  demais cláusulas permanecerão em pleno vigor.
                </p>
              </Topico>
            </Secao>

            <Secao id="contato" titulo="12. Contato">
              <div className="p-4 rounded-[14px]" style={{ background: "rgba(230,0,76,0.04)", border: "0.5px solid rgba(230,0,76,0.12)" }}>
                <p className="text-[14px]">
                  Para dúvidas, reclamações ou notificações relacionadas a estes Termos de Uso:
                </p>
                <p className="text-[14px] mt-2">
                  <strong>E-mail:</strong> contato@curadentes.com.br
                </p>
              </div>
            </Secao>
          </div>
        </div>
      </TermosNav>
    </main>
  );
}
