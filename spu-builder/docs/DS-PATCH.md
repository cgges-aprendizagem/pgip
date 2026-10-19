# Patch do Design System — para colar no Claude Design

Dois acréscimos ao DS, pedidos pelo builder. Ambos são **retrocompatíveis** (campos novos opcionais; nada quebra no que já existe). Depois de aplicar, **recompile o `_ds_bundle.js`** e copie-o para `spu-builder/public/ds/`.

- **Patch 1 — `itemFields`** no `BlockRegistry`: schema declarativo de cada item de lista. Torna o editor de listas do builder preciso (campos fixos, enums, "alternativa correta" via rádio).
- **Patch 2 — `mode="edit"`** no `BlockView`: edição inline no canvas (injeta `<Editable>` nos campos rich). É o gap marcado como *"edit habilitará handles/Editable depois"*.

---

## Patch 1 — `itemFields` no `BlockRegistry.jsx`

**Onde:** `components/core/BlockRegistry.jsx`, no array `BLOCKS`. Adicione a chave `itemFields` (e, onde indicado, `itemsKey`/`fields`) em cada bloco de lista. Não remova nada.

### Schema de um descritor de campo
```js
// itemFields: array de descritores; descreve a forma de UM item da lista.
// { key, label, type, inline?, options?, accent?, exclusive?, itemFields? }
//   key       chave no objeto-item; use '' quando o item é um escalar (string)
//   type      'text' | 'rich' | 'number' | 'bool' | 'icon' | 'select' | 'accent' | 'list'
//   inline    true → editor de uma linha (campos curtos: título, legenda)
//   options   [{value,label}] quando type==='select'
//   exclusive true (em type 'bool') → só um item da lista pode ser true (rádio)
//   itemFields quando type==='list' (sub-lista aninhada): schema do sub-item
```

### Edições por bloco

```js
// ── Estrutura ──
{ type: 'referencias', /* …existente… */ itemsKey: 'items',
  itemFields: [{ key: '', label: 'Referência', type: 'rich', inline: true }] },

{ type: 'pagefooter', /* …existente… */
  fields: ['code', 'context'],            // ← torna código/descrição editáveis
  itemsKey: 'credits',
  itemFields: [
    { key: 'role', label: 'Papel', type: 'text' },
    { key: 'name', label: 'Nome', type: 'text' },
  ] },

// ── Destaques ──
{ type: 'reflexao', /* …existente… */
  fields: ['children'], rich: true,        // ← intro "Antes de avançar…" editável
  itemsKey: 'prompts',
  itemFields: [{ key: '', label: 'Pergunta', type: 'rich', inline: true }] },

// ── Mídia ──
{ type: 'statblock', /* …existente… */ // itemsKey: 'stats' já existe
  itemFields: [
    { key: 'value', label: 'Valor', type: 'text' },
    { key: 'unit', label: 'Unidade', type: 'text' },
    { key: 'label', label: 'Rótulo', type: 'text' },
    { key: 'description', label: 'Descrição', type: 'text' },
  ] },

{ type: 'feature', /* …existente… */ // itemsKey: 'items' já existe
  itemFields: [
    { key: 'icon', label: 'Ícone', type: 'icon' },
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'text', label: 'Texto', type: 'rich', inline: true },
  ] },

{ type: 'mediaembed', /* …existente… */
  fields: ['title'],
  propFields: [                            // ← props de objeto (não-lista); ver nota
    { key: 'type', label: 'Tipo', type: 'select',
      options: [{ value: 'video', label: 'Vídeo' }, { value: 'audio', label: 'Áudio' }] },
    { key: 'provider', label: 'Fonte', type: 'text' },
    { key: 'url', label: 'URL', type: 'text' },
  ] },

// ── Interativos ──
{ type: 'flashcard', /* …existente… */
  propFields: [
    { key: 'term', label: 'Conceito', type: 'text' },
    { key: 'definition', label: 'Definição', type: 'rich' },
    { key: 'icon', label: 'Ícone', type: 'icon' },
  ] },

{ type: 'accordion', /* …existente… */ // itemsKey: 'items' já existe
  itemFields: [
    { key: 'title', label: 'Pergunta', type: 'text' },
    { key: 'content', label: 'Resposta', type: 'rich' },
  ] },

{ type: 'timeline', /* …existente… */
  itemsKey: 'eras',
  itemFields: [
    { key: 'label',  label: 'Período',  type: 'text' },
    { key: 'period', label: 'Intervalo', type: 'text' },
    { key: 'color',  label: 'Cor',      type: 'accent' },
    { key: 'milestones', label: 'Marcos', type: 'list', itemFields: [
      { key: 'date',    label: 'Data',      type: 'text' },
      { key: 'title',   label: 'Marco',     type: 'text' },
      { key: 'content', label: 'Descrição', type: 'rich' },
    ] },
  ] },

{ type: 'compareab', /* …existente… */
  propFields: [
    { key: 'a', label: 'Lado A', type: 'object', fields: [
      { key: 'label', label: 'Rótulo', type: 'text' },
      { key: 'icon',  label: 'Ícone',  type: 'icon' },
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'content', label: 'Conteúdo', type: 'rich' },
    ] },
    { key: 'b', label: 'Lado B', type: 'object', fields: [
      { key: 'label', label: 'Rótulo', type: 'text' },
      { key: 'icon',  label: 'Ícone',  type: 'icon' },
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'content', label: 'Conteúdo', type: 'rich' },
    ] },
  ] },

{ type: 'quiz', /* …existente… */ // itemsKey: 'questions' já existe
  itemFields: [
    { key: 'question', label: 'Pergunta', type: 'rich', inline: true },
    { key: 'options', label: 'Alternativas', type: 'list', itemFields: [
      { key: 'text',     label: 'Alternativa', type: 'rich', inline: true },
      { key: 'correct',  label: 'Correta',     type: 'bool', exclusive: true },
      { key: 'feedback', label: 'Feedback',    type: 'rich' },
    ] },
  ] },
```

> **Nota `propFields`:** é o mesmo schema do `itemFields`, mas para as **props de objeto** do próprio bloco (não-listas), como `mediaembed`, `flashcard`, `compareab`. Opcional — se preferir, deixe os `propFields` de fora nesta rodada; o builder já tem fallback genérico para esses. Os `itemFields` (listas) são o ganho principal.

Nenhuma mudança no `export const BlockRegistry` — `byType` já expõe os campos novos.

---

## Patch 2 — `mode="edit"` no `BlockView.jsx`

**Por quê funciona sem tocar nos componentes:** `renderRich(value)` devolve **ReactNode como está** (RichText.jsx, linha 74). Logo, se o `BlockView` passar um `<Editable>` no lugar da string HTML de um campo, o componente o renderiza inline. Só o `BlockView` muda.

**Onde:** `components/core/BlockView.jsx`.

```jsx
import React from 'react';
import { BlockRegistry } from './BlockRegistry.jsx';
import { RichText, renderRich } from '../content/RichText.jsx';
import { Editable } from '../content/Editable.jsx';   // ← novo import

function richField(def, key) { return def && def.rich && (def.fields || []).indexOf(key) !== -1; }

// Campos rich tratados como bloco (multilinha); o resto é inline (uma linha).
const BLOCK_LEVEL = { children: 1, body: 1, html: 1, content: 1 };

export function BlockView({ block, mode = 'preview', onEdit }) {
  if (!block) return null;
  const def = BlockRegistry.byType[block.type];
  if (!def) return React.createElement('div', { style: { padding: 12, color: 'var(--status-warning)', font: 'var(--font-mono)' } }, `Bloco desconhecido: ${block.type}`);

  const props = block.props || {};
  const editing = mode === 'edit';
  const emit = (patch) => onEdit && onEdit(block, patch);

  // No modo edit, um campo de texto vira <Editable>; senão devolve o valor cru.
  const fieldNode = (key, inline) => {
    if (!editing) return props[key];
    return React.createElement(Editable, {
      key, html: typeof props[key] === 'string' ? props[key] : '',
      single: !!inline, placeholder: key,
      onChange: (html) => emit({ [key]: html }),
    });
  };

  // —— Título simples ——
  if (block.type === 'titulo') {
    const tag = props.level || 'h2';
    return React.createElement(tag, { className: 'spu-block-title' },
      editing
        ? React.createElement(Editable, { html: props.text || '', single: true, onChange: (h) => emit({ text: h }) })
        : renderRich(props.text, { inline: true }));
  }

  // —— Parágrafo (RichText) ——
  if (block.type === 'prose') {
    return editing
      ? React.createElement(Editable, { html: typeof props.html === 'string' ? props.html : '', onChange: (h) => emit({ html: h }) })
      : React.createElement(RichText, { html: typeof props.html === 'string' ? props.html : undefined });
  }

  const NS = (function () {
    if (typeof window === 'undefined') return {};
    const k = Object.keys(window).find((n) => /^SPUENAP.*DesignSystem/.test(n));
    return (k && window[k]) || {};
  })();
  const Comp = def.component && NS[def.component];
  if (!Comp) return null;

  // —— Container (Section) ——
  if (def.kind === 'container') {
    const kids = (block.children || []).map((child) =>
      React.createElement(BlockView, { key: child.id, block: child, mode, onEdit }));
    return React.createElement(Comp, { ...props, children: undefined },
      React.createElement('div', { className: 'spu-blockstack', style: { display: 'flex', flexDirection: 'column', gap: 'var(--flow-block)' } }, kids));
  }

  // —— Demais blocos ——
  const resolved = { ...props };
  (def.fields || []).forEach((k) => {
    if (editing) {
      resolved[k] = fieldNode(k, !BLOCK_LEVEL[k]);          // todos os fields viram Editable
    } else if (richField(def, k) && typeof resolved[k] === 'string' && k === 'children') {
      resolved.children = renderRich(resolved.children);     // preview: comportamento atual
    }
  });
  return React.createElement(Comp, resolved);
}
```

`BlockDocument` não muda (só repassa `mode`/`onEdit`).

### Contrato do `onEdit`
No modo edit, o `BlockView` chama **`onEdit(block, patch)`** — recebe o bloco e o `patch` de props. O builder resolve o bloco por `id` (raiz ou filho de Section) e aplica. (Hoje `onEdit` era repassado sem assinatura definida; isto a fixa.)

---

## O que muda no builder depois da recompila

Quando o novo `_ds_bundle.js` chegar, eu ligo do lado do app:

1. **Editor de listas preciso** — passa a ler `def.itemFields`: campos fixos, `select` (ex.: vídeo/áudio), `accent` (cor), e **`exclusive`** para "alternativa correta" virar rádio (resolve a limitação que te relatei). `propFields` cobre `mediaembed`/`flashcard`/`compareab`.
2. **Edição inline no canvas** — o Canvas passa a renderizar o bloco selecionado com `mode="edit"` e `onEdit={(blk, patch) => dispatch(...) }`, com a `MarkToolbar` flutuante já ativa (o canvas tem `[data-spu-canvas]`). O Inspetor segue para props estruturais (largura/superfície/ícone/cor).

Nada disso quebra o que já funciona em `mode="preview"`.

---

## Checklist

- [ ] Patch 1 no `BlockRegistry.jsx` (itemFields/itemsKey/fields)
- [ ] Patch 2 no `BlockView.jsx` (import Editable + modo edit)
- [ ] Recompilar `_ds_bundle.js` no Claude Design
- [ ] Copiar `_ds_bundle.js` (e `styles.css` se mudou) para `spu-builder/public/ds/`
- [ ] Avisar o builder → ligo a consumação dos campos novos
