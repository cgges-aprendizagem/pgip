# DS Patch 15 — Campos visíveis de listas e objetos como rich text

## Objetivo

Permitir que textos visíveis no canvas, mesmo quando cadastrados originalmente pelo painel, aceitem formatação rica: links, glossário, marca-texto, cor, negrito e itálico.

## Campos a marcar como rich text

No `BlockRegistry`, atualizar os `itemFields` e `propFields` abaixo para `type: 'rich'` quando ainda estiverem como `text`.

- `markerlist.items`: `title`, `text`
- `reflexao.prompts`: item escalar `''`
- `mapfigure.markers`: `title`, `description`
- `statblock.stats`: `value`, `unit`, `label`, `description`
- `feature.items`: `title`, `text`
- `accordion.items`: `title`, `content`, `linkLabel`
- `timeline.eras`: `label`, `period`
- `timeline.eras.milestones`: `date`, `title`, `content`, `linkLabel`
- `quiz.questions`: `question`
- `quiz.questions.options`: `text`, `feedback`
- `flashcard.propFields`: `term`, `definition`
- `compareab.a/b`: `label`, `title`, `content`

Campos curtos devem usar `inline: true`. Campos longos como `content`, `definition` e `feedback` podem continuar em bloco.

## Campos diretos faltantes

Em `mapfigure`, incluir em `fields`:

```js
fields: ['caption', 'credit', 'label']
rich: true
```

## Renderização

Os componentes devem renderizar esses campos com `renderRich`, preservando React nodes quando o builder enviar um `<Editable />` no modo de edição.

Exemplos:

```jsx
renderRich(item.title, { inline: true })
renderRich(item.description, { inline: true })
renderRich(milestone.content)
```

Evitar inserir rich text de bloco dentro de `<p>`. Para campos como `description` usados dentro de parágrafo, usar `inline: true`.

## Observação

O builder recebeu uma camada de compatibilidade para editar/renderizar esses subcampos antes do DS base incorporar a mudança. Essa compatibilidade também foi incluída nos HTMLs exportados.
