# Patch do Design System v4 — link da MarkToolbar

Correção de 1 bug: o **popover de Link** (e qualquer popover com input) some no instante em que abre.

## Diagnóstico

`components/content/Editable.jsx`, função `MarkToolbar`:

- O popover de link tem `<input autoFocus>`. Ao abrir, o input **rouba o foco** do `contentEditable` → a seleção colapsa → dispara `selectionchange`.
- O handler `update()` (linha ~199) faz `if (sel.isCollapsed) { setBox(null); setMenu(null); return; }` → **esconde a barra e fecha o popover** imediatamente. O input desaparece antes de poder ser usado.
- Marca-texto/cor funcionam porque seus popovers usam `onMouseDown: preventDefault` (não há input, o foco nunca sai do editable). O link **não pode** preventDefault (o input precisa receber foco).

## Correção

No `update()`, **não esconder a barra quando o foco está dentro da própria toolbar/popover**. Uma linha no início do handler:

```js
React.useEffect(() => {
  const update = () => {
    // Foco dentro da toolbar/popover (ex.: input do link) → mantém visível.
    const ae = document.activeElement;
    if (ae && ae.closest && ae.closest('.spu-marktoolbar, .spu-mtpop')) return;   // ← NOVO

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { setBox(null); setMenu(null); return; }
    // …resto igual…
  };
  document.addEventListener('selectionchange', update);
  window.addEventListener('scroll', update, true);
  return () => { document.removeEventListener('selectionchange', update); window.removeEventListener('scroll', update, true); };
}, []);
```

Assim:
- abrir o popover de link mantém a barra (o foco está no input `.spu-mtpop`);
- `run()` já restaura a seleção salva (`savedRange`) antes de `applyLink`, então a marca aplica certo;
- clicar **fora** da toolbar tira o foco dela → a barra esconde normalmente (dismiss continua funcionando).

> Recompilar e copiar `_ds_bundle.js` para `spu-builder/public/ds/`.

## Bônus (opcional) — editar/remover termo e link

Hoje, para **remover** um termo de glossário ou um link: selecionar o trecho marcado e clicar **✕ (Limpar marcas)** — o `clearMarks` já desembrulha `[data-term]` e `a`. Para **editar**, remover e recriar.
Se quiser edição direta no futuro: ao abrir o popover de link/termo com a seleção **dentro** de um `a[href]`/`[data-term]` existente, pré-preencher o input com o valor atual e, no apply, substituir em vez de aninhar. (Melhoria de UX; não é bug.)
