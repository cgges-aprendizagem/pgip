import React from 'react';
import type { FieldDef, NS } from '../types/ds';
import { installCollapsibleSection } from './collapsibleSection';
import { hasMeaningfulText, normalizeEditorWhitespace } from './projectCompat';

type Component = React.ComponentType<Record<string, unknown>>;
const COMPAT_WRAPPED_TYPES = [
  'pagefooter',
  'markerlist',
  'reflexao',
  'mapfigure',
  'statblock',
  'feature',
  'accordion',
  'timeline',
  'quiz',
  'flashcard',
  'compareab',
  'carousel',
  'contentslider',
] as const;

const RICH_ITEM_FIELDS: Record<string, string[]> = {
  pagefooter: ['role', 'name'],
  markerlist: ['title', 'text'],
  reflexao: [''],
  mapfigure: ['title', 'description'],
  statblock: ['value', 'unit', 'label', 'description'],
  feature: ['title', 'text'],
  accordion: ['title', 'content', 'linkLabel'],
  timeline: ['label', 'period', 'date', 'title', 'content', 'linkLabel'],
  quiz: ['question', 'text', 'feedback'],
  carousel: ['title', 'caption', 'credit'],
  contentslider: ['label', 'tabLabel', 'title', 'subtitle', 'description', 'linkLabel', 'caption'],
};

const RICH_PROP_FIELDS: Record<string, string[]> = {
  flashcard: ['term', 'description', 'definition', 'frontCue', 'backCue'],
  compareab: ['label', 'title', 'content'],
};

const RICH_DIRECT_FIELDS: Record<string, string[]> = {
  pagefooter: ['code', 'context'],
  mapfigure: ['caption', 'credit', 'label', 'title'],
};

function renderRichInline(ns: NS, value: unknown) {
  if (typeof value !== 'string') return value;
  const normalized = normalizeEditorWhitespace(value);
  if (!hasMeaningfulText(normalized)) return null;
  if (!/[<&]/.test(normalized)) return normalized;
  const RichText = ns.RichText as React.ComponentType<Record<string, unknown>>;
  return React.createElement(RichText, { html: normalized, as: 'span', className: 'spu-richtext--inline' });
}

function renderRichBlock(ns: NS, value: unknown) {
  if (typeof value !== 'string') return value;
  const normalized = normalizeEditorWhitespace(value);
  if (!hasMeaningfulText(normalized)) return null;
  if (!/[<&]/.test(normalized)) return normalized;
  return React.createElement(ns.RichText, { html: normalized });
}

export function installDSCompat(ns: NS) {
  const target = ns as NS & { __spuBuilderCompat?: boolean };
  if (!target || target.__spuBuilderCompat) return;

  installCollapsibleSection(ns);

  const registry = ns.BlockRegistry?.byType;
  if (registry?.hero) registry.hero.rich = true;
  if (registry?.masthead) registry.masthead.rich = true;
  if (registry?.conclusion) registry.conclusion.rich = true;
  if (registry?.pagefooter) {
    registry.pagefooter.rich = true;
  }
  if (registry?.mapfigure) {
    registry.mapfigure.rich = true;
    registry.mapfigure.fields = Array.from(new Set([...(registry.mapfigure.fields || []), 'caption', 'credit', 'label']));
  }

  Object.values(registry || {}).forEach((def) => {
    const richItemKeys = RICH_ITEM_FIELDS[def.type] || [];
    if (richItemKeys.length && def.itemFields) {
      def.itemFields = markFieldsRich(def.itemFields, richItemKeys);
    }

    const richPropKeys = RICH_PROP_FIELDS[def.type] || [];
    if (richPropKeys.length && def.propFields) {
      def.propFields = markFieldsRich(def.propFields, richPropKeys);
    }
  });

  const Masthead = ns.Masthead as Component | undefined;
  if (Masthead) {
    ns.Masthead = ((props: Record<string, unknown>) => React.createElement(Masthead, {
      ...props,
      org: renderRichInline(ns, props.org),
      program: renderRichInline(ns, props.program),
    })) as Component;
  }

  const Conclusion = ns.Conclusion as Component | undefined;
  if (Conclusion) {
    ns.Conclusion = ((props: Record<string, unknown>) => React.createElement(Conclusion, {
      ...props,
      body: renderRichBlock(ns, props.body),
    })) as Component;
  }

  COMPAT_WRAPPED_TYPES.forEach((type) => wrapRichComponent(ns, type));

  const Accordion = ns.Accordion as Component | undefined;
  if (Accordion) {
    ns.Accordion = ((props: Record<string, unknown>) => {
      const items = Array.isArray(props.items) ? props.items.map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
        const value = item as Record<string, unknown>;
        const blocks = Array.isArray(value.blocks) ? value.blocks : [];
        if (!blocks.length) return value;
        return {
          ...value,
          content: React.createElement(React.Fragment, null,
            renderRichBlock(ns, value.content) as React.ReactNode,
            React.createElement('div', { className: 'spu-accordion-blocks' },
              blocks.map((block, index) => React.createElement(ns.BlockView, {
                key: (block as { id?: string }).id || index,
                block: block as never,
                mode: 'preview',
              })),
            ),
          ),
        };
      }) : props.items;
      return React.createElement(Accordion, { ...props, items });
    }) as Component;
  }

  const Timeline = ns.Timeline as Component | undefined;
  if (Timeline) {
    ns.Timeline = ((props: Record<string, unknown>) => {
      const eras = Array.isArray(props.eras) ? props.eras.map((era) => {
        if (!era || typeof era !== 'object' || Array.isArray(era)) return era;
        const eraValue = era as Record<string, unknown>;
        if (!Array.isArray(eraValue.milestones)) return eraValue;
        return {
          ...eraValue,
          milestones: eraValue.milestones.map((milestone) => {
            if (!milestone || typeof milestone !== 'object' || Array.isArray(milestone)) return milestone;
            const value = milestone as Record<string, unknown>;
            const blocks = Array.isArray(value.blocks) ? value.blocks : [];
            if (!blocks.length) return value;
            return {
              ...value,
              content: React.createElement(React.Fragment, null,
                renderRichBlock(ns, value.content) as React.ReactNode,
                React.createElement('div', { className: 'spu-embedded-blocks' },
                  blocks.map((nested, index) => React.createElement(ns.BlockView, {
                    key: (nested as { id?: string }).id || index,
                    block: nested as never,
                    mode: 'preview',
                  })),
                ),
              ),
            };
          }),
        };
      }) : props.eras;
      return React.createElement(Timeline, { ...props, eras });
    }) as Component;
  }

  target.__spuBuilderCompat = true;
}

function markFieldsRich(fields: FieldDef[], richKeys: string[]): FieldDef[] {
  return fields.map((field) => {
    const next = richKeys.includes(field.key)
      ? { ...field, type: 'rich' as const, inline: field.inline ?? !['content', 'definition', 'feedback'].includes(field.key) }
      : { ...field };

    if (next.itemFields) next.itemFields = markFieldsRich(next.itemFields, richKeys);
    if (next.fields) next.fields = markFieldsRich(next.fields, richKeys);
    return next;
  });
}

function wrapRichComponent(ns: NS, type: string) {
  const def = ns.BlockRegistry?.byType?.[type];
  if (!def?.component) return;
  const Original = ns[def.component] as Component | undefined;
  if (!Original) return;

  ns[def.component] = ((props: Record<string, unknown>) => {
    const next = richifyProps(ns, type, props);
    return React.createElement(Original, next);
  }) as Component;
}

function richifyProps(ns: NS, type: string, props: Record<string, unknown>) {
  const def = ns.BlockRegistry?.byType?.[type];
  const next: Record<string, unknown> = { ...props };

  const directKeys = new Set([...(def?.fields || []), ...(RICH_DIRECT_FIELDS[type] || [])]);
  directKeys.forEach((key) => {
    if (next[key] !== undefined) {
      next[key] = renderRichInline(ns, next[key]);
    }
  });

  if (def?.itemsKey && def.itemFields && Array.isArray(next[def.itemsKey])) {
    next[def.itemsKey] = (next[def.itemsKey] as unknown[]).map((item) => richifyItem(ns, item, def.itemFields || []));
  }

  (def?.propFields || []).forEach((field) => {
    if (!field.key || next[field.key] === undefined) return;
    next[field.key] = richifyValue(ns, next[field.key], field);
  });

  return next;
}

function richifyValue(ns: NS, value: unknown, field: FieldDef): unknown {
  if ((field.type === 'rich' || field.type === 'text') && typeof value === 'string') {
    return field.inline ?? !['content', 'definition', 'feedback'].includes(field.key)
      ? renderRichInline(ns, value)
      : renderRichBlock(ns, value);
  }

  if (field.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    return richifyObject(ns, value as Record<string, unknown>, field.fields || []);
  }

  if (field.type === 'list' && Array.isArray(value)) {
    return value.map((item) => richifyItem(ns, item, field.itemFields || []));
  }

  return value;
}

function richifyItem(ns: NS, item: unknown, fields: FieldDef[]): unknown {
  if (fields.length === 1 && fields[0].key === '') return richifyValue(ns, item, fields[0]);
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  return richifyObject(ns, item as Record<string, unknown>, fields);
}

function richifyObject(ns: NS, value: Record<string, unknown>, fields: FieldDef[]) {
  const next: Record<string, unknown> = { ...value };
  fields.forEach((field) => {
    if (!field.key) return;
    next[field.key] = richifyValue(ns, value[field.key], field);
  });
  return next;
}
