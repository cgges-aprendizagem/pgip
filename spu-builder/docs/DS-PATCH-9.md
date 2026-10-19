# Patch do Design System v9 — full-bleed, colunas e tabelas

Aplicar no DS-fonte, recompilar e sincronizar o kit no builder.

## 1 — BleedImage dentro de Section continua full-bleed

Problema observado: depois do patch 8, `BleedImage` com `bleed=true` pode ficar visualmente limitado quando inserido dentro de `Section`, especialmente em preview, deixando de ocupar a largura da viewport.

Reforçar CSS:

```css
.spu-section__inner .spu-bleedimg--bleed,
.spu-bleedimg--bleed{
  width:100vw;
  max-width:none;
  margin-left:calc(50% - 50vw);
  margin-right:calc(50% - 50vw);
}
```

## 2 — BleedImage: legenda abaixo centralizada de forma consistente

Problema observado: quando `title`, `caption` e `credit` aparecem abaixo da imagem, nem todos os trechos ficam centralizados.

Reforçar CSS:

```css
.spu-bleedimg figcaption .spu-bleedimg__cap{
  display:block;
  text-align:center;
}
.spu-bleedimg figcaption .spu-bleedimg__title,
.spu-bleedimg figcaption .spu-bleedimg__credit{
  text-align:center;
}
```

## 3 — Columns: filhos alinhados ao topo

Problema observado: alguns componentes carregam margem superior própria quando entram em colunas, fazendo cartões começarem em alturas diferentes.

CSS recomendado:

```css
.spu-columns > *{
  margin-top:0 !important;
  align-self:start;
}
.spu-columns > * > :first-child,
.spu-columns .spu-blockstack > :first-child{
  margin-top:0 !important;
}
```

## 4 — Registrar DataTable como bloco no BlockRegistry

O componente `DataTable` existe no DS, mas ainda não está registrado como bloco. O builder adicionou uma extensão temporária para inserir e exportar tabelas. Ideal é oficializar no DS.

Contrato sugerido:

```js
{
  type: 'datatable',
  component: 'DataTable',
  label: 'Tabela',
  icon: 'grid',
  cat: 'Texto',
  kind: 'list',
  fields: ['caption'],
  propFields: [
    { key: 'dense', label: 'Condensada', type: 'bool' },
    { key: 'highlightFirst', label: 'Destacar primeira coluna', type: 'bool' },
    { key: 'striped', label: 'Linhas alternadas', type: 'bool' },
    { key: 'tone', label: 'Cor', type: 'select',
      options: [
        { value: 'default', label: 'Padrão' },
        { value: 'petrol', label: 'Petróleo' },
        { value: 'terra', label: 'Terracota' },
        { value: 'ochre', label: 'Ocre' },
      ] },
  ],
  props: {
    caption: 'Tabela',
    columns: [
      { key: 'c0', label: 'Coluna 1' },
      { key: 'c1', label: 'Coluna 2' },
    ],
    rows: [
      { c0: 'Valor 1', c1: 'Valor 2' },
      { c0: 'Valor 3', c1: 'Valor 4' },
    ],
    dense: false,
    highlightFirst: false,
    striped: false,
    tone: 'default',
  },
}
```

## 5 — DataTable: opções visuais e mobile

Hoje o wrapper já usa `overflow-x:auto`, bom para mobile. Acrescentar:

```css
.spu-table-wrap--striped .spu-table tbody tr:nth-child(even){
  background:color-mix(in srgb, var(--color-surface-warm) 52%, transparent);
}
.spu-table-wrap--striped .spu-table tbody tr:hover{
  background:var(--color-primary-soft);
}
.spu-table-wrap--tone-petrol .spu-table th{background:var(--petrol-700);color:#fff}
.spu-table-wrap--tone-terra .spu-table th{background:var(--terra-700);color:#fff}
.spu-table-wrap--tone-ochre .spu-table th{background:var(--ochre-700);color:#fff}
```

No componente:

```jsx
export function DataTable({
  columns = [], rows = [], caption,
  dense = false, highlightFirst = false,
  striped = false, tone = 'default',
  className, style
}) {
  return (
    <div className={cx(
      'spu-table-wrap',
      striped && 'spu-table-wrap--striped',
      tone !== 'default' && `spu-table-wrap--tone-${tone}`,
      className
    )} style={style}>
      {/* tabela atual */}
    </div>
  );
}
```

## 6 — Builder-side temporário

Enquanto o DS não registra oficialmente `datatable`, o builder:

- registra `datatable` em runtime;
- injeta CSS de compatibilidade nos previews e exports;
- oferece editor para colar tabela TSV/CSV/Markdown e converter para `columns`/`rows`.

Remover essa extensão depois que o DS v9 for sincronizado.
