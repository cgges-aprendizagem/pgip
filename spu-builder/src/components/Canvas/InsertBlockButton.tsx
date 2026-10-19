import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BlockDef, NS } from '../../types/ds';
import { getAvailableIconSet, HIDDEN_BLOCKS, resolveBlockIcon } from '../Library/blockLibrary';
import styles from './InsertBlockButton.module.css';

interface Props {
  ns: NS;
  allowedTypes: string[];
  onInsert: (type: string) => void;
  spacing?: 'default' | 'title' | 'tight';
  embedded?: boolean;
  includeHidden?: boolean;
}

interface MenuPosition {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
}

export function InsertBlockButton({ ns, allowedTypes, onInsert, spacing = 'default', embedded = false, includeHidden = false }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const availableIcons = getAvailableIconSet(ns.ICON_NAMES || []);
  const allowed = useMemo(() => new Set(allowedTypes), [allowedTypes]);

  const blocks = useMemo(() => ns.BlockRegistry.blocks.filter((block) => (
    allowed.has(block.type) && (includeHidden || !HIDDEN_BLOCKS.has(block.type))
  )), [allowed, includeHidden, ns.BlockRegistry.blocks]);

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const filtered = normalizedQuery
    ? blocks.filter((block) => `${block.label} ${block.cat}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    : blocks;
  const categories = ns.BlockRegistry.cats
    .map((cat) => ({ cat, blocks: filtered.filter((block) => block.cat === cat) }))
    .filter((group) => group.blocks.length > 0);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const place = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(380, window.innerWidth - 24);
      const availableBelow = window.innerHeight - rect.bottom - 12;
      const availableAbove = rect.top - 12;
      const below = availableBelow >= 300 || availableBelow >= availableAbove;
      const maxHeight = Math.max(220, Math.min(440, below ? availableBelow : availableAbove));
      setPosition({
        left: Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12),
        top: below ? rect.bottom + 8 : undefined,
        bottom: below ? undefined : window.innerHeight - rect.top + 8,
        width,
        maxHeight,
      });
    };
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    place();
    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const choose = (block: BlockDef) => {
    onInsert(block.type);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.trigger} ${embedded ? styles.triggerEmbedded : spacing === 'title' ? styles.triggerTitle : spacing === 'tight' ? styles.triggerTight : ''}`}
        title={embedded ? 'Adicionar bloco ao item' : 'Inserir bloco aqui'}
        aria-label={embedded ? 'Adicionar bloco ao item' : 'Inserir bloco aqui'}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span aria-hidden="true">+</span>
        {embedded && <span>Adicionar bloco ao item</span>}
      </button>
      {open && position && createPortal(
        <div
          ref={menuRef}
          className={styles.menu}
          role="dialog"
          aria-label="Inserir bloco"
          style={position}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className={styles.menuHead}>
            <strong>Inserir bloco</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar">×</button>
          </div>
          <div className={styles.searchWrap}>
            <ns.Icon name="search" size={15} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar bloco…"
              aria-label="Buscar bloco"
            />
          </div>
          <div className={styles.options}>
            {categories.map((group) => (
              <section key={group.cat}>
                <p>{group.cat}</p>
                <div className={styles.grid}>
                  {group.blocks.map((block) => (
                    <button key={block.type} type="button" onClick={() => choose(block)}>
                      <ns.Icon name={resolveBlockIcon(block.icon, availableIcons)} size={15} />
                      <span>{block.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {categories.length === 0 && <div className={styles.empty}>Nenhum bloco encontrado.</div>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
