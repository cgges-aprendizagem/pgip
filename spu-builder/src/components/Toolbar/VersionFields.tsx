import type { DocMeta } from '../../types/ds';
import styles from './Toolbar.module.css';

export function VersionFields({ meta, onChange, disabled = false }: {
  meta: DocMeta; onChange: (patch: Record<string, unknown>) => void; disabled?: boolean;
}) {
  const value = meta.versioning || { author: '', notes: '', history: [] };
  return <fieldset className={styles.versionFields} disabled={disabled}>
    <legend>Registro da atualização</legend>
    <label>Responsável (obrigatório)
      <input required value={value.author} onChange={e => onChange({ versioning: { ...value, author: e.target.value } })} autoComplete="name" />
    </label>
    <label>Observações (opcional)
      <textarea value={value.notes} onChange={e => onChange({ versioning: { ...value, notes: e.target.value } })} rows={3} />
    </label>
    <small>Metadados de versionamento. Não aparecem no conteúdo publicado.</small>
  </fieldset>;
}
