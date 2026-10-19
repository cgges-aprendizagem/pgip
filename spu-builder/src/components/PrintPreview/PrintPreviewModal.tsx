import { useEffect, useMemo, useState, type ComponentType } from 'react';
import type { Block, Doc, NS } from '../../types/ds';
import { collectRichNotes } from '../../utils/richNotes';
import styles from './PrintPreviewModal.module.css';

interface Props {
  ns: NS;
  doc: Doc;
  onClose: () => void;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function collectQuizKeys(blocks: Block[]): string[] {
  const keys: string[] = [];
  const walk = (list: Block[]) => {
    list.forEach((block) => {
      if (block.type === 'quiz') {
        const questions = (block.props.questions as { options?: { correct?: boolean }[] }[] | undefined) || [];
        questions.forEach((question) => {
          const index = (question.options || []).findIndex((option) => !!option.correct);
          if (index >= 0) keys.push(LETTERS[index] || String(index + 1));
        });
      }
      if (block.children) walk(block.children);
    });
  };
  walk(blocks);
  return keys;
}

function cloneBlock(block: Block): Block {
  return {
    ...block,
    props: { ...(block.props || {}) },
    children: block.children?.map(cloneBlock),
  };
}

function preparePrintBlocks(blocks: Block[]): Block[] {
  const prepared: Block[] = [];

  blocks.forEach((source) => {
    const block = cloneBlock(source);

    if (block.children?.length) {
      block.children = preparePrintBlocks(block.children);
    }

    if (block.type === 'referencias') {
      block.props.defaultOpen = true;
    }

    if (block.children?.length && (block.type === 'section' || block.type === 'sectionslide' || block.type === 'collapsiblesection')) {
      let current = cloneBlock(block);
      current.children = [];

      block.children.forEach((child) => {
        if (child.props?.__pageBreakBefore && current.children && current.children.length > 0) {
          prepared.push(current);
          current = cloneBlock(block);
          current.id = `${block.id}_print_${prepared.length}`;
          current.props = { ...current.props, __pageBreakBefore: true };
          current.children = [];
        }
        current.children?.push(child);
      });

      prepared.push(current);
      return;
    }

    prepared.push(block);
  });

  return prepared;
}

function preparePrintDoc(doc: Doc): Doc {
  return {
    ...doc,
    meta: { ...doc.meta },
    blocks: preparePrintBlocks(doc.blocks),
  };
}

function stripPrintMarkers(block: Block): Block {
  const clean = cloneBlock(block);
  delete clean.props.__pageBreakBefore;
  if (clean.children) clean.children = clean.children.map(stripPrintMarkers);
  return clean;
}

export function PrintPreviewModal({ ns, doc, onClose }: Props) {
  const [printModeReady, setPrintModeReady] = useState(false);
  const BlockView = ns.BlockView;
  const BuilderCredit = ns.BuilderCredit as ComponentType<Record<string, never>> | undefined;
  const printDoc = useMemo(() => preparePrintDoc(doc), [doc]);
  const answerKeys = useMemo(() => collectQuizKeys(printDoc.blocks), [printDoc.blocks]);
  const richNotes = useMemo(() => collectRichNotes(printDoc.blocks), [printDoc.blocks]);

  useEffect(() => {
    const win = window as unknown as { __SPU_PRINT?: boolean };
    const previous = win.__SPU_PRINT;
    win.__SPU_PRINT = true;
    document.body.classList.add('spu-print-preview-open');
    setPrintModeReady(true);
    return () => {
      if (previous === undefined) delete win.__SPU_PRINT;
      else win.__SPU_PRINT = previous;
      document.body.classList.remove('spu-print-preview-open');
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} data-spu-print-preview>
      <div className={styles.toolbar}>
        <div>
          <strong>Prévia PDF</strong>
          <span>A4, com interativos expandidos para impressão.</span>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={() => window.print()}>Imprimir / salvar PDF</button>
          <button type="button" onClick={onClose}>Fechar</button>
        </div>
      </div>
      <main className={styles.sheet}>
        {printModeReady && (
          <>
            {printDoc.blocks.map((block) => (
              <div
                key={block.id}
                className={block.props.__pageBreakBefore ? styles.pageBreakBefore : undefined}
              >
                <BlockView block={stripPrintMarkers(block)} mode="preview" />
              </div>
            ))}
            {(richNotes.glossary.length > 0 || richNotes.links.length > 0) && (
              <section className={styles.richNotes}>
                {richNotes.glossary.length > 0 && (
                  <>
                    <p>Glossário</p>
                    <ol>
                      {richNotes.glossary.map((note, index) => (
                        <li key={`${note.term}-${index}`}>
                          <strong>{note.term}</strong> — <ns.RichText html={note.definition} as="div" />
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {richNotes.links.length > 0 && (
                  <>
                    <p>Links</p>
                    <ol>
                      {richNotes.links.map((note, index) => (
                        <li key={`${note.href}-${index}`}>
                          <strong>{note.label}</strong> — <a href={note.href}>{note.href}</a>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </section>
            )}
            {answerKeys.length > 0 && (
              <section className={styles.answerKey}>
                <p>Gabarito</p>
                <ol>
                  {answerKeys.map((key, index) => <li key={`${index}-${key}`}>{key}</li>)}
                </ol>
              </section>
            )}
            {doc.meta.builderCredit !== false && BuilderCredit && <BuilderCredit />}
          </>
        )}
      </main>
    </div>
  );
}
