# Patch do Design System v8 — QA visual: full-bleed, referencias, conclusion e contrastes

Aplicar no DS-fonte, recompilar, copiar o kit para o builder (`_ds_bundle.js`, `styles.css`, `image-slot.js`, tokens/assets se mudarem).

## 1 — Imagem full-bleed com metadados, altura e modo de legenda

`components/media/BleedImage.jsx`

Objetivo:

- mostrar `title`, `caption` e `credit` quando informados;
- oferecer duas apresentacoes:
  - `captionMode="below"`: texto pequeno abaixo da imagem, centralizado;
  - `captionMode="overlay"`: texto em box colorido/translucido sobre a imagem, parecido com Hero;
- permitir `heightPreset`: `narrow`, `medium`, `wide`, `full`;
- `full` usa a proporcao natural da imagem;
- os demais recortam com `fit="cover"` e devem usar efeito parallax visual (`background-attachment: fixed` quando houver `src`; para `image-slot`, manter `object-fit: cover`/recorte).

Patch recomendado:

```jsx
const HEIGHTS = {
  narrow: '28vh',
  medium: '46vh',
  wide: '64vh',
  full: null,
};

export function BleedImage({
  src, slot, alt = '', zoom = false, fit = 'cover', bleed = true,
  height = '46vh', heightPreset = 'medium',
  title, caption, credit, captionMode = 'below',
  overlayBg = 'rgba(14,46,43,.72)',
  overlayColor = '#fff',
  placeholder = 'Arraste uma imagem', className, style, ...rest
}) {
  const resolvedHeight = heightPreset === 'full'
    ? null
    : (HEIGHTS[heightPreset] || height);

  // se slot tiver imagem e heightPreset === 'full', manter ajuste proporcional atual.
  // se heightPreset !== 'full', manter altura fixa e recorte.
}
```

CSS recomendado:

```css
.spu-bleedimg{width:100%;margin:var(--flow-block) 0;background:var(--color-surface-warm);display:block}
.spu-bleedimg--bleed{width:100vw;margin-left:calc(50% - 50vw);max-width:none}
.spu-bleedimg__frame{position:relative;overflow:hidden;cursor:zoom-in}
.spu-bleedimg--plain .spu-bleedimg__frame{cursor:default}
.spu-bleedimg image-slot,.spu-bleedimg__frame>img{display:block;width:100%;height:100%;object-fit:cover}
.spu-bleedimg--full image-slot,.spu-bleedimg--full .spu-bleedimg__frame>img{height:auto;object-fit:contain}
.spu-bleedimg__parallax{background-size:cover;background-position:center;background-attachment:fixed}
.spu-bleedimg__cap{max-width:var(--container-content);margin:var(--space-3) auto 0;padding-inline:var(--gutter);font-size:var(--fs-caption);line-height:1.55;text-align:center;color:var(--text-muted)}
.spu-bleedimg__title{display:block;font-family:var(--font-display);font-weight:700;color:var(--color-primary-strong);margin-bottom:.2em}
.spu-bleedimg__credit{display:block;color:var(--text-faint);margin-top:.2em}
.spu-bleedimg__overlay{position:absolute;left:50%;bottom:var(--space-5);transform:translateX(-50%);width:min(var(--container-content),calc(100% - var(--gutter)*2));padding:var(--space-4) var(--space-5);border-radius:var(--radius-md);backdrop-filter:blur(8px);box-shadow:var(--shadow-md)}
.spu-bleedimg__overlay .spu-bleedimg__cap{margin:0;padding:0;color:inherit;text-align:left}
@media (max-width: 768px){.spu-bleedimg__parallax{background-attachment:scroll}}
```

`components/core/BlockRegistry.jsx`, bloco `bleedimage`:

```js
{ type: 'bleedimage', component: 'BleedImage', label: 'Imagem full-bleed', icon: 'image',
  cat: 'Mídia', kind: 'text', locks: { bg: true },
  fields: ['title', 'caption', 'credit'],
  propFields: [
    { key: 'heightPreset', label: 'Altura', type: 'select',
      options: [
        { value: 'narrow', label: 'Estreita' },
        { value: 'medium', label: 'Média' },
        { value: 'wide', label: 'Ampla' },
        { value: 'full', label: 'Total' },
      ] },
    { key: 'captionMode', label: 'Texto', type: 'select',
      options: [
        { value: 'below', label: 'Abaixo' },
        { value: 'overlay', label: 'Sobre a imagem' },
      ] },
    { key: 'overlayBg', label: 'Cor do box', type: 'select',
      options: [
        { value: 'rgba(14,46,43,.72)', label: 'Petróleo translúcido' },
        { value: 'rgba(109,62,41,.72)', label: 'Terracota translúcido' },
        { value: 'rgba(143,95,18,.72)', label: 'Ocre translúcido' },
        { value: 'rgba(255,255,255,.82)', label: 'Claro translúcido' },
      ] },
  ],
  props: { slot: '', src: '', zoom: false, fit: 'cover', heightPreset: 'medium',
           title: '', caption: '', credit: '', captionMode: 'below',
           overlayBg: 'rgba(14,46,43,.72)' } },
```

Observacao adicional (25/06): a imagem full-bleed nao precisa de clique/zoom. Manter `zoom=false` como padrao e, se possivel, remover/ocultar esse controle no registry.

## 2 — Referencias ABNT vira bloco de conteudo colapsado

Hoje `referencias` e estrutural e pode ficar colado depois da conclusao. O pedido e que ele seja bloco inserido dentro de `section` e fique fechado por padrao.

`components/content/ReferenceList.jsx`

- Trocar o wrapper para bloco (`div` ou `section` sem padding proprio de pagina).
- Usar `<details>` com `open={defaultOpen}`.
- Fechado por padrao (`defaultOpen=false`).

CSS sugerido:

```css
.spu-refs{margin:var(--flow-block) 0;max-width:none;padding:0}
.spu-refs__details{border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-sm);overflow:hidden}
.spu-refs__summary{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);cursor:pointer;padding:var(--space-4) var(--space-5);font-family:var(--font-display);font-weight:700;font-size:var(--fs-h6);color:var(--text-strong)}
.spu-refs__summary::-webkit-details-marker{display:none}
.spu-refs__list{list-style:none;margin:0;padding:0 var(--space-5) var(--space-5)}
```

`components/core/BlockRegistry.jsx`:

- remover `referencias` de `STRUCTURAL_TYPES`;
- manter `cat: 'Estrutura'` ou mover para `Texto`, mas `kind: 'list'`;
- adicionar `props: { title: 'Referências', defaultOpen: false, items: [...] }`.

`BuilderExport.migrate`:

- docs antigos com `referencias` no topo continuam validos, mas novos inserts devem ir para dentro de `section` por causa de `childTypes`.

## 3 — Conclusao com blocos extras abaixo do padrao

Pedido: manter a conclusao como esta, mas permitir inserir blocos abaixo dos elementos padrao quando necessario.

Recomendacao de contrato:

- `Conclusion` passa a aceitar `body` como texto rico padrao;
- `children` fica reservado para blocos extras;
- `BlockRegistry.conclusion` vira `kind: 'container'`;
- `BlockView` renderiza `body` com `renderRich` no preview e `Editable` no edit;
- o builder ja consegue dropar blocos dentro de qualquer `kind:'container'`.

`components/content/Conclusion.jsx`:

```jsx
export function Conclusion({
  id = 'conclusao', kicker = 'Para fechar', kickerIcon = 'check',
  title = 'Conclusão', body, src, slot, scrim = 'dark', height,
  children, className, style, ...rest
}) {
  return React.createElement('div', { id, className: 'op-hero-wrap', 'data-screen-label': id, ...rest },
    React.createElement(FullBleed, {
      bleed: true, wide: true, align: 'center', scrim,
      kicker, kickerIcon, title, src, slot, height,
      className: cx('spu-conclusion', className), style,
    },
      body && React.createElement('div', { className: 'spu-conclusion__body' }, body),
      children && React.createElement('div', { className: 'spu-conclusion__extra' }, children)
    )
  );
}
```

`components/core/BlockRegistry.jsx`:

```js
{ type: 'conclusion', component: 'Conclusion', label: 'Conclusão / síntese',
  icon: 'check-circle', cat: 'Estrutura', kind: 'container', locks: { bg: true },
  fields: ['kicker', 'title', 'body'], rich: true,
  props: { kicker: 'Para fechar', kickerIcon: 'check', title: 'Conclusão',
           body: '<p>Retome o essencial em poucas linhas.</p>', children: [] } },
```

`components/core/BlockView.jsx`, no ramo `def.kind === 'container'`:

- antes de montar o componente, resolver `body` quando `richField(def,'body')`;
- para `editing`, `body` deve virar `<Editable as="div">`.

`BuilderExport.migrate`:

```js
if (b.type === 'conclusion' && b.props && b.props.children && typeof b.props.children === 'string') {
  b.props.body = b.props.body || b.props.children;
  b.props.children = [];
}
```

## 4 — Cards claros dentro de secao escura mantem texto escuro

O reset atual da `.spu-section--dark` nao cobre todos os componentes citados. Ampliar em `components/layout/Section.jsx`:

```css
.spu-section--dark .spu-callout,
.spu-section--dark .spu-panel,
.spu-section--dark .spu-acc,
.spu-section--dark .spu-example,
.spu-section--dark .spu-examplecard,
.spu-section--dark .spu-feature--card,
.spu-section--dark .spu-map,
.spu-section--dark .spu-figure--framed,
.spu-section--dark .spu-stat--card,
.spu-section--dark .spu-compare,
.spu-section--dark .spu-ab,
.spu-section--dark .spu-tl__content,
.spu-section--dark .spu-embed__bar,
.spu-section--dark .spu-flip,
.spu-section--dark .spu-quiz {
  --text-strong: var(--ink-900);
  --text-body: var(--ink-700);
  --text-muted: var(--ink-500);
  --text-faint: var(--ink-500);
  --color-primary-strong: var(--petrol-700);
  color: var(--text-body);
}
```

Tambem ajustar os links-botao dentro dos cards, para nao herdarem o modo "texto sobre fundo escuro":

```css
.spu-section--dark .spu-acc .spu-richtext a[data-btn="primary"],
.spu-section--dark .spu-tl__content .spu-richtext a[data-btn="primary"] {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.spu-section--dark .spu-acc .spu-richtext a[data-btn="secondary"],
.spu-section--dark .spu-tl__content .spu-richtext a[data-btn="secondary"] {
  background: transparent;
  border-color: var(--color-primary);
  color: var(--color-primary-strong);
}
```

### 4b — Texto rico solto em secao escura: botoes, marcadores e marca-texto

Problemas vistos no QA:

- link renderizado como botao em fundo escuro fica com botao claro e texto claro;
- bullets e numeros ficam apagados em vez de usar uma cor viva;
- marca-texto usa fundos claros, mas o texto interno continua claro, causando baixo contraste.

Em `components/layout/Section.jsx`, substituir as regras atuais para `a[data-btn]` em secao escura:

```css
/* links comuns sobre fundo escuro */
.spu-section--dark .spu-richtext a:not([data-btn]) {
  color: var(--ochre-300);
  text-decoration-color: var(--ochre-400);
}

/* botoes sobre fundo escuro */
.spu-section--dark .spu-richtext a[data-btn="primary"] {
  background: #fff;
  border-color: #fff;
  color: var(--petrol-900);
}
.spu-section--dark .spu-richtext a[data-btn="secondary"] {
  background: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.72);
  color: #fff;
}
.spu-section--dark .spu-richtext a[data-btn="ghost"] {
  background: rgba(255,255,255,.14);
  border-color: transparent;
  color: #fff;
}
```

Tambem em `components/layout/Section.jsx`, criar marcadores vivos:

```css
.spu-section--dark .spu-richtext ul li::marker,
.spu-section--dark .spu-richtext ol li::marker {
  color: var(--ochre-300);
}
```

Para marca-texto em fundo escuro, criar variantes dark sem mudar o HTML salvo (`mark[data-hl]` continua igual). Em `components/layout/Section.jsx` ou em `components/content/RichText.jsx`:

```css
.spu-section--dark .spu-richtext mark {
  background: rgba(196, 132, 36, .62);
  color: var(--text-on-dark);
}
.spu-section--dark .spu-richtext mark[data-hl="terra"] {
  background: rgba(194, 97, 58, .62);
}
.spu-section--dark .spu-richtext mark[data-hl="petrol"] {
  background: rgba(74, 153, 142, .58);
}
.spu-section--dark .spu-richtext mark[data-hl="green"] {
  background: rgba(90, 150, 94, .62);
}
.spu-section--dark .spu-richtext mark[data-hl="sand"] {
  background: rgba(237, 231, 218, .28);
}
```

Opcionalmente, expor esses valores como tokens/variaveis:

```css
.spu-section--dark {
  --mark-ochre-dark: rgba(196, 132, 36, .62);
  --mark-terra-dark: rgba(194, 97, 58, .62);
  --mark-petrol-dark: rgba(74, 153, 142, .58);
  --mark-green-dark: rgba(90, 150, 94, .62);
  --mark-sand-dark: rgba(237, 231, 218, .28);
}
```

## 5 — Linha do tempo: card diferente do fundo quente

`components/interactive/Timeline.jsx`

Trocar:

```css
.spu-tl__content{background:var(--color-surface-warm)}
```

por:

```css
.spu-tl__content{background:color-mix(in srgb, var(--color-surface) 82%, var(--ochre-50))}
.spu-section--warm .spu-tl__content{background:var(--color-surface)}
```

Fallback se precisar evitar `color-mix`:

```css
.spu-tl__content{background:var(--bg-paper)}
.spu-section--warm .spu-tl__content{background:var(--color-surface)}
```

## 6 — Quiz e imagens menores centralizados na coluna

Centralizar componentes que tenham largura menor que a coluna:

`components/interactive/Quiz.jsx`:

```css
.spu-quiz{max-width:34rem;margin-inline:auto}
```

`components/media/Figure.jsx`:

```css
.spu-figure--sm,.spu-figure--md,.spu-figure--lg{margin-inline:auto}
```

Se outros componentes de imagem tiverem presets de largura menor, aplicar a mesma regra.

## 7 — Callout: evitar sobreposicao entre `tone` e `color`

Problema visto no builder: o bloco `Destaque / atenção` expõe `Tom` e `Cor de acento`. No componente, `color` sobrescreve `tone` (`const c = color || t.color`), então os controles parecem competir. Quando `color` tem valor, trocar o `tone` quase nao altera o visual.

Recomendacao: para o builder, manter apenas `tone`.

`components/core/BlockRegistry.jsx`, bloco `callout`:

- remover `color` de `props`;
- nao expor `color` para esse bloco;
- manter `tone`, `icon` e `variant`.

Exemplo:

```js
{ type: 'callout', component: 'Callout', label: 'Destaque / atenção',
  icon: 'lightbulb', cat: 'Destaques', kind: 'text', rich: true,
  fields: ['title', 'heading', 'children'],
  propFields: [
    { key: 'variant', label: 'Estilo', type: 'select',
      options: [{ value: 'header', label: 'Faixa no topo' }, { value: 'ear', label: 'Orelha de ícone' }] },
    { key: 'tone', label: 'Tom', type: 'select',
      options: [
        { value: 'info', label: 'Informativo' },
        { value: 'attention', label: 'Atenção' },
        { value: 'warning', label: 'Alerta' },
        { value: 'success', label: 'Sucesso' },
        { value: 'note', label: 'Nota' },
        { value: 'neutral', label: 'Neutro' },
      ] },
  ],
  props: { variant: 'header', tone: 'info', icon: 'lightbulb',
           title: 'Você sabia?', heading: '', children: '<p>O ponto-chave para o aluno reter.</p>' } },
```

`BuilderExport.migrate`:

```js
if (b.type === 'callout' && b.props) delete b.props.color;
```

Hotfix no builder: o painel ja esconde `color` para `callout` e limpa `color` quando o usuario troca `tone`.

## 8 — Listas visuais (`MarkerList`) no builder e em texto rico

O DS ja tem `components/content/MarkerList.jsx`, mas ele nao entrou no `BlockRegistry`. O usuario quer esse visual para listas numeradas e bullets dentro de textos; em listas de bullets, deve ser possivel escolher o icone.

### 8a — Registrar `MarkerList` como bloco

Primeiro passo, expor como bloco independente para uso imediato no builder:

```js
{ type: 'markerlist', component: 'MarkerList', label: 'Lista visual',
  icon: 'list', cat: 'Texto', kind: 'list',
  itemsKey: 'items',
  itemFields: [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'text', label: 'Texto', type: 'rich', inline: true },
  ],
  propFields: [
    { key: 'variant', label: 'Estilo', type: 'select',
      options: [
        { value: 'ordered', label: 'Numerada' },
        { value: 'check', label: 'Checks' },
        { value: 'plain', label: 'Bullet' },
        { value: 'icon', label: 'Ícone' },
      ] },
    { key: 'icon', label: 'Ícone do bullet', type: 'icon' },
  ],
  props: {
    variant: 'ordered',
    icon: 'check',
    items: [
      { title: 'Identificar', text: 'Localizar o imóvel no cadastro SPU.' },
      { title: 'Avaliar', text: 'Verificar a destinação atual do bem.' },
    ],
  } },
```

### 8b — Evoluir `MarkerList` para aceitar icone em bullet

`components/content/MarkerList.jsx`:

```jsx
export function MarkerList({ items = [], variant = 'ordered', icon = 'check', className, style }) {
  // ...
  if (variant === 'ordered') marker = <span className="spu-mlist__num">{i + 1}</span>;
  else if (variant === 'check') marker = <span className="spu-mlist__check"><Icon name="check" size={16} /></span>;
  else if (variant === 'icon') marker = <span className="spu-mlist__check"><Icon name={icon || 'check'} size={16} /></span>;
  else marker = <span className="spu-mlist__dot" />;
}
```

CSS: manter o visual da captura para `ordered`; para `icon`, reaproveitar chip circular.

### 8c — Listas visuais dentro de RichText

Para permitir esse visual dentro de campos de texto rico, sem virar bloco separado, ampliar o vocabulario HTML do RichText:

```html
<ol data-list="marker">...</ol>
<ul data-list="marker" data-icon="map-pin">...</ul>
```

CSS sugerido em `components/content/RichText.jsx`:

```css
.spu-richtext ol[data-list="marker"],
.spu-richtext ul[data-list="marker"]{
  list-style:none;
  margin:var(--flow-text) 0;
  padding:0;
  display:flex;
  flex-direction:column;
  gap:var(--space-3);
  counter-reset:spu-marker;
}
.spu-richtext ol[data-list="marker"]>li,
.spu-richtext ul[data-list="marker"]>li{
  position:relative;
  padding-left:3.8rem;
  min-height:2.8rem;
}
.spu-richtext ol[data-list="marker"]>li{counter-increment:spu-marker}
.spu-richtext ol[data-list="marker"]>li::before{
  content:counter(spu-marker);
  position:absolute;
  left:0;
  top:.1em;
  width:2.6rem;
  height:2.6rem;
  border-radius:999px;
  background:var(--color-primary);
  color:var(--color-on-primary);
  display:grid;
  place-items:center;
  font-family:var(--font-mono);
  font-weight:700;
}
.spu-richtext ul[data-list="marker"]>li::before{
  content:"";
  position:absolute;
  left:.35rem;
  top:.45em;
  width:2rem;
  height:2rem;
  border-radius:999px;
  background:var(--color-primary);
}
```

Para icones dentro de RichText, ha duas opcoes:

1. **Simples:** oferecer apenas bullets circulares em `RichText`, e icones customizados apenas no bloco `MarkerList`.
2. **Completa:** no render do `RichText`, transformar `ul[data-list="marker"][data-icon]` em React com `Icon`. Isso exige trocar parte do render HTML puro por parsing/sanitizacao controlada, ou criar uma etapa de pos-processamento. Recomendacao: fazer primeiro a opcao simples e usar o bloco `MarkerList` quando precisar de icone.

### 8d — Toolbar do editor

Depois que o DS aceitar `data-list="marker"`, adicionar na `MarkToolbar` um controle de lista visual:

- lista numerada visual: aplica/remove `data-list="marker"` no `<ol>`;
- lista bullet visual: aplica/remove `data-list="marker"` no `<ul>`;
- se for viavel a opcao completa, abrir seletor de icone para gravar `data-icon`.

## 9 — MediaEmbed: audio deve mudar layout e Spotify nao deve usar proporcao de video

Problemas vistos no QA:

- O painel oferece `type="audio"`, mas `MediaEmbed.jsx` so trata `type === 'podcast'`. Resultado: escolher Audio nao muda praticamente nada.
- Links Spotify derivados de `url` entram como `iframe` generico e usam `aspectRatio` de video (`16 / 9` ou `21 / 9`), ficando altos demais. O embed de faixa/podcast deve usar altura propria.

### 9a — Unificar valores de tipo

Escolher um dos contratos e usar em todos os lugares. Recomendacao: usar `audio`, por ser o rotulo do builder.

`components/content/MediaEmbed.jsx`:

```js
export function MediaEmbed({ type = 'video', src, url, title, provider, aspect, className, style }) {
  const isAudio = type === 'audio' || type === 'podcast';
  const ratio = aspect || (isAudio ? '21 / 9' : '16 / 9');
  const icon = isAudio ? 'headphones' : 'play-circle';
  // ...
}
```

`components/core/BlockRegistry.jsx`, bloco `mediaembed`:

```js
{ key: 'type', label: 'Tipo', type: 'select',
  options: [{ value: 'video', label: 'Vídeo' }, { value: 'audio', label: 'Áudio' }] },
```

`BuilderExport.migrate`:

```js
if (b.type === 'mediaembed' && b.props?.type === 'podcast') b.props.type = 'audio';
```

### 9b — Resolver Spotify como embed de audio com altura propria

`resolveMedia(url)` deve devolver metadados de layout, nao apenas `kind:'iframe'`.

```js
if (/open\.spotify\.com\//.test(u)) {
  const path = u.split('open.spotify.com/')[1].replace(/^intl-[a-z]{2}\//i, '');
  const clean = path.split('?')[0];
  const spotifyKind = clean.split('/')[0]; // track, episode, show, playlist, album...
  const compact = spotifyKind === 'track' || spotifyKind === 'episode';
  return {
    kind: 'spotify',
    src: `https://open.spotify.com/embed/${clean}`,
    height: compact ? 152 : 352,
  };
}
```

No render:

```js
let frameStyle = { aspectRatio: ratio };
if (media.kind === 'spotify') {
  frameStyle = { aspectRatio: 'auto', height: media.height || 152, minHeight: media.height || 152 };
  player = React.createElement('iframe', {
    src: media.src,
    title: title || 'Spotify',
    loading: 'lazy',
    allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
  });
} else if (media.kind === 'iframe') {
  player = React.createElement('iframe', { /* como hoje */ });
}
```

CSS continua:

```css
.spu-embed__frame{position:relative;width:100%}
.spu-embed__frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
```

### 9c — Player nativo de audio

Para `.mp3/.ogg/.wav`, manter altura compacta e nao usar aspect-ratio:

```js
} else if (media.kind === 'audio') {
  frameStyle = { aspectRatio: 'auto', minHeight: 96 };
  player = React.createElement('audio', { /* como hoje */ });
}
```

Hotfix no builder:

- o painel mapeia Audio para o valor que o DS atual entende (`podcast`);
- CSS temporario força `iframe[src*="open.spotify.com"]` para `height:152px`.

## 10 — Rodape: escolher tipo de licenca Creative Commons

Pedido: hoje o rodape só permite mostrar/ocultar a licença. O builder deve poder escolher entre, no mínimo:

- `byncsa` -> CC BY-NC-SA
- `byncnd` -> CC BY-NC-ND

`components/content/LicenseBadge.jsx`

Recomendacao: aceitar um prop de alto nivel `kind`/`licenseKind` e derivar `parts` e `url`.

```jsx
const LICENSES = {
  byncsa: {
    label: 'CC BY-NC-SA',
    parts: ['BY', 'NC', 'SA'],
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt_BR',
  },
  byncnd: {
    label: 'CC BY-NC-ND',
    parts: ['BY', 'NC', 'ND'],
    url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.pt_BR',
  },
};

export function LicenseBadge({
  kind = 'byncsa',
  licenseKind,
  parts,
  url,
  version = '4.0',
  ...rest
}) {
  const preset = LICENSES[licenseKind || kind] || LICENSES.byncsa;
  const resolvedParts = parts || preset.parts;
  const resolvedUrl = url || preset.url;
  // restante igual, usando resolvedParts/resolvedUrl
}
```

`components/content/PageFooter.jsx`

```jsx
export function PageFooter({
  code, context, credits = [], license = true,
  licenseKind = 'byncsa', licenseTone = 'dark',
  children, className, style
}) {
  // ...
  license && React.createElement(LicenseBadge, {
    kind: licenseKind,
    tone: licenseTone,
    style: { marginTop: 'var(--space-5)' },
  })
}
```

`components/core/BlockRegistry.jsx`, bloco `pagefooter`:

```js
propFields: [
  { key: 'licenseKind', label: 'Tipo de licença', type: 'select',
    options: [
      { value: 'byncsa', label: 'CC BY-NC-SA' },
      { value: 'byncnd', label: 'CC BY-NC-ND' },
    ] },
],
props: {
  code: 'Unidade · Tema',
  context: 'Descrição curta.',
  license: true,
  licenseKind: 'byncsa',
  credits: [{ role: 'Produção', name: '—' }],
}
```

Builder-side ja guarda `licenseKind` para o rodape; apos recompilar o DS, o campo passa a renderizar.

## 11 — Motion leve: parallax, fade/surgimento e abertura suave

Objetivo: adicionar movimento sutil, sem atrapalhar acessibilidade, PDF/print ou usuarios com redução de movimento.

Regras gerais:

- respeitar `prefers-reduced-motion: reduce`;
- em `@media print`, remover animacoes/transicoes e abrir conteudos ocultos quando aplicavel;
- usar duracoes curtas (`--dur`, `--dur-slow`) e `--ease-out`;
- motion visual deve ser atributo/propriedade opcional quando fizer sentido, mas pode vir ligado como padrao em componentes editoriais.

### 11.1 Hero

O `Hero` atual ja possui parallax (`parallax=true`). Manter e expor no registry como controle, caso ainda nao esteja visivel:

```js
propFields: [
  { key: 'parallax', label: 'Parallax', type: 'bool' },
  // demais props...
],
props: { parallax: true, /* ... */ }
```

### 11.2 Fade/surgimento suave de cards e destaques

Adicionar uma classe utilitaria de reveal, preferencialmente ativada por atributo:

```css
@keyframes spu-reveal-up {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.spu-motion-reveal,
.spu-callout,
.spu-panel,
.spu-examplecard,
.spu-feature--card,
.spu-stat--card,
.spu-ab,
.spu-quiz {
  animation: spu-reveal-up var(--dur-slow) var(--ease-out) both;
  animation-timeline: view();
  animation-range: entry 0% cover 22%;
}

@supports not (animation-timeline: view()) {
  .spu-motion-reveal,
  .spu-callout,
  .spu-panel,
  .spu-examplecard,
  .spu-feature--card,
  .spu-stat--card,
  .spu-ab,
  .spu-quiz {
    animation: spu-reveal-up var(--dur-slow) var(--ease-out) both;
  }
}

@media (prefers-reduced-motion: reduce), print {
  .spu-motion-reveal,
  .spu-callout,
  .spu-panel,
  .spu-examplecard,
  .spu-feature--card,
  .spu-stat--card,
  .spu-ab,
  .spu-quiz {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
```

Se o reveal automatico parecer excessivo, alternativa mais controlada:

- criar prop `motion="none|reveal"` em blocos/cards;
- adicionar `spu-motion-reveal` apenas quando `motion === 'reveal'`.

### 11.3 Accordion com abertura/fechamento suave

Hoje o painel e montado/desmontado (`isOpen && <div className="spu-acc__panel">...`). Para animar fechamento, manter o painel sempre no DOM e controlar altura/visibilidade por CSS.

```jsx
React.createElement('div', {
  className: 'spu-acc__panel',
  'aria-hidden': !isOpen,
}, React.createElement('div', { className: 'spu-acc__panelInner' },
  renderRich(it.content),
  itemExtras(it, 'spu-acc')
))
```

CSS:

```css
.spu-acc__panel{
  display:grid;
  grid-template-rows:0fr;
  opacity:0;
  transition:grid-template-rows var(--dur) var(--ease-out), opacity var(--dur-fast) var(--ease-out);
}
.spu-acc__panelInner{
  overflow:hidden;
  padding:0 var(--space-5);
}
.spu-acc__item--open .spu-acc__panel{
  grid-template-rows:1fr;
  opacity:1;
}
.spu-acc__item--open .spu-acc__panelInner{
  padding-bottom:var(--space-5);
}
@media (prefers-reduced-motion: reduce), print {
  .spu-acc__panel{transition:none;grid-template-rows:1fr;opacity:1}
}
```

### 11.4 Flipcard

O flipcard ja gira (`rotateY(180deg)`). Refinar para ficar mais sutil:

```css
.spu-flip__inner{
  transition:transform var(--dur-slow) var(--ease-in-out), filter var(--dur) var(--ease-out);
}
.spu-flip:hover .spu-flip__inner{
  filter:brightness(1.02);
}
.spu-flip--flipped .spu-flip__inner{
  transform:rotateY(180deg);
}
@media (prefers-reduced-motion: reduce), print {
  .spu-flip__inner{transition:none;transform:none !important;filter:none}
}
```

## Hotfix aplicado no builder

Enquanto este patch nao e recompilado no DS, o builder recebeu overrides temporarios em `src/index.css` para os itens 4, 5, 6/4b e 9, e ajustes no `Inspector` para esconder `color` em `callout` e mapear Audio de `MediaEmbed`. Remover esses overrides depois que o DS v8 estiver sincronizado, para evitar duplicacao de regra.
