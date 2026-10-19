# DS Patch 13 — Rich text em Masthead e Conclusion

## Objetivo

Evitar que marcações salvas pelo builder (`<span data-color>`, `<a>`, `<span data-term>`, `<p>`) apareçam como texto cru em componentes que recebem campos ricos.

## Alterações solicitadas

1. No `BlockRegistry`, marcar `masthead` como `rich: true` para que `org` e `program` sejam tratados como texto rico pelo builder.
2. Em `Masthead`, renderizar `org` e `program` com `RichText` inline quando forem strings HTML.
3. Em `Conclusion`, renderizar `body` com `RichText` quando for string HTML, preservando React nodes recebidos no modo de edição.

## Referência de implementação

```jsx
const isRichHtml = (value) => typeof value === 'string' && /[<&]/.test(value);

function richInline(value) {
  return isRichHtml(value)
    ? React.createElement(RichText, { html: value, as: 'span', className: 'spu-richtext--inline' })
    : value;
}

function richBlock(value) {
  return isRichHtml(value)
    ? React.createElement(RichText, { html: value })
    : value;
}
```

Aplicar `richInline(org)` e `richInline(program)` no `Masthead`.

Aplicar `richBlock(body)` no `Conclusion`, antes de inserir em `.spu-conclusion__body`.

## Observação

O builder recebeu uma camada temporária de compatibilidade para esses casos, inclusive nos HTMLs exportados. Quando o DS base incorporar essa correção, a compatibilidade pode continuar sem impacto ou ser removida depois.
