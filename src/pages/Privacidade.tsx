// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA: Privacidade (/privacidade)
//
// Página de Política de Privacidade da plataforma CuraDentes.
// Explica como os dados dos usuários são coletados, armazenados e tratados (LGPD).
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Check, ChevronDown, Shield } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const SECOES = [
  { id: "introducao", label: "Introdução" },
  { id: "dados-coletados", label: "Dados que coletamos" },
  { id: "finalidade", label: "Finalidade do tratamento" },
  { id: "base-legal", label: "Base legal" },
  { id: "compartilhamento", label: "Compartilhamento de dados" },
  { id: "cookies", label: "Cookies" },
  { id: "direitos", label: "Seus direitos (LGPD)" },
  { id: "retencao", label: "Prazo de retenção" },
  { id: "seguranca", label: "Segurança" },
  { id: "alteracoes", label: "Alterações" },
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

function Topico({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-[#1C1C1E]">{label}</p>
      {children}
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

export default function Privacidade() {
  const [menuAberto, setMenuAberto] = useState(false);

  const handleNavClick = (id: string) => {
    setMenuAberto(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen" style={{ background: "#F2F2F7" }}>
      <Header />

      <main className="container mx-auto px-5 md:px-8 lg:px-16 py-8 md:py-12">
        {/* Cabeçalho da página */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
            <Shield size={20} style={{ color: "#007AFF" }} />
          </div>
          <div>
            <h1 className="text-[24px] md:text-[28px] font-bold text-[#0A2A66]">Política de Privacidade</h1>
            <p className="text-[13px]" style={{ color: "#8E8E93" }}>Última atualização: 3 de junho de 2026</p>
          </div>
        </div>

        {/* Menu mobile (accordion) */}
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
          {/* Sidebar - desktop */}
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
              <Secao id="introducao" titulo="1. Introdução">
                <p>
                  A <strong>CuraDentes</strong> ("nós", "nosso" ou "plataforma") está comprometida com a proteção da
                  privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, usamos,
                  armazenamos e compartilhamos suas informações pessoais quando você utiliza nossa plataforma,
                  em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong>.
                </p>
                <p>
                  Ao utilizar o CuraDentes, você declara estar ciente e de acordo com as práticas descritas neste documento.
                  Se você é um dentista cadastrado em nossa plataforma ("CuraDentes Pro"), a aceitação formal ocorre
                  na etapa de consentimento do cadastro.
                </p>
              </Secao>

              <Secao id="dados-coletados" titulo="2. Dados que coletamos">
                <p>Coletamos as seguintes categorias de dados pessoais:</p>

                <Topico label="2.1. Dados dos dentistas (CuraDentes Pro)">
                  <Lista itens={[
                    "Nome completo, e-mail, telefone celular e CPF",
                    "CRO (Conselho Regional de Odontologia) e ano de formação",
                    "Foto de perfil (fornecida voluntariamente)",
                    "Dados de endereço: logradouro, número, complemento, bairro, cidade, estado e CEP",
                    "Telefone e WhatsApp do consultório",
                    "Procedimentos realizados, convênios aceitos e formas de pagamento",
                    "Agenda de horários de atendimento",
                    "Política de cancelamento e observações",
                    "Geolocalização (latitude/longitude) gerada automaticamente a partir do endereço",
                  ]} />
                </Topico>

                <Topico label="2.2. Dados dos pacientes">
                  <Lista itens={[
                    "Nome completo e e-mail (fornecidos pelo login do Google)",
                    "Foto de perfil (fornecida pelo Google, quando disponível)",
                    "Localização aproximada (latitude/longitude) quando autorizada pelo navegador",
                  ]} />
                </Topico>

                <Topico label="2.3. Dados de avaliações">
                  <Lista itens={[
                    "Nota (1 a 5) atribuída a um dentista",
                    "Especialidade avaliada",
                    "Registro do paciente avaliador (ID anônimo)",
                  ]} />
                </Topico>

                <Topico label="2.4. Dados coletados automaticamente">
                  <Lista itens={[
                    "Endereço IP e dados de navegação (user agent, páginas acessadas)",
                    "Preferências de busca e filtros utilizados",
                    "Dados de cache armazenados localmente no navegador (localStorage)",
                  ]} />
                </Topico>
              </Secao>

              <Secao id="finalidade" titulo="3. Finalidade do tratamento">
                <p>Utilizamos seus dados para as seguintes finalidades:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Viabilizar a plataforma:</strong> conectar pacientes a dentistas, exibir perfis
                    profissionais, permitir busca por localização e especialidade.
                  </li>
                  <li>
                    <strong>Gerenciar sua conta:</strong> autenticação, recuperação de senha e manutenção do
                    cadastro profissional.
                  </li>
                  <li>
                    <strong>Recomendações:</strong> exibir dentistas próximos com base na sua localização
                    ou filtros selecionados.
                  </li>
                  <li>
                    <strong>Melhoria do serviço:</strong> analisar padrões de uso para aprimorar a experiência
                    e corrigir falhas.
                  </li>
                  <li>
                    <strong>Comunicação:</strong> enviar comunicados operacionais (confirmação de cadastro,
                    alterações na plataforma).
                  </li>
                  <li>
                    <strong>Segurança:</strong> prevenir fraudes, garantir a integridade dos dados e
                    cumprir obrigações legais.
                  </li>
                </ul>
              </Secao>

              <Secao id="base-legal" titulo="4. Base legal para o tratamento">
                <p>Em conformidade com o art. 7º da LGPD, as bases legais que utilizamos são:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Consentimento (art. 7º, I):</strong> para o cadastro de dentistas, mediante
                    aceite expresso na etapa de consentimento.
                  </li>
                  <li>
                    <strong>Execução de contrato (art. 7º, V):</strong> para viabilizar o funcionamento da
                    plataforma e a conexão entre pacientes e dentistas.
                  </li>
                  <li>
                    <strong>Legítimo interesse (art. 7º, IX):</strong> para análises internas, melhoria
                    do serviço e segurança da plataforma.
                  </li>
                  <li>
                    <strong>Obrigação legal (art. 7º, II):</strong> para cumprir requisitos regulatórios
                    e ordens judiciais.
                  </li>
                </ul>
              </Secao>

              <Secao id="compartilhamento" titulo="5. Compartilhamento de dados">
                <p>Compartilhamos seus dados apenas nas seguintes circunstâncias:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Com prestadores de serviço:</strong> como o Supabase (hospedagem de banco de dados
                    e autenticação) e ViaCEP (consulta de CEP). Esses parceiros são contratualmente obrigados
                    a proteger seus dados.
                  </li>
                  <li>
                    <strong>Com outros usuários:</strong> os dados do perfil do dentista (nome, CRO, endereços,
                    agenda, convênios) são públicos para pacientes que utilizam a busca.
                  </li>
                  <li>
                    <strong>Por determinação legal:</strong> mediante ordem judicial ou requisição de autoridade
                    competente.
                  </li>
                </ul>
                <p className="mt-3" style={{ color: "#8E8E93" }}>
                  O CuraDentes <strong>não</strong> vende dados pessoais para terceiros.
                </p>
              </Secao>

              <Secao id="cookies" titulo="6. Cookies e tecnologias semelhantes">
                <p>
                  Utilizamos o <strong>localStorage</strong> do navegador para armazenar preferências de
                  navegação e dados de cache, como:
                </p>
                <Lista itens={[
                  "Rascunho de cadastro (para evitar perda de dados durante o registro)",
                  "Cache de consultas de CEP (para evitar reconsultas desnecessárias à API ViaCEP)",
                  "Cache de localização do usuário (para lembrar sua cidade por 30 minutos)",
                  "Cache de resultados de busca (para exibição offline-first)",
                ]} />
                <p className="mt-3">
                  Atualmente não utilizamos cookies de rastreamento ou publicidade. Caso isso mude,
                  atualizaremos esta política com antecedência.
                </p>
              </Secao>

              <Secao id="direitos" titulo="7. Seus direitos (LGPD)">
                <p>
                  Nos termos da LGPD (arts. 17 a 22), você possui os seguintes direitos em relação aos
                  seus dados pessoais:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {[
                    { direito: "Confirmação e acesso", desc: "Saber se tratamos seus dados e acessá-los" },
                    { direito: "Correção", desc: "Corrigir dados incompletos, inexatos ou desatualizados" },
                    { direito: "Anonimização ou exclusão", desc: "Solicitar a eliminação de dados desnecessários" },
                    { direito: "Portabilidade", desc: "Solicitar a transferência a outro fornecedor" },
                    { direito: "Revogação do consentimento", desc: "Retirar seu consentimento a qualquer momento" },
                    { direito: "Oposição", desc: "Opor-se ao tratamento com base no legítimo interesse" },
                    { direito: "Informação sobre compartilhamento", desc: "Saber com quais entidades compartilhamos seus dados" },
                  ].map((item) => (
                    <div
                      key={item.direito}
                      className="p-3 rounded-[12px]"
                      style={{ background: "rgba(0,122,255,0.04)", border: "0.5px solid rgba(0,122,255,0.12)" }}
                    >
                      <div className="flex items-start gap-2">
                        <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#34C759" }} />
                        <div>
                          <p className="text-[13px] font-semibold text-[#1C1C1E]">{item.direito}</p>
                          <p className="text-[12px] mt-0.5" style={{ color: "#8E8E93" }}>{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4">
                  Para exercer seus direitos, entre em contato conosco através do e-mail ou formulário
                  indicados na seção "Contato" abaixo. Responderemos em até <strong>15 dias</strong>.
                </p>
              </Secao>

              <Secao id="retencao" titulo="8. Prazo de retenção">
                <p>Armazenamos seus dados pessoais pelo período necessário para cumprir as finalidades descritas nesta política:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Dentistas:</strong> enquanto a conta permanecer ativa. Após exclusão da conta,
                    os dados serão anonimizados ou eliminados em até 90 dias, exceto quando houver obrigação
                    legal de retenção.
                  </li>
                  <li>
                    <strong>Pacientes:</strong> enquanto o usuário mantiver seu vínculo com a plataforma
                    (login social). Ao excluir a conta, sua <strong>geolocalização (latitude/longitude) é
                    eliminada imediatamente</strong> — não há retenção da localização precisa após o
                    "esquecimento". Avaliações anônimas podem ser mantidas após o desligamento.
                  </li>
                  <li>
                    <strong>Dados de cache local:</strong> por até 7 dias (CEP) ou 30 minutos (localização),
                    ou até a limpeza manual do navegador.
                  </li>
                </ul>
              </Secao>

              <Secao id="seguranca" titulo="9. Segurança dos dados">
                <p>Adotamos medidas técnicas e organizacionais para proteger seus dados pessoais:</p>
                <Lista itens={[
                  "Criptografia em trânsito via HTTPS/TLS",
                  "Senhas armazenadas com hash (bcrypt) pelo Supabase Auth",
                  "Políticas de acesso baseadas em função (RLS — Row Level Security) no banco de dados",
                  "Separação lógica dos dados entre diferentes usuários",
                  "Token de autenticação JWT com expiração",
                  "Práticas de desenvolvimento seguro (sanitização de inputs, proteção contra XSS e CSRF)",
                ]} />
              </Secao>

              <Secao id="alteracoes" titulo="10. Alterações nesta política">
                <p>
                  Esta política pode ser atualizada periodicamente para refletir mudanças em nossas práticas
                  ou na legislação. A data da última atualização está indicada no início do documento.
                </p>
                <p>
                  Notificaremos os dentistas cadastrados sobre alterações significativas por e-mail.
                  Recomendamos que todos os usuários revisem esta página regularmente.
                </p>
              </Secao>

              <Secao id="contato" titulo="11. Contato">
                <p>
                  Para exercer seus direitos, esclarecer dúvidas ou reportar preocupações sobre esta política,
                  entre em contato conosco:
                </p>
                <div className="mt-4 p-4 rounded-[14px]" style={{ background: "rgba(0,122,255,0.04)", border: "0.5px solid rgba(0,122,255,0.12)" }}>
                  <p className="text-[14px]">
                    <strong>E-mail:</strong> privacidade@curadentes.com.br
                  </p>
                  <p className="text-[14px] mt-2">
                    <strong>Endereço:</strong> [Inserir endereço da empresa]
                  </p>
                  <p className="text-[13px] mt-3" style={{ color: "#8E8E93" }}>
                    Responderemos em até 15 dias úteis.
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
