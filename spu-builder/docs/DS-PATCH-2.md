# Patch do Design System v2 — para colar no Claude Design

Segunda rodada de evoluções do DS, a partir do QA do builder. Aplique no DS-fonte (`~/Claude/SPU-DesignSystem/`), **recompile o `_ds_bundle.js`** e copie para `spu-builder/public/ds/`. Tudo retrocompatível.

Itens nesta rodada: **B** (texto claro em fundo escuro), **C** (cores de texto claras/vívidas), **D** (richtext cru no canvas: Timeline/CompareAB), **E** (bloco Colunas), **F** (variantes como dropdown), **I** (vídeo/áudio embutido). **K** (sumário) e **L** (hotspots) são propostas de design no fim.

> Já feito no builder (não precisa recompilar p/ isso): **A** (blocos sempre dentro de Section), **J** (níveis H1–H6), e a correção de seções nascendo vazias.

---

## B — Texto/ícones legíveis em `surface="dark"`

**Problema:** `.spu-section--dark` já define `color:var(--text-on-dark)`, mas componentes de texto (RichText, títulos) fixam a própria cor e não herdam.

**Onde:** `components/layout/Section.jsx`, no `injectCss('spu-section-css', …)`. Acrescente ao final do bloco CSS:

```css
/* —— Texto/elementos "soltos" sobre faixa escura herdam cor clara —— */
.spu-section--dark .spu-richtext,
.spu-section--dark .spu-block-title,
.spu-section--dark .spu-tl__title,
.spu-section--dark .spu-tl__mtitle,
.spu-section--dark .spu-kicker,
.spu-section--dark h1, .spu-section--dark h2, .spu-section--dark h3,
.spu-section--dark h4, .spu-section--dark h5, .spu-section--dark h6 { color: var(--text-on-dark); }

.spu-section--dark .spu-richtext strong,
.spu-section--dark .spu-richtext b { color: var(--text-on-dark); }

.spu-section--dark .spu-richtext a { color: var(--ochre-300); text-decoration-color: var(--ochre-400); }

/* Não mexer em blocos "encartados" (têm fundo próprio claro): Callout/Panel/
   ExampleCard/Figure/Accordion seguem com seu texto escuro sobre o cartão. */
```

> Regra: só os elementos que ficam **direto sobre a faixa** clareiam. Blocos com cartão próprio (fundo claro) mantêm o texto escuro — não inclua `.spu-callout`, `.spu-panel`, etc. nesta lista.

---

## C — Cores de texto claras/vívidas (para fundo escuro)

Hoje `RichText.COLORS` e `SPU_MARKS.colors` só têm tons escuros. Adicionar variantes claras.

**C.1 — `components/content/RichText.jsx`** — no mapa `COLOR` e no CSS:

```js
const COLOR = {
  petrol: 'var(--petrol-700)', terra: 'var(--terra-700)', ochre: 'var(--ochre-700)',
  green: 'var(--green-700)', ink: 'var(--ink-900)', muted: 'var(--text-muted)',
  // claros/vívidos (para fundo escuro)
  light: 'var(--text-on-dark)',
  'ochre-light': 'var(--ochre-300)', 'terra-light': 'var(--terra-300)',
  'petrol-light': 'var(--petrol-300)', 'green-light': 'var(--green-400)',
};
```
No `injectCss('spu-richtext-css', …)`, acrescente:
```css
.spu-richtext [data-color="light"]{color:var(--text-on-dark)}
.spu-richtext [data-color="ochre-light"]{color:var(--ochre-300)}
.spu-richtext [data-color="terra-light"]{color:var(--terra-300)}
.spu-richtext [data-color="petrol-light"]{color:var(--petrol-300)}
.spu-richtext [data-color="green-light"]{color:var(--green-400)}
```

**C.2 — `components/content/Editable.jsx`** — em `SPU_MARKS.colors`, acrescente:
```js
{ id: 'light',        label: 'Claro',          swatch: 'var(--text-on-dark)' },
{ id: 'ochre-light',  label: 'Ocre claro',     swatch: 'var(--ochre-300)' },
{ id: 'terra-light',  label: 'Terracota claro', swatch: 'var(--terra-300)' },
{ id: 'petrol-light', label: 'Petróleo claro', swatch: 'var(--petrol-300)' },
{ id: 'green-light',  label: 'Verde claro',    swatch: 'var(--green-400)' },
```

**C.3 — `components/core/BuilderManifest.jsx`** — em `textColors`:
```js
textColors: ['petrol', 'terra', 'ochre', 'green', 'muted',
             'light', 'ochre-light', 'terra-light', 'petrol-light', 'green-light'],
```

---

## D — RichText cru no canvas (Timeline e CompareAB)

Estes dois renderizam HTML de campo **sem** `renderRich` → o HTML aparece como texto no canvas. (Accordion e Quiz já usam `renderRich`, ok.)

**D.1 — `components/interactive/Timeline.jsx`** — `import { renderRich } from '../content/RichText.jsx';` e troque as duas ocorrências de `m.content` (linhas ~57 e ~96) por `renderRich(m.content)`. Opcional: `era.label`/`m.title`/`m.date` via `renderRich(x,{inline:true})` se quiser marcas neles.

**D.2 — `components/interactive/CompareAB.jsx`** — `import { renderRich }` e renderize o conteúdo dos lados A/B com `renderRich(side.content)` em vez do valor cru.

---

## E — Bloco "Colunas" (container até 4 colunas)

O componente `Columns` já existe (`components/layout/Columns.jsx`). Falta registrá-lo como container.

**E.1 — `components/core/BlockRegistry.jsx`** — novo bloco em `BLOCKS` (seção Estrutura):
```js
{ type: 'columns', component: 'Columns', label: 'Colunas', icon: 'layers',
  cat: 'Estrutura', kind: 'container', stack: false,
  props: { count: 2, gap: 'lg', children: [] },
  propFields: [
    { key: 'count', label: 'Nº de colunas', type: 'select',
      options: [{value:2,label:'2'},{value:3,label:'3'},{value:4,label:'4'}] },
    { key: 'gap', label: 'Espaçamento', type: 'select',
      options: [{value:'sm',label:'Pequeno'},{value:'md',label:'Médio'},{value:'lg',label:'Grande'}] },
  ] },
```
`columns` é um CHILD_TYPE (não está em STRUCTURAL_TYPES) → pode entrar numa Section. Como é container, também aceita filhos (os mesmos CHILD_TYPES). **Não** adicionar `columns` a STRUCTURAL_TYPES.

**E.2 — `components/core/BlockView.jsx`** — no ramo `def.kind === 'container'`, respeitar `stack:false` (Columns precisa dos filhos diretos na grade, não num wrapper flex-column):
```js
if (def.kind === 'container') {
  const kids = (block.children || []).map((child) =>
    React.createElement(BlockView, { key: child.id, block: child, mode, onEdit }));
  if (def.stack === false) {
    // Columns/grade: filhos vão direto como children do componente.
    return React.createElement(Comp, { ...props, children: undefined }, kids);
  }
  return React.createElement(Comp, { ...props, children: undefined },
    React.createElement('div', { className: 'spu-blockstack', style: { display:'flex', flexDirection:'column', gap:'var(--flow-block)' } }, kids));
}
```

> **Builder:** vou generalizar o canvas para containers aninhados (Section → Columns → blocos) — é trabalho meu pós-recompila.

---

## F — Variantes como dropdown (não digitar)

Expor os enums de `variant` via `propFields` para virarem `<select>` no painel.

**`components/core/BlockRegistry.jsx`** — acrescente `propFields` nos blocos:
```js
// pullquote (Citação)
propFields: [{ key:'variant', label:'Estilo', type:'select',
  options:[{value:'eye',label:'Olho (aspas grandes)'},{value:'block',label:'Bloco'}] }],

// callout (Destaque)
propFields: [{ key:'variant', label:'Estilo', type:'select',
  options:[{value:'header',label:'Faixa no topo'},{value:'ear',label:'Orelha de ícone'}] }],

// panel (Bloco de destaque)
propFields: [{ key:'variant', label:'Estilo', type:'select',
  options:[{value:'box',label:'Caixa'},{value:'feature',label:'Destaque'},{value:'accent',label:'Acento'}] }],

// statblock (Dados/estatísticas)
propFields: [{ key:'variant', label:'Estilo', type:'select',
  options:[{value:'rule',label:'Com régua'},{value:'card',label:'Cartão'},{value:'plain',label:'Simples'}] }],
```
(Se o bloco já tiver `propFields`, acrescente o item `variant` ao array existente.)

---

## I — Vídeo/áudio embutido (MediaEmbed)

Hoje o `MediaEmbed` só monta `<iframe>` se receber `src`. Fazer o componente **derivar** o player a partir da `url` (o builder só guarda a url).

**`components/media/MediaEmbed.jsx`** — adicionar um resolvedor de URL e ramos de player:
```js
// Deriva como exibir a mídia a partir da url.
function resolveMedia(url) {
  if (!url) return { kind: 'placeholder' };
  const u = url.trim();
  let m;
  if ((m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)))
    return { kind: 'iframe', src: `https://www.youtube.com/embed/${m[1]}` };
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)))
    return { kind: 'iframe', src: `https://player.vimeo.com/video/${m[1]}` };
  if (/open\.spotify\.com\//.test(u))
    return { kind: 'iframe', src: u.replace('open.spotify.com/', 'open.spotify.com/embed/') };
  if (/\.mp4($|\?)/i.test(u)) return { kind: 'video', src: u };
  if (/\.(mp3|ogg|wav)($|\?)/i.test(u)) return { kind: 'audio', src: u };
  return { kind: 'link', src: u }; // desconhecido → mantém placeholder + link na legenda
}
```
No corpo, escolher o player conforme `resolveMedia(url)`:
- `iframe` → `<iframe src=...>` (como hoje);
- `video` → `<video controls src=...>` ocupando o frame;
- `audio` → `<audio controls src=...>` (frame baixo, ~96px);
- `placeholder`/`link` → placeholder atual + a legenda/url abaixo (mantém o comportamento atual).

A legenda (`title`/`provider`/`url`) abaixo permanece em todos os casos.

---

## K — Sumário (TOC) a partir de H2 — *proposta de design*

O TOC precisa enxergar os outros blocos; um componente isolado não tem esse contexto. Proposta:
- **Builder** varre o doc e coleta os `titulo` com `level: 'h2'` (id + texto), montando uma lista; cada entrada tem um toggle "ocultar do sumário".
- Novo bloco **`toc`** (`kind:'marker'`/'list') com props `{ title:'Neste conteúdo', items:[{id,text,hidden}] }` — o builder **repopula** `items` automaticamente quando títulos H2 mudam (com merge dos `hidden` por id).
- Componente **`Toc`** no DS renderiza a lista (links âncora para os ids dos títulos). Para isso, o `titulo` deve emitir um `id` âncora (slug do texto) no `BlockView`.
- Decisão p/ depois: regenerar automático vs. botão "Atualizar sumário".

> Precisa de: componente `Toc` + âncora nos `titulo` (DS) + lógica de coleta/merge (builder). Implementar numa rodada dedicada.

---

## L — Imagem com hotspots — *proposta de design*

Componente novo `Hotspots`: uma imagem (via `<image-slot>`) + N marcadores posicionados em `%` (x,y) com rótulo/conteúdo em popover. Edição no builder:
- `kind:'list'`, `itemsKey:'spots'`, `itemFields:[{x:number},{y:number},{title},{content:rich}]`;
- posicionar arrastando o marcador sobre a imagem (interação no canvas — trabalho de builder);
- a imagem usa um `slot` como nos demais blocos de mídia.

> Precisa de design de interação (arraste do marcador no canvas). Implementar em rodada dedicada, depois de confirmarmos o comportamento desejado.

---

## Checklist
- [ ] B — Section.jsx (CSS dark)
- [ ] C — RichText.jsx + Editable.jsx + BuilderManifest.jsx (cores claras)
- [ ] D — Timeline.jsx + CompareAB.jsx (renderRich)
- [ ] E — BlockRegistry.jsx (bloco columns) + BlockView.jsx (stack:false)
- [ ] F — BlockRegistry.jsx (propFields variant)
- [ ] I — MediaEmbed.jsx (resolveMedia + players)
- [ ] Recompilar `_ds_bundle.js` e copiar para `spu-builder/public/ds/`
- [ ] Avisar o builder → ligo consumação (variantes, colunas aninhadas, cores)
- [ ] K e L: agendar rodadas dedicadas
