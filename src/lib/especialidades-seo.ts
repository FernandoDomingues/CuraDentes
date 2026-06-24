// ═══════════════════════════════════════════════════════════════════════════════
// CONTEÚDO DE SEO/AEO POR ESPECIALIDADE
//
// Para cada especialidade odontológica guardamos um "pacote" de conteúdo pronto
// para virar uma página rica e indexável: título, descrição, introdução, tópicos
// explicativos, benefícios, perguntas frequentes (FAQ) e links externos de
// referência. É esse conteúdo que faz a página /especialidade/<slug> ser útil para
// o paciente e ser citada por buscadores e IAs.
//
// Conteúdo portado do site-k11 (src/constants/especialidadesSEO.ts), sem alteração
// de texto — só reorganizado para o site-R0.
//
// IMAGENS: as `heroImage` são locais (public/especialidades/*.webp), auto-hospedadas
// no próprio projeto — sem hotlink externo. Origem/licença em CREDITOS.txt na pasta.
// ═══════════════════════════════════════════════════════════════════════════════

/** Uma pergunta+resposta da seção de perguntas frequentes. */
export interface FAQ {
  pergunta: string;
  resposta: string;
}

/** Pacote de conteúdo de SEO de uma especialidade. */
export interface EspecialidadeSEO {
  /** Trecho de URL (ex.: "implante-dentario"). */
  slug: string;
  /** Nome CANÔNICO (igual ao que o dentista cadastra e o banco guarda). */
  nome: string;
  /** Título da aba/<title> e do topo da página. */
  title: string;
  /** Descrição usada na meta description e nas prévias de busca. */
  description: string;
  /** Palavras-chave (apoio ao SEO). */
  keywords: string[];
  /** Imagem de destaque (Storage do Supabase do projeto). */
  heroImage: string;
  /** Parágrafo de abertura explicando a especialidade. */
  introducao: string;
  /** Blocos "título + texto" que explicam o tema em profundidade. */
  topicos: { titulo: string; texto: string }[];
  /** Lista de benefícios (bullets). */
  beneficios: string[];
  /** Perguntas frequentes — viram JSON-LD do tipo FAQPage. */
  faq: FAQ[];
  /** Links de referência externos (autoridade/credibilidade). */
  linksExternos: { label: string; url: string }[];
}

// Base das imagens de especialidade: auto-hospedadas em public/especialidades/
// (servidas em /especialidades/*.webp). Sem hotlink externo; ver CREDITOS.txt.
const IMG = "/especialidades";

export const ESPECIALIDADES_SEO: Record<string, EspecialidadeSEO> = {
  "Clínico Geral": {
    slug: "clinico-geral",
    nome: "Clínico Geral",
    title: "Clínico Geral | Dentista perto de você | CuraDentes",
    description:
      "Encontre o melhor dentista clínico geral perto de você. Consultas de rotina, restaurações, limpeza e prevenção com profissionais qualificados.",
    keywords: [
      "dentista clínico geral",
      "consulta odontológica",
      "dentista perto de mim",
      "clínico geral dentista",
      "prevenção oral",
    ],
    heroImage: `${IMG}/clinico-geral.webp`,
    introducao:
      "O clínico geral é o profissional responsável pelo primeiro contato do paciente com a odontologia. Realiza diagnósticos, prevenção, restaurações e encaminhamentos para especialistas quando necessário. É a porta de entrada para a saúde bucal.",
    topicos: [
      { titulo: "O que faz um clínico geral?", texto: "O dentista clínico geral realiza consultas de rotina, exames clínicos, radiografias, restaurações, limpezas, aplicação de flúor e orientações de higiene bucal. Ele é capacitado para diagnosticar problemas e encaminhar para especialistas." },
      { titulo: "Quando consultar?", texto: "Recomenda-se visitar o clínico geral a cada 6 meses para manutenção preventiva. Também deve ser procurado em casos de dor de dente, sensibilidade, sangramento gengival ou qualquer alteração na boca." },
      { titulo: "Prevenção e diagnóstico precoce", texto: "Consultas regulares ao clínico geral permitem identificar problemas como cáries, doenças gengivais e até lesões bucais em estágios iniciais, quando o tratamento é mais simples e eficaz." },
    ],
    beneficios: [
      "Atendimento humanizado e acolhedor",
      "Diagnóstico precoce de problemas bucais",
      "Encaminhamento para especialistas quando necessário",
      "Prevenção de doenças gengivais e cáries",
      "Orientações personalizadas de higiene oral",
    ],
    faq: [
      { pergunta: "Com que frequência devo ir ao clínico geral?", resposta: "O recomendado é visitar o dentista clínico geral a cada 6 meses para consultas de rotina e limpeza." },
      { pergunta: "Clínico geral faz clareamento?", resposta: "Sim, muitos clínicos gerais realizam clareamento dental. Caso o procedimento seja mais complexo, ele pode encaminhar para um especialista." },
      { pergunta: "Qual a diferença entre clínico geral e especialista?", resposta: "O clínico geral trata de forma ampla a saúde bucal, enquanto o especialista (como ortodontista ou implantodontista) tem formação específica em uma área." },
    ],
    linksExternos: [
      { label: "CFO - Conselho Federal de Odontologia", url: "https://website.cfo.org.br/" },
      { label: "SB Brasil - Saúde Bucal", url: "https://www.gov.br/saude/pt-br/assuntos/saude-bucal" },
    ],
  },

  "Clareamento dental": {
    slug: "clareamento-dental",
    nome: "Clareamento dental",
    title: "Clareamento Dental | Preços e Profissionais | CuraDentes",
    description:
      "Faça clareamento dental com profissionais confiáveis. Compare preços, veja avaliações e agende seu procedimento estético.",
    keywords: ["clareamento dental", "clareamento dentes", "branqueamento dental", "clareamento a laser", "clareamento caseiro"],
    heroImage: `${IMG}/clareamento-dental.webp`,
    introducao:
      "O clareamento dental é um dos procedimentos estéticos mais procurados na odontologia. Devolve o branco natural dos dentes removendo manchas causadas por alimentos, bebidas, tabaco e envelhecimento.",
    topicos: [
      { titulo: "Como funciona o clareamento?", texto: "O clareamento dental utiliza agentes clareadores à base de peróxido de hidrogênio ou peróxido de carbamida que penetram no esmalte e quebram as moléculas de pigmento, clareando os dentes de forma segura." },
      { titulo: "Tipos de clareamento", texto: "Existem duas modalidades principais: o clareamento de consultório (feito pelo dentista com luz ou laser) e o clareamento caseiro (com moldeiras personalizadas e gel de uso noturno). Ambos são eficazes." },
      { titulo: "Cuidados pós-clareamento", texto: "Após o clareamento, evite alimentos pigmentados (café, vinho, refrigerantes) por pelo menos 48 horas. Mantenha uma boa higiene bucal e faça retoques periódicos conforme orientação do dentista." },
    ],
    beneficios: [
      "Sorriso mais branco e jovem",
      "Aumento da autoestima e confiança",
      "Procedimento seguro e minimamente invasivo",
      "Resultados visíveis já nas primeiras sessões",
      "Melhora significativa na aparência facial",
    ],
    faq: [
      { pergunta: "Clareamento dental dói?", resposta: "Pode ocorrer sensibilidade temporária durante e após o procedimento, mas é controlável e desaparece em alguns dias." },
      { pergunta: "Quanto tempo dura o clareamento?", resposta: "Com cuidados adequados, o resultado pode durar de 1 a 3 anos. Evitar alimentos pigmentados prolonga o efeito." },
      { pergunta: "Qual o preço médio do clareamento dental?", resposta: "Os valores variam conforme a técnica e região, geralmente entre R$ 300 e R$ 1.500 por sessão." },
    ],
    linksExternos: [
      { label: "ABO - Associação Brasileira de Odontologia", url: "https://www.abo.org.br/" },
    ],
  },

  "Lentes de contato dental": {
    slug: "lentes-de-contato-dental",
    nome: "Lentes de contato dental",
    title: "Lentes de Contato Dental | Transforme seu Sorriso | CuraDentes",
    description:
      "Lentes de contato dental para um sorriso perfeito. Encontre especialistas em lentes de porcelana, compare preços e avaliações.",
    keywords: ["lentes de contato dental", "lentes de porcelana", "facetas", "lentes dentais", "sorriso perfeito"],
    heroImage: `${IMG}/lentes-de-contato-dental.webp`,
    introducao:
      "As lentes de contato dental são finíssimas lâminas de porcelana ou resina que cobrem a parte frontal dos dentes, corrigindo imperfeições estéticas como manchas, desalinhamentos leves, diastemas e formatos irregulares.",
    topicos: [
      { titulo: "O que são lentes de contato dental?", texto: "São facetas ultrafinas (entre 0,2mm e 0,5mm) confeccionadas sob medida para cada paciente, coladas na superfície dos dentes com cimento odontológico de alta resistência." },
      { titulo: "Como é o procedimento?", texto: "O tratamento envolve 2 a 3 consultas: planejamento digital do sorriso, preparo mínimo dos dentes, moldagem, prova e cimentação das lentes. O resultado é imediato e natural." },
      { titulo: "Cuidados e durabilidade", texto: "Com higiene adequada e visitas regulares ao dentista, as lentes de porcelana duram de 10 a 15 anos. Evite roer unhas, abrir embalagens com os dentes e consumir alimentos muito duros." },
    ],
    beneficios: [
      "Resultado estético imediato e natural",
      "Corrige manchas, diastemas e desalinhamentos",
      "Mínimo desgaste dental (0,2mm a 0,5mm)",
      "Alta durabilidade (10 a 15 anos)",
      "Aumento da autoestima e satisfação pessoal",
    ],
    faq: [
      { pergunta: "Lentes de contato dental quebram fácil?", resposta: "São resistentes quando bem cuidadas, mas podem trincar sob pressão excessiva. Evite mastigar gelo, canetas ou alimentos muito duros." },
      { pergunta: "Qual a diferença entre lente e faceta?", resposta: "A lente é mais fina (0,2-0,5mm) e exige mínimo desgaste. A faceta de porcelana tem espessura maior (0,5-1,5mm) e cobre mais imperfeições." },
      { pergunta: "Quem pode colocar lentes de contato dental?", resposta: "Pacientes com dentes e gengivas saudáveis. É necessário tratar cáries e doenças gengivais antes do procedimento." },
    ],
    linksExternos: [
      { label: "Sociedade Brasileira de Odontologia Estética", url: "https://sboe.com.br/" },
    ],
  },

  "Limpeza": {
    slug: "limpeza",
    nome: "Limpeza",
    title: "Limpeza Dental | Profilaxia e Prevenção | CuraDentes",
    description:
      "Faça limpeza dental regular com profissionais. Remoção de tártaro, placa bacteriana e polimento. Agende sua consulta de profilaxia.",
    keywords: ["limpeza dental", "profilaxia", "limpeza nos dentes", "remoção de tártaro", "raspagem dental"],
    heroImage: `${IMG}/limpeza.webp`,
    introducao:
      "A limpeza dental profissional, também chamada de profilaxia, é um procedimento essencial para manter a saúde bucal. Remove placas bacterianas, tártaro e manchas superficiais que a escovação diária não elimina.",
    topicos: [
      { titulo: "O que é profilaxia dental?", texto: "É a limpeza profunda realizada pelo dentista ou higienista, que inclui raspagem supra e subgengival, uso de jatos de bicarbonato, polimento com pasta profilática e aplicação tópica de flúor." },
      { titulo: "Benefícios da limpeza regular", texto: "Previne cáries, gengivite, periodontite e mau hálito. Além disso, dentes limpos acumulam menos placa, reduzindo o risco de doenças sistêmicas associadas à saúde bucal." },
      { titulo: "Com que frequência fazer?", texto: "A recomendação padrão é a cada 6 meses. Pacientes com maior propensão a cáries ou doença periodontal podem precisar de intervalos menores (3 a 4 meses)." },
    ],
    beneficios: [
      "Prevenção de cáries e doenças gengivais",
      "Hálito mais fresco e agradável",
      "Dentes mais brancos e lisos",
      "Detecção precoce de problemas bucais",
      "Sensação de limpeza e bem-estar",
    ],
    faq: [
      { pergunta: "Limpeza dental dói?", resposta: "Normalmente não. Pode haver leve desconforto em áreas com tártaro acumulado ou gengivas inflamadas, mas é tolerável." },
      { pergunta: "Quanto custa uma limpeza dental?", resposta: "O preço médio fica entre R$ 80 e R$ 250, dependendo da região e da complexidade da limpeza." },
      { pergunta: "Qual a diferença entre limpeza e raspagem?", resposta: "A limpeza (profilaxia) remove placa e tártaro superficiais. A raspagem (raspagem radicular) é mais profunda, indicada para casos de periodontite." },
    ],
    linksExternos: [
      { label: "Ministério da Saúde - Saúde Bucal", url: "https://www.gov.br/saude/pt-br/assuntos/saude-bucal" },
    ],
  },

  "Ortodontia (aparelho)": {
    slug: "ortodontia-aparelho",
    nome: "Ortodontia (aparelho)",
    title: "Aparelho Ortodôntico | Ortodontista | CuraDentes",
    description:
      "Coloque aparelho dentário com ortodontistas experientes. Aparelho fixo, móvel, estético e invisível. Compare preços e avaliações.",
    keywords: ["aparelho dentário", "ortodontia", "aparelho ortodôntico", "aparelho estético", "invisalign", "aparelho fixo"],
    heroImage: `${IMG}/ortodontia.webp`,
    introducao:
      "A ortodontia é a especialidade que corrige a posição dos dentes e dos ossos maxilares, proporcionando um sorriso alinhado, melhor função mastigatória e prevenindo problemas futuros.",
    topicos: [
      { titulo: "Tipos de aparelho", texto: "Aparelho fixo metálico (tradicional), estético (safira ou porcelana), lingual (colado atrás dos dentes) e alinhadores invisíveis (como Invisalign). Cada tipo tem indicações específicas." },
      { titulo: "Quando iniciar o tratamento?", texto: "A idade ideal para avaliação ortodôntica é aos 7 anos, mas o tratamento pode ser feito em qualquer idade. Adultos representam hoje cerca de 30% dos pacientes ortodônticos." },
      { titulo: "Duração do tratamento", texto: "Em média, o tratamento ortodôntico dura de 18 a 36 meses, dependendo da complexidade do caso. Após a remoção do aparelho, é necessário usar contenção para manter o resultado." },
    ],
    beneficios: [
      "Dentes alinhados e sorriso harmonioso",
      "Melhora da mastigação e digestão",
      "Prevenção de desgaste dental anormal",
      "Redução de dores na ATM e mandíbula",
      "Aumento da autoestima e confiança",
    ],
    faq: [
      { pergunta: "Aparelho dói para colocar?", resposta: "A colocação não dói. Pode haver desconforto nos primeiros dias após as ativações, controlável com analgésicos comuns." },
      { pergunta: "Quanto tempo usa aparelho?", resposta: "O tempo médio é de 1 a 3 anos. Casos simples podem resolver em 6 meses; casos complexos podem levar mais tempo." },
      { pergunta: "Qual o valor do aparelho ortodôntico?", resposta: "Os valores variam muito: aparelho fixo metálico de R$ 150 a R$ 400 mensais, estético de R$ 300 a R$ 700, e Invisalign de R$ 400 a R$ 1.200 mensais." },
    ],
    linksExternos: [
      { label: "ABOR - Associação Brasileira de Ortodontia e Ortopedia Facial", url: "https://abor.org.br/" },
    ],
  },

  "Implante dentário": {
    slug: "implante-dentario",
    nome: "Implante dentário",
    title: "Implante Dentário | Preços e Implantodontistas | CuraDentes",
    description:
      "Recupere seus dentes com implantes dentários. Encontre implantodontistas perto de você, compare preços e veja avaliações reais.",
    keywords: ["implante dentário", "implante dental", "implante de dente", "implante dentário preço", "implantodontista"],
    heroImage: `${IMG}/implante-dentario.webp`,
    introducao:
      "O implante dentário é a técnica mais avançada para substituir dentes perdidos. Um pino de titânio é inserido no osso maxilar, funcionando como raiz artificial para receber uma prótese dentária.",
    topicos: [
      { titulo: "Como funciona o implante?", texto: "O implante de titânio é cirurgicamente inserido no osso. Após 3 a 6 meses de osseointegração (fusão do implante ao osso), é colocada a prótese definitiva sobre ele." },
      { titulo: "Vantagens sobre outras opções", texto: "Diferente de pontes e próteses removíveis, o implante não desgasta dentes vizinhos, estimula o osso evitando reabsorção óssea, e tem sensação muito similar ao dente natural." },
      { titulo: "Quem pode fazer implante?", texto: "A maioria dos adultos com saúde geral adequada pode receber implantes. É necessário ter volume ósseo suficiente. Fumantes e diabéticos precisam de avaliação cuidadosa." },
    ],
    beneficios: [
      "Solução definitiva para dentes perdidos",
      "Não desgasta dentes vizinhos",
      "Previne reabsorção óssea",
      "Estética e função muito próximas do dente natural",
      "Alta taxa de sucesso (acima de 95%)",
    ],
    faq: [
      { pergunta: "Implante dentário dói?", resposta: "A cirurgia é feita com anestesia local, portanto não dói. O pós-operatório pode ter desconforto controlável com medicamentos." },
      { pergunta: "Quanto tempo dura um implante?", resposta: "Com bons cuidados, os implantes duram décadas, muitas vezes a vida toda. A higiene e visitas regulares ao dentista são essenciais." },
      { pergunta: "Qual o valor de um implante dentário?", resposta: "O valor por implante varia de R$ 1.500 a R$ 5.000, incluindo o pino, a coroa protética e a cirurgia." },
    ],
    linksExternos: [
      { label: "CBI - Centro Brasileiro de Implantodontia", url: "https://cbi.com.br/" },
    ],
  },

  "Tratamento de canal": {
    slug: "tratamento-de-canal",
    nome: "Tratamento de canal",
    title: "Tratamento de Canal (Endodontia) | Preços | CuraDentes",
    description:
      "Precisa de tratamento de canal? Encontre endodontistas perto de você. Veja preços, avaliações e agende sua consulta sem dor.",
    keywords: ["tratamento de canal", "endodontia", "canal dentário", "extrair canal", "dentista canal"],
    heroImage: `${IMG}/tratamento-de-canal.webp`,
    introducao:
      "O tratamento de canal (endodontia) é o procedimento que remove a polpa infectada ou inflamada do interior do dente, limpando, desinfetando e selando o canal radicular para preservar o dente.",
    topicos: [
      { titulo: "Quando é necessário?", texto: "O canal é indicado quando a cárie atinge a polpa (nervo) do dente, causando dor intensa, infecção ou abscesso. Também é necessário em casos de trauma dental com fratura expondo a polpa." },
      { titulo: "Como é o procedimento?", texto: "Após anestesia local, o dentista abre o dente, remove a polpa infectada, limpa e molda o canal com instrumentos especiais, desinfeta e sela com material obturador. Pode ser feito em 1 a 3 sessões." },
      { titulo: "Mitos e verdades", texto: "Ao contrário do que muitos pensam, o tratamento de canal não dói — a anestesia moderna torna o procedimento confortável. A dor que o paciente sente antes é da infecção, não do tratamento." },
    ],
    beneficios: [
      "Preserva o dente natural, evitando extração",
      "Elimina a dor causada pela infecção",
      "Restaura a função mastigatória",
      "Distribui a força da mastigação corretamente",
      "Alternativa mais econômica que implante ou ponte",
    ],
    faq: [
      { pergunta: "Tratamento de canal dói?", resposta: "Com anestesia adequada, o procedimento é indolor. Pode haver leve desconforto nos dias seguintes, controlável com analgésicos." },
      { pergunta: "Quanto tempo leva um canal?", resposta: "Cada sessão dura de 30 a 90 minutos. O número de sessões varia de 1 a 3, dependendo da complexidade e infecção." },
      { pergunta: "Qual o valor de um tratamento de canal?", resposta: "O valor varia conforme o dente (canal simples ou complexo): de R$ 400 a R$ 1.500 por dente." },
    ],
    linksExternos: [
      { label: "SBEndo - Sociedade Brasileira de Endodontia", url: "https://www.sbendo.com.br/" },
    ],
  },

  "Prótese dentária": {
    slug: "protese-dentaria",
    nome: "Prótese dentária",
    title: "Prótese Dentária | Preços e Proteticistas | CuraDentes",
    description:
      "Recupere seu sorriso com próteses dentárias fixas ou removíveis. Encontre especialistas, compare preços e veja avaliações.",
    keywords: ["prótese dentária", "prótese dental", "prótese fixa", "prótese removível", "dentadura", "coroa dentária"],
    heroImage: `${IMG}/protese-dentaria.webp`,
    introducao:
      "A prótese dentária é um dispositivo que substitui um ou mais dentes perdidos, restaurando a função mastigatória, a estética do sorriso e prevenindo problemas na articulação temporomandibular.",
    topicos: [
      { titulo: "Tipos de prótese", texto: "Próteses fixas (coroas e pontes) são cimentadas sobre dentes preparados ou implantes. Próteses removíveis (parciais ou totais) podem ser retiradas para higiene. Cada tipo tem indicações específicas." },
      { titulo: "Materiais utilizados", texto: "As próteses podem ser de porcelana, cerâmica pura (zircônia), metalocerâmica (metal revestido de porcelana) ou resina. A escolha depende da resistência, estética e custo desejados." },
      { titulo: "Adaptação e cuidados", texto: "A adaptação à prótese leva de 1 a 4 semanas. A higiene é fundamental: escovação, fio dental e, para próteses removíveis, limpeza com produtos específicos." },
    ],
    beneficios: [
      "Restaura a mastigação e fala adequadas",
      "Previne desgaste de dentes vizinhos",
      "Mantém a estrutura facial e o tônus muscular",
      "Melhora a estética do sorriso",
      "Distribui as forças mastigatórias uniformemente",
    ],
    faq: [
      { pergunta: "Qual a diferença entre coroa e ponte?", resposta: "A coroa cobre um dente danificado. A ponte substitui um ou mais dentes perdidos, apoiando-se nos dentes vizinhos." },
      { pergunta: "Quanto tempo dura uma prótese?", resposta: "Próteses fixas bem cuidadas duram de 10 a 15 anos. Removíveis duram de 5 a 8 anos, podendo necessitar de reembasamento." },
      { pergunta: "Prótese dentária doi para colocar?", resposta: "Não. O preparo dental é feito com anestesia. Pode haver sensibilidade nos dias seguintes, mas é temporária." },
    ],
    linksExternos: [
      { label: "ABO - Associação Brasileira de Odontologia", url: "https://www.abo.org.br/" },
    ],
  },

  "Cirurgia oral": {
    slug: "cirurgia-oral",
    nome: "Cirurgia oral",
    title: "Cirurgia Oral | Extração e Cirurgia Dentária | CuraDentes",
    description:
      "Precisa de cirurgia oral? Encontre cirurgiões-dentistas perto de você. Extração de siso, dentes inclusos e outros procedimentos cirúrgicos.",
    keywords: ["cirurgia oral", "extração de dente", "cirurgia dentária", "extrair siso", "dente incluso", "cirurgião dentista"],
    heroImage: `${IMG}/cirurgia-oral.webp`,
    introducao:
      "A cirurgia oral é a especialidade que realiza procedimentos cirúrgicos na cavidade bucal, como extração de dentes (inclusive sisos inclusos), biópsias, frenectomias e correção de alterações ósseas.",
    topicos: [
      { titulo: "Principais procedimentos", texto: "Extração de dentes (sisos inclusos ou não), remoção de cistos e tumores, biópsias, frenectomia (freio labial/lingual), cirurgia pré-protética e implantes." },
      { titulo: "Extração de siso", texto: "O siso (terceiro molar) é o dente que mais frequentemente requer extração cirúrgica. Recomenda-se remover entre 16 e 20 anos, quando a recuperação é mais rápida." },
      { titulo: "Pós-operatório", texto: "Após a cirurgia, é comum inchaço e desconforto. Aplicação de gelo nas primeiras 24 horas, repouso, alimentação pastosa e medicação prescrita são fundamentais para boa recuperação." },
    ],
    beneficios: [
      "Alívio de dores e infecções",
      "Prevenção de complicações futuras",
      "Melhora da saúde bucal geral",
      "Correção de problemas funcionais",
      "Preparação para tratamentos reabilitadores",
    ],
    faq: [
      { pergunta: "Cirurgia oral dói?", resposta: "O procedimento é feito com anestesia local, não dói. O pós-operatório requer analgésicos e cuidados para controle do desconforto." },
      { pergunta: "Quanto tempo de recuperação?", resposta: "A recuperação inicial leva de 3 a 7 dias. O inchaço reduz após 48-72 horas. Atividades normais podem ser retomadas em 1 semana." },
      { pergunta: "Precisa de repouso após extração de siso?", resposta: "Sim. Recomenda-se repouso de 24 a 48 horas, dieta pastosa, evitar bochechos fortes e não fumar nesse período." },
    ],
    linksExternos: [
      { label: "CBCTBMF - Colégio Brasileiro de Cirurgia e Traumatologia Bucomaxilofacial", url: "https://bucomaxilo.org.br/" },
    ],
  },

  Periodontia: {
    slug: "periodontia",
    nome: "Periodontia",
    title: "Periodontia | Tratamento da Gengiva | CuraDentes",
    description:
      "Trate doenças da gengiva com periodontistas. Gengivite, periodontite, retração gengival e mau hálito têm solução. Agende sua consulta.",
    keywords: ["periodontia", "doença gengival", "gengivite", "periodontite", "retração gengival", "mau hálito", "tratamento gengiva"],
    heroImage: `${IMG}/periodontia.webp`,
    introducao:
      "A periodontia é a especialidade que cuida da saúde das gengivas e do osso que suporta os dentes. Previne, diagnostica e trata doenças como gengivite e periodontite, principais causas de perda dentária.",
    topicos: [
      { titulo: "O que é doença periodontal?", texto: "É uma inflamação bacteriana que afeta os tecidos de suporte dos dentes. Começa como gengivite (gengiva sangra) e pode evoluir para periodontite (perda óssea e mobilidade dentária)." },
      { titulo: "Tratamento periodontal", texto: "Raspagem e alisamento radicular (curetagem), uso de antibióticos tópicos ou sistêmicos, e em casos avançados, cirurgia periodontal. O acompanhamento regular é essencial para controle." },
      { titulo: "Prevenção", texto: "Escovação correta, uso diário de fio dental, visitas regulares ao dentista (a cada 6 meses) e evitar tabagismo são as principais formas de prevenção." },
    ],
    beneficios: [
      "Prevenção da perda dentária",
      "Redução do sangramento gengival",
      "Melhora do hálito",
      "Controle da inflamação sistêmica",
      "Preservação do osso alveolar",
    ],
    faq: [
      { pergunta: "Gengiva que sangra é normal?", resposta: "Não. Gengiva que sangra ao escovar ou usar fio dental indica inflamação (gengivite). Consulte um periodontista." },
      { pergunta: "Periodontite tem cura?", resposta: "Não tem cura definitiva, pois é uma doença crônica. Mas é controlável com tratamento adequado e manutenção periódica." },
      { pergunta: "Doença periodontal afeta a saúde geral?", resposta: "Sim. Estudos associam periodontite a maior risco de doenças cardíacas, diabetes descompensado e parto prematuro." },
    ],
    linksExternos: [
      { label: "SOBRAPI - Sociedade Brasileira de Periodontia e Implantodontia", url: "https://sobrapi.org/" },
    ],
  },

  Odontopediatria: {
    slug: "odontopediatria",
    nome: "Odontopediatria",
    title: "Odontopediatria | Dentista Infantil | CuraDentes",
    description:
      "Leve seu filho ao dentista infantil. Atendimento lúdico e acolhedor para crianças. Prevenção, cárie infantil e orientação para pais.",
    keywords: ["odontopediatria", "dentista infantil", "dentista para crianças", "cárie infantil", "primeira consulta odontopediatria"],
    heroImage: `${IMG}/odontopediatria.webp`,
    introducao:
      "A odontopediatria é a especialidade dedicada à saúde bucal de bebês, crianças e adolescentes. Profissionais treinados para oferecer atendimento acolhedor, lúdico e adaptado a cada fase do desenvolvimento.",
    topicos: [
      { titulo: "Primeira consulta", texto: "A primeira visita ao odontopediatra deve ocorrer assim que o primeiro dente de leite nascer (por volta dos 6 meses). Isso cria um vínculo positivo e previne problemas futuros." },
      { titulo: "Principais tratamentos", texto: "Aplicação de flúor, selantes, restaurações, tratamento de cárie, orientação de higiene, prevenção de hábitos nocivos (chupeta, mamadeira) e acompanhamento do crescimento facial." },
      { titulo: "Cárie na infância", texto: "A cárie precoce da infância (cárie de mamadeira) é a doença crônica mais comum na infância, mas é totalmente prevenível com orientação adequada dos pais e visitas regulares ao odontopediatra." },
    ],
    beneficios: [
      "Cria hábitos saudáveis desde cedo",
      "Prevenção de cáries e problemas ortodônticos",
      "Atendimento acolhedor e sem trauma",
      "Orientação personalizada para pais",
      "Acompanhamento do desenvolvimento facial",
    ],
    faq: [
      { pergunta: "Com que idade levar a criança ao dentista?", resposta: "A primeira consulta deve ser até 1 ano de idade, assim que o primeiro dente nasce." },
      { pergunta: "Dente de leite precisa de tratamento?", resposta: "Sim! Dentes de leite saudáveis são essenciais para mastigação, fala e reserva de espaço para os dentes permanentes." },
      { pergunta: "Como preparar a criança para a consulta?", resposta: "Evite palavras como 'agulha', 'dor' ou 'broca'. Diga que o dentista vai 'contar os dentes' e 'deixar o sorriso brilhando'." },
    ],
    linksExternos: [
      { label: "ABOPED - Associação Brasileira de Odontopediatria", url: "https://aboped.org/" },
    ],
  },

  "Harmonização orofacial": {
    slug: "harmonizacao-orofacial",
    nome: "Harmonização orofacial",
    title: "Harmonização Orofacial | Preços e Especialistas | CuraDentes",
    description:
      "Harmonização orofacial com dentistas especializados. Preenchimento labial, botox, bioestimuladores e mais. Transforme sua face.",
    keywords: ["harmonização orofacial", "preenchimento labial", "harmonização facial", "bioestimuladores", "ácido hialurônico", "dentista estética", "botox", "botox odontológico", "botox para bruxismo", "toxina botulínica", "sorriso gengival"],
    heroImage: `${IMG}/harmonizacao-orofacial.webp`,
    introducao:
      "A harmonização orofacial (HOF) é uma área da odontologia que integra procedimentos estéticos e funcionais para equilibrar a face, valorizar o sorriso e rejuvenescer a aparência de forma natural. Inclui o botox (toxina botulínica), tanto para fins estéticos quanto terapêuticos.",
    topicos: [
      { titulo: "Principais procedimentos", texto: "Preenchimento com ácido hialurônico (lábios, bigode chinês, olheiras), aplicação de botox, bioestimuladores de colágeno (Sculptra, Radiesse), fios de sustentação e lipo de papada." },
      { titulo: "Botox (toxina botulínica)", texto: "O botox faz parte da harmonização orofacial. Além de suavizar rugas de expressão, tem uso terapêutico: relaxa a musculatura no bruxismo, corrige o sorriso gengival, alivia dores na ATM e equilibra assimetrias faciais. A aplicação é rápida (cerca de 15 minutos), praticamente indolor, e os efeitos duram de 4 a 6 meses." },
      { titulo: "Resultados naturais", texto: "A filosofia da HOF é realçar a beleza natural sem artificialismo. O profissional avalia a face como um todo para criar equilíbrio e harmonia." },
      { titulo: "Quem pode realizar", texto: "Apenas cirurgiões-dentistas com pós-graduação em HOF podem realizar estes procedimentos. Verifique sempre a formação do profissional." },
    ],
    beneficios: [
      "Rejuvenescimento facial natural",
      "Equilíbrio e simetria da face",
      "Valorização do sorriso",
      "Botox para bruxismo, sorriso gengival e rugas",
      "Resultados progressivos e duradouros",
      "Autoestima elevada",
    ],
    faq: [
      { pergunta: "O botox faz parte da harmonização orofacial?", resposta: "Sim. O botox (toxina botulínica) é um dos procedimentos da harmonização orofacial, com uso estético (rugas de expressão) e também funcional: bruxismo, sorriso gengival e dores na ATM." },
      { pergunta: "Harmonização orofacial dói?", resposta: "O desconforto é leve. Cremes anestésicos e anestesia local são usados para garantir o conforto durante o procedimento." },
      { pergunta: "Quanto tempo dura cada procedimento?", resposta: "Botox: 4-6 meses. Preenchimento: 6-18 meses. Bioestimuladores: 18-24 meses. Fios de sustentação: 12-18 meses." },
      { pergunta: "Qual o valor da harmonização orofacial?", resposta: "Cada procedimento tem valor específico: preenchimento labial R$ 500-R$ 1.500, botox R$ 300-R$ 1.200, bioestimuladores R$ 1.500-R$ 4.000 por sessão." },
    ],
    linksExternos: [
      { label: "Sociedade Brasileira de Odontologia Estética", url: "https://sboe.com.br/" },
    ],
  },
};
