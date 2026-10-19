import { useEffect, useRef } from 'react';
import type { NS, Doc } from '../../types/ds';
import { enhanceGlossaryTerms } from '../../utils/enhanceGlossary';
import styles from './PreviewModal.module.css';

interface Props {
  ns: NS;
  doc: Doc;
  onClose: () => void;
}

// Visualização da página: renderiza o documento em mode="preview" (sem chrome
// de edição), exatamente como sai no HTML exportado. Fecha com Esc ou no X.
export function PreviewModal({ ns, doc, onClose }: Props) {
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const id = window.setTimeout(() => {
      if (pageRef.current) cleanup = enhanceGlossaryTerms(pageRef.current);
    }, 80);
    return () => {
      window.clearTimeout(id);
      cleanup?.();
    };
  }, [doc]);

  const BlockDocument = ns.BlockDocument;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.bar}>
        <span className={styles.title}>Visualização — {doc.meta.title}</span>
        <button className={styles.close} onClick={onClose}>Fechar ✕</button>
      </div>
      <div className={styles.scroll} onClick={(e) => e.stopPropagation()}>
        <div ref={pageRef} className={styles.page}>
          <BlockDocument doc={doc} mode="preview" />
        </div>
      </div>
    </div>
  );
}
