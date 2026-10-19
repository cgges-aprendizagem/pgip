# DS Patch 14 — Rich text no rodapé

## Objetivo

Permitir formatação nos textos do rodapé, especialmente links e termos de glossário em créditos.

## Alterações solicitadas

1. No `BlockRegistry`, marcar `pagefooter` como `rich: true`.
2. Nos `itemFields` de `pagefooter.credits`, trocar `role` e `name` para `type: 'rich'` com `inline: true`.
3. Em `PageFooter`, renderizar `code`, `context`, `credits[].role` e `credits[].name` com `renderRich(..., { inline: true })`, preservando React nodes quando já vierem prontos do modo de edição.

## Referência de implementação

```jsx
function richInline(value) {
  return renderRich(value, { inline: true });
}
```

Uso esperado no componente:

```jsx
code && <p className="spu-pagefooter__code">{richInline(code)}</p>
context && <p className="spu-pagefooter__context">{richInline(context)}</p>

credits.map((c, i) => (
  <li key={i}>
    <b>{richInline(c.role)}</b>
    {richInline(c.name)}
  </li>
))
```

## Observação

O builder recebeu uma camada de compatibilidade para permitir esse comportamento antes do patch entrar no DS base. Links inseridos nos créditos também passam a ser capturados nas notas do PDF, pois o coletor de notas já percorre objetos aninhados nas props.
