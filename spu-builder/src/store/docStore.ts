import { produce } from 'immer';
import type { Doc, Block } from '../types/ds';

// Ações id-based: operam em qualquer profundidade da árvore de blocos.
export type DocAction =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_DOC'; doc: Doc }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'ADD_TOP'; block: Block }                         // bloco no nível raiz
  | { type: 'ADD_TOP_AT'; block: Block; index: number }
  | { type: 'ADD_CHILD'; parentId: string; block: Block }     // dentro de um container
  | { type: 'ADD_CHILD_AT'; parentId: string; block: Block; index: number }
  | { type: 'PATCH'; id: string; patch: Record<string, unknown> }
  | { type: 'REPLACE_BLOCKS'; blocks: Block[] }
  | { type: 'REMOVE'; id: string }
  | { type: 'DUPLICATE'; id: string }
  | { type: 'MOVE'; parentId: string | null; fromIndex: number; toIndex: number }
  | { type: 'MOVE_TO'; id: string; parentId: string | null; index: number }
  | { type: 'SYNC'; id: string; patch: Record<string, unknown> } // atualiza bloco sem histórico
  | { type: 'SYNC_META'; patch: Record<string, unknown> };        // atualiza meta sem histórico (ex.: sumário)

export interface DocState {
  doc: Doc;
  past: Doc[];
  future: Doc[];
}

// ── Walkers de árvore ──────────────────────────────────────────────────────
// Accordion e timeline guardam blocos em arrays "blocks" dentro de props. Para
// o drag-and-drop, esses arrays recebem um id virtual e passam a se comportar
// como qualquer block.children, inclusive para mover/duplicar recursivamente.
const EMBEDDED_PARENT_PREFIX = 'embedded:';
type EmbeddedPath = Array<string | number>;

interface BlockLocation {
  block: Block;
  arr: Block[];
  index: number;
  parentId: string | null;
}

export function embeddedParentId(ownerId: string, path: EmbeddedPath): string {
  return EMBEDDED_PARENT_PREFIX + encodeURIComponent(ownerId) + ':' + encodeURIComponent(JSON.stringify(path));
}

function parseEmbeddedParentId(parentId: string): { ownerId: string; path: EmbeddedPath } | null {
  if (!parentId.startsWith(EMBEDDED_PARENT_PREFIX)) return null;
  const separator = parentId.indexOf(':', EMBEDDED_PARENT_PREFIX.length);
  if (separator === -1) return null;
  try {
    const ownerId = decodeURIComponent(parentId.slice(EMBEDDED_PARENT_PREFIX.length, separator));
    const path = JSON.parse(decodeURIComponent(parentId.slice(separator + 1)));
    return Array.isArray(path) ? { ownerId, path } : null;
  } catch {
    return null;
  }
}

function isBlock(value: unknown): value is Block {
  return !!value && typeof value === 'object'
    && typeof (value as Block).id === 'string'
    && typeof (value as Block).type === 'string'
    && !!(value as Block).props && typeof (value as Block).props === 'object';
}

function visitEmbeddedBlockArrays(
  value: unknown,
  path: EmbeddedPath,
  visit: (arr: Block[], path: EmbeddedPath) => boolean,
): boolean {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      if (visitEmbeddedBlockArrays(value[index], [...path, index], visit)) return true;
    }
    return false;
  }
  if (!value || typeof value !== 'object') return false;

  for (const [key, current] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = [...path, key];
    if (key === 'blocks' && Array.isArray(current) && current.every(isBlock)) {
      if (visit(current, nextPath)) return true;
      continue;
    }
    if (visitEmbeddedBlockArrays(current, nextPath, visit)) return true;
  }
  return false;
}

function findBlockLocationInArray(blocks: Block[], id: string, parentId: string | null): BlockLocation | null {
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.id === id) return { block, arr: blocks, index, parentId };

    if (block.children) {
      const child = findBlockLocationInArray(block.children, id, block.id);
      if (child) return child;
    }

    let embedded: BlockLocation | null = null;
    visitEmbeddedBlockArrays(block.props, [], (arr, path) => {
      embedded = findBlockLocationInArray(arr, id, embeddedParentId(block.id, path));
      return embedded !== null;
    });
    if (embedded) return embedded;
  }
  return null;
}

function findBlockLocation(blocks: Block[], id: string): BlockLocation | null {
  return findBlockLocationInArray(blocks, id, null);
}

export function findBlock(blocks: Block[], id: string): Block | null {
  return findBlockLocation(blocks, id)?.block ?? null;
}

// Array endereçado por um pai real (block.children) ou por um pai virtual
// (items[n].blocks / eras[n].milestones[n].blocks).
export function findBlockArray(blocks: Block[], parentId: string | null, create = false): Block[] | null {
  if (parentId === null) return blocks;

  const embedded = parseEmbeddedParentId(parentId);
  if (!embedded) {
    const parent = findBlock(blocks, parentId);
    if (!parent) return null;
    if (!parent.children && create) parent.children = [];
    return parent.children ?? null;
  }

  const owner = findBlock(blocks, embedded.ownerId);
  if (!owner) return null;
  let current: unknown = owner.props;
  for (let index = 0; index < embedded.path.length; index++) {
    const segment = embedded.path[index];
    const nextSegment = embedded.path[index + 1];
    if (!current || typeof current !== 'object') return null;
    const container = current as Record<string | number, unknown>;
    if (container[segment] === undefined && create) {
        container[segment] = nextSegment === undefined || typeof nextSegment === 'number' ? [] : {};
    }
    current = container[segment];
  }
  return Array.isArray(current) ? current as Block[] : null;
}

// Array que contém o id (para splice/reorder) + o índice.
function findParentArray(blocks: Block[], id: string): { arr: Block[]; index: number } | null {
  const location = findBlockLocation(blocks, id);
  return location ? { arr: location.arr, index: location.index } : null;
}

export function findBlockParentId(blocks: Block[], id: string): string | null {
  return findBlockLocation(blocks, id)?.parentId ?? null;
}

// Mantido para consumidores que precisam especificamente de um container real.
export function findParentBlock(blocks: Block[], id: string): Block | null {
  const parentId = findBlockParentId(blocks, id);
  return parentId && !parentId.startsWith(EMBEDDED_PARENT_PREFIX) ? findBlock(blocks, parentId) : null;
}

export function findBlockIndex(blocks: Block[], id: string): number {
  return findBlockLocation(blocks, id)?.index ?? -1;
}

export function isDescendantOf(blocks: Block[], idOrParentId: string, possibleAncestorId: string): boolean {
  let parentId: string | null = idOrParentId.startsWith(EMBEDDED_PARENT_PREFIX)
    ? idOrParentId
    : findBlockParentId(blocks, idOrParentId);

  while (parentId) {
    const embedded = parseEmbeddedParentId(parentId);
    const parentBlockId = embedded?.ownerId ?? parentId;
    if (parentBlockId === possibleAncestorId) return true;
    parentId = findBlockParentId(blocks, parentBlockId);
  }
  return false;
}

export function docReducer(state: DocState, action: DocAction): DocState {
  if (action.type === 'UNDO') return undo(state);
  if (action.type === 'REDO') return redo(state);

  if (action.type === 'SET_DOC') {
    const doc = { ...action.doc, blocks: (action.doc.blocks || []).map(b => normalizeContainer(b)) };
    return { doc, past: [], future: [] };
  }

  // Atualização sem histórico (sumário auto-sincronizado).
  if (action.type === 'SYNC') {
    const doc = produce(state.doc, (draft) => {
      const b = findBlock(draft.blocks as Block[], action.id);
      if (b) Object.assign(b.props, action.patch);
    });
    return { ...state, doc };
  }

  if (action.type === 'SYNC_META') {
    const doc = produce(state.doc, (draft) => {
      Object.assign(draft.meta, action.patch);
    });
    return { ...state, doc };
  }

  const snapshot = state.doc;

  const nextDoc = produce(state.doc, (draft) => {
    const blocks = draft.blocks as Block[];

    switch (action.type) {
      case 'SET_TITLE':
        draft.meta.title = action.title;
        break;

      case 'ADD_TOP':
        blocks.push(prepareBlock(action.block) as never);
        break;

      case 'ADD_TOP_AT':
        blocks.splice(clampIndex(action.index, blocks.length), 0, prepareBlock(action.block) as never);
        break;

      case 'ADD_CHILD': {
        const target = findBlockArray(blocks, action.parentId, true);
        if (target) target.push(prepareBlock(action.block) as never);
        break;
      }

      case 'ADD_CHILD_AT': {
        const target = findBlockArray(blocks, action.parentId, true);
        if (target) target.splice(clampIndex(action.index, target.length), 0, prepareBlock(action.block) as never);
        break;
      }

      case 'PATCH': {
        const b = findBlock(blocks, action.id);
        if (b) Object.assign(b.props, action.patch);
        break;
      }

      case 'REPLACE_BLOCKS':
        draft.blocks = action.blocks as never;
        break;

      case 'REMOVE': {
        const found = findParentArray(blocks, action.id);
        if (found) found.arr.splice(found.index, 1);
        break;
      }

      case 'DUPLICATE': {
        const found = findParentArray(blocks, action.id);
        if (found) {
          const clone = JSON.parse(JSON.stringify(found.arr[found.index])) as Block;
          reassignIds(clone);
          reassignSlots(clone);
          found.arr.splice(found.index + 1, 0, clone as never);
        }
        break;
      }

      case 'MOVE': {
        const arr = findBlockArray(blocks, action.parentId);
        if (arr) {
          const [m] = arr.splice(action.fromIndex, 1);
          arr.splice(action.toIndex, 0, m);
        }
        break;
      }

      case 'MOVE_TO': {
        const found = findParentArray(blocks, action.id);
        if (!found) break;
        const [moving] = found.arr.splice(found.index, 1);
        const targetArr = findBlockArray(blocks, action.parentId, true);
        if (!targetArr) {
          found.arr.splice(found.index, 0, moving);
          break;
        }
        const sameArray = found.arr === targetArr;
        const rawIndex = sameArray && found.index < action.index ? action.index - 1 : action.index;
        targetArr.splice(clampIndex(rawIndex, targetArr.length), 0, moving);
        break;
      }
    }
  });

  return {
    doc: nextDoc,
    past: [...state.past, snapshot].slice(-50),
    future: [],
  };
}

export function undo(state: DocState): DocState {
  if (!state.past.length) return state;
  const prev = state.past[state.past.length - 1];
  return { doc: prev, past: state.past.slice(0, -1), future: [state.doc, ...state.future] };
}

export function redo(state: DocState): DocState {
  if (!state.future.length) return state;
  const next = state.future[0];
  return { doc: next, past: [...state.past, state.doc], future: state.future.slice(1) };
}

// ── Preparação de blocos novos ─────────────────────────────────────────────

// newBlock('section') coloca os filhos-padrão em props.children, mas o BlockView
// e o builder usam block.children. Normaliza: hoist props.children → block.children.
function normalizeContainer(block: Block): Block {
  const props = { ...(block.props || {}) };
  const normalized: Block = { ...block, props };

  const nestedChildren = Array.isArray(props.children);
  if (normalized.children == null && nestedChildren) {
    normalized.children = props.children as Block[];
  }
  if (nestedChildren) delete (props as Record<string, unknown>).children;
  applyBuilderDefaults(normalized);
  if (normalized.children) normalized.children = normalized.children.map(normalizeContainer);
  normalizeEmbeddedContainers(normalized.props);
  return normalized;
}

function normalizeEmbeddedContainers(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(normalizeEmbeddedContainers);
    return;
  }
  if (!value || typeof value !== 'object') return;

  const object = value as Record<string, unknown>;
  Object.entries(object).forEach(([key, current]) => {
    if (key === 'blocks' && Array.isArray(current) && current.every(isBlock)) {
      object[key] = current.map(normalizeContainer);
      return;
    }
    normalizeEmbeddedContainers(current);
  });
}

function applyBuilderDefaults(block: Block): Block {
  if (!block.props) block.props = {};
  if (block.type === 'figure' && typeof block.props.size === 'string') {
    block.props.size = normalizeFigureSize(block.props.size);
  }
  if (block.type === 'pagefooter' && block.props.licenseKind === undefined) {
    block.props.licenseKind = 'byncsa';
  }
  if (block.type === 'bleedimage' && block.props.zoom === undefined) {
    block.props.zoom = false;
  }
  if (block.type === 'imagereveal') {
    if (block.props.heightMode === undefined) block.props.heightMode = 'original';
    if (block.props.caption === undefined) block.props.caption = '';
  }
  if (block.type === 'flashcard') {
    if (block.props.showIcon === undefined) block.props.showIcon = true;
    if (block.props.useCoverImage === undefined) block.props.useCoverImage = false;
    if (block.props.coverSlot === undefined) block.props.coverSlot = '';
    if (block.props.coverAlt === undefined) block.props.coverAlt = '';
    if (block.props.frontCue === undefined) block.props.frontCue = 'Clique para virar';
    if (block.props.backCue === undefined) block.props.backCue = 'Clique para voltar';
  }
  return block;
}

function normalizeFigureSize(size: string): string {
  const aliases: Record<string, string> = {
    small: 'sm',
    pequena: 'sm',
    medio: 'md',
    média: 'md',
    media: 'md',
    medium: 'md',
    large: 'lg',
    wide: 'lg',
    ampla: 'lg',
    total: 'full',
  };
  return aliases[size.toLowerCase()] || size;
}

export function prepareBlock(block: Block): Block {
  return assignSlots(normalizeContainer(block));
}

// Atribui ids de slot estáveis aos campos de imagem vazios (slot/*Slot).
function assignSlots(block: Block): Block {
  visitSlotProps(block.props || {}, block.id, [], false);
  if (block.children) block.children.forEach(assignSlots);
  return block;
}

// Reatribui ids novos a um bloco clonado (e filhos) — evita ids duplicados.
function reassignIds(block: Block): Block {
  block.id = uid();
  if (block.children) block.children.forEach(reassignIds);
  visitEmbeddedBlocks(block.props, reassignIds);
  return block;
}

// Reatribui ids de slot novos (usado ao duplicar, para não compartilhar imagem).
function reassignSlots(block: Block): Block {
  visitSlotProps(block.props || {}, block.id, [], true);
  if (block.children) block.children.forEach(reassignSlots);
  visitEmbeddedBlocks(block.props, reassignSlots);
  return block;
}

// Duplica com segurança valores de listas do Inspector. Itens de accordion e
// timeline podem conter blocos completos; ids e slots precisam ser novos para
// não apontarem para a mesma seleção/imagem do item original.
export function duplicateNestedValue<T>(value: T): T {
  const clone = JSON.parse(JSON.stringify(value)) as T;
  visitEmbeddedBlocks(clone, (block) => {
    reassignIds(block);
    reassignSlots(block);
  });
  visitSlotProps(clone, uid(), [], true);
  return clone;
}

function visitEmbeddedBlocks(value: unknown, visit: (block: Block) => void): void {
  if (Array.isArray(value)) {
    value.forEach((item) => visitEmbeddedBlocks(item, visit));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const object = value as Record<string, unknown>;
  if (typeof object.id === 'string' && typeof object.type === 'string' && object.props && typeof object.props === 'object') {
    visit(object as unknown as Block);
    return;
  }
  Object.values(object).forEach((item) => visitEmbeddedBlocks(item, visit));
}

// Percorre também listas/objetos internos (slides, itens de accordion e marcos
// da timeline). O caminho faz cada imagem do mesmo bloco receber um id único.
function visitSlotProps(value: unknown, blockId: string, path: Array<string | number>, replace: boolean): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitSlotProps(item, blockId, [...path, index], replace));
    return;
  }
  if (!value || typeof value !== 'object') return;

  const object = value as Record<string, unknown>;
  Object.keys(object).forEach((key) => {
    const current = object[key];
    const isSlot = key === 'slot' || key.endsWith('Slot');
    if (isSlot && typeof current === 'string' && (replace || current === '')) {
      const suffix = [...path, key].join('_');
      object[key] = `${blockId}__${suffix}`;
      return;
    }
    visitSlotProps(current, blockId, [...path, key], replace);
  });
}

function uid() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) return length;
  return Math.max(0, Math.min(length, index));
}
