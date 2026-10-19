# Auditoria Codex — 2026-06-25

Contexto: usuario informou que aplicou os patches 6 e 7 no DS e recompilou/copiu o kit para o builder. Esta auditoria confere o estado local do builder, o bundle atualmente em `public/ds/` e o bundle novo encontrado no DS-fonte.

## Resultado rapido

- `npm run build` passa sem erros.
- O builder ja tem consumo preparado para:
  - `doc.meta.toc` sincronizado a partir dos titulos H2.
  - toolbar de Sumario com toggle e itens ocultaveis.
  - `mapfigure` com camada de edicao de hotspots no canvas.
  - painel generico dirigido por `propFields`/`itemFields`, incluindo slots.
- O DS foi recompilado no DS-fonte: `/Users/luishlindner/Claude/SPU-DesignSystem/_ds_bundle.js` contem partes centrais dos patches 6 e 7.
- O kit recompilado foi sincronizado para `public/ds/` nesta auditoria. Os hashes de `_ds_bundle.js` e `image-slot.js` agora batem com o DS-fonte.

## Evidencias no bundle atual

Verificado antes da sincronizacao em `public/ds/_ds_bundle.js` (copia antiga no builder):

- `BlockDocument` ainda renderiza apenas `blocks.map(BlockView)`; nao renderiza `doc.meta.toc` nem `PageToc`.
- Nao ha entrada `type: 'mapfigure'` no `BlockRegistry`, embora o componente `MapFigure` exista.
- `MapFigure` nao aceita prop `slot`; usa apenas `src`.
- `titulo` ainda precisa confirmar se emite `id={block.id}` para ancora do sumario.
- `conclusion` no registry ainda usa `fields: ['kicker', 'title', 'body']` e `props.body`; o componente `Conclusion` consome `children`.
- `.spu-richtext` ainda esta como `color:var(--text-body)`, nao `color:inherit`.
- `Panel` ainda nao tem prop `bg` no registry e `.spu-panel--feature` ainda nao faz breakout `width:100vw`.

Verificado antes da sincronizacao em `public/ds/image-slot.js` (copia antiga no builder):

- O patch de slot vazio read-only ainda nao aparece na copia atual do builder: no ramo sem URL falta `this.style.display = editable ? '' : 'none'`, e no ramo com URL falta `this.style.display = ''`.

Verificado no DS-fonte recompilado:

- `/Users/luishlindner/Claude/SPU-DesignSystem/_ds_bundle.js` tem `type: 'mapfigure'`, `PageToc`, `BlockDocument` com `doc.meta.toc`, `.spu-richtext{color:inherit}`, `conclusion.children`, `Panel bg` e `.spu-panel--feature` full-bleed.
- `/Users/luishlindner/Claude/SPU-DesignSystem/assets/image-slot.js` tem o patch de ocultar slot vazio em read-only.
- Os hashes diferem da copia do builder, confirmando que `public/ds/` nao foi atualizado com o ultimo kit.

## Sincronizacao feita

Copiado do DS-fonte para o builder:

- `/Users/luishlindner/Claude/SPU-DesignSystem/_ds_bundle.js` -> `public/ds/_ds_bundle.js`
- `/Users/luishlindner/Claude/SPU-DesignSystem/styles.css` -> `public/ds/styles.css`
- `/Users/luishlindner/Claude/SPU-DesignSystem/assets/image-slot.js` -> `public/ds/image-slot.js`
- `/Users/luishlindner/Claude/SPU-DesignSystem/tokens/*` -> `public/ds/tokens/*`

Validado depois da copia:

- `npm run build` passa.
- `public/ds/_ds_bundle.js` agora contem `type: 'mapfigure'`, `PageToc`, `BlockDocument` com `doc.meta.toc`, `.spu-richtext{color:inherit}`, `conclusion.children`, `Panel bg` e `.spu-panel--feature` full-bleed.
- `public/ds/image-slot.js` agora contem o patch de ocultar slot vazio em read-only.

## Proximo passo recomendado

Os melhores proximos refinamentos do builder sao:

- mover blocos entre secoes/containers por drag-and-drop;
- indicador visual de posicao de drop;
- export SCORM;
- polimento offline de fontes/texturas no HTML exportado.
