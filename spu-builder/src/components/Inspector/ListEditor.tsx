import { useEffect } from 'react';
import type { NS, FieldDef } from '../../types/ds';
import { duplicateNestedValue } from '../../store/docStore';
import { lbl } from './labels';
import { SlotField } from './SlotField';
import { TokenColorControl } from './TokenColorControl';
import styles from './ListEditor.module.css';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

// Campo de imagem (slot) em item de lista: garante um id estável e reusa o
// SlotField (upload via drop sintético no <image-slot> do canvas).
function SlotControl({ value, onChange }: { value: string; onChange: (v: Json) => void }) {
  useEffect(() => {
    if (!value) onChange(`c_${Math.random().toString(36).slice(2, 9)}__imageSlot`);
  }, [value, onChange]);
  if (!value) return <span className={styles.subLabel}>preparando…</span>;
  return <SlotField slotId={value} />;
}

function isObj(v: unknown): v is Record<string, Json> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

const MULTILINE = new Set(['content', 'children', 'body', 'html', 'feedback', 'description']);

// Valor padrão para um campo, conforme o schema (mantém a estrutura correta).
function defaultForType(f: FieldDef): Json {
  switch (f.type) {
    case 'number': return 0;
    case 'bool': return false;
    case 'list': return [];
    case 'object': {
      const o: Record<string, Json> = {};
      (f.fields || []).forEach((sf) => { o[sf.key] = defaultForType(sf); });
      return o;
    }
    default: return '';
  }
}

function blankItem(fields: FieldDef[]): Json {
  if (fields.length === 1 && fields[0].key === '') return defaultForType(fields[0]);
  const o: Record<string, Json> = {};
  for (const f of fields) o[f.key] = defaultForType(f);
  return o;
}

// ── Controle de um campo, dirigido pelo FieldDef ──
export function FieldControl({ ns, field, value, onChange }: {
  ns: NS; field: FieldDef; value: Json; onChange: (v: Json) => void;
}) {
  switch (field.type) {
    case 'icon':
      return (
        <div className={styles.iconWrap}>
          <ns.IconGallery value={(value as string) || ''} onPick={(n) => onChange(n)} itemMin={40} size={15} />
        </div>
      );
    case 'bool':
      return (
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      );
    case 'number':
      return (
        <input type="number" className={styles.input} value={Number(value) || 0} onChange={(e) => onChange(Number(e.target.value))} />
      );
    case 'select':
      return (
        <select className={styles.input} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'accent':
      return <TokenColorControl value={(value as string) || ''} onChange={onChange} />;
    case 'slot':
      return <SlotControl value={(value as string) || ''} onChange={onChange} />;
    case 'rich':
      return (
        <ns.Editable
          html={(value as string) || ''}
          onChange={(html) => onChange(html)}
          single={field.inline ?? !MULTILINE.has(field.key)}
          placeholder="Escreva…"
        />
      );
    case 'list':
      return (
        <ListEditor ns={ns} fields={field.itemFields || []} items={(value as Json[]) || []} onChange={onChange} itemKey={field.key} />
      );
    case 'object':
      return (
        <div className={styles.nestedObj}>
          {(field.fields || []).map((sf) => (
            <div className={styles.subField} key={sf.key}>
              <label className={styles.subLabel}>{sf.label || lbl(sf.key)}</label>
              <FieldControl
                ns={ns}
                field={sf}
                value={isObj(value) ? value[sf.key] : null}
                onChange={(nv) => onChange({ ...(isObj(value) ? value : {}), [sf.key]: nv })}
              />
            </div>
          ))}
        </div>
      );
    case 'text':
    default:
      return (
        <input className={styles.input} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      );
  }
}

interface ListEditorProps {
  ns: NS;
  fields: FieldDef[];     // schema do item (itemFields)
  items: Json[];
  onChange: (items: Json[]) => void;
  itemKey?: string;
}

export function ListEditor({ ns, fields, items, onChange, itemKey }: ListEditorProps) {
  const scalar = fields.length === 1 && fields[0].key === '';
  // Campo exclusivo (rádio entre itens), se houver.
  const exclusiveField = fields.find((f) => f.exclusive);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const duplicate = (i: number) => {
    const next = items.slice();
    next.splice(i + 1, 0, duplicateNestedValue(items[i]));
    onChange(next);
  };
  const update = (i: number, v: Json) => onChange(items.map((it, idx) => (idx === i ? v : it)));
  const add = () => onChange([...items, blankItem(fields)]);

  // Seleção exclusiva: marca um item, zera os demais.
  const setExclusive = (i: number, key: string) =>
    onChange(items.map((it, idx) => (isObj(it) ? { ...it, [key]: idx === i } : it)));

  const singular = itemNoun(itemKey);

  return (
    <div className={styles.list}>
      {items.map((item, i) => (
        <div className={styles.item} key={i}>
          <div className={styles.itemHead}>
            <span className={styles.itemTitle}>{singular} {i + 1}</span>
            <div className={styles.itemActions}>
              {exclusiveField && (
                <label className={styles.correctRadio} title={exclusiveField.label}>
                  <input
                    type="radio"
                    checked={isObj(item) && item[exclusiveField.key] === true}
                    onChange={() => setExclusive(i, exclusiveField.key)}
                  />
                  {exclusiveField.label}
                </label>
              )}
              <button className={styles.iconBtn} onClick={() => move(i, i - 1)} disabled={i === 0} title="Subir">↑</button>
              <button className={styles.iconBtn} onClick={() => move(i, i + 1)} disabled={i === items.length - 1} title="Descer">↓</button>
              <button className={styles.iconBtn} onClick={() => duplicate(i)} title="Duplicar item">
                <ns.Icon name="repeat" size={12} />
              </button>
              <button className={styles.iconBtnDanger} onClick={() => remove(i)} title="Remover">✕</button>
            </div>
          </div>
          <div className={styles.itemBody}>
            {scalar ? (
              <FieldControl ns={ns} field={fields[0]} value={item} onChange={(v) => update(i, v)} />
            ) : (
              fields.filter((f) => !f.exclusive).map((f) => (
                <div className={styles.subField} key={f.key}>
                  <label className={styles.subLabel}>{f.label || lbl(f.key)}</label>
                  <FieldControl
                    ns={ns}
                    field={f}
                    value={isObj(item) ? item[f.key] : null}
                    onChange={(v) => update(i, isObj(item) ? { ...item, [f.key]: v } : v)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
      <button className={styles.addBtn} onClick={add}>+ Adicionar {singular.toLowerCase()}</button>
    </div>
  );
}

function itemNoun(key?: string): string {
  switch (key) {
    case 'questions': return 'Questão';
    case 'options': return 'Alternativa';
    case 'stats': return 'Dado';
    case 'milestones': return 'Marco';
    case 'eras': return 'Período';
    case 'prompts': return 'Pergunta';
    case 'credits': return 'Crédito';
    case 'slides': return 'Slide';
    case 'items': return 'Item';
    default: return 'Item';
  }
}
