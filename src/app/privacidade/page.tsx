// ═══════════════════════════════════════════════════════════════════════════════
// POLÍTICA DE PRIVACIDADE — /privacidade (Server Component, estática).
//
// Conteúdo (LGPD) portado do site-k11, palavra por palavra. Navegação por âncoras
// (#secao), sem JavaScript. A retenção de geolocalização do paciente é ZERO na
// exclusão (expurgo imediato) — ver memória [[regua-lembrete-cadastro]] e docs.
//
// OBS: "[Inserir endereço da empresa]" segue como placeholder cadastral pendente.
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o CuraDentes coleta, usa, armazena e compartilha dados pessoais, em conformidade com a LGPD (Lei nº 13.709/2018).",
  alternates: { canonical: "/privacidade" },
};

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

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-lg font-bold text-brand-navy">{titulo}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function Topico({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-ink">{label}</p>
      <div className="mt-1 space-y-3">{children}</div>
    </div>
  );
}

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-6">
      {itens.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function Privacidade() {
  return (
    <Container className="py-10 md:py-14">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-navy">Política de Privacidade</h1>
        <p className="mt-1 text-sm text-ink-muted">Última atualização: 3 de junho de 2026</p>
      </div>

      <div className="flex flex-col gap-10 md:flex-row">
        {/* Sidebar (âncoras) — desktop */}
        <nav className="hidden w-64 flex-shrink-0 md:block">
          <div className="sticky top-24 rounded-2xl border border-black/10 bg-white p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Nesta página</p>
            <ul className="flex flex-col gap-0.5">
              {SECOES.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-lg px-3 py-2 text-[13px] text-ink-soft transition-colors hover:bg-black/5">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Conteúdo */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-10 rounded-3xl border border-black/8 bg-white p-6 md:p-10">
            <Secao id="introducao" titulo="1. Introdução">
              <p>
                A <strong>CuraDentes</strong> (“nós”, “nosso” ou “plataforma”) está comprometida com a
                proteção da privacidade dos seus usuários. Esta Política de Privacidade descreve como
                coletamos, usamos, armazenamos e compartilhamos suas informações pessoais quando você
                utiliza nossa plataforma, em conformidade com a <strong>Lei Geral de Proteção de Dados
                Pessoais (LGPD — Lei nº 13.709/2018)</strong>.
              </p>
              <p>
                Ao utilizar o CuraDentes, você declara estar ciente e de acordo com as práticas descritas
                neste documento. Se você é um dentista cadastrado em nossa plataforma (“CuraDentes Pro”),
                a aceitação formal ocorre na etapa de consentimento do cadastro.
              </p>
            </Secao>

            <Secao id="dados-coletados" titulo="2. Dados que coletamos">
              <p>Coletamos as seguintes categorias de dados pessoais:</p>
              <Topico label="2.1. Dados dos dentistas (CuraDentes Pro)">
                <Lista
                  itens={[
                    "Nome completo, e-mail, telefone celular e CPF",
                    "CRO (Conselho Regional de Odontologia) e ano de formação",
                    "Foto de perfil (fornecida voluntariamente)",
                    "Dados de endereço: logradouro, número, complemento, bairro, cidade, estado e CEP",
                    "Telefone e WhatsApp do consultório",
                    "Procedimentos realizados, convênios aceitos e formas de pagamento",
                    "Agenda de horários de atendimento",
                    "Política de cancelamento e observações",
                    "Geolocalização (latitude/longitude) gerada automaticamente a partir do endereço",
                  ]}
                />
              </Topico>
              <Topico label="2.2. Dados dos pacientes">
                <Lista
                  itens={[
                    "Nome completo e e-mail (fornecidos pelo login do Google)",
                    "Foto de perfil (fornecida pelo Google, quando disponível)",
                    "Localização aproximada (latitude/longitude) quando autorizada pelo navegador",
                  ]}
                />
              </Topico>
              <Topico label="2.3. Dados de avaliações">
                <Lista
                  itens={[
                    "Nota (1 a 5) atribuída a um dentista",
                    "Especialidade avaliada",
                    "Registro do paciente avaliador (ID anônimo)",
                  ]}
                />
              </Topico>
              <Topico label="2.4. Dados coletados automaticamente">
                <Lista
                  itens={[
                    "Endereço IP e dados de navegação (user agent, páginas acessadas)",
                    "Preferências de busca e filtros utilizados",
                    "Dados de cache armazenados localmente no navegador (localStorage)",
                  ]}
                />
              </Topico>
            </Secao>

            <Secao id="finalidade" titulo="3. Finalidade do tratamento">
              <p>Utilizamos seus dados para as seguintes finalidades:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Viabilizar a plataforma:</strong> conectar pacientes a dentistas, exibir perfis profissionais, permitir busca por localização e especialidade.</li>
                <li><strong>Gerenciar sua conta:</strong> autenticação, recuperação de senha e manutenção do cadastro profissional.</li>
                <li><strong>Recomendações:</strong> exibir dentistas próximos com base na sua localização ou filtros selecionados.</li>
                <li><strong>Melhoria do serviço:</strong> analisar padrões de uso para aprimorar a experiência e corrigir falhas.</li>
                <li>
                  <strong>Comunicação:</strong> enviar <strong>e-mails essenciais</strong> ao serviço
                  (confirmação de cadastro, segurança, recuperação de senha e avisos sobre a plataforma)
                  e, <strong>mediante o seu consentimento (opt-in)</strong>, e-mails opcionais de
                  desempenho do perfil, novidades/dicas e ofertas de parceiros. Você pode revogar o
                  consentimento e cancelar os e-mails opcionais a qualquer momento pelo link de
                  descadastro presente nesses e-mails ou na sua conta. Os e-mails essenciais não dependem
                  desse consentimento.
                </li>
                <li><strong>Segurança:</strong> prevenir fraudes, garantir a integridade dos dados e cumprir obrigações legais.</li>
              </ul>
            </Secao>

            <Secao id="base-legal" titulo="4. Base legal para o tratamento">
              <p>Em conformidade com o art. 7º da LGPD, as bases legais que utilizamos são:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Consentimento (art. 7º, I):</strong> para o cadastro de dentistas, mediante aceite expresso na etapa de consentimento.</li>
                <li><strong>Execução de contrato (art. 7º, V):</strong> para viabilizar o funcionamento da plataforma e a conexão entre pacientes e dentistas.</li>
                <li><strong>Legítimo interesse (art. 7º, IX):</strong> para análises internas, melhoria do serviço e segurança da plataforma.</li>
                <li><strong>Obrigação legal (art. 7º, II):</strong> para cumprir requisitos regulatórios e ordens judiciais.</li>
              </ul>
            </Secao>

            <Secao id="compartilhamento" titulo="5. Compartilhamento de dados">
              <p>Compartilhamos seus dados apenas nas seguintes circunstâncias:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Com prestadores de serviço:</strong> como o Supabase (hospedagem de banco de dados e autenticação) e ViaCEP (consulta de CEP). Esses parceiros são contratualmente obrigados a proteger seus dados.</li>
                <li><strong>Com outros usuários:</strong> os dados do perfil do dentista (nome, CRO, endereços, agenda, convênios) são públicos para pacientes que utilizam a busca.</li>
                <li><strong>Por determinação legal:</strong> mediante ordem judicial ou requisição de autoridade competente.</li>
              </ul>
              <p className="text-ink-muted">
                O CuraDentes <strong>não</strong> vende dados pessoais para terceiros.
              </p>
            </Secao>

            <Secao id="cookies" titulo="6. Cookies e tecnologias semelhantes">
              <p>
                Utilizamos o <strong>localStorage</strong> do navegador para armazenar preferências de
                navegação e dados de cache, como:
              </p>
              <Lista
                itens={[
                  "Rascunho de cadastro (para evitar perda de dados durante o registro)",
                  "Cache de consultas de CEP (para evitar reconsultas desnecessárias à API ViaCEP)",
                  "Cache de localização do usuário (para lembrar sua cidade por 30 minutos)",
                  "Cache de resultados de busca (para exibição offline-first)",
                ]}
              />
              <p>
                Atualmente não utilizamos cookies de rastreamento ou publicidade. Caso isso mude,
                atualizaremos esta política com antecedência.
              </p>
            </Secao>

            <Secao id="direitos" titulo="7. Seus direitos (LGPD)">
              <p>
                Nos termos da LGPD (arts. 17 a 22), você possui os seguintes direitos em relação aos seus
                dados pessoais:
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { direito: "Confirmação e acesso", desc: "Saber se tratamos seus dados e acessá-los" },
                  { direito: "Correção", desc: "Corrigir dados incompletos, inexatos ou desatualizados" },
                  { direito: "Anonimização ou exclusão", desc: "Solicitar a eliminação de dados desnecessários" },
                  { direito: "Portabilidade", desc: "Solicitar a transferência a outro fornecedor" },
                  { direito: "Revogação do consentimento", desc: "Retirar seu consentimento a qualquer momento" },
                  { direito: "Oposição", desc: "Opor-se ao tratamento com base no legítimo interesse" },
                  { direito: "Informação sobre compartilhamento", desc: "Saber com quais entidades compartilhamos seus dados" },
                ].map((item) => (
                  <div key={item.direito} className="rounded-xl border border-brand-blue/12 bg-brand-blue/4 p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0 text-success">✓</span>
                      <div>
                        <p className="text-[13px] font-semibold text-ink">{item.direito}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p>
                Para exercer seus direitos, entre em contato conosco através do e-mail ou formulário
                indicados na seção “Contato” abaixo. Responderemos em até <strong>15 dias</strong>.
              </p>
            </Secao>

            <Secao id="retencao" titulo="8. Prazo de retenção">
              <p>
                Armazenamos seus dados pessoais pelo período necessário para cumprir as finalidades
                descritas nesta política:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Dentistas:</strong> enquanto a conta permanecer ativa. Após exclusão da conta, os dados serão anonimizados ou eliminados em até 90 dias, exceto quando houver obrigação legal de retenção.</li>
                <li>
                  <strong>Pacientes:</strong> enquanto o usuário mantiver seu vínculo com a plataforma
                  (login social). Ao excluir a conta, sua <strong>geolocalização (latitude/longitude) é
                  eliminada imediatamente</strong> — não há retenção da localização precisa após o
                  “esquecimento”. Avaliações anônimas podem ser mantidas após o desligamento.
                </li>
                <li><strong>Dados de cache local:</strong> por até 7 dias (CEP) ou 30 minutos (localização), ou até a limpeza manual do navegador.</li>
              </ul>
            </Secao>

            <Secao id="seguranca" titulo="9. Segurança dos dados">
              <p>Adotamos medidas técnicas e organizacionais para proteger seus dados pessoais:</p>
              <Lista
                itens={[
                  "Criptografia em trânsito via HTTPS/TLS",
                  "Senhas armazenadas com hash (bcrypt) pelo Supabase Auth",
                  "Políticas de acesso baseadas em função (RLS — Row Level Security) no banco de dados",
                  "Separação lógica dos dados entre diferentes usuários",
                  "Token de autenticação JWT com expiração",
                  "Práticas de desenvolvimento seguro (sanitização de inputs, proteção contra XSS e CSRF)",
                ]}
              />
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
                Para exercer seus direitos, esclarecer dúvidas ou reportar preocupações sobre esta
                política, entre em contato conosco:
              </p>
              <div className="rounded-2xl border border-brand-blue/12 bg-brand-blue/4 p-4">
                <p className="text-sm"><strong>E-mail:</strong> privacidade@curadentes.com.br</p>
                <p className="mt-2 text-sm"><strong>Endereço:</strong> [Inserir endereço da empresa]</p>
                <p className="mt-3 text-[13px] text-ink-muted">Responderemos em até 15 dias úteis.</p>
              </div>
            </Secao>
          </div>
        </div>
      </div>
    </Container>
  );
}
