# Patch do Design System v6 — Hotspots (MapFigure) e Sumário (recolhido)

Revisado para **reusar o que já existe** no DS: `MapFigure` (imagem com marcadores) e o padrão de **sumário recolhido** do template. Aplicar no DS-fonte, recompilar, copiar o bundle.

---

## 1 — Âncora de id no `titulo` (para os links do sumário)

`components/core/BlockView.jsx`, caso `titulo`: emitir `id={block.id}` na heading.
```js
if (block.type === 'titulo') {
  const tag = props.level || 'h2';
  return React.createElement(tag, { id: block.id, className: 'spu-block-title' },   // ← id={block.id}
    editing
      ? React.createElement(Editable, { html: props.text || '', single: true, as: 'span', onChange: (h) => emit({ text: h }) })
      : renderRich(props.text, { inline: true }));
}
```

---

## 2 — MapFigure como bloco "Imagem com hotspots" (+ suporte a slot)

O `MapFigure` já existe (imagem + marcadores `%` com popover + legenda). Faltam **registrar como bloco** e aceitar **`<image-slot>`** (hoje só `src`).

**2a. `components/media/MapFigure.jsx`** — aceitar `slot` (como o Figure):
```js
export function MapFigure({ src, slot, alt = '', markers = [], caption, credit, label, className, style }) {
  // …
  // dentro do .spu-map__frame, trocar o bloco de mídia por:
  const media = slot
    ? React.createElement('image-slot', { id: slot, shape: 'rect', fit: 'cover',
        placeholder: 'Arraste uma imagem', style: { width: '100%', display: 'block', minHeight: 300 } })
    : src
      ? React.createElement('img', { className: 'spu-map__img', src, alt })
      : React.createElement('div', { className: 'spu-map__phbox' }, /* placeholder atual */ );
  // …usar `media` no lugar do ternário src?img:placeholder
}
```

**2b. `components/core/BlockRegistry.jsx`** — novo bloco (Mídia):
```js
{ type: 'mapfigure', component: 'MapFigure', label: 'Imagem com hotspots', icon: 'map-pin',
  cat: 'Mídia', kind: 'list', itemsKey: 'markers',
  itemFields: [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'description', label: 'Descrição', type: 'rich' },
    { key: 'label', label: 'Rótulo do pino (opcional)', type: 'text' },
    { key: 'x', label: 'X (%)', type: 'number' },
    { key: 'y', label: 'Y (%)', type: 'number' },
  ],
  props: { slot: '', markers: [], caption: '', credit: '' } },
```
> O builder assina o `slot` automaticamente, faz upload pelo painel/canvas e adiciona/move marcadores **clicando na imagem** (grava `x`/`y`). `title`/`description` no painel. Pino numerado + popover já vêm do MapFigure.

---

## 3 — Sumário recolhido (gerado dos H2)

O sumário já existe como padrão **no template** (`Summary`: botão flutuante → painel com âncoras + scroll-spy), não como componente. Promovê-lo a componente e renderizá-lo no `BlockDocument` a partir de `doc.meta.toc`.

**3a. Novo `components/content/PageToc.jsx`** (reaproveita o markup/CSS do `op-summary` do template):
```jsx
import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { injectCss } from '../core/dsutil.js';

injectCss('spu-pagetoc-css', `
.spu-pagetoc{position:fixed;top:var(--space-5);right:var(--space-5);z-index:90;font-family:var(--font-body)}
.spu-pagetoc__toggle{display:flex;align-items:center;gap:.5em;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-pill);padding:.5em .9em;font-size:var(--fs-caption);font-weight:600;color:var(--text-strong);cursor:pointer;box-shadow:var(--shadow-md)}
.spu-pagetoc__panel{position:absolute;top:calc(100% + 8px);right:0;width:260px;max-height:60vh;overflow:auto;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);box-shadow:var(--shadow-lg);padding:var(--space-4)}
.spu-pagetoc__title{font-family:var(--font-mono);font-size:var(--fs-eyebrow);text-transform:uppercase;letter-spacing:.08em;color:var(--text-faint);margin:0 0 var(--space-3)}
.spu-pagetoc__panel a{display:flex;gap:.6em;align-items:baseline;color:var(--text-strong);text-decoration:none;padding:.35em 0;font-weight:600}
.spu-pagetoc__panel a:hover,.spu-pagetoc__panel a.is-active{color:var(--color-link-hover)}
.spu-pagetoc__num{font-family:var(--font-mono);font-size:var(--fs-caption);color:var(--color-primary-strong)}
@media print{.spu-pagetoc{display:none}}
`);

export function PageToc({ items = [], title = 'Neste conteúdo' }) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(null);
  const visible = (items || []).filter((i) => !i.hidden && i.text);
  React.useEffect(() => {
    if (!visible.length) return undefined;
    const obs = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    visible.forEach((i) => { const el = document.getElementById(i.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [items]);
  if (!visible.length) return null;
  return React.createElement('div', { className: 'spu-pagetoc' },
    React.createElement('button', { type: 'button', className: 'spu-pagetoc__toggle', onClick: () => setOpen((o) => !o) },
      React.createElement(Icon, { name: open ? 'x' : 'list', size: 16 }), 'Sumário'),
    open && React.createElement('nav', { className: 'spu-pagetoc__panel' },
      React.createElement('p', { className: 'spu-pagetoc__title' }, title),
      visible.map((i, n) => React.createElement('a', {
        key: i.id, href: '#' + i.id, className: active === i.id ? 'is-active' : '',
        onClick: () => setOpen(false),
      },
        React.createElement('span', { className: 'spu-pagetoc__num' }, String(n + 1).padStart(2, '0')),
        React.createElement('span', { dangerouslySetInnerHTML: { __html: i.text } })))));
}
```

**3b. `components/core/BlockView.jsx` — `BlockDocument`** renderiza o sumário a partir de `doc.meta.toc`:
```js
import { PageToc } from '../content/PageToc.jsx';

export function BlockDocument({ doc, mode = 'preview', onEdit }) {
  const blocks = (doc && doc.blocks) || [];
  const toc = doc && doc.meta && doc.meta.toc;
  return React.createElement(React.Fragment, null,
    toc && toc.enabled !== false && React.createElement(PageToc, { items: toc.items || [], title: toc.title }),
    blocks.map((b) => React.createElement(BlockView, { key: b.id, block: b, mode, onEdit })));
}
```

> O builder mantém `doc.meta.toc.items` sincronizado com os H2 (preserva `hidden`), e tem o controle de ligar/ocultar na toolbar. No export/preview o `BlockDocument` desenha o sumário recolhido. **Não há bloco `toc`** — é feature de documento.

---

## Checklist
- [ ] 1 — BlockView.jsx (id no titulo)
- [ ] 2 — MapFigure.jsx (slot) + registry (mapfigure)
- [ ] 3 — PageToc.jsx + BlockDocument (render do sumário via meta.toc)
- [ ] Recompilar + copiar `_ds_bundle.js` para `spu-builder/public/ds/`
