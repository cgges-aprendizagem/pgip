# Patch do Design System v5 — texto em faixa escura (abordagem por tokens)

O item 6 do v3 clareou só `.spu-richtext`/títulos. Componentes com classes próprias de texto (StatBlock, PullQuote, ReflectionStop, Timeline, MarkerList…) continuam **escuros sobre fundo escuro** — confirmado no preview: o StatBlock "100 / Rótulo" some na Section `surface="dark"`.

## Correção (substitui a regra do item 6)

Em vez de listar classe por classe, **remapear os tokens de texto** dentro de `.spu-section--dark`. Tudo que usa `var(--text-strong|body|muted)` ou `var(--color-primary-strong)` clareia automaticamente; depois **resetar os tokens dentro dos cartões** (que têm fundo próprio claro).

`components/layout/Section.jsx` — substitua o bloco de CSS do patch v3/B por:

```css
/* Faixa escura: remapeia os tokens → todo texto "solto" clareia sozinho */
.spu-section--dark {
  color: var(--text-on-dark);
  --text-strong: var(--text-on-dark);
  --text-body: var(--text-on-dark);
  --text-muted: var(--text-on-dark-muted);
  --color-primary-strong: var(--text-on-dark);
}
.spu-section--dark .spu-richtext a { color: var(--ochre-300); }

/* Cartões com fundo próprio claro: restauram os tokens escuros */
.spu-section--dark .spu-callout,
.spu-section--dark .spu-panel,
.spu-section--dark .spu-acc,
.spu-section--dark .spu-example,
.spu-section--dark .spu-figure--framed,
.spu-section--dark .spu-stat--card,
.spu-section--dark .spu-compare,
.spu-section--dark .spu-tl__content,
.spu-section--dark .spu-embed__bar,
.spu-section--dark .spu-flip {
  --text-strong: var(--ink-900);
  --text-body: var(--ink-700);
  --text-muted: var(--ink-500);
  --color-primary-strong: var(--petrol-700);
  color: var(--text-body);
}
```

(Valores de reset = os originais de `tokens/colors.css`: `--text-strong:var(--ink-900)`, `--text-body:var(--ink-700)`, `--text-muted:var(--ink-500)`, `--color-primary-strong:var(--petrol-700)`.)

Cobre StatBlock (`__value` usa `var(--color-primary-strong)`, `__label` usa `var(--text-strong)`, `__desc` usa `var(--text-muted)`), PullQuote, ReflectionStop, Timeline, MarkerList — sem enumerar cada um. O StatBlock com cor de acento (`--_sc`) segue na cor de acento (visível).

> Recompilar e copiar `_ds_bundle.js` para `spu-builder/public/ds/`.

## Validado no preview (v3, OK)
- ✅ FeatureGrid renderiza marcas (não mostra HTML cru)
- ✅ Full-bleed ocupa 100vw mesmo dentro de Section
- ✅ Título→texto com espaço razoável
- ✅ Título/parágrafo soltos clareiam em fundo escuro
- ⚠️ StatBlock e afins → corrigidos por este patch v5
