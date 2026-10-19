# Patch do Design System v10 — BleedImage full-bleed anulado por margin inline

Aplicar no DS-fonte, recompilar e sincronizar o kit no builder.

## Problema

Depois do v9, `BleedImage` ainda pode aparecer recuada dentro de `Section`.

A causa é que o componente renderiza:

```jsx
style: {
  margin: 'var(--flow-block) 0',
  ...style
}
```

Esse `margin` inline sobrescreve o CSS:

```css
.spu-bleedimg--bleed{
  margin-left:calc(50% - 50vw);
  margin-right:calc(50% - 50vw);
}
```

Resultado: a classe full-bleed calcula corretamente, mas perde para o `margin` inline.

## Correção recomendada

Em `components/media/BleedImage.jsx`, trocar o `style` inline do `<figure>` por margens verticais separadas:

```jsx
const figureStyle = bleed
  ? {
      marginTop: 'var(--flow-block)',
      marginBottom: 'var(--flow-block)',
      ...style,
    }
  : {
      margin: 'var(--flow-block) 0',
      ...style,
    };
```

E usar:

```jsx
React.createElement('figure', {
  className: cx('spu-bleedimg', bleed && 'spu-bleedimg--bleed', ...),
  style: figureStyle,
  ...rest
}, ...)
```

Alternativa ainda mais explícita:

```jsx
const figureStyle = {
  marginTop: 'var(--flow-block)',
  marginBottom: 'var(--flow-block)',
  ...(bleed ? {
    width: '100vw',
    maxWidth: 'none',
    marginLeft: 'calc(50% - 50vw)',
    marginRight: 'calc(50% - 50vw)',
  } : {
    marginLeft: 0,
    marginRight: 0,
  }),
  ...style,
};
```

## Builder-side temporário

Enquanto o DS não for recompilado, o builder adicionou compat CSS em `src/index.css` e nos exports HTML:

```css
.spu-bleedimg--bleed{
  width:100vw !important;
  max-width:none !important;
  margin-left:calc(50% - 50vw) !important;
  margin-right:calc(50% - 50vw) !important;
}
```

Remover esse compat depois que o DS v10 for sincronizado.
