# DS-PATCH-17 — RichText em todos os campos no preview e export

Aplicar esta correção no `components/core/BlockView.jsx` do DS-fonte antes da próxima recompilação.

## Problema

No modo de edição, todos os campos listados em `def.fields` são substituídos por `Editable` e aceitam formatação rica. No preview e na exportação, porém, o `BlockView` só passava `children` por `renderRich` e ainda exigia a flag opcional `def.rich`. Campos como `caption`, `credit`, `byline`, `cite`, `title` e `kicker` podiam exibir tags HTML literalmente.

## Correção

Primeiro, tratar toda chave presente em `def.fields` como RichText. Essa é a regra documentada pelo próprio registry e evita depender da flag histórica `def.rich`:

```jsx
function richField(def, key) {
  return def && (def.fields || []).includes(key)
}
```

No ramo de blocos não-container, substituir o tratamento especial de `children` por uma conversão geral:

```jsx
(def.fields || []).forEach((key) => {
  if (editing) {
    resolved[key] = fieldNode(key, !BLOCK_LEVEL[key])
  } else if (richField(def, key) && typeof resolved[key] === 'string') {
    resolved[key] = renderRich(resolved[key], {
      inline: !BLOCK_LEVEL[key],
    })
  }
})
```

Isso iguala o comportamento do canvas, preview e exportação. Campos de uma linha continuam inline; `children`, `body`, `html` e `content` continuam em bloco.

No `MediaEmbed`, o título visível pode receber o RichText, mas o atributo `title` do iframe deve continuar como texto puro. Extrair `textContent` do HTML para esse atributo, com remoção simples de tags como fallback.

O Inspetor do builder também deve considerar todas as chaves de `def.fields` como ricas, mesmo quando `def.rich` estiver ausente.
