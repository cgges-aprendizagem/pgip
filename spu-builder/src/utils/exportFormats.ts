// Exportação em 3 formatos:
//  1) HTML autocontido (1 arquivo, tudo inline)
//  2) Pacote HTML + assets (.zip com pasta assets/ e images/)
//  3) SCORM 1.2 não-avaliativo (.zip com imsmanifest.xml)
//
// Imagens: ficam no sidecar (data URL). A exportação pode preservar o arquivo
// original ou criar uma cópia WebP compacta. Para o pacote/SCORM, os bytes são
// extraídos para assets/images/ e o sidecar passa a usar caminhos relativos
// (image-slot relaxado p/ aceitá-los). O sidecar é sempre entregue por um
// override de fetch embutido, então funciona em file://.

import { zipSync, strToU8 } from 'fflate';
import type { Doc } from '../types/ds';
import { getDocumentLucideAssets } from './lucideCatalog';
import { readImageSlots } from './imageSlotStore';

const DS_BASE = `${import.meta.env.BASE_URL}ds/`;
const VENDOR_BASE = `${import.meta.env.BASE_URL}vendor/`;
const SLOT_FILE = '.image-slots.state.json';
const BUILDER_EXPORT_CSS = `
.spu-figure__frame > image-slot {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
}
.spu-figure--small,
.spu-figure--pequena { width: min(100%, 340px); margin-inline: auto; }
.spu-figure--medium,
.spu-figure--medio,
.spu-figure--media { width: min(100%, 560px); margin-inline: auto; }
.spu-figure--large,
.spu-figure--wide,
.spu-figure--ampla { width: min(100%, 820px); margin-inline: auto; }
.spu-figure--total { width: 100%; }
.spu-block-title:is(h2) { line-height: 1.06; }
.spu-block-title .spu-richtext { line-height: inherit; }
.spu-content-slider__title .spu-richtext { line-height: inherit; }
.spu-conclusion .spu-richtext :is(strong, b) { color: inherit; }
.spu-accordion-blocks,
.spu-embedded-blocks { display:flex; flex-direction:column; gap:var(--flow-block); margin-top:var(--space-5); }
.spu-richtext [data-term] {
  position: relative;
  display: inline-block;
}
.spu-term-pop {
  position: fixed;
  z-index: 10050;
  width: max-content;
  max-width: min(320px, calc(100vw - 24px));
  display: none;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--text-body);
  box-shadow: var(--shadow-lg);
  text-align: left;
  font-size: var(--fs-small);
  line-height: 1.5;
}
.spu-term-pop::after {
  content: "";
  position: absolute;
  top: 100%;
  left: var(--spu-term-arrow, 18px);
  width: 11px;
  height: 11px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  transform: translate(-50%, -50%) rotate(45deg);
}
.spu-term-pop[data-placement="bottom"]::after {
  top: auto;
  bottom: 100%;
  transform: translate(-50%, 50%) rotate(225deg);
}
.spu-term-pop strong {
  display: block;
  margin-bottom: .25em;
  color: var(--text-strong);
  font-family: var(--font-display);
}
.spu-term-pop__def p { margin: 0 0 .55em; }
.spu-term-pop__def p:last-child { margin-bottom: 0; }
.spu-term-pop.is-open { display: block; }
`;
const GLOSSARY_ENHANCER_JS = `
(function(){
  var popById = {};
  var positionById = {};
  var nextId = 1;
  function safeDefinition(value){
    var box = document.createElement('div');
    box.innerHTML = String(value || '');
    var allowed = ['STRONG','B','EM','I','BR','P','SPAN'];
    Array.from(box.querySelectorAll('*')).forEach(function(el){
      if(el.tagName === 'SCRIPT' || el.tagName === 'STYLE'){ el.remove(); return; }
      if(allowed.indexOf(el.tagName) < 0){ el.replaceWith.apply(el, Array.from(el.childNodes)); return; }
      Array.from(el.attributes).forEach(function(attr){ el.removeAttribute(attr.name); });
    });
    return box.innerHTML;
  }
  function closeAll(except){
    document.querySelectorAll('.spu-term-open').forEach(function(el){
      if(el !== except){
        el.classList.remove('spu-term-open');
        el.setAttribute('aria-expanded','false');
        var pop = popById[el.dataset.spuTermPortalId];
        if(pop) pop.classList.remove('is-open');
      }
    });
  }
  function enhance(){
    document.querySelectorAll('.spu-richtext [data-term]').forEach(function(el){
      if(el.dataset.spuTermReady) return;
      var term = (el.getAttribute('data-term') || el.textContent || '').trim();
      var def = (el.getAttribute('data-definition') || el.getAttribute('title') || el.getAttribute('data-def') || '').trim();
      if(!term || !def) return;
      el.dataset.spuTermReady = '1';
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
      el.setAttribute('aria-expanded','false');
      el.setAttribute('data-definition',def);
      el.removeAttribute('title');
      var id = 'spu-term-' + nextId++;
      el.dataset.spuTermPortalId = id;
      var pop = document.createElement('span');
      pop.className = 'spu-term-pop';
      pop.setAttribute('role','tooltip');
      pop.innerHTML = '<strong></strong><span class="spu-term-pop__def"></span>';
      pop.querySelector('strong').textContent = term;
      pop.querySelector('.spu-term-pop__def').innerHTML = safeDefinition(def);
      document.body.appendChild(pop);
      popById[id] = pop;
      var position = function(){
        var rect = el.getBoundingClientRect();
        var width = Math.min(320, window.innerWidth - 24);
        var left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
        var below = rect.top < 150 && window.innerHeight - rect.bottom > rect.top;
        var arrow = Math.min(Math.max(18, rect.left + rect.width / 2 - left), width - 18);
        pop.style.left = left + 'px';
        pop.style.width = width + 'px';
        pop.style.top = below ? rect.bottom + 10 + 'px' : 'auto';
        pop.style.bottom = below ? 'auto' : window.innerHeight - rect.top + 10 + 'px';
        pop.style.setProperty('--spu-term-arrow',arrow + 'px');
        pop.dataset.placement = below ? 'bottom' : 'top';
      };
      positionById[id] = position;
      var toggle = function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var open = el.classList.toggle('spu-term-open');
        el.setAttribute('aria-expanded', open ? 'true' : 'false');
        pop.classList.toggle('is-open',open);
        if(open){ closeAll(el); position(); }
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', function(ev){
        if(ev.key === 'Enter' || ev.key === ' '){ toggle(ev); }
        if(ev.key === 'Escape'){ closeAll(); }
      });
    });
  }
  document.addEventListener('click', function(){ closeAll(); });
  function repositionOpen(){
    document.querySelectorAll('.spu-term-open').forEach(function(el){
      var position = positionById[el.dataset.spuTermPortalId];
      if(position) position();
    });
  }
  window.addEventListener('resize',repositionOpen);
  window.addEventListener('scroll',repositionOpen,true);
  enhance();
  window.__SPU_ENHANCE_GLOSSARY = enhance;
})();`;
const DS_COMPAT_JS = `
(function(){
  window.__SPU_INSTALL_DS_COMPAT = function(NS){
    if(!NS || NS.__spuBuilderCompat) return;
    var COMPAT_TYPES = ['pagefooter','markerlist','reflexao','mapfigure','statblock','feature','accordion','timeline','quiz','flashcard','compareab','carousel','contentslider'];
    var RICH_ITEM_FIELDS = {
      pagefooter:['role','name'],
      markerlist:['title','text'],
      reflexao:[''],
      mapfigure:['title','description'],
      statblock:['value','unit','label','description'],
      feature:['title','text'],
      accordion:['title','content','linkLabel'],
      timeline:['label','period','date','title','content','linkLabel'],
      quiz:['question','text','feedback'],
      carousel:['title','caption','credit'],
      contentslider:['label','tabLabel','title','subtitle','description','linkLabel','caption']
    };
    var RICH_PROP_FIELDS = {
      flashcard:['term','description','definition'],
      compareab:['label','title','content']
    };
    var RICH_DIRECT_FIELDS = {
      pagefooter:['code','context'],
      mapfigure:['caption','credit','label','title']
    };
    function markFieldsRich(fields, richKeys){
      return (fields || []).map(function(field){
        var next = richKeys.indexOf(field.key) >= 0
          ? Object.assign({}, field, { type: 'rich', inline: field.inline != null ? field.inline : ['content','definition','feedback'].indexOf(field.key) < 0 })
          : Object.assign({}, field);
        if(next.itemFields) next.itemFields = markFieldsRich(next.itemFields, richKeys);
        if(next.fields) next.fields = markFieldsRich(next.fields, richKeys);
        return next;
      });
    }
    if(NS.BlockRegistry && NS.BlockRegistry.byType){
      if(NS.BlockRegistry.byType.masthead) NS.BlockRegistry.byType.masthead.rich = true;
      if(NS.BlockRegistry.byType.conclusion) NS.BlockRegistry.byType.conclusion.rich = true;
      if(NS.BlockRegistry.byType.pagefooter){
        NS.BlockRegistry.byType.pagefooter.rich = true;
      }
      if(NS.BlockRegistry.byType.mapfigure){
        NS.BlockRegistry.byType.mapfigure.rich = true;
        NS.BlockRegistry.byType.mapfigure.fields = Array.from(new Set([].concat(NS.BlockRegistry.byType.mapfigure.fields || [], ['caption','credit','label'])));
      }
      Object.keys(NS.BlockRegistry.byType).forEach(function(type){
        var def = NS.BlockRegistry.byType[type];
        if(RICH_ITEM_FIELDS[type] && def.itemFields) def.itemFields = markFieldsRich(def.itemFields, RICH_ITEM_FIELDS[type]);
        if(RICH_PROP_FIELDS[type] && def.propFields) def.propFields = markFieldsRich(def.propFields, RICH_PROP_FIELDS[type]);
      });
    }
    function inline(value){
      value = normalizeWhitespace(value);
      if(typeof value !== 'string' || !/[<&]/.test(value) || !NS.RichText) return value;
      return React.createElement(NS.RichText, { html: value, as: 'span', className: 'spu-richtext--inline' });
    }
    function block(value){
      value = normalizeWhitespace(value);
      if(typeof value !== 'string' || !/[<&]/.test(value) || !NS.RichText) return value;
      return React.createElement(NS.RichText, { html: value });
    }
    function normalizeWhitespace(value){
      if(typeof value !== 'string') return value;
      var html = value.replace(/(?:&nbsp;|\u00a0)/gi, ' ');
      if(!/[<>]/.test(html)) return hasRichContent(html) ? html : '';
      html = html.replace(/<div(?:\\s[^>]*)?>/gi, '<p>').replace(/<\\/div>/gi, '</p>');
      if(!/<(?:p|ul|ol|blockquote|h[1-6])\\b/i.test(html) && /(?:<br\\s*\\/?>\\s*){2,}/i.test(html)){
        html = '<p>' + html.replace(/(?:<br\\s*\\/?>\\s*){2,}/gi, '</p><p>') + '</p>';
      }
      if(/<p\\b/i.test(html) && !/^\\s*<(?:p|ul|ol|blockquote|h[1-6])\\b/i.test(html)){
        html = html.replace(/^([\\s\\S]*?)(?=<p\\b)/i, '<p>$1</p>');
      }
      html = html.replace(/<p>\\s*<p>/gi, '<p>')
        .replace(/<\\/p>\\s*<\\/p>/gi, '</p>')
        .replace(/<p>\\s*<br\\s*\\/?>\\s*<\\/p>/gi, '<p><br></p>');
      return hasRichContent(html) ? html : '';
    }
    function hasRichContent(value){
      if(value == null) return false;
      if(typeof value !== 'string') return true;
      var visible = value.replace(/<!--[\\s\\S]*?-->/g, '')
        .replace(/<br\\s*\\/?>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/(?:&nbsp;|&#160;|&#x0*a0;|\\u00a0)/gi, ' ')
        .replace(/[\\s\\u00a0\\u200b-\\u200d\\ufeff]/g, '');
      return visible.length > 0;
    }
    function installCollapsibleSection(){
      var registry = NS.BlockRegistry;
      if(!registry || registry.byType.collapsiblesection) return;
      var css = '.spu-csection__always,.spu-csection__body{display:flex;flex-direction:column;gap:var(--flow-block)}' +
        '.spu-csection__summary{display:inline-flex;align-items:center;gap:var(--space-2);width:max-content;margin-top:var(--flow-block);padding:.68em .95em;border:1px solid var(--color-primary);border-radius:var(--radius);color:var(--color-primary-strong);background:transparent;font-family:var(--font-display);font-weight:700;cursor:pointer}' +
        '.spu-csection__summary:hover{background:var(--color-primary-soft)}' +
        '.spu-csection__summary svg{transition:transform var(--dur) var(--ease-out)}' +
        '.spu-csection__summary[aria-expanded="true"] svg{transform:rotate(180deg)}' +
        '.spu-csection__body{margin-top:var(--space-6)}' +
        '.spu-csection__body[hidden]{display:none}' +
        '.spu-section--dark .spu-csection__summary{border-color:var(--text-on-dark);color:var(--text-on-dark)}' +
        '.spu-section--dark .spu-csection__summary:hover{background:rgba(255,255,255,.1)}' +
        '@media print{.spu-csection__body{display:flex!important}.spu-csection__summary{display:none!important}}';
      if(NS.injectCss) NS.injectCss('spu-collapsible-section-css', css);
      else if(!document.getElementById('spu-collapsible-section-css')){
        var style = document.createElement('style');
        style.id = 'spu-collapsible-section-css';
        style.textContent = css;
        document.head.appendChild(style);
      }
      NS.CollapsibleSection = function(props){
        props = props || {};
        var triggerLabel = props.triggerLabel || 'Clique para expandir';
        var printing = NS.isPrint ? NS.isPrint() : window.__SPU_PRINT === true;
        var state = React.useState(!!props.defaultOpen);
        var open = state[0];
        var setOpen = state[1];
        var forcedOpen = printing;
        var items = React.Children.toArray(props.children);
        function blockType(node){
          if(!React.isValidElement(node)) return '';
          if(node.props && node.props.block && node.props.block.type) return node.props.block.type;
          return React.Children.toArray(node.props && node.props.children).map(blockType).filter(Boolean)[0] || '';
        }
        var markerIndex = items.findIndex(function(item){ return blockType(item) === 'collapsebreak'; });
        var alwaysVisible = markerIndex >= 0 ? items.slice(0, markerIndex) : [];
        var collapsed = markerIndex >= 0 ? items.slice(markerIndex + 1) : items;
        var sectionProps = Object.assign({}, props, {
          width: props.width || 'content',
          surface: props.surface || 'none',
          pad: props.pad || 'lg',
          className: ['spu-csection', props.className].filter(Boolean).join(' ')
        });
        ['title','lead','triggerLabel','defaultOpen','__builderEditing','children'].forEach(function(key){ delete sectionProps[key]; });
        return React.createElement(NS.Section, sectionProps,
          React.createElement(React.Fragment, null,
            alwaysVisible.length && React.createElement('div', { className:'spu-csection__always spu-blockstack' }, alwaysVisible),
            !printing && React.createElement('button', {
                type:'button',
                className:'spu-csection__summary',
                'aria-expanded':forcedOpen || open,
                onClick:function(){ if(!forcedOpen) setOpen(!open); }
              },
                NS.renderRich ? NS.renderRich(triggerLabel, { inline:true }) : triggerLabel,
                React.createElement(NS.Icon, { name:'chevron-down', size:18 })
              ),
              React.createElement('div', { className:'spu-csection__body spu-blockstack', hidden:!(forcedOpen || open) }, collapsed)
          )
        );
      };
      NS.CollapseBreak = function(){ return null; };
      var markerDefinition = {
        type:'collapsebreak', component:'CollapseBreak', label:'Botão de recolher',
        icon:'chevron-down', cat:'Estrutura', kind:'marker', internal:true, props:{}
      };
      var definition = {
        type:'collapsiblesection', component:'CollapsibleSection', label:'Seção expansível',
        icon:'chevron-down', cat:'Estrutura', kind:'container', stack:false,
        fields:['triggerLabel'], allowedTypes:registry.childTypes.concat([markerDefinition.type]),
        props:{ triggerLabel:'Clique para expandir', defaultOpen:false, width:'content', surface:'none', pad:'lg', children:[] },
        propFields:[{ key:'defaultOpen', label:'Iniciar aberta', type:'bool' }]
      };
      var sectionIndex = registry.blocks.findIndex(function(item){ return item.type === 'section'; });
      registry.blocks.splice(sectionIndex >= 0 ? sectionIndex + 1 : registry.blocks.length, 0, definition);
      registry.blocks.push(markerDefinition);
      registry.byType[definition.type] = definition;
      registry.byType[markerDefinition.type] = markerDefinition;
      if(registry.structuralTypes.indexOf(definition.type) < 0){
        var structuralIndex = registry.structuralTypes.indexOf('section');
        registry.structuralTypes.splice(structuralIndex >= 0 ? structuralIndex + 1 : registry.structuralTypes.length, 0, definition.type);
      }
      var originalNewBlock = registry.newBlock.bind(registry);
      registry.newBlock = function(type, child){
        if(type === markerDefinition.type) return { id:(child ? 'c' : 'b') + Math.random().toString(36).slice(2, 9), type:markerDefinition.type, props:{} };
        if(type !== definition.type) return originalNewBlock(type, child);
        var props = JSON.parse(JSON.stringify(definition.props));
        props.children = [registry.newBlock(markerDefinition.type, true)];
        return { id:(child ? 'c' : 'b') + Math.random().toString(36).slice(2, 9), type:definition.type, props:props };
      };
    }
    installCollapsibleSection();
    var Masthead = NS.Masthead;
    if(Masthead){
      NS.Masthead = function(props){
        props = props || {};
        return React.createElement(Masthead, Object.assign({}, props, {
          org: inline(props.org),
          program: inline(props.program)
        }));
      };
    }
    var Conclusion = NS.Conclusion;
    if(Conclusion){
      NS.Conclusion = function(props){
        props = props || {};
        return React.createElement(Conclusion, Object.assign({}, props, {
          body: block(props.body)
        }));
      };
    }
    function richifyValue(value, field){
      if((field.type === 'rich' || field.type === 'text') && typeof value === 'string'){
        return field.inline != null ? (field.inline ? inline(value) : block(value)) : (['content','definition','feedback'].indexOf(field.key) >= 0 ? block(value) : inline(value));
      }
      if(field.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) return richifyObject(value, field.fields || []);
      if(field.type === 'list' && Array.isArray(value)) return value.map(function(item){ return richifyItem(item, field.itemFields || []); });
      return value;
    }
    function richifyItem(item, fields){
      if(fields.length === 1 && fields[0].key === '') return richifyValue(item, fields[0]);
      if(!item || typeof item !== 'object' || Array.isArray(item)) return item;
      return richifyObject(item, fields);
    }
    function richifyObject(value, fields){
      var next = Object.assign({}, value);
      (fields || []).forEach(function(field){
        if(!field.key) return;
        next[field.key] = richifyValue(value[field.key], field);
      });
      return next;
    }
    function richifyProps(type, props){
      var def = NS.BlockRegistry && NS.BlockRegistry.byType && NS.BlockRegistry.byType[type];
      var next = Object.assign({}, props || {});
      var direct = [].concat((def && def.fields) || [], RICH_DIRECT_FIELDS[type] || []);
      direct.forEach(function(key){ if(next[key] !== undefined) next[key] = inline(next[key]); });
      if(def && def.itemsKey && def.itemFields && Array.isArray(next[def.itemsKey])) next[def.itemsKey] = next[def.itemsKey].map(function(item){ return richifyItem(item, def.itemFields || []); });
      ((def && def.propFields) || []).forEach(function(field){ if(field.key && next[field.key] !== undefined) next[field.key] = richifyValue(next[field.key], field); });
      return next;
    }
    COMPAT_TYPES.forEach(function(type){
      var def = NS.BlockRegistry && NS.BlockRegistry.byType && NS.BlockRegistry.byType[type];
      var Original = def && def.component && NS[def.component];
      if(!Original) return;
      NS[def.component] = function(props){
        return React.createElement(Original, richifyProps(type, props || {}));
      };
    });
    var Accordion = NS.Accordion;
    if(Accordion){
      NS.Accordion = function(props){
        props = props || {};
        var items = Array.isArray(props.items) ? props.items.map(function(item){
          if(!item || typeof item !== 'object' || Array.isArray(item) || !Array.isArray(item.blocks) || !item.blocks.length) return item;
          return Object.assign({}, item, {
            content: React.createElement(React.Fragment, null,
              block(item.content),
              React.createElement('div', { className:'spu-accordion-blocks' }, item.blocks.map(function(nested, index){
                return React.createElement(NS.BlockView, { key:nested.id || index, block:nested, mode:'preview' });
              }))
            )
          });
        }) : props.items;
        return React.createElement(Accordion, Object.assign({}, props, { items:items }));
      };
    }
    var Timeline = NS.Timeline;
    if(Timeline){
      NS.Timeline = function(props){
        props = props || {};
        var eras = Array.isArray(props.eras) ? props.eras.map(function(era){
          if(!era || typeof era !== 'object' || Array.isArray(era) || !Array.isArray(era.milestones)) return era;
          return Object.assign({}, era, {
            milestones: era.milestones.map(function(milestone){
              if(!milestone || typeof milestone !== 'object' || Array.isArray(milestone) || !Array.isArray(milestone.blocks) || !milestone.blocks.length) return milestone;
              return Object.assign({}, milestone, {
                content: React.createElement(React.Fragment, null,
                  block(milestone.content),
                  React.createElement('div', { className:'spu-embedded-blocks' }, milestone.blocks.map(function(nested, index){
                    return React.createElement(NS.BlockView, { key:nested.id || index, block:nested, mode:'preview' });
                  }))
                )
              });
            })
          });
        }) : props.eras;
        return React.createElement(Timeline, Object.assign({}, props, { eras:eras }));
      };
    }
    NS.__spuBuilderCompat = true;
  };
})();`;

async function fetchText(href: string): Promise<string> {
  const r = await fetch(href);
  if (!r.ok) throw new Error(`Falha ao buscar ${href}`);
  return r.text();
}

// Resolve @import url('relativo') inlinando o CSS; mantém absolutos (fontes).
async function inlineCss(href: string, seen = new Set<string>()): Promise<string> {
  if (seen.has(href)) return '';
  seen.add(href);
  const dir = href.slice(0, href.lastIndexOf('/') + 1);
  const txt = await fetchText(href);
  const importRe = /@import\s+url\(['"]?([^'")]+)['"]?\)\s*;?/g;
  let out = txt;
  for (const m of [...txt.matchAll(importRe)]) {
    if (/^https?:/i.test(m[1])) continue;
    out = out.replace(m[0], await inlineCss(dir + m[1], seen));
  }
  return out;
}

export type ImageQuality = 'compact' | 'high';

interface SlotVal { u?: string; s?: number; x?: number; y?: number }
type Sidecar = Record<string, SlotVal | string>;
const COMPACT_MAX_DIM = 1600;
const COMPACT_WEBP_QUALITY = 0.9;

function referencedSlotIds(doc: Doc): Set<string> {
  const ids = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    Object.entries(object).forEach(([key, current]) => {
      if ((key === 'slot' || key.endsWith('Slot')) && typeof current === 'string') {
        if (current && !(key === 'slot' && object.showImage === false)) ids.add(current);
        return;
      }
      visit(current);
    });
  };
  visit(doc.blocks);
  return ids;
}

async function getSidecar(doc: Doc): Promise<Sidecar> {
  try {
    const all = JSON.parse(await readImageSlots()) as Sidecar;
    const referenced = referencedSlotIds(doc);
    return Object.fromEntries(Object.entries(all).filter(([id]) => referenced.has(id)));
  } catch {
    return {};
  }
}

// O projeto editável preserva os originais, independentemente da qualidade
// escolhida para as imagens da publicação HTML/SCORM.
export async function serializeProject(doc: Doc): Promise<string> {
  return JSON.stringify({ ...doc, imageSlots: await getSidecar(doc) }, null, 2);
}

// O código é informado no título do documento (ex.: M121 - Bens imóveis públicos).
export function projectFileName(doc: Doc): string {
  const code = doc.meta.title?.match(/\b(m\d+[a-z]?)\b/i)?.[1].toLowerCase() || '';
  return `projeto${code}.spu.json`;
}

export async function saveProject(doc: Doc): Promise<void> {
  download(projectFileName(doc), await serializeProject(doc), 'application/json');
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; ext: string } | null {
  const m = dataUrl.match(/^data:image\/([a-z0-9.+-]+);base64,(.*)$/i);
  if (!m) return null;
  const ext = m[1].toLowerCase().replace('jpeg', 'jpg');
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, ext };
}

function bytesToDataUrl(bytes: Uint8Array, ext: string): string {
  const mimeExt = ext === 'jpg' ? 'jpeg' : ext;
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:image/${mimeExt};base64,${btoa(binary)}`;
}

function framingMeta(value: SlotVal | string): SlotVal {
  if (typeof value === 'string') return {};
  const out: SlotVal = {};
  if (Number.isFinite(value.s)) out.s = value.s;
  if (Number.isFinite(value.x)) out.x = value.x;
  if (Number.isFinite(value.y)) out.y = value.y;
  return out;
}

async function compactImage(dataUrl: string): Promise<{ bytes: Uint8Array; ext: string } | null> {
  const decoded = dataUrlToBytes(dataUrl);
  if (!decoded) return null;

  const mimeExt = decoded.ext === 'jpg' ? 'jpeg' : decoded.ext;
  const source = new Blob([decoded.bytes as BlobPart], { type: `image/${mimeExt}` });
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(source);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (decoded.ext === 'webp' && longest <= COMPACT_MAX_DIM) return decoded;

    const scale = Math.min(1, COMPACT_MAX_DIM / Math.max(1, longest));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return decoded;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encoded = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', COMPACT_WEBP_QUALITY);
    });
    if (!encoded) return decoded;
    return { bytes: new Uint8Array(await encoded.arrayBuffer()), ext: 'webp' };
  } catch {
    return decoded;
  } finally {
    bitmap?.close();
  }
}

async function imageBytes(dataUrl: string, quality: ImageQuality) {
  return quality === 'compact' ? compactImage(dataUrl) : dataUrlToBytes(dataUrl);
}

async function sidecarForInlineExport(doc: Doc, quality: ImageQuality): Promise<Sidecar> {
  const source = await getSidecar(doc);
  const out: Sidecar = {};
  for (const id of Object.keys(source)) {
    const value = source[id];
    const url = typeof value === 'string' ? value : value.u;
    if (!url) continue;
    if (quality === 'high') {
      out[id] = { ...framingMeta(value), u: url };
      continue;
    }
    const compact = await compactImage(url);
    out[id] = { ...framingMeta(value), u: compact ? bytesToDataUrl(compact.bytes, compact.ext) : url };
  }
  return out;
}

async function getReactUMD(): Promise<{ react: string; reactDom: string; license: string }> {
  const [react, reactDom, license] = await Promise.all([
    fetchText(VENDOR_BASE + 'react.production.min.js'),
    fetchText(VENDOR_BASE + 'react-dom.production.min.js'),
    fetchText(VENDOR_BASE + 'REACT_LICENSE.txt'),
  ]);
  return { react, reactDom, license };
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

function escapeInlineScript(js: string): string {
  return js.replace(/<\/script/gi, '<\\/script');
}

// Relaxa o image-slot exportado para aceitar caminhos relativos de assets.
function relaxImageSlot(js: string): string {
  return js.replace(/!\/\^data:image\\\/\/i\.test\(stored\.u\)/g, '!/^(data:image\\/|assets\\/)/i.test(stored.u)')
           .replace(/!\/\^data:image\/i\.test\(stored\.u\)/g, '!/^(data:image|assets\\/)/i.test(stored.u)');
}

// ── Template da página ──────────────────────────────────────────────────────
interface PageOpts {
  doc: Doc;
  inline: boolean;                 // true = autocontido; false = assets externos
  bundleJs: string;
  stylesCss: string;
  sidecar: Sidecar;                // já com URLs corretas (data: ou assets/)
  react: { react: string; reactDom: string; license: string };
  lucideIcons: Record<string, string>;
  lucideLicense: string;
  scorm?: boolean;
  print?: boolean;
  autoPrint?: boolean;
}

function buildPageHtml(o: PageOpts): string {
  const title = o.doc.meta.title || 'Conteúdo';
  const lang = o.doc.meta.lang || 'pt-BR';
  const data = JSON.stringify(o.doc).replace(/</g, '\\u003c');
  const sidecarJson = JSON.stringify(o.sidecar).replace(/</g, '\\u003c');
  const lucideIconsJson = JSON.stringify(o.lucideIcons).replace(/</g, '\\u003c');

  const reactTags = o.inline
    ? `<script>${escapeInlineScript(o.react.react)}</script>\n<script>${escapeInlineScript(o.react.reactDom)}</script>`
    : `<script src="assets/react.js"></script>\n<script src="assets/react-dom.js"></script>`;

  const cssTag = o.inline ? `<style>${o.stylesCss}\n${BUILDER_EXPORT_CSS}</style>` : `<link rel="stylesheet" href="assets/styles.css">\n<style>${BUILDER_EXPORT_CSS}</style>`;
  const bundleTag = o.inline ? `<script>${escapeInlineScript(o.bundleJs)}</script>` : `<script src="assets/ds-bundle.js"></script>`;
  const printFlag = o.print ? `<script>window.__SPU_PRINT=true;</script>` : '';
  const printCss = o.print ? `<style>
@page { size: A4; margin: 0; }
html { background: #d8d5cd; }
body { margin: 0; background: #d8d5cd; }
#root {
  --spu-print-image-max-height: 89mm;
  width: 210mm;
  min-height: 297mm;
  margin: 24px auto;
  padding-block: 10mm;
  box-sizing: border-box;
  background: var(--color-page, #fffdf8);
  box-shadow: 0 16px 40px rgba(0,0,0,.16);
}
.spu-print-shell { overflow-x: hidden; }
.spu-print-shell .spu-section,
.spu-print-shell .spu-fullbleed--bleed,
.spu-print-shell .spu-bleedimg--bleed,
.spu-print-shell .spu-panel--feature {
  width: 100% !important;
  max-width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  transform: none !important;
}
.spu-print-shell .spu-section__inner { max-width: 100% !important; }
.spu-print-shell .spu-fullbleed { border-radius: 0; }
.spu-print-shell .spu-bleedimg__parallax { background-attachment: scroll !important; }
.spu-print-shell .spu-pagetoc { display: none !important; }
.spu-print-shell .spu-figure,
.spu-print-shell .spu-map,
.spu-print-shell .spu-bleedimg,
.spu-print-shell .spu-reveal,
.spu-print-shell .spu-reveal-print figure,
.spu-print-shell .spu-examplecard__cover,
.spu-print-shell .spu-acc__media,
.spu-print-shell .spu-tl__media,
.spu-print-shell .spu-twi__media { break-inside: avoid; }
.spu-print-shell .spu-map__frame,
.spu-print-shell .spu-bleedimg__frame,
.spu-print-shell .spu-reveal,
.spu-print-shell .spu-reveal-print figure,
.spu-print-shell .spu-examplecard__cover,
.spu-print-shell .spu-acc__media,
.spu-print-shell .spu-tl__media,
.spu-print-shell .spu-twi__media { max-height: var(--spu-print-image-max-height) !important; overflow: hidden; }
.spu-print-shell .spu-map__img,
.spu-print-shell .spu-bleedimg__frame img,
.spu-print-shell .spu-reveal img,
.spu-print-shell .spu-reveal-print img,
.spu-print-shell .spu-examplecard__cover img,
.spu-print-shell .spu-acc__media img,
.spu-print-shell .spu-tl__media img,
.spu-print-shell .spu-twi__media img,
.spu-print-shell .spu-map__frame image-slot,
.spu-print-shell .spu-bleedimg__frame image-slot,
.spu-print-shell .spu-reveal image-slot,
.spu-print-shell .spu-reveal-print image-slot,
.spu-print-shell .spu-examplecard__cover image-slot,
.spu-print-shell .spu-acc__media image-slot,
.spu-print-shell .spu-tl__media image-slot,
.spu-print-shell .spu-twi__media image-slot { max-height: var(--spu-print-image-max-height) !important; object-fit: contain !important; }
.spu-print-shell .spu-figure__frame { max-height: none !important; overflow: hidden; }
.spu-print-shell .spu-figure__frame img,
.spu-print-shell .spu-figure__frame > image-slot { width: 100% !important; max-height: none !important; object-fit: contain !important; }
.spu-print-shell image-slot:not([data-filled]),
.spu-print-shell .spu-carousel__slide:has(.spu-figure__frame > image-slot:not([data-filled])),
.spu-print-shell .spu-figure:has(.spu-figure__frame > image-slot:not([data-filled])),
.spu-print-shell .spu-acc__media:has(image-slot:not([data-filled])),
.spu-print-shell .spu-tl__media:has(image-slot:not([data-filled])) { display: none !important; }
.spu-print-answer-key {
  max-width: var(--container-content);
  margin: var(--space-8) auto 0;
  padding: var(--space-4) 0 0;
  border-top: 1px solid var(--color-border);
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: var(--fs-caption);
}
.spu-print-answer-key__title {
  margin: 0 0 var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--fs-eyebrow);
  letter-spacing: var(--ls-eyebrow);
  text-transform: uppercase;
  color: var(--text-faint);
}
.spu-print-answer-key ol {
  margin: 0;
  padding-left: 1.5em;
  columns: 2;
}
.spu-print-answer-key li { break-inside: avoid; margin: 0 0 .25em; }
@media print {
  html, body, #root { background: transparent; }
  #root { width: auto; min-height: 0; margin: 0; padding-block: 10mm; box-shadow: none; }
}
</style>` : '';

  // Override do fetch do sidecar (funciona em file://; imagens carregam via <img src>).
  const sidecarScript = `<script>(function(){var DATA=${sidecarJson};var f=window.fetch?window.fetch.bind(window):null;window.fetch=function(i,n){var u=typeof i==='string'?i:(i&&i.url)||'';if(u&&u.indexOf('${SLOT_FILE}')>=0){return Promise.resolve(new Response(JSON.stringify(DATA),{headers:{'Content-Type':'application/json'}}));}return f?f(i,n):Promise.reject(new Error('no fetch'));};})();</script>`;

  const scormTag = o.scorm ? `<script src="scorm-api.js"></script>` : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${reactTags}
${cssTag}
${printCss}
${sidecarScript}
${scormTag}
${printFlag}
</head>
<body${o.print ? ' class="spu-print-body"' : ''}>
<div id="root"></div>
<script id="spu-doc" type="application/json">${data}</script>
<script id="spu-image-slots" type="application/json">${sidecarJson}</script>
<script id="spu-lucide-icons" type="application/json">${lucideIconsJson}</script>
<script id="spu-lucide-license" type="text/plain">${escapeInlineScript(o.lucideLicense)}</script>
<script id="spu-react-license" type="text/plain">${escapeInlineScript(o.react.license)}</script>
${bundleTag}
<script>${escapeInlineScript(DS_COMPAT_JS)}</script>
<script>
(function () {
  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  function walkBlocks(blocks, visit) {
    (blocks || []).forEach(function (block) {
      visit(block);
      if (block.children) walkBlocks(block.children, visit);
    });
  }
  function QuizAnswerKey(props) {
    var keys = [];
    walkBlocks(props.doc && props.doc.blocks, function (block) {
      if (block.type !== 'quiz') return;
      var questions = block.props && block.props.questions || [];
      questions.forEach(function (q) {
        var idx = (q.options || []).findIndex(function (o) { return !!o.correct; });
        if (idx >= 0) keys.push(LETTERS[idx] || String(idx + 1));
      });
    });
    if (!keys.length) return null;
    return React.createElement('section', { className: 'spu-print-answer-key' },
      React.createElement('p', { className: 'spu-print-answer-key__title' }, 'Gabarito'),
      React.createElement('ol', null, keys.map(function (k, i) {
        return React.createElement('li', { key: i }, k);
      }))
    );
  }
  function start(tries){
    var NS = window[Object.keys(window).filter(function(k){return /DesignSystem/.test(k);})[0]];
    if (!NS || !NS.BlockDocument) { if(tries>0) return setTimeout(function(){start(tries-1);},50);
      document.getElementById('root').textContent = 'Kit do design system não carregado.'; return; }
    if (window.__SPU_INSTALL_DS_COMPAT) window.__SPU_INSTALL_DS_COMPAT(NS);
    var lucideIcons = JSON.parse(document.getElementById('spu-lucide-icons').textContent || '{}');
    if (NS.ICONS) Object.assign(NS.ICONS, lucideIcons);
    if (Array.isArray(NS.ICON_NAMES)) Object.keys(lucideIcons).forEach(function(name){
      if (NS.ICON_NAMES.indexOf(name) < 0) NS.ICON_NAMES.push(name);
    });
    var doc = JSON.parse(document.getElementById('spu-doc').textContent);
    var children = [React.createElement(NS.BlockDocument, { key: 'doc', doc: doc, mode: 'preview', showBuilderCredit: ${o.print ? 'false' : 'true'} })];
    if (${o.print ? 'true' : 'false'}) {
      children.push(React.createElement(QuizAnswerKey, { key: 'quiz-key', doc: doc }));
      if ((!doc.meta || doc.meta.builderCredit !== false) && NS.BuilderCredit) {
        children.push(React.createElement(NS.BuilderCredit, { key: 'builder-credit' }));
      }
    }
    ReactDOM.createRoot(document.getElementById('root')).render(
      React.createElement('div', { className: ${o.print ? "'spu-print-shell'" : "''"} }, children));
    setTimeout(function(){ if(window.__SPU_ENHANCE_GLOSSARY) window.__SPU_ENHANCE_GLOSSARY(); }, 80);
    ${o.print && o.autoPrint ? "setTimeout(function(){ window.print(); }, 450);" : ''}
  }
  start(40);
})();
</script>
<script>${escapeInlineScript(GLOSSARY_ENHANCER_JS)}</script>
</body>
</html>`;
}

function download(filename: string, content: Uint8Array | string, mime: string) {
  const blob = new Blob([content as BlobPart], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

const safe = (s: string) => (s || 'conteudo').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'conteudo';

// ── 1) HTML autocontido ─────────────────────────────────────────────────────
export async function exportSelfContained(doc: Doc, quality: ImageQuality = 'high') {
  const [bundleJsRaw, stylesCss] = await Promise.all([
    fetchText(DS_BASE + '_ds_bundle.js'),
    inlineCss(DS_BASE + 'styles.css'),
  ]);
  const bundleJs = relaxImageSlot(bundleJsRaw);
  const react = await getReactUMD();
  const lucide = await getDocumentLucideAssets(doc);
  const sidecar = await sidecarForInlineExport(doc, quality);
  const html = buildPageHtml({ doc, inline: true, bundleJs, stylesCss, sidecar, react, lucideIcons: lucide.icons, lucideLicense: lucide.license });
  download(safe(doc.meta.title) + '.html', html, 'text/html;charset=utf-8');
}

// Extrai imagens do sidecar para arquivos e devolve sidecar com caminhos relativos.
async function externalizeImages(files: Record<string, Uint8Array>, doc: Doc, quality: ImageQuality): Promise<Sidecar> {
  const src = await getSidecar(doc);
  const out: Sidecar = {};
  let n = 0;
  for (const id of Object.keys(src)) {
    const v = src[id];
    const url = typeof v === 'string' ? v : v.u;
    const dec = url ? await imageBytes(url, quality) : null;
    if (!dec) continue;
    const name = `assets/images/img-${n++}-${safe(id).slice(0, 24)}.${dec.ext}`;
    files[name] = dec.bytes;
    out[id] = { ...framingMeta(v), u: name };
  }
  return out;
}

// ── 2) Pacote HTML + assets (.zip) ───────────────────────────────────────────
export async function exportAssetsZip(doc: Doc, quality: ImageQuality = 'high') {
  const [bundleJsRaw, stylesCss] = await Promise.all([
    fetchText(DS_BASE + '_ds_bundle.js'),
    inlineCss(DS_BASE + 'styles.css'),
  ]);
  const react = await getReactUMD();
  const files: Record<string, Uint8Array> = {};
  const sidecar = await externalizeImages(files, doc, quality);
  const bundleJs = relaxImageSlot(bundleJsRaw);
  const lucide = await getDocumentLucideAssets(doc);

  const html = buildPageHtml({ doc, inline: false, bundleJs, stylesCss, sidecar, react, lucideIcons: lucide.icons, lucideLicense: lucide.license });
  files['index.html'] = strToU8(html);
  files[projectFileName(doc)] = strToU8(await serializeProject(doc));
  files['assets/ds-bundle.js'] = strToU8(bundleJs);
  files['assets/styles.css'] = strToU8(stylesCss);
  files['assets/react.js'] = strToU8(react.react);
  files['assets/react-dom.js'] = strToU8(react.reactDom);
  files['assets/REACT_LICENSE.txt'] = strToU8(react.license);
  download(safe(doc.meta.title) + '-html.zip', zipSync(files), 'application/zip');
}

// ── 3) SCORM 1.2 não-avaliativo (.zip) ───────────────────────────────────────
function imsmanifest(doc: Doc): string {
  const id = 'SPU_' + safe(doc.meta.title).replace(/-/g, '_');
  const title = escapeHtml(doc.meta.title || 'Conteúdo');
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG">
    <organization identifier="ORG">
      <title>${title}</title>
      <item identifier="ITEM" identifierref="RES"><title>${title}</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm-api.js"/>
    </resource>
  </resources>
</manifest>`;
}

// Wrapper SCORM 1.2 não-avaliativo: marca "completed" ao abrir, sem nota.
const SCORM_API_JS = `(function(){
  function find(w,d){ while(w){ if(w.API) return w.API; if(w.parent===w) break; w=w.parent; } return null; }
  var API = find(window) || (window.opener && find(window.opener));
  function call(m,a,b){ try{ return API && API[m] ? API[m](a==null?'':a, b==null?'':b) : ''; }catch(e){ return ''; } }
  if (API) {
    call('LMSInitialize','');
    var st = call('LMSGetValue','cmi.core.lesson_status');
    if (st==='not attempted' || st==='' || st==='unknown') call('LMSSetValue','cmi.core.lesson_status','completed');
    call('LMSSetValue','cmi.core.lesson_mode','browse');
    call('LMSCommit','');
    window.addEventListener('unload', function(){ call('LMSCommit',''); call('LMSFinish',''); });
  }
})();`;

export async function exportScormZip(doc: Doc, quality: ImageQuality = 'high') {
  const [bundleJsRaw, stylesCss] = await Promise.all([
    fetchText(DS_BASE + '_ds_bundle.js'),
    inlineCss(DS_BASE + 'styles.css'),
  ]);
  const react = await getReactUMD();
  const files: Record<string, Uint8Array> = {};
  const sidecar = await externalizeImages(files, doc, quality);
  const bundleJs = relaxImageSlot(bundleJsRaw);
  const lucide = await getDocumentLucideAssets(doc);

  const html = buildPageHtml({ doc, inline: false, bundleJs, stylesCss, sidecar, react, lucideIcons: lucide.icons, lucideLicense: lucide.license, scorm: true });
  files['index.html'] = strToU8(html);
  files[projectFileName(doc)] = strToU8(await serializeProject(doc));
  files['imsmanifest.xml'] = strToU8(imsmanifest(doc));
  files['scorm-api.js'] = strToU8(SCORM_API_JS);
  files['assets/ds-bundle.js'] = strToU8(bundleJs);
  files['assets/styles.css'] = strToU8(stylesCss);
  files['assets/react.js'] = strToU8(react.react);
  files['assets/react-dom.js'] = strToU8(react.reactDom);
  files['assets/REACT_LICENSE.txt'] = strToU8(react.license);
  download(safe(doc.meta.title) + '-scorm.zip', zipSync(files), 'application/zip');
}
