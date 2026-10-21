import type { Doc } from '../types/ds';

/** A snapshot is committed locally only after the export/publication succeeds. */
export function versionedDocument(doc: Doc, format: string): Doc {
  const author = doc.meta.versioning?.author.trim() || '';
  if (!author) throw new Error('Informe o responsável pela atualização.');
  const notes = doc.meta.versioning?.notes.trim() || '';
  const entry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), author, notes, format };
  return { ...doc, meta: { ...doc.meta, versioning: {
    author, notes: '', history: [...(doc.meta.versioning?.history || []), entry],
  } } };
}
