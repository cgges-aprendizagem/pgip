# DS-PATCH-11 — Figure: tamanho do image-slot em imagens com legenda

## Problema

No bloco `Figure` / "Imagem com legenda", as opções de tamanho (`sm`, `md`, `lg`, `full`) aparecem corretas no contrato, mas na visualização/export HTML a imagem com `slot` pode permanecer pequena. O sintoma aparece especialmente quando há imagem enviada via `<image-slot>`.

## Causa provável

O componente `Figure` define classes de largura no `<figure>`:

- `.spu-figure--sm`
- `.spu-figure--md`
- `.spu-figure--lg`
- `.spu-figure--full`

Mas o host do `<image-slot>` tem largura padrão própria no web component. Mesmo com `style={{ width: '100%' }}`, em alguns contextos ele continua calculando pequeno, e a rotina de altura proporcional usa essa largura pequena.

## Patch sugerido no DS

Arquivo: `components/media/Figure.jsx`

No CSS injetado de `spu-figure-css`, reforçar o host do slot dentro do frame:

```css
.spu-figure__frame > image-slot {
  display: block;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
}
```

Opcionalmente, tornar o componente defensivo para aliases antigos de tamanho:

```jsx
const SIZE_ALIAS = {
  small: 'sm',
  pequena: 'sm',
  medium: 'md',
  medio: 'md',
  media: 'md',
  large: 'lg',
  wide: 'lg',
  ampla: 'lg',
  total: 'full',
};

const resolvedSize = SIZE_ALIAS[size] || size;
```

E usar:

```jsx
className={cx('spu-figure', `spu-figure--${resolvedSize}`, framed && 'spu-figure--framed', className)}
```

## Compatibilidade temporária no builder

Enquanto este patch não está no DS base, o builder adicionou CSS compatível no preview e nos exports HTML/SCORM, além de normalizar aliases ao abrir projetos.
