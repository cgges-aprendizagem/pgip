import type { NS, Block, BlockDef, FieldDef } from '../../types/ds';
import { lbl, optLabel } from './labels';
import { ListEditor, FieldControl } from './ListEditor';
import { SlotField } from './SlotField';
import { TableEditor } from './TableEditor';
import { TokenColorControl } from './TokenColorControl';
import styles from './Inspector.module.css';

const isSlotKey = (k: string) => k === 'slot' || k.endsWith('Slot');

interface Props {
  ns: NS;
  block: Block | null;
  onPatch: (id: string, patch: Record<string, unknown>) => void;
}

// Presets de pad da Section (não estão no manifest ainda; enum do DS).
const PAD_OPTIONS = ['lg', 'md', 'none'];
const LEVEL_OPTIONS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

// Enums conhecidos do DS para props de string que devem virar dropdown.
const KNOWN_ENUMS: Record<string, string[]> = {
  fit: ['contain', 'cover', 'fill'],
  size: ['sm', 'md', 'lg', 'full'],
  shape: ['rect', 'rounded', 'circle', 'pill'],
  licenseKind: ['byncsa', 'byncnd'],
};

// Campos de texto longo (multi-linha / HTML de bloco).
const MULTILINE = new Set(['children', 'body', 'html', 'content', 'lead']);
// Props ocultas no painel (geridas em outro lugar).
const HIDDEN = new Set(['children', 'src', '__pageBreakBefore']);

function cleanManualRichFormatting(value: unknown): unknown {
  if (typeof value === 'string') {
    if (!/<span\b/i.test(value)) return value;
    const template = document.createElement('template');
    template.innerHTML = value;
    template.content.querySelectorAll('span:not([data-term])').forEach((span) => {
      span.replaceWith(...Array.from(span.childNodes));
    });
    return template.innerHTML;
  }
  if (Array.isArray(value)) return value.map(cleanManualRichFormatting);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, current]) => [key, cleanManualRichFormatting(current)]));
  }
  return value;
}

export function Inspector({ ns, block, onPatch }: Props) {
  const { BlockRegistry, BuilderManifest, Editable, IconGallery } = ns;

  if (!block) {
    return (
      <aside className={styles.root} data-spu-canvas>
        <div className={styles.heading}>Propriedades</div>
        <div className={styles.empty}>Selecione um bloco no canvas.</div>
      </aside>
    );
  }

  const def: BlockDef = BlockRegistry.byType[block.type];
  if (!def) return null;

  const props = block.props || {};
  const patch = (p: Record<string, unknown>) => onPatch(block.id, p);
  const labelFor = (key: string) => {
    if (block.type === 'mapfigure' && key === 'label') return 'Título da imagem';
    if (block.type === 'hero' && key === 'kicker') return 'Nome da competência';
    if (block.type === 'hero' && key === 'byline') return 'Autoria, subtítulo ou eixo/competência';
    return lbl(key);
  };

  // ---- controles reutilizáveis ----

  const selectField = (key: string, options: string[], allowEmpty = false, onValue?: (value: string) => Record<string, unknown>) => (
    <div className={styles.field} key={key}>
      <label className={styles.label}>{labelFor(key)}</label>
      <select
        className={styles.select}
        value={(props[key] as string) ?? ''}
        onChange={(e) => patch(onValue ? onValue(e.target.value) : { [key]: e.target.value })}
      >
        {allowEmpty && <option value="">padrão</option>}
        {options.map(o => <option key={o} value={o}>{optLabel(o)}</option>)}
      </select>
    </div>
  );

  const accentField = (key: string) => (
    <div className={styles.field} key={key}>
      <label className={styles.label}>{labelFor(key)}</label>
      <TokenColorControl value={(props[key] as string) || ''} onChange={(value) => patch({ [key]: value })} />
    </div>
  );

  const iconField = (key: string) => (
    <div className={styles.field} key={key}>
      <label className={styles.label}>{labelFor(key)}</label>
      <div className={styles.iconGallery}>
        <IconGallery
          value={(props[key] as string) || ''}
          onPick={(name) => patch({ [key]: name })}
          itemMin={44}
          size={16}
        />
      </div>
    </div>
  );

  const textField = (key: string, rich: boolean) => (
    <div className={styles.field} key={key}>
      <label className={styles.label}>{labelFor(key)}</label>
      {rich ? (
        <Editable
          html={(props[key] as string) || ''}
          onChange={(html) => patch({ [key]: html })}
          single={!MULTILINE.has(key)}
          placeholder="Escreva… (selecione para marcar)"
        />
      ) : (
        <input
          className={styles.input}
          value={(props[key] as string) || ''}
          onChange={(e) => patch({ [key]: e.target.value })}
        />
      )}
    </div>
  );

  const numberField = (key: string) => (
    <div className={styles.field} key={key}>
      <label className={styles.label}>{labelFor(key)}</label>
      <input
        type="number"
        className={styles.input}
        value={Number(props[key]) || 0}
        onChange={(e) => patch({ [key]: Number(e.target.value) })}
      />
    </div>
  );

  const boolField = (key: string) => (
    <div className={`${styles.field} ${styles.fieldRow}`} key={key}>
      <label className={styles.label}>{labelFor(key)}</label>
      <input
        type="checkbox"
        checked={!!props[key]}
        onChange={(e) => patch({ [key]: e.target.checked })}
      />
    </div>
  );

  // ---- montagem por kind ----

  const fields = def.fields || [];
  // `def.fields` armazena HTML vindo do Editable. Nem todos os registros
  // históricos possuem `rich: true`, embora o canvas aceite formatação.
  const richField = (k: string) => fields.includes(k);
  const propFields = def.propFields || [];
  const propFieldKeys = new Set(propFields.map(f => f.key));

  // Chaves já cobertas por seções dedicadas → não repetir no loop genérico.
  const covered = new Set<string>([
    ...fields,
    ...propFieldKeys,
    ...(def.itemsKey ? [def.itemsKey] : []),
    'icon', 'kickerIcon', 'color', 'tone', 'level',
    'width', 'surface', 'pad', '__pullUp', '__pullDown',
  ]);

  const styleProps = Object.keys(props).filter(k => !covered.has(k) && !HIDDEN.has(k) && !(block.type === 'bleedimage' && k === 'zoom'));

  // Campo do schema (propFields) → linha de controle.
  const schemaField = (f: FieldDef) => {
    return (
      <div className={styles.field} key={f.key}>
        <label className={styles.label}>{f.label || labelFor(f.key)}</label>
        {['color', 'accent', 'bg', 'overlayBg'].includes(f.key) ? (
          <TokenColorControl value={(props[f.key] as string) || ''} onChange={(value) => patch({ [f.key]: value })} />
        ) : block.type === 'externalembed' && f.key === 'embed' ? (
          <textarea
            className={`${styles.input} ${styles.embedCode}`}
            value={(props[f.key] as string) || ''}
            onInput={(event) => patch({ [f.key]: event.currentTarget.value })}
            placeholder="Cole a URL ou o código <iframe>…"
          />
        ) : (
          <FieldControl ns={ns} field={f} value={(props[f.key] as never) ?? null} onChange={(v) => patch({ [f.key]: v })} />
        )}
      </div>
    );
  };

  return (
    <aside className={styles.root} data-spu-canvas>
      <div className={styles.heading}>
        {def.label}
        <span className={styles.kind}>{def.kind}</span>
      </div>

      <div className={`${styles.field} ${styles.fieldRow}`}>
        <label className={styles.label}>Quebrar página antes no PDF</label>
        <input
          type="checkbox"
          checked={!!props.__pageBreakBefore}
          onChange={(e) => patch({ __pageBreakBefore: e.target.checked })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Aproximação entre blocos</label>
        <label className={styles.compactToggle}>
          <input
            type="checkbox"
            checked={!!props.__pullUp}
            onChange={(e) => patch({ __pullUp: e.target.checked })}
          />
          Ignorar espaço acima
        </label>
        <label className={styles.compactToggle}>
          <input
            type="checkbox"
            checked={!!props.__pullDown}
            onChange={(e) => patch({ __pullDown: e.target.checked })}
          />
          Ignorar espaço abaixo
        </label>
      </div>

      <div className={styles.field}>
        <button
          type="button"
          className={styles.cleanFormatBtn}
          onClick={() => patch(cleanManualRichFormatting(props) as Record<string, unknown>)}
        >
          Limpar formatação manual deste bloco
        </button>
      </div>

      {block.type === 'datatable' && (
        <>
          {textField('caption', true)}
          <div className={styles.field}>
            <label className={styles.label}>Dados</label>
            <TableEditor key={block.id} ns={ns} block={block} onPatch={patch} />
          </div>
        </>
      )}

      {/* 1) CAMPOS DE CONTEÚDO (def.fields) */}
      {block.type !== 'datatable' && fields.map(f => {
        if (f === 'level') return selectField('level', LEVEL_OPTIONS);
        return textField(f, richField(f));
      })}

      {/* 2) CONTAINER → largura / superfície / pad */}
      {def.kind === 'container' && (
        <>
          {props.width !== undefined && selectField('width', BuilderManifest.widths)}
          {props.surface !== undefined && !def.locks?.bg && selectField('surface', BuilderManifest.surfaces)}
          {props.pad !== undefined && selectField('pad', PAD_OPTIONS)}
        </>
      )}

      {/* 3) CONTROLES DEDICADOS comuns */}
      {props.level !== undefined && !fields.includes('level') && selectField('level', LEVEL_OPTIONS)}
      {props.icon !== undefined && !propFieldKeys.has('icon') && iconField('icon')}
      {props.kickerIcon !== undefined && iconField('kickerIcon')}
      {props.color !== undefined && !propFieldKeys.has('color') && block.type !== 'callout' && accentField('color')}
      {props.tone !== undefined && selectField('tone', BuilderManifest.tones, true, block.type === 'callout' ? (tone) => ({ tone, color: '' }) : undefined)}

      {/* 4) PROPS DE OBJETO via schema (propFields: flashcard, mediaembed, compareab…) */}
      {block.type !== 'datatable' && propFields.map(schemaField)}

      {/* 5) LISTA principal via itemFields (itemsKey: quiz, accordion, stats…) */}
      {block.type !== 'datatable' && def.itemsKey && def.itemFields && (
        <div className={styles.field}>
          <label className={styles.label}>{lbl(def.itemsKey)}</label>
          <ListEditor
            ns={ns}
            fields={def.itemFields}
            items={(props[def.itemsKey] as never[]) || []}
            itemKey={def.itemsKey}
            onChange={(items) => patch({ [def.itemsKey as string]: items })}
          />
        </div>
      )}

      {/* 6) PROPS GENÉRICAS restantes (sem schema) */}
      {block.type !== 'datatable' && styleProps.map(k => {
        const v = props[k];
        if (isSlotKey(k)) {
          return (
            <div className={styles.field} key={k}>
              <label className={styles.label}>{k === 'slot' ? 'Imagem' : labelFor(k)}</label>
              <SlotField slotId={(v as string) || ''} />
            </div>
          );
        }
        if (KNOWN_ENUMS[k] && typeof v === 'string') {
          return selectField(k, KNOWN_ENUMS[k]);
        }
        if (Array.isArray(v)) {
          // Array sem schema → infere campo escalar rich.
          return (
            <div className={styles.field} key={k}>
              <label className={styles.label}>{labelFor(k)}</label>
              <ListEditor
                ns={ns}
                fields={[{ key: '', label: lbl(k), type: 'rich', inline: true }]}
                items={v as never[]}
                itemKey={k}
                onChange={(items) => patch({ [k]: items })}
              />
            </div>
          );
        }
        if (v !== null && typeof v === 'object') return null;
        if (typeof v === 'number') return numberField(k);
        if (typeof v === 'boolean') return boolField(k);
        if (typeof v === 'string') return textField(k, false);
        return null;
      })}
    </aside>
  );
}
