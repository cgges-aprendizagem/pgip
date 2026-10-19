# Patch do Design System v3 — para colar no Claude Design

Terceira rodada, a partir do QA do builder. **O item 1 é crítico** (quebra o Hero e a edição inline de campos inline). Aplique no DS-fonte, **recompile o `_ds_bundle.js`** e copie para `spu-builder/public/ds/`.

---

## 1 — CRÍTICO: edição inline injeta `<div>` dentro de `<p>`/`<h1>`

**Sintoma:** "Hero não carrega"; MediaEmbed/Figure quebram. Console: `In HTML, <div> cannot be a descendant of <p>` (centenas).

**Causa:** no `mode="edit"`, o `BlockView` injeta `Editable` **sempre como `<div>`**. Campos inline (title, caption, byline…) são renderizados pelos componentes dentro de `<p>`/`<h1>`/`<span>` → `<div>` ali é HTML inválido → React aborta a subárvore (Hero some).

**Correção:** o `Editable` já aceita `as`. No `BlockView.jsx` (modo edit), passar `as='span'` para campos inline.

```js
// helper de campo no modo edit
const fieldNode = (key, inline) => {
  if (!editing) return props[key];
  return React.createElement(Editable, {
    key,
    html: typeof props[key] === 'string' ? props[key] : '',
    single: !!inline,
    as: inline ? 'span' : 'div',          // ← NOVO: inline vira <span>
    placeholder: key,
    onChange: (html) => emit({ [key]: html }),
  });
};
```
E no caso especial do `titulo` (renderizado dentro de `<h1..h6>`), o Editable também deve ser inline:
```js
if (block.type === 'titulo') {
  const tag = props.level || 'h2';
  return React.createElement(tag, { className: 'spu-block-title' },
    editing
      ? React.createElement(Editable, { html: props.text || '', single: true, as: 'span', onChange: (h) => emit({ text: h }) })
      : renderRich(props.text, { inline: true }));
}
```
`prose` continua `as='div'` (é bloco). Lembrar que `BLOCK_LEVEL` (children/body/html/content) = `div`; o resto = `span`.

> Opcional (polish): usar um placeholder amigável em vez da chave crua (hoje um campo vazio mostra "title"/"credit"). Pode mapear `{title:'Título', caption:'Legenda', …}` ou deixar vazio.

---

## 2 — FeatureGrid: HTML cru no campo `text`

`components/content/FeatureGrid.jsx` renderiza `item.text` sem `renderRich` → aparece `Uma <span data-color="terra">linha</span>.` no canvas.
**Correção:** `import { renderRich }` e renderizar `renderRich(item.text, { inline: true })`.

## 3 — Flipcard: HTML cru na definição

`components/interactive/Flipcard.jsx` renderiza `definition` sem `renderRich` (verso mostra `<span data-color="petrol">…`).
**Correção:** `renderRich(definition)` no verso (e `renderRich(term,{inline:true})` na frente, se quiser marcas no termo).

## 4 — MediaEmbed: Spotify com locale gera 404

URLs do Spotify vêm com locale (`/intl-pt/`): `open.spotify.com/intl-pt/track/ID`. O embed correto é `open.spotify.com/embed/track/ID` (sem locale). Hoje gera `embed/intl-pt/track/...` → 404.
**Correção** em `resolveMedia` (no arquivo real do MediaEmbed — está em `components/content/`):
```js
if (/open\.spotify\.com\//.test(u)) {
  const path = u.split('open.spotify.com/')[1].replace(/^intl-[a-z]{2}\//i, ''); // tira locale
  return { kind: 'iframe', src: `https://open.spotify.com/embed/${path.split('?')[0]}` };
}
```

## 5 — MarkToolbar larga demais (some ferramentas)

As cores claras (patch v2 C) aumentaram a barra → corta itens. Agrupar **destaques (marca-texto)** e **cores de texto** em dois menus (dropdown/popover) em vez de ~15 swatches inline.
**Onde:** `components/content/Editable.jsx`, `MarkToolbar`. Sugestão: dois botões ("Marca-texto ▾", "Cor ▾") que abrem um popover com os swatches; manter B/i/lista/link/termo/limpar inline. Mantém todas as marcas, barra estreita.

## 6 — Texto claro em fundo escuro: refinar (não afetar cartões)

Patch v2 B clareou demais/de menos. Regra correta: **só texto solto sobre a faixa** clareia; blocos com **fundo próprio claro** (accordion, flashcard, callout, panel, example, figure, stat card, compareab, timeline content, embed bar) mantêm texto escuro.
**Onde:** `components/layout/Section.jsx`. Substituir o bloco do patch v2 por:
```css
/* clareia o texto solto sobre a faixa escura */
.spu-section--dark, .spu-section--dark .spu-richtext, .spu-section--dark .spu-block-title,
.spu-section--dark .spu-kicker, .spu-section--dark h1, .spu-section--dark h2, .spu-section--dark h3,
.spu-section--dark h4, .spu-section--dark h5, .spu-section--dark h6 { color: var(--text-on-dark); }
.spu-section--dark .spu-richtext strong { color: var(--text-on-dark); }
.spu-section--dark .spu-richtext a { color: var(--ochre-300); }

/* RESET dentro de blocos com fundo próprio claro */
.spu-section--dark .spu-callout, .spu-section--dark .spu-panel, .spu-section--dark .spu-acc,
.spu-section--dark .spu-example, .spu-section--dark .spu-figure, .spu-section--dark .spu-stat--card,
.spu-section--dark .spu-compare, .spu-section--dark .spu-tl__content, .spu-section--dark .spu-embed__bar,
.spu-section--dark .spu-flip {
  color: var(--text-body);
}
.spu-section--dark .spu-callout .spu-richtext, .spu-section--dark .spu-panel .spu-richtext,
.spu-section--dark .spu-acc .spu-richtext, .spu-section--dark .spu-example .spu-richtext,
.spu-section--dark .spu-figure .spu-richtext, .spu-section--dark .spu-tl__content .spu-richtext,
.spu-section--dark .spu-flip .spu-richtext {
  color: var(--text-body);
}
```
(Ajuste os nomes de classe que eu possa ter errado — a ideia é "clareia tudo, reseta dentro dos cartões".)

## 7 — Referências: largura da coluna de conteúdo

`ReferenceList` ocupa largura cheia. Deve usar a largura de conteúdo padrão (como `Section width="content"`).
**Onde:** `components/content/ReferenceList.jsx` (CSS raiz): adicionar `max-width: var(--container-content); margin-inline: auto; padding-inline: var(--gutter);` ao container.

## 8 — ImageReveal: props não batem com o componente

O `ImageReveal` consome `before`/`after` (src de imagem via `<img>`), mas o `BlockRegistry` define `beforeSlot`/`afterSlot` — **nunca consumidos** → nunca mostra imagem, e não usa `<image-slot>` (o builder não consegue enviar imagem por ele).
**Correção recomendada (consistência com Figure):** fazer o `ImageReveal` renderizar `<image-slot id={beforeSlot}>` e `<image-slot id={afterSlot}>` (como o Figure faz com `slot`), em vez de `<img src=before/after>`. Assim o builder envia imagem pelo mesmo mecanismo (drag no canvas + botão do painel).
- Alternativa mais simples: trocar no registry para `before`/`after` (data-URL) e o builder grava a imagem direto na prop. (Menos consistente; incha o doc.)

---

## 9 — Placeholders amigáveis no modo edit (campos vazios mostram a chave)

No modo edit, campos vazios exibem a **chave** ("title", "credit") como placeholder. Usar rótulos PT-BR. No `BlockView.jsx`, mapa simples:
```js
const FIELD_PLACEHOLDER = { title:'Título', heading:'Subtítulo', caption:'Legenda',
  credit:'Crédito (opcional)', byline:'Autoria', kicker:'Sobrelinha', cite:'Fonte',
  text:'Texto', children:'Conteúdo', body:'Corpo', html:'Texto' };
// na criação do Editable: placeholder: FIELD_PLACEHOLDER[key] || key
```

## 10 — Figure: "Fonte:" fixo quando não há crédito

No modo edit o campo `credit` é sempre um elemento (Editable) → o Figure mostra "Fonte:" mesmo vazio. Em preview/export já é condicional (ok). Para o canvas não poluir: só renderizar o prefixo "Fonte:" quando `credit` tiver texto. Como no edit o valor é um elemento, condicionar pelo **valor cru** do bloco, não pelo nó. Sugestão: passar uma flag `hasCredit` ou checar `typeof credit==='string' ? credit.trim() : true`. (Aceitável deixar como está se preferir; é só no editor.)

## 11 — Espaço título→bloco seguinte muito amplo

A pilha usa `--flow-block` = `clamp(2rem,5vw,3.5rem)` entre todos os blocos; depois de um **título de seção** isso fica largo demais. Reduzir o espaço do `titulo` para o bloco seguinte. Sugestão no `BlockView`/CSS do título: `.spu-block-title{ margin: 0 0 calc(-1 * var(--flow-block) + var(--space-3)) 0 }` **ou** dar ao `titulo` um wrapper com `margin-bottom` negativo equivalente. Alternativa: a pilha (`spu-blockstack`) usar `gap: var(--flow-text)` logo após um título. Ajuste a gosto — o alvo é ~`var(--space-4/6)` entre título e texto.

## 12 — BleedImage deve ocupar a largura total da tela (mesmo dentro de Section)

`BleedImage`/`FullBleed` precisa "furar" o container de conteúdo da Section e ocupar 100vw.
**Onde:** CSS do BleedImage/FullBleed:
```css
.spu-bleed{ width:100vw; margin-left:calc(50% - 50vw); max-width:none; }
```
(Confirmar que nenhum ancestral tem `overflow:hidden`. No builder, a Section não corta — ok.)

## 13 — Biblioteca de ícones maior + busca no seletor

Dois pedidos: (a) **mais ícones** (hoje 33); (b) **busca** no `IconGallery`.

**(a) `components/core/Icon.jsx`** — acrescentar entradas ao mapa `ICONS` (inner-SVG do Lucide). Faltam, no mínimo, os ícones que os blocos já declaram:
```js
image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
layout: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
heading: '<path d="M6 12h12"/><path d="M6 20V4"/><path d="M18 20V4"/>',
type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
list: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
square: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
'book-marked': '<path d="M10 2v8l3-3 3 3V2"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
flower: '<circle cx="12" cy="12" r="3"/><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"/><path d="M12 7.5V9"/><path d="M7.5 12H9"/><path d="M16.5 12H15"/><path d="M12 16.5V15"/>',
// ...e quantos mais quiser (calendar, users, globe, file, video, mic, award, flag, star, bookmark, clock, pencil, trash, download, upload, eye, heart, etc.)
```
Atualizar `ICON_NAMES` (deriva das chaves de `ICONS`, então geralmente automático).

**(b) `components/core/IconGallery.jsx`** — adicionar um `<input>` de busca no topo que filtra por nome (substring), e renderizar só os que casam:
```js
const [q, setQ] = React.useState('');
const list = ICON_NAMES.filter(n => !q || n.includes(q.toLowerCase()));
// render: <input placeholder="Buscar ícone…" value={q} onChange={e=>setQ(e.target.value)} /> + grade de `list`
```
Assim o builder ganha busca e set ampliado automaticamente (o painel já usa `IconGallery`). No builder vou remover o fallback de ícones da biblioteca quando o set cobrir todos os blocos.

## 14 — Link e Termo de glossário não funcionam (dependem de `window.prompt`)

**Sintoma:** botões 🔗 (Link) e "termo" da MarkToolbar não fazem nada. Highlight/negrito/cor funcionam.

**Causa:** `applyLink`/`applyTerm` usam `window.prompt`. Em contexto **sandboxed/sem modais** (preview embutido do app, iframes) o `prompt` é ignorado e retorna `null` → o código faz `if(!url) return` → no-op silencioso. (Verificado: numa aba normal do navegador funciona; no preview embutido não.)

**Correção:** trocar `window.prompt` por um **input flutuante** (sem modal nativo), preservando a seleção. Em `components/content/Editable.jsx`:

```js
// Input flutuante para substituir window.prompt (funciona em sandbox/export).
function inlinePrompt(message, def) {
  return new Promise((resolve) => {
    const sel = window.getSelection();
    const r = sel && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : { left: innerWidth/2, bottom: 80 };
    const box = document.createElement('div');
    box.style.cssText = `position:fixed;z-index:10000;left:${Math.min(r.left, innerWidth-300)}px;top:${r.bottom+8}px;background:var(--ink-900);padding:8px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.3);display:flex;gap:6px`;
    const input = document.createElement('input');
    input.placeholder = message; input.value = def || '';
    input.style.cssText = 'font:13px system-ui;padding:6px 8px;border-radius:6px;border:0;width:240px';
    const ok = document.createElement('button');
    ok.textContent = 'OK';
    ok.style.cssText = 'border:0;border-radius:6px;background:var(--color-accent);color:#fff;padding:6px 10px;cursor:pointer';
    box.append(input, ok);
    document.body.appendChild(box);
    input.focus(); input.select();
    const done = (v) => { box.remove(); document.removeEventListener('pointerdown', outside, true); resolve(v); };
    const outside = (e) => { if (!box.contains(e.target)) done(null); };
    ok.onclick = () => done(input.value.trim() || null);
    input.onkeydown = (e) => { if (e.key==='Enter') done(input.value.trim()||null); if (e.key==='Escape') done(null); };
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  });
}

export async function applyLink() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const saved = sel.getRangeAt(0).cloneRange();             // preserva a seleção
  const url = await inlinePrompt('Endereço do link (https://…)', 'https://');
  if (!url) return;
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(saved);
  wrapSelection('a', { href: url }, 'a[href]');
}

export async function applyTerm() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const saved = sel.getRangeAt(0).cloneRange();
  const word = sel.toString().trim(); if (!word) return;
  const def = await inlinePrompt('Definição do termo “' + word + '”', '');
  if (!def) return;
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(saved);
  wrapSelection('span', { 'data-term': word, title: def }, 'span[data-term]');
}
```
(A MarkToolbar continua chamando `applyLink`/`applyTerm` no onClick — agora async, sem mudar mais nada.)

---

## Checklist
- [ ] 1 — BlockView.jsx (`as: inline?'span':'div'`) **crítico**
- [ ] 2 — FeatureGrid.jsx (renderRich text)
- [ ] 3 — Flipcard.jsx (renderRich definition)
- [ ] 4 — MediaEmbed.jsx (Spotify locale)
- [ ] 5 — Editable.jsx (MarkToolbar em dropdowns)
- [ ] 6 — Section.jsx (dark text refinado)
- [ ] 7 — ReferenceList.jsx (largura content)
- [ ] 8 — ImageReveal.jsx (usar image-slot) + confirmar registry
- [ ] 9 — BlockView.jsx (placeholders amigáveis)
- [ ] 10 — Figure.jsx ("Fonte:" só com crédito) — opcional
- [ ] 11 — título→bloco: reduzir espaço
- [ ] 12 — BleedImage/FullBleed full-bleed 100vw
- [ ] 13 — Icon.jsx (mais ícones) + IconGallery.jsx (busca)
- [ ] 14 — Editable.jsx (link/termo via input flutuante, sem window.prompt)
- [ ] Recompilar e copiar `_ds_bundle.js` para `spu-builder/public/ds/`
