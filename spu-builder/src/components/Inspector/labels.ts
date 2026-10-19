// Rótulos PT-BR compartilhados entre Inspector e ListEditor.

// Valores de token/opção (largura, superfície, tom, nível…).
export const LABELS: Record<string, string> = {
  narrow: 'Estreita', content: 'Conteúdo', wide: 'Larga', full: 'Total',
  none: 'Nenhuma', page: 'Papel', white: 'Branca', warm: 'Quente', dark: 'Escura',
  'terra-dark': 'Terracota escura',
  lg: 'Amplo', md: 'Médio',
  info: 'Informação', attention: 'Atenção', warning: 'Alerta',
  success: 'Sucesso', note: 'Nota', neutral: 'Neutro',
  h1: 'Título principal (H1)', h2: 'Título de seção (H2)', h3: 'Subtítulo (H3)',
  h4: 'H4', h5: 'H5', h6: 'H6',
  video: 'Vídeo', audio: 'Áudio',
  byncsa: 'CC BY-NC-SA', byncnd: 'CC BY-NC-ND',
  // fit (object-fit)
  contain: 'Conter (inteira)', cover: 'Cobrir (preencher)', fill: 'Esticar',
  // size (largura da figura) — 'md'/'lg' já definidos acima
  sm: 'Pequena',
  // shape
  rect: 'Retângulo', rounded: 'Arredondado', circle: 'Círculo', pill: 'Pílula',
};

// Chaves de campo/prop.
export const FIELD_LABELS: Record<string, string> = {
  title: 'Título', heading: 'Subtítulo', children: 'Conteúdo', body: 'Corpo',
  html: 'Texto', kicker: 'Sobrelinha', byline: 'Autoria', caption: 'Legenda',
  credit: 'Crédito', label: 'Rótulo', cite: 'Fonte', text: 'Texto',
  term: 'Conceito', definition: 'Definição', icon: 'Ícone',
  kickerIcon: 'Ícone da sobrelinha', color: 'Cor de acento', tone: 'Tom',
  width: 'Largura', surface: 'Superfície', pad: 'Espaçamento', level: 'Nível',
  columns: 'Colunas', card: 'Em cartão', numbered: 'Numerado',
  variant: 'Variante', provider: 'Fonte', url: 'URL', type: 'Tipo',
  // listas e itens
  items: 'Itens', slides: 'Slides', stats: 'Dados', questions: 'Questões', prompts: 'Perguntas',
  options: 'Alternativas', milestones: 'Marcos', eras: 'Períodos',
  credits: 'Créditos', license: 'Licença',
  licenseKind: 'Tipo de licença',
  value: 'Valor', unit: 'Unidade', description: 'Descrição',
  question: 'Pergunta', correct: 'Correta', feedback: 'Feedback',
  period: 'Período', date: 'Data', name: 'Nome', role: 'Papel',
  a: 'Lado A', b: 'Lado B', eyebrow: 'Sobrelinha',
  org: 'Identidade', program: 'Nome do programa',
  beforeLabel: 'Rótulo “antes”', afterLabel: 'Rótulo “depois”',
  beforeSlot: 'Imagem “antes”', afterSlot: 'Imagem “depois”',
  heightMode: 'Altura da imagem',
  showImage: 'Exibir imagem', subtitle: 'Subtítulo', linkHref: 'URL do link', linkLabel: 'Texto do link',
  labelIcon: 'Ícone da etiqueta', tabLabel: 'Rótulo da aba', showTabNumbers: 'Mostrar números nas abas',
  hint: 'Chamada superior', accent: 'Cor de acento', alt: 'Texto alternativo',
  lead: 'Texto de apresentação', triggerLabel: 'Texto para expandir', defaultOpen: 'Iniciar aberta',
};

export const lbl = (k: string) => FIELD_LABELS[k] || k;
export const optLabel = (v: string) => LABELS[v] || v;
