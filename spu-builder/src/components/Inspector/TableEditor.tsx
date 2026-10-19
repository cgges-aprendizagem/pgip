import { useMemo, useState } from 'react';
import type { Block, NS } from '../../types/ds';
import styles from './TableEditor.module.css';

interface Props {
  ns: NS;
  block: Block;
  onPatch: (patch: Record<string, unknown>) => void;
}

interface Column { key: string; label: string; align?: string }
type Row = Record<string, string>;

export function TableEditor({ ns, block, onPatch }: Props) {
  const props = block.props || {};
  const columns = (props.columns as Column[]) || [];
  const rows = (props.rows as Row[]) || [];
  const [draft, setDraft] = useState(() => tableToText((props.columns as Column[]) || [], (props.rows as Row[]) || []));

  const applyFormat = (patch: Record<string, unknown>) => {
    const next = { ...props, ...patch };
    onPatch({ ...patch, className: tableClass(!!next.striped, String(next.tone || 'default')) });
  };

  const parsedPreview = useMemo(() => parseTable(draft), [draft]);

  const applyTable = () => {
    const parsed = parseTable(draft);
    if (!parsed.columns.length) return;
    onPatch({
      columns: parsed.columns,
      rows: parsed.rows,
      className: tableClass(!!props.striped, String(props.tone || 'default')),
    });
  };

  const updateHeader = (index: number, label: string) => {
    const nextColumns = columns.map((column, columnIndex) => columnIndex === index ? { ...column, label } : column);
    onPatch({ columns: nextColumns });
    setDraft(tableToText(nextColumns, rows));
  };

  const updateCell = (rowIndex: number, key: string, value: string) => {
    const nextRows = rows.map((row, index) => index === rowIndex ? { ...row, [key]: value } : row);
    onPatch({ rows: nextRows });
    setDraft(tableToText(columns, nextRows));
  };

  return (
    <div className={styles.root}>
      <textarea
        className={styles.textarea}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={'Cole aqui uma tabela do Excel/Sheets, CSV ou Markdown.\nEx.: Nome\\tValor\\nItem A\\t10'}
      />
      <div className={styles.toolbar}>
        <button className={styles.btn} onClick={applyTable}>Aplicar tabela</button>
        <button className={styles.btn} onClick={() => setDraft(tableToText((props.columns as Column[]) || [], (props.rows as Row[]) || []))}>
          Recarregar dados
        </button>
      </div>
      {columns.length > 0 && (
        <div className={styles.richSection}>
          <div className={styles.richLabel}>Formatar textos da tabela</div>
          <div className={styles.richHint}>Selecione um trecho em qualquer célula para aplicar negrito, destaque, cor, link ou termo.</div>
          <div className={styles.richScroll}>
            <table className={styles.richTable}>
              <thead>
                <tr>
                  {columns.map((column, index) => (
                    <th key={column.key}>
                      <ns.Editable
                        html={column.label || ''}
                        single
                        as="span"
                        placeholder={`Coluna ${index + 1}`}
                        onChange={(html) => updateHeader(index, html)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((column) => (
                      <td key={column.key}>
                        <ns.Editable
                          html={row[column.key] || ''}
                          single
                          as="span"
                          placeholder="Célula vazia"
                          onChange={(html) => updateCell(rowIndex, column.key, html)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className={styles.grid}>
        <label className={styles.check}>
          <input type="checkbox" checked={!!props.dense} onChange={(e) => applyFormat({ dense: e.target.checked })} />
          Condensada
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={!!props.highlightFirst} onChange={(e) => applyFormat({ highlightFirst: e.target.checked })} />
          1ª coluna em destaque
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={!!props.striped} onChange={(e) => applyFormat({ striped: e.target.checked })} />
          Linhas alternadas
        </label>
        <label className={styles.label}>
          Cor
          <select className={styles.select} value={String(props.tone || 'default')} onChange={(e) => applyFormat({ tone: e.target.value })}>
            <option value="default">Padrão</option>
            <option value="petrol">Petróleo</option>
            <option value="terra">Terracota</option>
            <option value="ochre">Ocre</option>
          </select>
        </label>
      </div>
      <div className={styles.hint}>
        Detectado: {parsedPreview.columns.length} colunas e {parsedPreview.rows.length} linhas. A primeira linha vira cabeçalho.
      </div>
    </div>
  );
}

function parseTable(text: string): { columns: Column[]; rows: Row[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { columns: [], rows: [] };

  const markdown = lines.filter((l) => /^\|.*\|$/.test(l));
  const source = markdown.length >= 2 ? markdown.filter((l) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(l)) : lines;
  const matrix = source.map((line) => splitLine(line)).filter((row) => row.some((cell) => cell.trim()));
  if (!matrix.length) return { columns: [], rows: [] };

  const width = Math.max(...matrix.map((row) => row.length));
  const header = normalizeRow(matrix[0], width);
  const columns = header.map((label, i) => ({ key: `c${i}`, label: label || `Coluna ${i + 1}`, align: inferAlign(label) }));
  const rows = matrix.slice(1).map((row) => {
    const cells = normalizeRow(row, width);
    const out: Row = {};
    columns.forEach((column, i) => { out[column.key] = cells[i] || ''; });
    return out;
  });

  return { columns, rows };
}

function splitLine(line: string): string[] {
  if (/^\|.*\|$/.test(line)) return line.replace(/^\||\|$/g, '').split('|').map(cleanCell);
  if (line.includes('\t')) return line.split('\t').map(cleanCell);
  return splitCsv(line).map(cleanCell);
}

function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && quoted && next === '"') {
      current += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function cleanCell(value: string): string {
  return value.trim().replace(/^"|"$/g, '').trim();
}

function normalizeRow(row: string[], width: number): string[] {
  return Array.from({ length: width }, (_, i) => row[i] || '');
}

function inferAlign(label: string): string | undefined {
  return /(%|valor|total|quant|n[ºo]|r\$)/i.test(label) ? 'right' : undefined;
}

function tableToText(columns: Column[], rows: Row[]): string {
  if (!columns.length) return '';
  return [
    columns.map((c) => c.label).join('\t'),
    ...rows.map((row) => columns.map((c) => row[c.key] || '').join('\t')),
  ].join('\n');
}

function tableClass(striped: boolean, tone: string): string {
  return [
    striped && 'spu-table-wrap--striped',
    tone !== 'default' && `spu-table-wrap--tone-${tone}`,
  ].filter(Boolean).join(' ');
}
