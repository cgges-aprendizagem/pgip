import { Component, useReducer, useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
} from '@dnd-kit/core';
import { useDS } from './hooks/useDS';
import {
  docReducer,
  findBlock,
  findBlockArray,
  findBlockParentId,
  findBlockIndex,
  isDescendantOf,
  type DocState,
} from './store/docStore';
import { Library } from './components/Library/Library';
import { Canvas } from './components/Canvas/Canvas';
import { Inspector } from './components/Inspector/Inspector';
import { Toolbar } from './components/Toolbar/Toolbar';
import { PreviewModal } from './components/Preview/PreviewModal';
import { PrintPreviewModal } from './components/PrintPreview/PrintPreviewModal';
import { RichNotesModal } from './components/RichNotes/RichNotesModal';
import { normalizeProjectContent } from './utils/projectCompat';
import { clearImageSlots } from './utils/imageSlotStore';
import type { Block } from './types/ds';
import { updateRichNote, type RichNoteUpdate } from './utils/richNotes';
import styles from './App.module.css';

const AUTOSAVE_KEY = 'spu_builder_doc';
type DropTarget = { parentId: string | null; index: number };

// Em containers aninhados (accordion > colunas), o centro geométrico pode
// apontar para um ancestral distante. A área sob o ponteiro deve ter prioridade.
const nestedCollisionDetection: CollisionDetection = (args) => {
  const pointed = pointerWithin(args);
  return pointed.length ? pointed : closestCenter(args);
};

class AppErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('SPU Builder render error', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h1>Erro ao renderizar o builder</h1>
          <pre>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const ns = useDS();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [printPreviewing, setPrintPreviewing] = useState(false);
  const [richNotesOpen, setRichNotesOpen] = useState(false);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const [state, dispatch] = useReducer(docReducer, null, (): DocState => ({
    doc: { schema: 1, meta: { title: 'Rascunho', lang: 'pt-BR' }, blocks: [] },
    past: [], future: [],
  }));

  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), []);

  useEffect(() => {
    if (!ns) return;
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const doc = ns.BuilderExport.migrate(normalizeProjectContent(JSON.parse(saved)));
        dispatch({ type: 'SET_DOC', doc });
        return;
      }
    } catch {/* ignore */}
    dispatch({ type: 'SET_DOC', doc: ns.BuilderExport.newDoc({ title: 'Rascunho' }) });
  }, [ns]);

  useEffect(() => {
    if (!ns || !state.doc.schema) return;
    const id = setTimeout(() => {
      localStorage.setItem(AUTOSAVE_KEY, ns.BuilderExport.serialize(state.doc));
    }, 400);
    return () => clearTimeout(id);
  }, [ns, state.doc]);

  // Sincroniza o sumário (meta.toc.items) com os títulos H2 do documento,
  // preservando "hidden" por id. Sumário recolhido renderizado pelo DS.
  useEffect(() => {
    const heads: { id: string; text: string }[] = [];
    const walk = (bs: Block[]) => bs.forEach((b) => {
      if (b.type === 'titulo' && ((b.props.level as string) || 'h2') === 'h2') {
        heads.push({ id: b.id, text: (b.props.text as string) || '' });
      }
      if (b.children) walk(b.children as Block[]);
    });
    walk(state.doc.blocks);
    const toc = state.doc.meta.toc || {};
    const old = toc.items || [];
    const hiddenById = Object.fromEntries(old.map((i) => [i.id, i.hidden]));
    const items = heads.map((h) => ({ id: h.id, text: h.text, hidden: !!hiddenById[h.id] }));
    if (JSON.stringify(items) !== JSON.stringify(old)) {
      dispatch({ type: 'SYNC_META', patch: { toc: { ...toc, items } } });
    }
  }, [state.doc]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function allowedTypesForParent(parentId: string | null): string[] {
    if (!ns) return [];
    if (!parentId) return ns.BlockRegistry.structuralTypes;
    const parent = findBlock(state.doc.blocks, parentId);
    const definition = parent ? ns.BlockRegistry.byType[parent.type] : undefined;
    return definition?.allowedTypes || ns.BlockRegistry.childTypes;
  }

  // Insere um bloco pela biblioteca, respeitando a regra: blocos de conteúdo
  // SEMPRE vivem dentro de uma Section; só os estruturais ficam no nível raiz.
  function insertBlock(type: string) {
    if (!ns) return;
    const structural: string[] = ns.BlockRegistry.structuralTypes;
    const block = ns.BlockRegistry.newBlock(type);
    if (!block) {
      console.error('Bloco desconhecido ou inválido:', type);
      return;
    }

    if (structural.includes(type)) {
      dispatch({ type: 'ADD_TOP', block });
      return;
    }

    // Bloco de conteúdo → precisa de uma Section.
    const blocks = state.doc.blocks;
    const last = blocks[blocks.length - 1];
    if (last && (last.type === 'section' || last.type === 'collapsiblesection')) {
      dispatch({ type: 'ADD_CHILD', parentId: last.id, block });
    } else {
      const sec = ns.BlockRegistry.newBlock('section');
      if (!sec) {
        console.error('Não foi possível criar seção para o bloco:', type);
        return;
      }
      sec.children = [block];
      if (sec.props) (sec.props as Record<string, unknown>).children = [];
      dispatch({ type: 'ADD_TOP', block: sec });
    }
  }

  function handleDragOver(event: DragOverEvent) {
    setDropTarget(resolveAllowedDropTarget(event));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const target = dropTarget ?? resolveAllowedDropTarget(event);
    setDropTarget(null);
    if (!over || !ns) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const blocks = state.doc.blocks;

    // 1. Drag da biblioteca
    if (activeId.startsWith('lib:')) {
      const type = activeId.slice(4);
      const structural: string[] = ns.BlockRegistry.structuralTypes;

      if (target?.parentId && allowedTypesForParent(target.parentId).includes(type)) {
        dispatch({ type: 'ADD_CHILD_AT', parentId: target.parentId, index: target.index, block: ns.BlockRegistry.newBlock(type) });
        return;
      }

      if (!target?.parentId && structural.includes(type)) {
        dispatch({ type: 'ADD_TOP_AT', index: target?.index ?? blocks.length, block: ns.BlockRegistry.newBlock(type) });
        return;
      }

      // Caso contrário → enforcement (conteúdo vai para uma Section)
      insertBlock(type);
      return;
    }

    // 2. Mover bloco existente para qualquer container/posição compatível.
    if (activeId !== overId && target) {
      const moving = findBlock(blocks, activeId);
      if (!moving) return;

      const movingDef = ns.BlockRegistry.byType[moving.type];
      const structural: string[] = ns.BlockRegistry.structuralTypes;
      const canMoveToTop = !target.parentId && structural.includes(moving.type);
      const canMoveToContainer = !!target.parentId && allowedTypesForParent(target.parentId).includes(moving.type);
      const movingContainerIntoOwnChild = target.parentId ? target.parentId === activeId || isDescendantOf(blocks, target.parentId, activeId) : false;

      if ((movingDef?.kind === 'container' || moving) && !movingContainerIntoOwnChild && (canMoveToTop || canMoveToContainer)) {
        dispatch({ type: 'MOVE_TO', id: activeId, parentId: target.parentId, index: target.index });
      }
    }
  }

  function resolveAllowedDropTarget(event: DragEndEvent | DragOverEvent): DropTarget | null {
    if (!ns) return null;
    const target = resolveDropTarget(event);
    if (!target) return null;

    const activeId = String(event.active.id);
    const structural: string[] = ns.BlockRegistry.structuralTypes;

    if (activeId.startsWith('lib:')) {
      const type = activeId.slice(4);
      if (target.parentId && allowedTypesForParent(target.parentId).includes(type)) return target;
      if (!target.parentId && structural.includes(type)) return target;
      return null;
    }

    const moving = findBlock(state.doc.blocks, activeId);
    if (!moving) return null;
    const canMoveToTop = !target.parentId && structural.includes(moving.type);
    const canMoveToContainer = !!target.parentId && allowedTypesForParent(target.parentId).includes(moving.type);
    const movingContainerIntoOwnChild = target.parentId ? target.parentId === activeId || isDescendantOf(state.doc.blocks, target.parentId, activeId) : false;
    if (movingContainerIntoOwnChild || (!canMoveToTop && !canMoveToContainer)) return null;

    const currentParentId = findBlockParentId(state.doc.blocks, activeId);
    const currentIndex = findBlockIndex(state.doc.blocks, activeId);
    if (currentParentId === target.parentId && (target.index === currentIndex || target.index === currentIndex + 1)) return null;
    return target;
  }

  function resolveDropTarget(event: DragEndEvent | DragOverEvent): DropTarget | null {
    const { active, over } = event;
    if (!over) return null;
    const overId = String(over.id);
    const blocks = state.doc.blocks;

    if (overId === 'canvas') return { parentId: null, index: blocks.length };

    if (overId.startsWith('drop:')) {
      const parentId = overId.slice(5);
      const target = findBlockArray(blocks, parentId);
      return { parentId, index: target?.length ?? 0 };
    }

    const overBlock = findBlock(blocks, overId);
    if (!overBlock) return null;
    const overDef = ns?.BlockRegistry.byType[overBlock.type];
    const overParentId = findBlockParentId(blocks, overId);

    const overRect = over.rect;
    const activeRect = active.rect.current.translated || active.rect.current.initial;
    const activeCenterY = activeRect ? activeRect.top + activeRect.height / 2 : overRect.top;
    const after = activeCenterY > overRect.top + overRect.height / 2;

    if (overParentId) {
      const overIndex = findBlockIndex(blocks, overId);
      return { parentId: overParentId, index: overIndex + (after ? 1 : 0) };
    }

    if (overDef?.kind === 'container') {
      const activeId = String(active.id);
      const allowed = overDef.allowedTypes || ns?.BlockRegistry.childTypes || [];
      const isLibraryContent = activeId.startsWith('lib:') && allowed.includes(activeId.slice(4));
      const activeBlock = !activeId.startsWith('lib:') ? findBlock(blocks, activeId) : null;
      const isExistingContent = activeBlock && allowed.includes(activeBlock.type);
      if (isLibraryContent || isExistingContent) {
        return { parentId: overId, index: overBlock.children?.length ?? 0 };
      }
    }

    const overIndex = findBlockIndex(blocks, overId);
    return { parentId: null, index: overIndex + (after ? 1 : 0) };
  }

  if (!ns) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        Carregando Design System…
      </div>
    );
  }

  const selectedBlock: Block | null = selectedId ? findBlock(state.doc.blocks, selectedId) : null;

  const handleMove = (id: string, dir: 'up' | 'down') => {
    const parentId = findBlockParentId(state.doc.blocks, id);
    const arr = findBlockArray(state.doc.blocks, parentId) || [];
    const from = arr.findIndex(b => b.id === id);
    const to = dir === 'up' ? from - 1 : from + 1;
    if (from !== -1 && to >= 0 && to < arr.length) {
      dispatch({ type: 'MOVE', parentId, fromIndex: from, toIndex: to });
    }
  };

  const handlePatch = (id: string, patch: Record<string, unknown>) => dispatch({ type: 'PATCH', id, patch });
  const handleInlineEdit = (edited: Block, patch: Record<string, unknown>) => dispatch({ type: 'PATCH', id: edited.id, patch });
  const handleInsertAt = (parentId: string | null, index: number, type: string) => {
    if (!ns) return;
    const allowed = allowedTypesForParent(parentId);
    if (!allowed.includes(type)) return;
    const block = ns.BlockRegistry.newBlock(type);
    if (!block) return;
    if (parentId) dispatch({ type: 'ADD_CHILD_AT', parentId, index, block });
    else dispatch({ type: 'ADD_TOP_AT', index, block });
    setSelectedId(block.id);
  };
  const handleClearDoc = () => {
    if (!ns) return;
    localStorage.removeItem(AUTOSAVE_KEY);
    void clearImageSlots();
    dispatch({ type: 'SET_DOC', doc: ns.BuilderExport.newDoc({ title: 'Rascunho' }) });
    setSelectedId(null);
  };
  const handleRichNoteUpdate = (update: RichNoteUpdate) => {
    dispatch({ type: 'REPLACE_BLOCKS', blocks: updateRichNote(state.doc.blocks, update) });
  };

  return (
    <AppErrorBoundary>
      <DndContext
        sensors={sensors}
        collisionDetection={nestedCollisionDetection}
        onDragOver={handleDragOver}
        onDragCancel={() => setDropTarget(null)}
        onDragEnd={handleDragEnd}
      >
      <div className={styles.root} data-spu-app-shell>
        <Toolbar
          ns={ns}
          doc={state.doc}
          canUndo={state.past.length > 0}
          canRedo={state.future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onTitleChange={(title) => dispatch({ type: 'SET_TITLE', title })}
          onOpenDoc={(d) => { dispatch({ type: 'SET_DOC', doc: d }); setSelectedId(null); }}
          onPreview={() => setPreviewing(true)}
          onPrintPreview={() => setPrintPreviewing(true)}
          onRichNotes={() => setRichNotesOpen(true)}
          onMetaChange={(patch) => dispatch({ type: 'SYNC_META', patch })}
          onClearDoc={handleClearDoc}
        />
        <div className={styles.workspace}>
          <Library ns={ns} onAdd={insertBlock} />
          <Canvas
            ns={ns}
            blocks={state.doc.blocks}
            selectedId={selectedId}
            dropTarget={dropTarget}
            onSelect={setSelectedId}
            onRemove={(id) => { dispatch({ type: 'REMOVE', id }); setSelectedId(null); }}
            onDuplicate={(id) => dispatch({ type: 'DUPLICATE', id })}
            onMove={handleMove}
            onInlineEdit={handleInlineEdit}
            onInsert={handleInsertAt}
          />
          <div className={styles.rightRail}>
            <Inspector
              ns={ns}
              block={selectedBlock}
              onPatch={handlePatch}
            />
          </div>
        </div>
      </div>
      {previewing && <PreviewModal ns={ns} doc={state.doc} onClose={() => setPreviewing(false)} />}
      {printPreviewing && <PrintPreviewModal ns={ns} doc={state.doc} onClose={() => setPrintPreviewing(false)} />}
      {richNotesOpen && <RichNotesModal ns={ns} blocks={state.doc.blocks} onUpdate={handleRichNoteUpdate} onClose={() => setRichNotesOpen(false)} />}
      </DndContext>
    </AppErrorBoundary>
  );
}
