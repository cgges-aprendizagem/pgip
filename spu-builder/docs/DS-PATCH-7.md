# Patch do Design System v7 — ajustes do QA

Aplicar no DS-fonte, recompilar, copiar bundle (e o `assets/image-slot.js`).

---

## 1 — CRÍTICO: texto inline escuro sobre fundo colorido no canvas

**Sintoma:** no canvas (modo edit), títulos brancos sobre faixa colorida ficam escuros — "Você sabia?" (header do Callout), "Exemplo prático" (ExampleCard), "Para fechar"/"Conclusão". No preview está ok.

**Causa:** no modo edit, os campos inline viram `<span class="spu-richtext">`, e `.spu-richtext{color:var(--text-body)}` (escuro) sobrescreve o branco que o container daria. No preview o título é string crua, que herda a cor do container.

**Correção:** `components/content/RichText.jsx` — `.spu-richtext` deve **herdar** a cor do container:
```css
.spu-richtext{color:inherit;line-height:var(--lh-body)}   /* era: color:var(--text-body) */
```
O `body`/`Section` já definem `color:var(--text-body)` (escuro) e `.spu-section--dark` define claro (v5), então a herança funciona em todos os casos — e o Editable inline herda o branco do `.spu-callout__hd`/scrim. (Os tokens de `strong`, links, marks seguem usando suas próprias cores.)

---

## 2 — Conclusão não mostra o corpo

`Conclusion` renderiza `children`, mas o `BlockRegistry` define o campo como **`body`** → o texto vai para uma prop ignorada.

**Correção:** `components/core/BlockRegistry.jsx`, bloco `conclusion`: renomear `body` → `children`:
```js
{ type: 'conclusion', component: 'Conclusion', /* … */ kind: 'text', locks: { bg: true },
  fields: ['kicker', 'title', 'children'],     // ← era ['kicker','title','body']
  props: { kicker: 'Para fechar', kickerIcon: 'check', title: 'Conclusão',
           children: '<p>Retome o essencial em poucas linhas.</p>' },   // ← era body
  rich: true },
```

---

## 3 — Bloco de destaque (Panel): cor de fundo + "modo bloco" full-bleed

**3a. Cor de fundo do card.** `components/content/Panel.jsx` — aceitar `bg`:
```js
export function Panel({ children, variant = 'box', wide = false, kicker, kickerIcon = 'map-pin',
  title, color, bg, className, style }) {
  // …
  const bgStyle = bg ? { background: bg, backgroundImage: 'none' } : null;
  // aplicar nos dois returns:
  // style: { ...(color ? { '--_pc': color } : null), ...bgStyle, ...style }
}
```
`components/core/BlockRegistry.jsx`, bloco `panel` — acrescentar `bg` ao `propFields` (junto do `variant`):
```js
propFields: [
  { key: 'variant', label: 'Estilo', type: 'select',
    options: [{value:'box',label:'Caixa'},{value:'feature',label:'Bloco (full-bleed)'},{value:'accent',label:'Acento'}] },
  { key: 'bg', label: 'Cor de fundo', type: 'select',
    options: [
      { value: '', label: 'Quente (padrão)' },
      { value: 'var(--petrol-50)', label: 'Petróleo claro' },
      { value: 'var(--terra-50)', label: 'Terracota claro' },
      { value: 'var(--ochre-50)', label: 'Ocre claro' },
      { value: 'var(--green-100)', label: 'Verde claro' },
      { value: 'var(--sand-100)', label: 'Areia' },
      { value: 'var(--bg-paper)', label: 'Papel' },
    ] },
],
```
E `props` do panel ganha `bg: ''`.

**3b. "Modo bloco" (sem cantos arredondados) = full-bleed real (100vw).** Hoje `variant="feature"` já tira o arredondamento, mas só ocupa a largura do container. Para furar a coluna e ocupar a tela: `components/content/Panel.jsx`, no CSS `.spu-panel--feature`:
```css
.spu-panel--feature{border-radius:0;border-inline:none;border-block:1px solid var(--color-border);
  background-size:420px;padding:0;margin:var(--flow-block) 0;
  width:100vw;margin-left:calc(50% - 50vw);max-width:none}   /* ← breakout 100vw */
```
(O `.spu-panel__inner` já centraliza o conteúdo com max-width.)

---

## 4 — Slot de imagem vazio: ocultar no HTML exportado

Quando não há imagem, a versão final deve ficar **sem** o slot (não mostrar o placeholder). `assets/image-slot.js`, no fim de `_render()` (ramo `else`, sem url): ocultar quando **read-only** (sem omelette):
```js
} else {
  this._img.style.display = 'none';
  this._img.removeAttribute('src');
  this._ghost.removeAttribute('src');
  this._empty.style.display = 'flex';
  this.removeAttribute('data-filled');
  this.style.display = editable ? '' : 'none';   // ← export sem imagem → some
}
```
E no ramo `if (url)` acrescentar `this.style.display = '';` (reexibe se voltar a ter imagem).
> Já apliquei isso na cópia do builder (`public/ds/image-slot.js`) para o export atual; espelhe no DS-fonte para não reverter na próxima cópia.

---

## 5 — (opcional) Remover "Parada de reflexão" do registry

O usuário não vai usar o `reflexao`. Já ocultei na biblioteca do builder; se quiser, remova a entrada `reflexao` do `BLOCKS` no `BlockRegistry.jsx`.

---

## Checklist
- [ ] 1 — RichText.jsx (`.spu-richtext{color:inherit}`) **crítico**
- [ ] 2 — BlockRegistry.jsx (conclusion `body`→`children`)
- [ ] 3 — Panel.jsx (`bg` + feature 100vw) + registry propFields
- [ ] 4 — assets/image-slot.js (ocultar slot vazio read-only)
- [ ] 5 — (opcional) remover `reflexao`
- [ ] Recompilar + copiar `_ds_bundle.js` e `image-slot.js` para `spu-builder/public/ds/`
