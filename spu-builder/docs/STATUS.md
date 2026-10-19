# Status do SPU Builder — sessão de 23/06

Builder estilo GrapeJS/Wix que consome o **SPU ENAP Design System** (kit compilado em `public/ds/`). Estado central = doc `{schema, meta, blocks[]}`; o DS transforma dados em UI; toda restrição vem do DS.

## Rodada 11 — Prévia PDF/A4 no builder (25/06)
- **Patch 10 aplicado e sincronizado**: o DS agora mantém `BleedImage` full-bleed por inline style; removidos os overrides temporários do builder/export.
- **Build validado** após a limpeza pós-patch 10.
- **Exportar → Prévia PDF**: abre uma sobreposição A4/print dentro do builder, `window.__SPU_PRINT=true`, CSS de página e conteúdo renderizado pelo DS em `mode="preview"`.
- A prévia usa o comportamento print já existente no DS para interativos quando suportado e adiciona um **gabarito discreto** para quizzes ao final do documento.
- Glossário em marcações de texto é renderizado como notas ao fim quando o DS coletar termos no modo print.
- Próximo passo sugerido: validar visualmente essa folha A4 e, depois, evoluir para exportação PDF direta sem modal de impressão.

## Rodada 12 — Import HTML com imagens + ajustes PDF (25/06)
- HTML exportado agora inclui `<script id="spu-image-slots">` com o sidecar de imagens; ao importar HTML autocontido, o builder restaura essas imagens no storage local.
- Na visualização HTML do builder, o botão flutuante de sumário do DS foi deslocado para baixo para não sobrepor a barra "Fechar".
- Prévia PDF força `ReferenceList` aberto (`defaultOpen=true`) para referências não saírem colapsadas.
- Inspetor ganhou "Quebrar página antes no PDF"; a prévia A4 respeita a quebra e divide seções quando a marca estiver em um bloco interno.

## Rodada 13 — Figure com legenda: tamanho do slot (25/06)
- Corrigido no builder/export o caso em que `Figure` com `<image-slot>` ficava pequena mesmo com tamanho médio/amplo/total.
- Adicionado CSS compatível no preview e nos HTMLs exportados para forçar o slot a ocupar 100% do frame.
- Adicionada normalização defensiva de aliases de tamanho ao abrir projetos (`small/medium/large/wide/total` etc.).
- Registrado **docs/DS-PATCH-11.md** para levar a correção ao DS base.

## Rodada 14 — Glossário e notas de links no PDF (25/06)
- Adicionado enhancer no builder/export para tornar termos `[data-term]` clicáveis no HTML e funcionais em mobile.
- Prévia PDF agora coleta termos de glossário e links dentro de textos ricos, renderizando notas ao final do documento.
- Registrado **docs/DS-PATCH-12.md** para o DS base converter `data-term` em `GlossaryTerm` no `renderRich`.

## Como rodar
```bash
cd ~/Claude/spu-builder
npm run dev      # http://localhost:5173
npm run build    # tsc + vite (verificação de tipos + bundle)
```

## Arquitetura (arquivos-chave)
- `index.html` — carrega `/ds/styles.css`; o bundle é injetado em runtime.
- `src/main.tsx` — expõe `window.React/ReactDOM` (UMD do DS), carrega `_ds_bundle.js` + `image-slot.js` dinamicamente, e **shim de `window.omelette` + intercept de `fetch`** para persistir `<image-slot>` em localStorage.
- `src/hooks/useDS.ts` — espera o namespace `SPUENAPAprendizagemDesignSystem_f0eeed` resolver.
- `src/store/docStore.ts` — reducer Immer + undo/redo (50 snapshots); ops de bloco e de filho; `assignSlots`/`reassignSlots` (ids de imagem estáveis).
- `src/types/ds.d.ts` — contrato de tipos do DS (BlockDef, FieldDef, NS, etc.).
- `src/components/`
  - `Toolbar/` — título, undo/redo, **Abrir** (.spu.json/HTML), **Salvar**, visualizações e exportações HTML/pacote/SCORM.
  - `Library/` — biblioteca por categoria; drag (dnd-kit) + clique para inserir.
  - `Canvas/` — render recursivo via `BlockNode`; containers usam componentes reais do DS; folhas editam inline; handles sobrepostos; drop em seção/container com validação `childTypes`.
  - `Inspector/` + `ListEditor.tsx` + `labels.ts` — painel dirigido por `kind`/`itemFields`/`propFields`.
- `src/utils/exportFormats.ts` — exporta HTML autocontido, pacote HTML + assets e SCORM 1.2.
- `docs/DS-PATCH.md` — patches do DS já aplicados (itemFields + mode="edit").

## ✅ Feito nesta sessão
1. **Esqueleto** Vite+React+TS, kit do DS em `public/ds/` (bundle, styles, tokens/, image-slot).
2. **Carregamento do DS** com instância única de React (sem dupla-React).
3. **Fidelidade visual** — todos os tokens do DS (tipografia Red Hat/Source Sans/IBM Plex, cores, spacing, sombras). Section renderiza via `ns.Section` (faixa/superfície/largura/pad reais).
4. **Biblioteca + inserção** (clique e drag-drop).
5. **Estado** — undo/redo, autosave (localStorage, debounce 400ms), mover/duplicar/remover; **blocos dentro de seções** (children, validação `childTypes`, reordenar).
6. **Inspetor por `kind`** — selects corrigidos (manifest = arrays de string), controles dedicados (ícone, cor de acento, tom, largura/superfície/pad, nível H2/H3/H4).
7. **Patch do DS** (DS-PATCH.md) aplicado e recompilado pelo Claude Design:
   - `itemFields`/`propFields` no BlockRegistry;
   - `mode="edit"` no BlockView (injeta `<Editable>`; `onEdit(block, patch)`).
8. **Editor de listas** dirigido por `itemFields` — quiz/accordion/stats/feature/timeline/referências; `select`, `accent`, `icon`, listas aninhadas, objetos (`compareab`); **`exclusive` → rádio "alternativa correta"**; adicionar/remover/subir/descer.
9. **Edição inline no canvas** (`mode="edit"`) — campos viram `<Editable>` no próprio bloco; `MarkToolbar` flutuante (marca-texto, B/i, cor, link, termo); `onEdit` resolve raiz vs. filho.
10. **Image slots** — ids estáveis por bloco (`slot`/`*Slot`), persistência em localStorage (shim omelette + fetch).
11. **Abrir/Salvar projeto** `.spu.json` (migrate + sanitize).
12. **Export HTML standalone offline** — bundle+CSS inline (@imports resolvidos), image-slot e imagens (sidecar) embutidos.

## ⚠️ Conhecido / frágil
- **`index.html` foi perdido** em algum ponto e recriado nesta sessão. Se sumir de novo, recriar com: link para `/ds/styles.css` + `<div id="root">` + `<script type="module" src="/src/main.tsx">` (o bundle é carregado pelo main.tsx, **não** no HTML).
- **Bugs visuais/comportamentais** relatados pelo usuário ainda não triados — ver lista de QA abaixo.
- Export inline mantém `@import` de **Google Fonts** (absoluto) → precisa de internet para a tipografia exata; offline cai no fallback. Texturas (`url()` relativas dos tokens) podem não resolver no arquivo exportado.

## 🔜 Falta (prioridade para retomar)
1. **Triagem dos bugs** que o usuário viu (pedir repro: qual bloco, o quê). Suspeitas a checar:
   - foco/caret saltando durante edição inline em alguns campos;
   - `compareab`/`timeline` (objetos/listas aninhadas profundas) no inspetor;
   - blocos com `component:null` (`titulo`) e `prose` em modo edit dentro de seção;
   - seleção vs. clique-para-editar (propagação) em blocos full-bleed (Hero/BleedImage).
2. **Drag-drop refinos** — reordenar entre seções e do canvas para dentro/fora de seção; indicador de posição de drop (hoje insere no fim).
3. **Importar conteúdo marcado** (HTML/Markdown → blocos) usando o vocabulário de `content-marking-guide.md` + `BuilderExport.sanitize`.
4. **SCORM** — empacotar o HTML standalone + `imsmanifest.xml` num `.zip`.
5. **Polimento de export** — opção de embutir fontes (woff2 base64) e texturas para 100% offline.
6. **Versionar o kit** (`ds/v1/`) e fixar versão para o builder não quebrar quando o DS evoluir.

## Atualização (DS-PATCH-2 aplicado + consumo ligado)
- Bundle v2 copiado para `public/ds/` (tinha ficado só no DS-fonte).
- **Canvas reescrito como recursivo** (`BlockNode`): containers aninham (Section → Colunas → blocos). Store agora é **id-based** (`PATCH/REMOVE/DUPLICATE/MOVE/ADD_TOP/ADD_CHILD` operam em qualquer profundidade via walkers). `SectionBlock` removido. Seleção por id único.
- **E (colunas)** ligado e validado: Colunas aparece na biblioteca; renderiza como grade dentro da Section; drop zone funciona.
- **F (variantes)** validado: citação mostra dropdown Estilo (Olho/Bloco); idem callout/panel/statblock via `propFields`.
- **B, C, D, I** vêm do bundle (DS) — sem trabalho de builder; C (cores claras) aparecem na MarkToolbar automaticamente.
- Correção estrutural confirmada por screenshot: Section nasce com Título+parágrafo padrão.
- **Pendente de refinamento:** mover blocos **entre** containers diferentes via drag (hoje: reordena dentro do mesmo container + inserir da biblioteca em qualquer container). `launch.json` criado em `~/Claude/.claude/` (preview).

## QA rodada 2 (capturas + observações)
**Causa-raiz achada:** no `mode="edit"`, o `BlockView` injeta `Editable` como `<div>` dentro de `<p>`/`<h1>` → HTML inválido → **Hero não carrega** e quebra MediaEmbed/Figure inline. Correção é DS (item 1 do DS-PATCH-3, crítico).

Builder-side (feito):
- **Setas ↑/↓** para mover bloco/seção (além do grip de arrastar), desabilitadas nos extremos.
- **Upload de imagem pelo painel** (`SlotField`): botão "Enviar imagem" dispara um drop sintético no `<image-slot>` do canvas — validado end-to-end (Figure encheu, persistiu como webp). Campos slot não mostram mais o id cru.

DS-side → **docs/DS-PATCH-3.md** (recompilar):
1. ⚠️ BlockView inline `as='span'` (Hero + inline) — crítico
2. FeatureGrid `text` renderRich (HTML cru)
3. Flipcard `definition` renderRich (HTML cru)
4. MediaEmbed Spotify locale (404)
5. MarkToolbar larga demais → agrupar cores em dropdown
6. Texto claro/escuro: refinar (não afetar cartões como accordion)
7. ReferenceList largura de conteúdo
8. ImageReveal: props `beforeSlot`/`afterSlot` não batem com o componente (usa `before`/`after`) — alinhar para usar `<image-slot>`

## Estado dos patches no bundle (24/06)
Recompilado trouxe: **Masthead** (novo bloco estrutural, funciona automático no builder — só ajustei rótulos org/program no inspetor) + **Panel feature 100vw** + Hero mais baixo.
**Ainda PENDENTE no DS (reaplicar DS-PATCH-6 e -7):** `.spu-richtext{color:inherit}` (texto no canvas, crítico), Conclusão `body`→`children`, Panel prop `bg`, `titulo` id, MapFigure slot + bloco `mapfigure`, PageToc + BlockDocument. (image-slot v7#4 já no DS-fonte.)

## Atualização Codex (25/06)
- Confirmado: o Claude Design recompilou o DS; o builder ainda estava com copia antiga em `public/ds/`.
- Sincronizado o kit novo do DS-fonte para `public/ds/` (`_ds_bundle.js`, `styles.css`, `image-slot.js`, tokens/assets). `npm run build` passou.
- QA visual do usuario gerou **docs/DS-PATCH-8.md**:
  1. BleedImage com titulo/legenda/fonte, modo abaixo/overlay, altura estreita/media/ampla/total e parallax nos recortes.
  2. Referencias ABNT como bloco dentro de Section e colapsado por padrao.
  3. Conclusion permitindo blocos extras abaixo do corpo padrao.
  4. Reset de contraste para cards claros dentro de Section escura.
  5. Timeline com card diferente do fundo quente.
  6. Quiz e imagens menores centralizados.
- DS-PATCH-8 aplicado e sincronizado em `public/ds/` (25/06). Removidos os hotfixes temporarios do builder em `src/index.css`.
- Exportacoes HTML/pacote/SCORM iniciadas:
  - `src/utils/exportFormats.ts` gera HTML autocontido, pacote HTML e SCORM 1.2.
  - Corrigido pacote com imagens: `image-slot` carregado antes do bundle e bundle/slot relaxados para aceitar `assets/images/...`.
  - Pacote HTML e SCORM agora incluem `projeto.spu.json` para reabrir/editar no builder.
  - Botao "Abrir" aceita `.spu.json` e HTML exportado com `<script id="spu-doc">`.
  - Corrigido HTML autocontido: scripts inline escapam `</script>` interno do bundle para o navegador nao encerrar a tag antes da hora.
- Novos pedidos adicionados ao **docs/DS-PATCH-8.md**:
  - Rodape com `licenseKind` (`byncsa`/`byncnd`) renderizado pelo DS.
  - Imagem full-bleed com `zoom=false` por padrao; builder oculta o controle de zoom.
  - Motion leve no DS: parallax do Hero exposto, reveal de cards/destaques, accordion com abertura/fechamento suave e refinamento do flipcard.
  - `MediaEmbed` agora usa `audio` no contrato; removido mapeamento temporario `audio -> podcast` do Inspector.
- Drag/drop do canvas:
  - Blocos existentes agora podem ser movidos entre secoes/containers compativeis.
  - Blocos novos arrastados da biblioteca podem cair antes/depois de blocos ja existentes dentro da secao, nao apenas no final.
  - Indicador visual de drop mostra a posicao exata antes de soltar.
  - Regra preservada: conteudo fica dentro de Section; estruturais ficam no nivel raiz.
- Painel de revisao do builder:
  - Lista pendencias simples antes da exportacao: titulo vazio, pagina vazia, midia sem URL, imagens pendentes, quiz sem alternativa correta e rodape sem creditos.
  - Fica no painel direito, abaixo do inspetor, sem depender de alteracoes no DS.
- DS-PATCH-9 aplicado e sincronizado em `public/ds/`:
  - Corrigir BleedImage full-bleed dentro de Section e centralizacao da legenda abaixo.
  - Alinhar filhos de Columns pelo topo.
  - Registrar oficialmente `DataTable` como bloco no DS e adicionar `striped`/`tone`.
  - Removida a extensao temporaria do builder para registrar/exportar `datatable`; permanece apenas o editor pratico de colagem de tabelas no Inspector.
- Aberto **docs/DS-PATCH-10.md**:
  - BleedImage ainda recuava porque `margin: 'var(--flow-block) 0'` inline sobrescreve o `margin-left/right` full-bleed.
  - DS-PATCH-10 aplicado e sincronizado; removido compat CSS temporario do preview e dos exports.

## Rodada 7 — ajustes do QA (24/06)
Builder-side (feito + validado):
- **"Parada de reflexão" oculta** da biblioteca (HIDDEN_BLOCKS).
- **FIT/SIZE/SHAPE viram dropdown** (KNOWN_ENUMS no Inspector): fit Conter/Cobrir/Esticar; size Pequena/Médio/Amplo/Total.
- **Slot vazio some no export**: patch em `public/ds/image-slot.js` (read-only sem imagem → `display:none`). Espelhar no DS-fonte (item 4 do v7).

DS-side → **docs/DS-PATCH-7.md** (aguarda recompila):
1. ⚠️ `.spu-richtext{color:inherit}` — conserta texto inline escuro sobre fundo colorido **no canvas** (Callout header, ExampleCard, Conclusão). Diagnosticado por busca de contraste.
2. Conclusão `body`→`children` no registry (corpo não aparecia).
3. Panel: prop `bg` (cor de fundo) + `feature` vira full-bleed 100vw ("modo bloco").
4. image-slot.js no DS-fonte (espelhar slot vazio oculto).
5. (opcional) remover `reflexao` do registry.

## Rodada 6 — Sumário + Hotspots (REUSANDO o que já existe no DS) (24/06)
O usuário lembrou: já estava previsto no DS. Revisado:
- **Hotspots = `MapFigure`** (já existe: imagem + marcadores % com popover + legenda). Só falta registrar como bloco + aceitar `slot`.
- **Sumário = padrão do template** (`Summary` recolhido no canto, gerado dos títulos, scroll-spy). Não é componente — vira feature de documento via `doc.meta.toc`.

DS → **docs/DS-PATCH-6.md** (reescrito, aguarda recompila): id no titulo; MapFigure aceita slot + bloco `mapfigure` (itemsKey `markers`); `PageToc.jsx` + `BlockDocument` renderiza o sumário recolhido de `doc.meta.toc`.

Builder (feito + validado no preview):
- **TOC**: ação `SYNC_META` (sem histórico); efeito sincroniza `doc.meta.toc.items` com os H2 (preserva `hidden`); **popover "Sumário" na toolbar** (toggle mostrar + ocultar entradas) — badge mostra nº visível. Validado: 2 H2 → badge 2 + 2 itens no popover.
- **Hotspots**: `HotspotLayer` no canvas keyed em `block.type==='mapfigure'` (patch `markers`): clicar adiciona, arrastar move; conteúdo no painel (ListEditor); imagem via SlotField.
- Removido: blocos `toc`/`hotspots` que eu tinha inventado; branch toc no Inspector.

## v4 + v5 aplicados e validados (24/06)
- ✅ **Link funciona**: popover permanece aberto (foco no input não derruba a barra); ciclo completo testado → criou `<a href="https://gov.br/spu">` e fechou o popover. Botões Link/Botão/Botão 2ª presentes.
- ✅ **Texto em fundo escuro**: StatBlock value/label medidos em `rgb(237,231,218)` (#EDE7DA, claro); título/prose claros; callout (cartão) preserva texto escuro. Acento ("+") mantém laranja.

## Rodada 5 — validação visual do v3 no preview (24/06)
Montei doc de teste (Hero + Section escura + bleed + Section warm) e abri o Visualizar:
- ✅ Título/parágrafo soltos clareiam em fundo escuro
- ✅ Callout (cartão) mantém cabeçalho claro / corpo correto
- ✅ FeatureGrid renderiza "Uma linha." (sem HTML cru) — item 2 ok
- ✅ Full-bleed = 100vw mesmo dentro de Section — item 12 ok
- ✅ Espaço título→texto razoável — item 11 ok
- ❌ **StatBlock "100/Rótulo" escuro sobre escuro** (e PullQuote/ReflectionStop/Timeline teriam o mesmo) → **docs/DS-PATCH-5.md**: remapear tokens `--text-*`/`--color-primary-strong` em `.spu-section--dark` + reset nos cartões (robusto, sem enumerar classes).

## Rodada 4 (24/06)
- **Preview HTML** (feito): botão "Visualizar" na toolbar → `PreviewModal` renderiza o doc em `mode="preview"` (sem chrome de edição, fecha no X/Esc). Validado: 0 editáveis, conteúdo renderiza com o DS.
- **Bug do Link diagnosticado** → `docs/DS-PATCH-4.md` (DS): o popover de link tem `<input autoFocus>` que rouba foco → seleção colapsa → o handler `update()` da MarkToolbar faz `setBox(null)` e a barra some. Fix: `update()` ignora quando o foco está dentro de `.spu-marktoolbar/.spu-mtpop`. (Marca-texto/cor funcionam pois usam preventDefault.)
- **Remover termo/link**: selecionar o trecho e clicar ✕ (Limpar marcas) — `clearMarks` desembrulha `[data-term]` e `a`. Editar = remover e recriar.

## DS-PATCH-3 aplicado e validado (24/06)
Bundle v3 copiado para `public/ds/` (81 ícones, era 33). Validado no preview:
- ✅ **Hero carrega** (fix crítico `as='span'` — Callout title agora é `<span>` dentro de `<p>`, sem mais erro div-in-p)
- ✅ Placeholders amigáveis ("Título", "Escreva… (selecione para marcar)")
- ✅ Variantes em dropdown (Estilo: Faixa no topo)
- ✅ **Busca de ícones** ("Buscar ícone…") + 82 ícones no painel
- ✅ Biblioteca: ícones reais do DS (meu fallback ficou inerte)
- ✅ Link/termo via `inlinePrompt` (sem `window.prompt`; funções agora exportadas)
- ✅ **Imagem + link em itens** (accordion/timeline): `type:'slot'` tratado no ListEditor (novo `SlotControl` gera id + reusa SlotField); Link/Estilo do link via schema
- Builder: adicionado suporte a `FieldType 'slot'` no editor de listas.

> Pendências do QA que dependiam do v3 agora resolvidas (Hero, HTML cru, cores claro/escuro, fonte, full-bleed, ícones, link/termo). Reabrir teste visual de: texto claro/escuro refinado (item 6), full-bleed 100vw (item 12), espaço título→texto (item 11) — confirmar no canvas.

## QA rodada 3 (mais capturas)
Builder-side (feito): **ícones da biblioteca consistentes** — todos os 25 blocos têm ícone (usa `ns.ICON_NAMES` + fallback p/ os que o DS ainda não tem; quando o DS ampliar o set, resolve sozinho).

DS-side → estendido em **docs/DS-PATCH-3.md** (itens 9–13):
9. Placeholders amigáveis no modo edit (campo vazio mostra "title"/"credit")
10. Figure "Fonte:" só quando há crédito
11. Espaço título→bloco muito amplo (`--flow-block`)
12. BleedImage full-bleed 100vw (mesmo dentro de Section)
13. **Biblioteca de ícones maior + busca no IconGallery** (Icon.jsx + IconGallery.jsx)
(itens 2 e 6 já cobrem: FeatureGrid HTML cru, e StatBlock/texto claro-escuro refinado)

## Triagem do QA (lista A–L do usuário)
| # | Item | Onde | Status |
|---|---|---|---|
| A | Blocos sempre dentro de Section (exceto hero/conclusion/pagefooter/referencias) | builder | ✅ feito |
| — | (bug raiz) Section nascia vazia (children em props.children) | builder | ✅ feito |
| J | Níveis H1–H6 no título | builder | ✅ feito |
| B | Texto/ícone claro sobre fundo escuro | DS | 📋 DS-PATCH-2 |
| C | Cores de texto claras/vívidas | DS | 📋 DS-PATCH-2 |
| D | RichText cru no canvas (Timeline, CompareAB) | DS | 📋 DS-PATCH-2 |
| E | Bloco Colunas (até 4) | DS + builder | 📋 DS-PATCH-2 (+ builder pós-recompila: containers aninhados) |
| F | Variantes como dropdown (citação, destaque…) | DS | 📋 DS-PATCH-2 |
| I | Vídeo/áudio embutido (YouTube/Spotify/mp4/mp3) | DS | 📋 DS-PATCH-2 |
| G | Tudo editável (textos/ícones) | builder | 🔍 precisa exemplos concretos do usuário |
| H | Upload de imagem facilitado pelo painel (antes/depois) | builder | ⏳ pós-recompila (canvas já permite arrastar/clicar no slot) |
| K | Sumário a partir de H2 + ocultar | DS + builder | 🗓️ rodada dedicada (design em DS-PATCH-2) |
| L | Imagem com hotspots | DS + builder | 🗓️ rodada dedicada (design em DS-PATCH-2) |

## Contexto do DS (para continuar)
- DS original: `~/Claude/SPU-DesignSystem/` (fonte `.jsx` + `_ds_bundle.js`).
- **Recompilar o bundle** = ação no **Claude Design** (compilador omelette), não build local. Fluxo: editar `.jsx` → recompilar lá → copiar `_ds_bundle.js` para `spu-builder/public/ds/`.
- Ícones disponíveis no DS (33): info, alert-triangle, alert-circle, lightbulb, quote, map-pin, compass, layers, calendar, chevron-*, arrow-*, plus, minus, check, external-link, play-circle, pause, headphones, book-open, link, search, maximize, newspaper, file-text, building, target, sparkles, repeat, rotate-cw, scale.
