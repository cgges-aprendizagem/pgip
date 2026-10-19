import type { NS } from '../../types/ds';
import { useDraggable } from '@dnd-kit/core';
import styles from './Library.module.css';
import { getAvailableIconSet, HIDDEN_BLOCKS, resolveBlockIcon } from './blockLibrary';

// Fallback para ícones que os blocos declaram mas o DS ainda não tem (33 ícones).
// Quando o DS ampliar o set, o ícone real do bloco passa a resolver e o fallback
// é ignorado (a checagem usa ns.ICON_NAMES em runtime).
interface Props {
  ns: NS;
  onAdd: (type: string) => void;
}

function DraggableBlock({ ns, type, label, icon, avail, onAdd }: { ns: NS; type: string; label: string; icon: string; avail: Set<string>; onAdd: (type: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `lib:${type}`, data: { source: 'library', type } });
  const iconName = resolveBlockIcon(icon, avail);

  return (
    <button
      ref={setNodeRef}
      className={styles.block + (isDragging ? ` ${styles.dragging}` : '')}
      onClick={() => onAdd(type)}
      {...listeners}
      {...attributes}
      title={`Inserir ${label}`}
    >
      <ns.Icon name={iconName} size={15} />
      <span>{label}</span>
    </button>
  );
}

export function Library({ ns, onAdd }: Props) {
  const { BlockRegistry } = ns;
  const avail = getAvailableIconSet(ns.ICON_NAMES || []);

  return (
    <aside className={styles.root}>
      <div className={styles.heading}>Biblioteca</div>
      {BlockRegistry.cats.map(cat => (
        <div key={cat}>
          <div className={styles.cat}>{cat}</div>
          {BlockRegistry.blocks.filter(b => b.cat === cat && !HIDDEN_BLOCKS.has(b.type)).map(b => (
            <DraggableBlock
              key={b.type}
              ns={ns}
              type={b.type}
              label={b.label}
              icon={b.icon}
              avail={avail}
              onAdd={onAdd}
            />
          ))}
        </div>
      ))}
    </aside>
  );
}
