import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { NS, Block, BlockDef, FieldDef } from '../../types/ds';
import { embeddedParentId } from '../../store/docStore';
import styles from './Canvas.module.css';
import { InsertBlockButton } from './InsertBlockButton';

export interface DropTarget {
  parentId: string | null;
  index: number;
}

interface NodeCallbacks {
  ns: NS;
  selectedId: string | null;
  dropTarget: DropTarget | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onInlineEdit: (block: Block, patch: Record<string, unknown>) => void;
  onInsert: (parentId: string | null, index: number, type: string) => void;
  siblingTypes?: string[];
}

// Um nó da árvore: container (Section/Columns via componente real do DS) ou
// folha (BlockView mode="edit"). Recursivo → containers podem aninhar.
function BlockNode({ block, index, count, parentId, ...cb }: NodeCallbacks & { block: Block; index: number; count: number; parentId: string | null }) {
  const { ns, selectedId } = cb;
  const def: BlockDef | undefined = ns.BlockRegistry.byType[block.type];
  const isContainer = def?.kind === 'container';
  const isSelected = selectedId === block.id;
  const isCompactSubheading = block.type === 'titulo' && ['h3', 'h4', 'h5', 'h6'].includes(String(block.props.level || ''));
  const siblingTypes = cb.siblingTypes;
  const insertTypes = siblingTypes || (parentId ? ns.BlockRegistry.childTypes : ns.BlockRegistry.structuralTypes);
  const insertAfter = (
    <InsertBlockButton
      ns={ns}
      allowedTypes={insertTypes}
      includeHidden={insertTypes.some((type) => ns.BlockRegistry.byType[type]?.internal)}
      spacing={block.type === 'kicker' ? 'tight' : block.type === 'titulo' ? 'title' : 'default'}
      onInsert={(type) => cb.onInsert(parentId, index + 1, type)}
    />
  );

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    ...blockSpacingStyle(block),
  };

  const handles = (label?: string) => isSelected && (
    <div className={styles.handles}>
      {label && <span className={styles.tag}>{label}</span>}
      <button className={styles.handle} onClick={(e) => { e.stopPropagation(); cb.onMove(block.id, 'up'); }} disabled={index === 0} title="Mover para cima">↑</button>
      <button className={styles.handle} onClick={(e) => { e.stopPropagation(); cb.onMove(block.id, 'down'); }} disabled={index === count - 1} title="Mover para baixo">↓</button>
      <button className={styles.handle} {...listeners} {...attributes} title="Arrastar">⠿</button>
      <button className={styles.handle} onClick={(e) => { e.stopPropagation(); cb.onDuplicate(block.id); }} title="Duplicar">
        <ns.Icon name="repeat" size={13} />
      </button>
      <button className={styles.handleDanger} onClick={(e) => { e.stopPropagation(); cb.onRemove(block.id); }} title="Remover">
        <ns.Icon name="minus" size={13} />
      </button>
    </div>
  );

  if (isContainer && def) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        data-block-id={block.id}
        data-block-type={block.type}
        className={styles.containerWrap + (isSelected ? ` ${styles.containerSelected}` : '')}
        onClick={(e) => { e.stopPropagation(); cb.onSelect(block.id); }}
      >
        {handles(def.label)}
        <ContainerBody block={block} def={def} {...cb} />
        {insertAfter}
      </div>
    );
  }

  const isMap = block.type === 'mapfigure';

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.id}
      data-block-type={block.type}
      className={styles.leafWrap
        + (block.type === 'kicker' ? ` ${styles.leafCompactAfter}` : '')
        + (isCompactSubheading ? ` ${styles.leafSubheadingAfter}` : '')
        + (isSelected ? ` ${styles.leafSelected}` : '')}
      onClick={(e) => { e.stopPropagation(); cb.onSelect(block.id); }}
    >
      {handles()}
      <div style={{ position: 'relative' }}>
        <EditableLeaf block={block} def={def} {...cb} />
        {isMap && isSelected && (
          <HotspotLayer block={block} onPatchMarkers={(markers) => cb.onInlineEdit(block, { markers })} />
        )}
      </div>
      {insertAfter}
    </div>
  );
}

interface Marker { title?: string; description?: string; x?: number; y?: number; label?: string }

// Camada de edição dos marcadores do MapFigure (só com o bloco selecionado):
// clicar no fundo adiciona um marcador na posição %; arrastar um marcador o move.
function HotspotLayer({ block, onPatchMarkers }: { block: Block; onPatchMarkers: (markers: Marker[]) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const markers: Marker[] = (block.props.markers as Marker[]) || [];

  const pctFrom = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    return { x: Math.round(clamp(((clientX - r.left) / r.width) * 100)), y: Math.round(clamp(((clientY - r.top) / r.height) * 100)) };
  };

  const addMarker = (e: React.MouseEvent) => {
    if (e.target !== ref.current) return; // ignora cliques nos marcadores
    e.stopPropagation();
    const { x, y } = pctFrom(e.clientX, e.clientY);
    onPatchMarkers([...markers, { title: 'Novo ponto', description: '', x, y }]);
  };

  const startDrag = (i: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const { x, y } = pctFrom(ev.clientX, ev.clientY);
      onPatchMarkers(markers.map((s, idx) => (idx === i ? { ...s, x, y } : s)));
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div ref={ref} className={styles.hotspotLayer} onClick={addMarker}>
      {markers.map((s, i) => (
        <div
          key={i}
          className={styles.hotspotHandle}
          style={{ left: (s.x ?? 50) + '%', top: (s.y ?? 50) + '%' }}
          onPointerDown={(e) => startDrag(i, e)}
          title={`Ponto ${i + 1} — arraste para mover`}
        >
          {i + 1}
        </div>
      ))}
      <div className={styles.hotspotHint}>Clique na imagem para adicionar · arraste os pontos para mover · edite o conteúdo no painel</div>
    </div>
  );
}

// Corpo de um container: renderiza o componente real do DS (faixa/grade) e
// coloca os filhos (cada um um BlockNode) dentro, com drop zone.
function DropIndicator() {
  return (
    <div className={styles.dropIndicator} aria-hidden="true">
      <span />
    </div>
  );
}

const BLOCK_LEVEL_FIELDS = new Set(['children', 'body', 'html', 'content', 'lead']);
const LEAF_BLOCKVIEW_TYPES = new Set(['titulo', 'prose']);
const NON_EDITABLE_TEXT_KEYS = new Set([
  'url',
  'href',
  'link',
  'linkHref',
  'src',
  'slot',
  'imageSlot',
  'beforeSlot',
  'afterSlot',
  'color',
  'icon',
  'kickerIcon',
  'provider',
  'embed',
  'licenseKind',
]);

const FIELD_PLACEHOLDERS: Record<string, string> = {
  title: 'Título',
  heading: 'Subtítulo',
  caption: 'Legenda',
  credit: 'Crédito (opcional)',
  byline: 'Autoria',
  kicker: 'Sobrelinha',
  cite: 'Fonte',
  text: 'Texto',
  children: 'Conteúdo',
  body: 'Corpo',
  html: 'Texto',
  term: 'Termo',
  definition: 'Definição',
  org: 'Identidade',
  program: 'Nome do programa',
  lead: 'Texto de apresentação',
  triggerLabel: 'Clique para expandir',
};

function fieldPlaceholder(block: Block, key: string) {
  if (block.type === 'hero' && key === 'kicker') return 'Nome da competência';
  if (block.type === 'hero' && key === 'byline') return 'Autoria, subtítulo ou eixo/competência';
  return FIELD_PLACEHOLDERS[key] || key;
}

function editableContainerProps(block: Block, def: BlockDef, cb: NodeCallbacks) {
  const fields = def.fields || [];
  if (!fields.length) return block.props;

  const props: Record<string, unknown> = { ...block.props };
  fields.forEach((key) => {
    const inline = !BLOCK_LEVEL_FIELDS.has(key);
    props[key] = (
      <cb.ns.Editable
        key={key}
        html={typeof block.props[key] === 'string' ? block.props[key] as string : ''}
        single={inline}
        as={inline ? 'span' : 'div'}
        placeholder={fieldPlaceholder(block, key)}
        onChange={(html) => cb.onInlineEdit(block, { [key]: html })}
      />
    );
  });

  return props;
}

function replaceAtPath(value: unknown, path: Array<string | number>, nextValue: unknown): unknown {
  if (path.length === 0) return nextValue;
  const [head, ...rest] = path;

  if (Array.isArray(value)) {
    const copy = value.slice();
    copy[Number(head)] = replaceAtPath(copy[Number(head)], rest, nextValue);
    return copy;
  }

  if (value && typeof value === 'object') {
    return {
      ...(value as Record<string, unknown>),
      [head]: replaceAtPath((value as Record<string, unknown>)[head as string], rest, nextValue),
    };
  }

  if (typeof head === 'number') {
    const copy: unknown[] = [];
    copy[head] = replaceAtPath(undefined, rest, nextValue);
    return copy;
  }

  return { [head]: replaceAtPath(undefined, rest, nextValue) };
}

function isEditableTextField(field: FieldDef) {
  if (field.type !== 'rich' && field.type !== 'text') return false;
  if (NON_EDITABLE_TEXT_KEYS.has(field.key)) return false;
  if (/url|href|slot/i.test(field.key)) return false;
  return true;
}

function editableTextValue(
  value: unknown,
  field: FieldDef,
  block: Block,
  cb: NodeCallbacks,
  rootKey: string,
  path: Array<string | number>,
) {
  const inline = field.inline ?? !BLOCK_LEVEL_FIELDS.has(field.key);
  return (
    <cb.ns.Editable
      html={typeof value === 'string' ? value : ''}
      single={inline}
      as={inline ? 'span' : 'div'}
      placeholder={field.label || FIELD_PLACEHOLDERS[field.key] || field.key || 'Texto'}
      onChange={(html) => cb.onInlineEdit(block, { [rootKey]: replaceAtPath(block.props[rootKey], path, html) })}
    />
  );
}

function editableValueForField(
  value: unknown,
  field: FieldDef,
  block: Block,
  cb: NodeCallbacks,
  rootKey: string,
  path: Array<string | number>,
): unknown {
  if (isEditableTextField(field)) {
    return editableTextValue(value, field, block, cb, rootKey, path);
  }

  if (field.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    return editableObjectValue(value as Record<string, unknown>, field.fields || [], block, cb, rootKey, path);
  }

  if (field.type === 'list' && Array.isArray(value)) {
    return value.map((item, index) => editableItemValue(item, field.itemFields || [], block, cb, rootKey, [...path, index]));
  }

  return value;
}

function editableItemValue(
  item: unknown,
  fields: FieldDef[],
  block: Block,
  cb: NodeCallbacks,
  rootKey: string,
  path: Array<string | number>,
): unknown {
  if (fields.length === 1 && fields[0].key === '') {
    return editableValueForField(item, fields[0], block, cb, rootKey, path);
  }

  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  return editableObjectValue(item as Record<string, unknown>, fields, block, cb, rootKey, path);
}

function editableObjectValue(
  value: Record<string, unknown>,
  fields: FieldDef[],
  block: Block,
  cb: NodeCallbacks,
  rootKey: string,
  path: Array<string | number>,
) {
  const next: Record<string, unknown> = { ...value };
  fields.forEach((field) => {
    if (!field.key) return;
    next[field.key] = editableValueForField(value[field.key], field, block, cb, rootKey, [...path, field.key]);
  });
  return next;
}

function editableLeafProps(block: Block, def: BlockDef, cb: NodeCallbacks) {
  const props: Record<string, unknown> = { ...block.props };

  (def.fields || []).forEach((key) => {
    props[key] = (
      <cb.ns.Editable
        key={key}
        html={typeof block.props[key] === 'string' ? block.props[key] as string : ''}
        single={!BLOCK_LEVEL_FIELDS.has(key)}
        as={BLOCK_LEVEL_FIELDS.has(key) ? 'div' : 'span'}
        placeholder={fieldPlaceholder(block, key)}
        onChange={(html) => cb.onInlineEdit(block, { [key]: html })}
      />
    );
  });

  if (def.itemsKey && def.itemFields && Array.isArray(block.props[def.itemsKey])) {
    props[def.itemsKey] = (block.props[def.itemsKey] as unknown[]).map((item, index) => (
      editableItemValue(item, def.itemFields || [], block, cb, def.itemsKey as string, [index])
    ));
  }

  (def.propFields || []).forEach((field) => {
    if (!field.key || props[field.key] === undefined) return;
    props[field.key] = editableValueForField(block.props[field.key], field, block, cb, field.key, []);
  });

  return props;
}

function EditableLeaf({ block, def, ...cb }: NodeCallbacks & { block: Block; def?: BlockDef }) {
  const { ns } = cb;
  if (!def || !def.component || LEAF_BLOCKVIEW_TYPES.has(block.type)) {
    return <ns.BlockView block={block} mode="edit" onEdit={cb.onInlineEdit} />;
  }

  if (block.type === 'figure') {
    return <EditableFigure block={block} {...cb} />;
  }

  if (block.type === 'accordion') {
    return <EditableAccordion block={block} def={def} {...cb} />;
  }

  if (block.type === 'timeline') {
    return <EditableTimeline block={block} def={def} {...cb} />;
  }

  const Comp = ns[def.component] as React.ComponentType<Record<string, unknown>> | undefined;
  if (!Comp) return <ns.BlockView block={block} mode="edit" onEdit={cb.onInlineEdit} />;

  return React.createElement(Comp, editableLeafProps(block, def, cb));
}

function blockSpacingStyle(block: Block): React.CSSProperties {
  return {
    ...(block.props.__pullUp ? { marginTop: 'calc(-1 * var(--flow-block))' } : null),
    ...(block.props.__pullDown ? { marginBottom: 'calc(-1 * var(--flow-block))' } : null),
  };
}

function EmbeddedBlocksEditor({ blocks, parentId, ...cb }: NodeCallbacks & {
  blocks: Block[];
  parentId: string;
}) {
  const allowedTypes = cb.ns.BlockRegistry.childTypes;
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: 'drop:' + parentId });

  return (
    <div
      ref={dropRef}
      className={styles.embeddedBlocks + (isOver ? ' ' + styles.dropOver : '')}
      onClick={(event) => event.stopPropagation()}
    >
      <SortableContext items={blocks.map((nested) => nested.id)} strategy={verticalListSortingStrategy}>
        {blocks.map((nested, nestedIndex) => (
          <React.Fragment key={nested.id}>
            {cb.dropTarget?.parentId === parentId && cb.dropTarget.index === nestedIndex && <DropIndicator />}
            <BlockNode
              {...cb}
              block={nested}
              index={nestedIndex}
              count={blocks.length}
              parentId={parentId}
            />
          </React.Fragment>
        ))}
        {cb.dropTarget?.parentId === parentId && cb.dropTarget.index === blocks.length && <DropIndicator />}
      </SortableContext>
      {blocks.length === 0 && (
        <div className={styles.emptyEmbeddedDrop}>
          <cb.ns.Icon name="plus" size={16} />
          <span>Arraste blocos para esta aba</span>
        </div>
      )}
      <InsertBlockButton
        ns={cb.ns}
        allowedTypes={allowedTypes}
        embedded
        onInsert={(type) => cb.onInsert(parentId, blocks.length, type)}
      />
    </div>
  );
}

function EditableAccordion({ block, def, ...cb }: NodeCallbacks & { block: Block; def: BlockDef }) {
  const { ns } = cb;
  const Comp = ns[def.component as string] as React.ComponentType<Record<string, unknown>> | undefined;
  if (!Comp) return <ns.BlockView block={block} mode="edit" onEdit={cb.onInlineEdit} />;

  const sourceItems = Array.isArray(block.props.items) ? block.props.items : [];
  const items = sourceItems.map((source, itemIndex) => {
    const editable = editableItemValue(source, def.itemFields || [], block, cb, 'items', [itemIndex]);
    if (!source || typeof source !== 'object' || Array.isArray(source) || !editable || typeof editable !== 'object' || Array.isArray(editable)) {
      return editable;
    }

    const sourceObject = source as Record<string, unknown>;
    const editableObject = editable as Record<string, unknown>;
    const blocks = Array.isArray(sourceObject.blocks) ? sourceObject.blocks as Block[] : [];
    const nestedEditor = (
      <EmbeddedBlocksEditor
        {...cb}
        blocks={blocks}
        parentId={embeddedParentId(block.id, ['items', itemIndex, 'blocks'])}
      />
    );

    return {
      ...editableObject,
      blocks: undefined,
      content: (
        <>
          {editableObject.content}
          {nestedEditor}
        </>
      ),
    };
  });

  return React.createElement(Comp, { ...block.props, items });
}

function EditableTimeline({ block, def, ...cb }: NodeCallbacks & { block: Block; def: BlockDef }) {
  const { ns } = cb;
  const Comp = ns[def.component as string] as React.ComponentType<Record<string, unknown>> | undefined;
  if (!Comp) return <ns.BlockView block={block} mode="edit" onEdit={cb.onInlineEdit} />;

  const sourceEras = Array.isArray(block.props.eras) ? block.props.eras : [];
  const eras = sourceEras.map((sourceEra, eraIndex) => {
    const editableEra = editableItemValue(sourceEra, def.itemFields || [], block, cb, 'eras', [eraIndex]);
    if (!sourceEra || typeof sourceEra !== 'object' || Array.isArray(sourceEra)
      || !editableEra || typeof editableEra !== 'object' || Array.isArray(editableEra)) return editableEra;

    const sourceMilestones = Array.isArray((sourceEra as Record<string, unknown>).milestones)
      ? (sourceEra as Record<string, unknown>).milestones as unknown[]
      : [];
    const editableMilestones = Array.isArray((editableEra as Record<string, unknown>).milestones)
      ? (editableEra as Record<string, unknown>).milestones as unknown[]
      : [];

    return {
      ...(editableEra as Record<string, unknown>),
      milestones: editableMilestones.map((editableMilestone, milestoneIndex) => {
        const sourceMilestone = sourceMilestones[milestoneIndex];
        if (!sourceMilestone || typeof sourceMilestone !== 'object' || Array.isArray(sourceMilestone)
          || !editableMilestone || typeof editableMilestone !== 'object' || Array.isArray(editableMilestone)) return editableMilestone;
        const sourceObject = sourceMilestone as Record<string, unknown>;
        const editableObject = editableMilestone as Record<string, unknown>;
        const blocks = Array.isArray(sourceObject.blocks) ? sourceObject.blocks as Block[] : [];
        return {
          ...editableObject,
          blocks: undefined,
          content: (
            <>
              {editableObject.content}
              <EmbeddedBlocksEditor
                {...cb}
                blocks={blocks}
                parentId={embeddedParentId(block.id, ['eras', eraIndex, 'milestones', milestoneIndex, 'blocks'])}
              />
            </>
          ),
        };
      }),
    };
  });

  return React.createElement(Comp, { ...block.props, eras });
}

function EditableFigure({ block, ...cb }: NodeCallbacks & { block: Block }) {
  const { ns } = cb;
  const slotRef = React.useRef<HTMLElement | null>(null);
  const props = block.props || {};
  const sizeAliases: Record<string, string> = {
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
  const size = sizeAliases[String(props.size || 'md')] || String(props.size || 'md');
  const slot = typeof props.slot === 'string' ? props.slot : '';
  const src = typeof props.src === 'string' ? props.src : '';
  const fit = typeof props.fit === 'string' ? props.fit : 'contain';
  const imageTitleKey = Object.prototype.hasOwnProperty.call(props, 'title') ? 'title' : 'label';
  const hasMeta = props.title || props.caption || props.credit || props.label;

  React.useEffect(() => {
    const slotElement = slotRef.current;
    if (!slot || !slotElement) return;
    const syncHeight = () => {
      const image = slotElement.shadowRoot?.querySelector<HTMLImageElement>('.frame img');
      if (!image?.src || !image.naturalWidth) {
        slotElement.style.height = '300px';
        return;
      }
      const width = slotElement.clientWidth || slotElement.offsetWidth || 1;
      slotElement.style.height = `${Math.round(width * image.naturalHeight / image.naturalWidth)}px`;
    };
    const image = slotElement.shadowRoot?.querySelector<HTMLImageElement>('.frame img');
    image?.addEventListener('load', syncHeight);
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(slotElement);
    const stateObserver = new MutationObserver(syncHeight);
    stateObserver.observe(slotElement, { attributes: true, attributeFilter: ['data-filled'] });
    return () => {
      image?.removeEventListener('load', syncHeight);
      observer.disconnect();
      stateObserver.disconnect();
    };
  }, [slot]);

  const field = (key: string, placeholder: string) => (
    <ns.Editable
      html={typeof props[key] === 'string' ? props[key] as string : ''}
      single
      as="span"
      placeholder={placeholder}
      onChange={(html) => cb.onInlineEdit(block, { [key]: html })}
    />
  );

  return (
    <figure className={`spu-figure spu-figure--${size} ${hasMeta && slot ? 'spu-figure--framed' : ''}`}>
      <div className="spu-figure__frame" style={{ cursor: 'default' }}>
        {slot ? (
          React.createElement('image-slot', {
            ref: slotRef,
            id: slot,
            shape: 'rect',
            fit,
            placeholder: 'Arraste uma imagem',
            style: { width: '100%', height: 300, display: 'block' },
          })
        ) : src ? (
          <img src={src} alt={typeof props.alt === 'string' ? props.alt : ''} />
        ) : (
          <div className="spu-ph">
            <ns.Icon name="building" size={30} />
            <span className="spu-ph__label">Imagem</span>
          </div>
        )}
      </div>
      <figcaption className="spu-figure__cap">
        <span className="spu-figure__title">{field(imageTitleKey, 'Título da imagem')}</span>
        {field('caption', 'Legenda')}
        <span className="spu-figure__credit">{field('credit', 'Crédito (opcional)')}</span>
      </figcaption>
    </figure>
  );
}

function ContainerBody({ block, def, ...cb }: NodeCallbacks & { block: Block; def: BlockDef }) {
  const { ns } = cb;
  const children: Block[] = (block.children as Block[]) || [];
  const childTypes: string[] = def.allowedTypes || ns.BlockRegistry.childTypes;
  const isStack = (def as { stack?: boolean }).stack !== false;
  const Comp = ns[def.component as string] as React.ComponentType<Record<string, unknown>>;
  const componentProps = editableContainerProps(block, def, cb);
  const { children: _childrenProp, ...componentPropsWithoutChildren } = componentProps;
  if (block.type === 'collapsiblesection' || block.type === 'sectionslider') {
    componentPropsWithoutChildren.__builderEditing = true;
  }

  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `drop:${block.id}` });

  const strategy = isStack ? verticalListSortingStrategy : rectSortingStrategy;

  const nodes = children.length === 0 ? [(
    <React.Fragment key="empty">
      {cb.dropTarget?.parentId === block.id && cb.dropTarget.index === 0 && <DropIndicator />}
      <div className={styles.emptyDrop}>
        <ns.Icon name="plus" size={16} />
        <span>Arraste um bloco aqui</span>
        <span className={styles.hint}>Aceita: {childTypes.join(', ')}</span>
        <InsertBlockButton
          ns={ns}
          allowedTypes={childTypes}
          includeHidden={childTypes.some((type) => ns.BlockRegistry.byType[type]?.internal)}
          onInsert={(type) => cb.onInsert(block.id, 0, type)}
        />
      </div>
    </React.Fragment>
  )] : children.map((c, i) => {
    const node = <BlockNode key={c.id} {...cb} block={c} index={i} count={children.length} parentId={block.id} siblingTypes={childTypes} />;
    if (cb.dropTarget?.parentId !== block.id || cb.dropTarget.index !== i) return node;
    return <React.Fragment key={c.id}><DropIndicator />{node}</React.Fragment>;
  });
  if (children.length > 0 && cb.dropTarget?.parentId === block.id && cb.dropTarget.index === children.length) {
    nodes.push(<DropIndicator key="drop-end" />);
  }

  // Stack (Section): filhos num flex-column com gap do DS, dentro de um wrapper
  // droppable. Grid (Columns): filhos vão direto como células; droppable no wrapper.
  const inner = isStack
    ? <div ref={dropRef} className={styles.stack + (isOver ? ` ${styles.dropOver}` : '')}>
        <SortableContext items={children.map(c => c.id)} strategy={strategy}>{nodes}</SortableContext>
      </div>
    : <div ref={dropRef} className={isOver ? styles.dropOver : undefined}>
        <SortableContext items={children.map(c => c.id)} strategy={strategy}>
          {React.createElement(Comp, componentPropsWithoutChildren, ...nodes)}
        </SortableContext>
      </div>;

  // Para stack, o componente (Section) envolve o stack; para grid já está montado.
  return isStack
    ? React.createElement(Comp, componentPropsWithoutChildren, inner)
    : inner;
}

interface CanvasProps {
  ns: NS;
  blocks: Block[];
  selectedId: string | null;
  dropTarget: DropTarget | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onInlineEdit: (block: Block, patch: Record<string, unknown>) => void;
  onInsert: (parentId: string | null, index: number, type: string) => void;
}

export function Canvas({ ns, blocks, selectedId, dropTarget, onSelect, onRemove, onDuplicate, onMove, onInlineEdit, onInsert }: CanvasProps) {
  const { setNodeRef } = useDroppable({ id: 'canvas' });

  return (
    <main
      ref={setNodeRef}
      className={styles.root}
      data-spu-canvas
      onClick={() => onSelect(null)}
    >
      {blocks.length === 0 && (
        <div className={styles.empty}>
          <ns.Icon name="layers" size={32} />
          <p>Arraste um bloco da biblioteca ou clique nele para inserir.</p>
        </div>
      )}
      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        {blocks.map((block, i) => (
          <React.Fragment key={block.id}>
            {dropTarget?.parentId === null && dropTarget.index === i && <DropIndicator />}
            <BlockNode
              block={block}
              index={i}
              count={blocks.length}
              parentId={null}
              ns={ns}
              selectedId={selectedId}
              dropTarget={dropTarget}
              onSelect={onSelect}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              onMove={onMove}
              onInlineEdit={onInlineEdit}
              onInsert={onInsert}
            />
          </React.Fragment>
        ))}
        {dropTarget?.parentId === null && dropTarget.index === blocks.length && <DropIndicator />}
      </SortableContext>
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ns.MarkToolbar />
      </div>
    </main>
  );
}
