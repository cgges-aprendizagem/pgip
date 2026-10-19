import { useEffect, useState } from 'react';
import type { Doc } from '../../types/ds';
import { validateDoc } from '../../utils/validateDoc';
import styles from './QualityPanel.module.css';

interface Props {
  doc: Doc;
}

export function QualityPanel({ doc }: Props) {
  const [, setPulse] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPulse((n) => n + 1), 1200);
    return () => window.clearInterval(id);
  }, []);

  const issues = validateDoc(doc);

  return (
    <aside className={styles.root}>
      <div className={styles.heading}>
        Revisao
        <span className={styles.count}>{issues.length}</span>
      </div>
      {issues.length === 0 ? (
        <div className={styles.ok}>Sem pendencias principais para exportacao.</div>
      ) : (
        <ul className={styles.list}>
          {issues.map((issue) => (
            <li key={issue.id} className={`${styles.item} ${issue.level === 'warn' ? styles.warn : ''}`}>
              <span className={styles.dot} />
              <span>{issue.text}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
