type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasContent(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
}

function copyAlias(props: JsonRecord, target: string, aliases: string[]) {
  if (hasContent(props[target])) return;
  const alias = aliases.find((key) => hasContent(props[key]));
  if (alias) props[target] = props[alias];
}

export function normalizeEditorWhitespace(value: string): string {
  const clean = value.replace(/(?:&nbsp;|\u00a0)/gi, ' ');
  if (!/[<>]/.test(clean)) return hasMeaningfulText(clean) ? clean : '';

  let html = clean
    .replace(/<div(?:\s[^>]*)?>/gi, '<p>')
    .replace(/<\/div>/gi, '</p>');

  if (!/<(?:p|ul|ol|blockquote|h[1-6])\b/i.test(html) && /(?:<br\s*\/?>\s*){2,}/i.test(html)) {
    html = `<p>${html.replace(/(?:<br\s*\/?>\s*){2,}/gi, '</p><p>')}</p>`;
  }

  if (/<p\b/i.test(html) && !/^\s*<(?:p|ul|ol|blockquote|h[1-6])\b/i.test(html)) {
    html = html.replace(/^([\s\S]*?)(?=<p\b)/i, '<p>$1</p>');
  }

  const normalized = html
    .replace(/<p>\s*<p>/gi, '<p>')
    .replace(/<\/p>\s*<\/p>/gi, '</p>')
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '<p><br></p>');

  return hasMeaningfulText(normalized) ? normalized : '';
}

/**
 * Diz se um campo de texto possui conteúdo visível. Editores rich-text podem
 * persistir um campo aparentemente vazio como `<p><br></p>`, `&nbsp;` ou com
 * caracteres de largura zero; todos esses casos devem se comportar como `''`.
 */
export function hasMeaningfulText(value: unknown): boolean {
  if (typeof value !== 'string') return value !== undefined && value !== null;

  const visible = value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/(?:&nbsp;|&#160;|&#x0*a0;|\u00a0)/gi, ' ')
    .replace(/[\s\u00a0\u200b-\u200d\ufeff]/g, '');

  return visible.length > 0;
}

function normalizeStrings(value: unknown): unknown {
  if (typeof value === 'string') return normalizeEditorWhitespace(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => { value[index] = normalizeStrings(item); });
    return value;
  }
  if (isRecord(value)) {
    Object.keys(value).forEach((key) => { value[key] = normalizeStrings(value[key]); });
  }
  return value;
}

function normalizeListItems(block: JsonRecord, props: JsonRecord) {
  if (block.type === 'accordion' && Array.isArray(props.items)) {
    props.items.forEach((value) => {
      if (!isRecord(value)) return;
      copyAlias(value, 'title', ['question', 'heading', 'label']);
      copyAlias(value, 'content', ['answer', 'body', 'description', 'text', 'html']);
    });
  }

  if (block.type === 'timeline' && Array.isArray(props.eras)) {
    props.eras.forEach((value) => {
      if (!isRecord(value)) return;
      copyAlias(value, 'label', ['title', 'name']);
      if (!Array.isArray(value.milestones)) return;
      value.milestones.forEach((milestone) => {
        if (!isRecord(milestone)) return;
        copyAlias(milestone, 'date', ['year', 'period']);
        copyAlias(milestone, 'title', ['heading', 'label', 'name']);
        copyAlias(milestone, 'content', ['description', 'body', 'text', 'html']);
      });
    });
  }
}

function compatId(prefix: string) {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function migrateCollapsibleSection(block: JsonRecord, props: JsonRecord) {
  if (block.type !== 'collapsiblesection') return;
  const directChildren = Array.isArray(block.children) ? block.children : [];
  const propChildren = Array.isArray(props.children) ? props.children : [];
  const children = directChildren.length ? directChildren : propChildren;
  const hasMarker = children.some((child) => isRecord(child) && child.type === 'collapsebreak');
  if (!hasMarker) {
    const before: JsonRecord[] = [];
    if (hasMeaningfulText(props.title)) before.push({
      id: compatId('c'),
      type: 'titulo',
      props: { text: props.title, level: 'h2' },
    });
    if (hasMeaningfulText(props.lead)) before.push({
      id: compatId('c'),
      type: 'prose',
      props: { html: props.lead },
    });
    block.children = [
      ...before,
      { id: compatId('c'), type: 'collapsebreak', props: {} },
      ...children,
    ];
  }
  props.children = [];
  delete props.title;
  delete props.lead;
}

/**
 * Aceita nomes de campos usados por versões antigas e por JSONs produzidos
 * fora do builder, antes de o sanitize preencher os valores-padrão do DS.
 */
export function normalizeProjectContent(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  normalizeStrings(raw);

  const walk = (blocks: unknown[]) => {
    blocks.forEach((value) => {
      if (!isRecord(value)) return;
      const props = isRecord(value.props) ? value.props : {};
      value.props = props;

      if (value.type === 'kicker') {
        copyAlias(props, 'children', ['text', 'content', 'label', 'title']);
      }

      if (value.type === 'panel') {
        copyAlias(props, 'body', ['children', 'content', 'html', 'text', 'description']);
      }

      if (value.type === 'examplecard') {
        copyAlias(props, 'body', ['children', 'content', 'html', 'text', 'description']);
      }

      if (['callout', 'reflexao', 'pullquote'].includes(String(value.type))) {
        copyAlias(props, 'children', ['content', 'body', 'html', 'text', 'description']);
      }

      migrateCollapsibleSection(value, props);

      normalizeListItems(value, props);
      if (Array.isArray(value.children)) walk(value.children);
      if (Array.isArray(props.children)) walk(props.children);
    });
  };

  if (Array.isArray(raw.blocks)) walk(raw.blocks);
  return raw;
}
