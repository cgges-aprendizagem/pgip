import type { Block } from '../types/ds';

export interface GlossaryNote {
  term: string;
  definition: string;
}

export interface LinkNote {
  label: string;
  href: string;
}

export interface RichNotes {
  glossary: GlossaryNote[];
  links: LinkNote[];
}

export type RichNoteUpdate =
  | { kind: 'glossary'; original: GlossaryNote; next: GlossaryNote }
  | { kind: 'link'; original: LinkNote; next: LinkNote };

function htmlStrings(value: unknown, out: string[]) {
  if (typeof value === 'string' && /<(a|span|mark|p|ul|ol|strong|em|b|i)\b/i.test(value)) {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => htmlStrings(item, out));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => htmlStrings(item, out));
  }
}

function walkBlocks(blocks: Block[], visit: (block: Block) => void) {
  blocks.forEach((block) => {
    visit(block);
    if (block.children) walkBlocks(block.children, visit);
  });
}

export function collectRichNotes(blocks: Block[]): RichNotes {
  const glossaryByKey = new Map<string, GlossaryNote>();
  const linksByHref = new Map<string, LinkNote>();
  const parser = new DOMParser();

  walkBlocks(blocks, (block) => {
    const fragments: string[] = [];
    htmlStrings(block.props, fragments);

    fragments.forEach((html) => {
      const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');

      doc.querySelectorAll('[data-term]').forEach((node) => {
        const el = node as HTMLElement;
        const term = (el.getAttribute('data-term') || el.textContent || '').trim();
        const definition = (el.getAttribute('data-definition') || el.getAttribute('title') || el.getAttribute('data-def') || '').trim();
        if (!term || !definition) return;
        glossaryByKey.set(`${term}::${definition}`, { term, definition });
      });

      doc.querySelectorAll('a[href]').forEach((node) => {
        const el = node as HTMLAnchorElement;
        const href = (el.getAttribute('href') || '').trim();
        if (!href || href.startsWith('#')) return;
        const label = (el.textContent || href).trim();
        linksByHref.set(`${href}::${label}`, { label, href });
      });
    });
  });

  return {
    glossary: [...glossaryByKey.values()],
    links: [...linksByHref.values()],
  };
}

function sanitizeDefinition(value: string): string {
  const box = document.createElement('div');
  box.innerHTML = value;
  const allowed = new Set(['STRONG', 'B', 'EM', 'I', 'BR', 'P', 'SPAN']);
  Array.from(box.querySelectorAll('*')).forEach((el) => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') {
      el.remove();
      return;
    }
    if (!allowed.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }
    Array.from(el.attributes).forEach((attribute) => el.removeAttribute(attribute.name));
  });
  return box.innerHTML.trim();
}

function updateHtml(html: string, update: RichNoteUpdate): string {
  if (!/<(a|span)\b/i.test(html)) return html;
  const template = document.createElement('template');
  template.innerHTML = html;
  let changed = false;

  if (update.kind === 'glossary') {
    template.content.querySelectorAll<HTMLElement>('[data-term]').forEach((el) => {
      const term = (el.getAttribute('data-term') || el.textContent || '').trim();
      const definition = (el.getAttribute('data-definition') || el.getAttribute('title') || el.getAttribute('data-def') || '').trim();
      if (term !== update.original.term || definition !== update.original.definition) return;
      el.setAttribute('data-term', update.next.term.trim());
      el.setAttribute('data-definition', sanitizeDefinition(update.next.definition));
      el.removeAttribute('title');
      el.removeAttribute('data-def');
      changed = true;
    });
  } else {
    template.content.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((el) => {
      const href = (el.getAttribute('href') || '').trim();
      const label = (el.textContent || href).trim();
      if (href !== update.original.href || label !== update.original.label) return;
      el.href = update.next.href.trim();
      el.textContent = update.next.label.trim() || update.next.href.trim();
      changed = true;
    });
  }

  return changed ? template.innerHTML : html;
}

function updateValue(value: unknown, update: RichNoteUpdate): unknown {
  if (typeof value === 'string') return updateHtml(value, update);
  if (Array.isArray(value)) return value.map((item) => updateValue(item, update));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, updateValue(item, update)]));
  }
  return value;
}

export function updateRichNote(blocks: Block[], update: RichNoteUpdate): Block[] {
  return blocks.map((block) => ({
    ...block,
    props: updateValue(block.props, update) as Record<string, unknown>,
    children: block.children ? updateRichNote(block.children, update) : undefined,
  }));
}
