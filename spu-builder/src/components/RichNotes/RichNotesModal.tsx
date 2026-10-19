import { useEffect, useMemo, useState } from 'react';
import type { Block, NS } from '../../types/ds';
import { collectRichNotes, type GlossaryNote, type LinkNote, type RichNoteUpdate } from '../../utils/richNotes';
import styles from './RichNotesModal.module.css';

interface Props {
  ns: NS;
  blocks: Block[];
  onUpdate: (update: RichNoteUpdate) => void;
  onClose: () => void;
}

function GlossaryRow({ ns, note, onSave }: { ns: NS; note: GlossaryNote; onSave: (next: GlossaryNote) => void }) {
  const [term, setTerm] = useState(note.term);
  const [definition, setDefinition] = useState(note.definition);
  useEffect(() => { setTerm(note.term); setDefinition(note.definition); }, [note]);
  const changed = term.trim() !== note.term || definition.trim() !== note.definition;

  return (
    <article className={styles.card}>
      <label>
        <span>Termo</span>
        <input value={term} onChange={(event) => setTerm(event.target.value)} />
      </label>
      <label>
        <span>Definição</span>
        <ns.Editable
          html={definition}
          onChange={setDefinition}
          placeholder="Definição do termo…"
        />
        <small>Selecione um trecho para aplicar negrito ou itálico. Enter cria um novo parágrafo; Shift+Enter quebra a linha.</small>
      </label>
      <button type="button" disabled={!changed || !term.trim() || !definition.trim()} onClick={() => onSave({ term: term.trim(), definition: definition.trim() })}>
        Salvar alterações
      </button>
    </article>
  );
}

function LinkRow({ note, onSave }: { note: LinkNote; onSave: (next: LinkNote) => void }) {
  const [label, setLabel] = useState(note.label);
  const [href, setHref] = useState(note.href);
  useEffect(() => { setLabel(note.label); setHref(note.href); }, [note]);
  const changed = label.trim() !== note.label || href.trim() !== note.href;

  return (
    <article className={styles.card}>
      <label>
        <span>Texto do link</span>
        <input value={label} onChange={(event) => setLabel(event.target.value)} />
      </label>
      <label>
        <span>Endereço</span>
        <input value={href} onChange={(event) => setHref(event.target.value)} />
      </label>
      <div className={styles.linkActions}>
        <a href={href} target="_blank" rel="noopener">Testar link</a>
        <button type="button" disabled={!changed || !href.trim()} onClick={() => onSave({ label: label.trim() || href.trim(), href: href.trim() })}>
          Salvar alterações
        </button>
      </div>
    </article>
  );
}

export function RichNotesModal({ ns, blocks, onUpdate, onClose }: Props) {
  const notes = useMemo(() => collectRichNotes(blocks), [blocks]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="rich-notes-title" onMouseDown={(event) => event.stopPropagation()} data-spu-canvas>
        <header>
          <div>
            <h2 id="rich-notes-title">Termos e links</h2>
            <p>Revise, teste e altere todas as ocorrências sem precisar reler a página.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className={styles.content}>
          <section>
            <h3>Glossário <span>{notes.glossary.length}</span></h3>
            {notes.glossary.length === 0 && <p className={styles.empty}>Nenhum termo de glossário encontrado.</p>}
            <div className={styles.list}>
              {notes.glossary.map((note, index) => (
                <GlossaryRow
                  key={`${note.term}-${note.definition}-${index}`}
                  ns={ns}
                  note={note}
                  onSave={(next) => onUpdate({ kind: 'glossary', original: note, next })}
                />
              ))}
            </div>
          </section>
          <section>
            <h3>Links <span>{notes.links.length}</span></h3>
            {notes.links.length === 0 && <p className={styles.empty}>Nenhum link externo encontrado.</p>}
            <div className={styles.list}>
              {notes.links.map((note, index) => (
                <LinkRow
                  key={`${note.href}-${note.label}-${index}`}
                  note={note}
                  onSave={(next) => onUpdate({ kind: 'link', original: note, next })}
                />
              ))}
            </div>
          </section>
        </div>
        <ns.MarkToolbar />
      </section>
    </div>
  );
}
