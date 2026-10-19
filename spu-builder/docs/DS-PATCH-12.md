# DS-PATCH-12 — Glossário em RichText e notas de PDF

## Problema

O DS já tem `GlossaryTerm` e `GlossaryFootnotes`, mas os termos criados pela `MarkToolbar` dentro de texto rico são salvos como:

```html
<span data-term="Termo" title="Definição">Termo</span>
```

O `renderRich`/`RichText` atual renderiza esse HTML com `dangerouslySetInnerHTML`. Resultado:

- no HTML final o termo aparece apenas sublinhado, sem popover clicável;
- no PDF o termo não passa por `GlossaryTerm`, então não é registrado em `GlossaryFootnotes`.

## Patch ideal no DS

Arquivo: `components/content/RichText.jsx`

Substituir a renderização cega de strings HTML por um parser/renderer leve que preserve tags permitidas e converta:

```html
<span data-term="..." title="...">...</span>
```

em:

```jsx
<GlossaryTerm term={term} definition={definition}>{children}</GlossaryTerm>
```

Se preferir manter o `dangerouslySetInnerHTML`, alternativa mínima:

1. adicionar um enhancer pós-render no `RichText` para termos clicáveis em HTML;
2. no modo print, coletar `[data-term]` dos textos ricos para gerar notas no fim.

## Links no PDF

Além do glossário, o export/print deve coletar links de texto rico:

```html
<a href="https://...">rótulo</a>
```

E renderizá-los ao final do documento como notas:

```text
Links
1. rótulo — https://...
```

## Compatibilidade temporária no builder

Enquanto este patch não está no DS base:

- o builder/export adiciona um enhancer DOM para tornar `[data-term]` clicável no HTML;
- a prévia PDF coleta `[data-term]` e links de textos ricos e lista tudo ao final.
