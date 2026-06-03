import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const SECOES = [
  { id: "aceitacao", label: "Aceitação" },
  { id: "definicoes", label: "Definições" },
  { id: "cadastro-paciente", label: "Cadastro do paciente" },
  { id: "cadastro-dentista", label: "Cadastro do dentista" },
  { id: "uso-plataforma", label: "Uso da plataforma" },
  { id: "obrigacoes", label: "Obrigações" },
  { id: "responsabilidade", label: "Responsabilidade" },
  { id: "propriedade-intelectual", label: "Propriedade intelectual" },
  { id: "cancelamento", label: "Cancelamento" },
  { id: "disposicoes", label: "Disposições gerais" },
  { id: "contato", label: "Contato" },
];

function Secao({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-[18px] font-bold text-[#0A2A66] mb-4">{titulo}</h2>
      <div className="text-[15px] leading-relaxed text-[#3A3A3C] space-y-3">{children}</div>
    </section>
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
  const [menuAberto, setMenuAberto] = useState(false);

  const handleNavClick = (id: string) => {
    setMenuAberto(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
      <Header />

      <main className="container mx-auto px-5 md:px-8 lg:px-16 py-8 md:py-12">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-[#E6004C]/10 flex items-center justify-center flex-shrink-0">
            <FileText size={20} style={{ color: "#E6004C" }} />
          </div>
          <div>
            <h1 className="text-[24px] md:text-[28px] font-bold text-[#0A2A66]">Termos de Uso</h1>
            <p className="text-[13px]" style={{ color: "#8E8E93" }}>Última atualização: 3 de junho de 2026</p>
          </div>
        </div>

        {/* Menu mobile */}
        <div className="md:hidden mb-6">
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] bg-white text-[14px] font-semibold text-[#0A2A66]"
            style={{ border: "0.5px solid rgba(60,60,67,0.12)" }}
          >
            Navegar pelos tópicos
            <ChevronDown size={18} className={`transition-transform ${menuAberto ? "rotate-180" : ""}`} />
          </button>
          {menuAberto && (
            <nav className="mt-2 bg-white rounded-[12px] p-2" style={{ border: "0.5px solid rgba(60,60,67,0.12)" }}>
              {SECOES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleNavClick(s.id)}
                  className="block w-full text-left px-3 py-2.5 text-[14px] rounded-[8px] hover:bg-[#F2F2F7] transition-colors"
                  style={{ color: "#3A3A3C" }}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          )}
        </div>

        <div className="flex gap-10">
          {/* Sidebar desktop */}
          <nav className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-[16px] p-4" style={{ border: "0.5px solid rgba(60,60,67,0.10)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8E8E93" }}>Nesta página</p>
              <ul className="flex flex-col gap-0.5">
                {SECOES.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => handleNavClick(s.id)}
                      className="w-full text-left px-3 py-2 text-[13px] rounded-[8px] hover:bg-[#F2F2F7] transition-colors"
                      style={{ color: "#3A3A3C" }}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-[20px] p-6 md:p-10 flex flex-col gap-10" style={{ border: "0.5px solid rgba(60,60,67,0.08)" }}>

              <Secao id="aceitacao" titulo="1. Aceitação dos Termos">
                <p>
                  Ao utilizar o <strong>CuraDentes</strong> ("plataforma"), você declara ter lido,
                  compreendido e concordado com estes Termos de Uso. Se você não concorda com qualquer
                  parte destes termos, não utilize a plataforma.
                </p>
                <p>
                  Para dentistas ("CuraDentes Pro"), a aceitação formal ocorre na etapa de consentimento
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

              <Secao id="uso-plataforma" titulo="5. Uso da plataforma">
                <p>A plataforma CuraDentes conecta pacientes a dentistas. Não realizamos agendamentos,
                não intermediamos consultas e não somos responsáveis pela qualidade do serviço
                prestado pelos profissionais cadastrados.</p>

                <Topico label="5.1. Papel do CuraDentes">
                  <p>
                    O CuraDentes atua exclusivamente como um diretório e motor de busca de
                    profissionais de odontologia. Não somos uma clínica odontológica, não prestamos
                    serviços de saúde e não realizamos diagnósticos.
                  </p>
                </Topico>

                <Topico label="5.2. Avaliações">
                  <p>
                    Pacientes podem avaliar dentistas com base em suas experiências. As avaliações
                    refletem a opinião pessoal do paciente e não representam a posição do CuraDentes.
                    Reservamo-nos o direito de remover avaliações que violem estes termos (discurso
                    de ódio, informações falsas, spam).
                  </p>
                </Topico>
              </Secao>

              <Secao id="obrigacoes" titulo="6. Obrigações dos usuários">
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

              <Secao id="responsabilidade" titulo="7. Responsabilidade">
                <Topico label="7.1. Limitação de responsabilidade">
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

                <Topico label="7.2. Responsabilidade do dentista">
                  <p>
                    O dentista é civil e criminalmente responsável pelos serviços odontológicos que
                    presta. O CuraDentes não exerce qualquer controle ou supervisão sobre a atividade
                    profissional dos dentistas cadastrados.
                  </p>
                </Topico>

                <Topico label="7.3. Indenização">
                  <p>
                    O usuário concorda em indenizar o CuraDentes por quaisquer perdas, danos ou
                    custos decorrentes do uso inadequado da plataforma ou da violação destes termos.
                  </p>
                </Topico>
              </Secao>

              <Secao id="propriedade-intelectual" titulo="8. Propriedade intelectual">
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

              <Secao id="cancelamento" titulo="9. Cancelamento e suspensão">
                <Topico label="9.1. Pelo usuário">
                  <p>
                    O dentista pode solicitar a exclusão de sua conta a qualquer momento, entrando
                    em contato conosco. Os dados serão anonimizados ou eliminados conforme a Política
                    de Privacidade.
                  </p>
                </Topico>

                <Topico label="9.2. Pela plataforma">
                  <p>
                    O CuraDentes se reserva o direito de suspender ou encerrar contas que violem
                    estes Termos de Uso, sem prejuízo das demais medidas legais cabíveis.
                  </p>
                </Topico>
              </Secao>

              <Secao id="disposicoes" titulo="10. Disposições gerais">
                <Topico label="10.1. Legislação aplicável">
                  <p>
                    Estes Termos de Uso são regidos pela legislação brasileira, em especial pelo
                    Código Civil (Lei nº 10.406/2002) e pelo Marco Civil da Internet (Lei nº
                    12.965/2014).
                  </p>
                </Topico>

                <Topico label="10.2. Foro">
                  <p>
                    Fica eleito o foro da comarca de [cidade/estado] para dirimir quaisquer
                    controvérsias decorrentes destes Termos, com renúncia a qualquer outro foro,
                    por mais privilegiado que seja.
                  </p>
                </Topico>

                <Topico label="10.3. Alterações">
                  <p>
                    Estes Termos podem ser alterados a qualquer momento. Dentistas cadastrados serão
                    notificados por e-mail sobre alterações significativas. O uso continuado da
                    plataforma após as alterações constitui aceitação dos novos termos.
                  </p>
                </Topico>

                <Topico label="10.4. Nulidade parcial">
                  <p>
                    Se qualquer cláusula destes Termos for considerada inválida ou inexequível, as
                    demais cláusulas permanecerão em pleno vigor.
                  </p>
                </Topico>
              </Secao>

              <Secao id="contato" titulo="11. Contato">
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
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Topico({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="font-semibold text-[#1C1C1E]">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
