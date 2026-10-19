import React from 'react';
import type { BlockDef, NS } from '../types/ds';

type CompatNS = NS & {
  CollapsibleSection?: React.ComponentType<Record<string, unknown>>;
  CollapseBreak?: React.ComponentType<Record<string, unknown>>;
  injectCss?: (id: string, css: string) => void;
  isPrint?: () => boolean;
  renderRich?: (value: unknown, options?: { inline?: boolean }) => React.ReactNode;
};

const COLLAPSIBLE_SECTION_CSS = `
.spu-csection__always,.spu-csection__body{display:flex;flex-direction:column;gap:var(--flow-block)}
.spu-csection__summary{display:inline-flex;align-items:center;gap:var(--space-2);width:max-content;margin-top:var(--flow-block);padding:.68em .95em;border:1px solid var(--color-primary);border-radius:var(--radius);color:var(--color-primary-strong);background:transparent;font-family:var(--font-display);font-weight:700;cursor:pointer;transition:background var(--dur-fast),color var(--dur-fast)}
.spu-csection__summary:hover{background:var(--color-primary-soft)}
.spu-csection__summary svg{transition:transform var(--dur) var(--ease-out)}
.spu-csection__summary[aria-expanded="true"] svg{transform:rotate(180deg)}
.spu-csection__body{margin-top:var(--space-6)}
.spu-csection__body[hidden]{display:none}
.spu-csection__marker-editor{padding:.55em .85em;border:1px dashed var(--color-primary);border-radius:var(--radius);color:var(--color-primary-strong);background:var(--color-primary-soft);font-family:var(--font-mono);font-size:var(--fs-eyebrow);letter-spacing:.04em;text-transform:uppercase}
.spu-section--dark .spu-csection__summary{border-color:var(--text-on-dark);color:var(--text-on-dark)}
.spu-section--dark .spu-csection__summary:hover{background:rgba(255,255,255,.1)}
@media print{.spu-csection__body{display:flex!important}.spu-csection__summary{display:none!important}}
`;

export function installCollapsibleSection(ns: NS) {
  const target = ns as CompatNS;
  const registry = target.BlockRegistry;
  if (!registry || registry.byType.collapsiblesection) return;

  target.injectCss?.('spu-collapsible-section-css', COLLAPSIBLE_SECTION_CSS);

  function rich(value: unknown, inline = false) {
    return target.renderRich ? target.renderRich(value, { inline }) : value as React.ReactNode;
  }

  function blockType(node: React.ReactNode): string | undefined {
    if (!React.isValidElement(node)) return undefined;
    const props = node.props as { block?: { type?: string }; children?: React.ReactNode };
    if (props.block?.type) return props.block.type;
    const nested = React.Children.toArray(props.children);
    return nested.map(blockType).find(Boolean);
  }

  function CollapsibleSection(props: Record<string, unknown>) {
    const {
      triggerLabel = 'Clique para expandir',
      defaultOpen = false,
      width = 'content',
      surface = 'none',
      pad = 'lg',
      children,
      className,
      __builderEditing = false,
      ...rest
    } = props;
    const printing = target.isPrint?.() === true;
    const forcedOpen = printing;
    const [open, setOpen] = React.useState(Boolean(defaultOpen));
    const Section = target.Section as React.ComponentType<Record<string, unknown>>;
    const items = React.Children.toArray(children as React.ReactNode);
    const markerIndex = items.findIndex((item) => blockType(item) === 'collapsebreak');
    const marker = markerIndex >= 0 ? items[markerIndex] : null;
    const alwaysVisible = markerIndex >= 0 ? items.slice(0, markerIndex) : [];
    const collapsed = markerIndex >= 0 ? items.slice(markerIndex + 1) : items;

    return React.createElement(Section, {
      ...rest,
      width,
      surface,
      pad,
      className: ['spu-csection', className].filter(Boolean).join(' '),
    }, React.createElement(React.Fragment, null,
      alwaysVisible.length > 0 && React.createElement('div', { className: 'spu-csection__always spu-blockstack' }, alwaysVisible),
      __builderEditing === true && marker,
      !printing && React.createElement('button', {
        type: 'button',
        className: 'spu-csection__summary',
        'aria-expanded': forcedOpen || open,
        onClick: () => { if (!forcedOpen) setOpen((value) => !value); },
      },
        rich(triggerLabel, true),
        React.createElement(target.Icon, { name: 'chevron-down', size: 18 }),
      ),
      React.createElement('div', {
        className: 'spu-csection__body spu-blockstack',
        hidden: !(forcedOpen || open),
      }, collapsed)),
    );
  }

  function CollapseBreak() {
    return React.createElement('div', { className: 'spu-csection__marker-editor' }, 'Conteúdo recolhido abaixo deste ponto');
  }

  target.CollapsibleSection = CollapsibleSection;
  target.CollapseBreak = CollapseBreak;

  const markerDefinition: BlockDef = {
    type: 'collapsebreak',
    component: 'CollapseBreak',
    label: 'Botão de recolher',
    icon: 'chevron-down',
    cat: 'Estrutura',
    kind: 'marker',
    internal: true,
    props: {},
  };

  const definition: BlockDef = {
    type: 'collapsiblesection',
    component: 'CollapsibleSection',
    label: 'Seção expansível',
    icon: 'chevron-down',
    cat: 'Estrutura',
    kind: 'container',
    fields: ['triggerLabel'],
    stack: false,
    allowedTypes: [...registry.childTypes, markerDefinition.type],
    props: {
      triggerLabel: 'Clique para expandir',
      defaultOpen: false,
      width: 'content',
      surface: 'none',
      pad: 'lg',
      children: [],
    },
    propFields: [{
      key: 'defaultOpen',
      label: 'Iniciar aberta',
      type: 'bool',
    }],
  };

  const sectionIndex = registry.blocks.findIndex((block) => block.type === 'section');
  registry.blocks.splice(sectionIndex >= 0 ? sectionIndex + 1 : registry.blocks.length, 0, definition);
  registry.blocks.push(markerDefinition);
  registry.byType[definition.type] = definition;
  registry.byType[markerDefinition.type] = markerDefinition;
  if (!registry.structuralTypes.includes(definition.type)) {
    const structuralIndex = registry.structuralTypes.indexOf('section');
    registry.structuralTypes.splice(structuralIndex >= 0 ? structuralIndex + 1 : registry.structuralTypes.length, 0, definition.type);
  }

  const originalNewBlock = registry.newBlock.bind(registry);
  registry.newBlock = (type, child) => {
    if (type === markerDefinition.type) return {
      id: (child ? 'c' : 'b') + Math.random().toString(36).slice(2, 9),
      type: markerDefinition.type,
      props: {},
    };
    if (type !== definition.type) return originalNewBlock(type, child);
    return {
      id: (child ? 'c' : 'b') + Math.random().toString(36).slice(2, 9),
      type: definition.type,
      props: {
        ...JSON.parse(JSON.stringify(definition.props)),
        children: [registry.newBlock(markerDefinition.type, true)],
      },
    };
  };
}
