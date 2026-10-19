export function enhanceGlossaryTerms(root: ParentNode = document) {
  const popByTerm = new WeakMap<Element, HTMLElement>();
  const positionByTerm = new WeakMap<Element, () => void>();
  const portalPops: HTMLElement[] = [];
  const closeAll = (except?: Element) => {
    document.querySelectorAll('.spu-term-open').forEach((el) => {
      if (el !== except) {
        el.classList.remove('spu-term-open');
        el.setAttribute('aria-expanded', 'false');
        popByTerm.get(el)?.classList.remove('is-open');
      }
    });
  };

  root.querySelectorAll('.spu-richtext [data-term]').forEach((node) => {
    const el = node as HTMLElement;
    if (el.dataset.spuTermReady) return;
    const term = (el.getAttribute('data-term') || el.textContent || '').trim();
    const definition = (el.getAttribute('data-definition') || el.getAttribute('title') || el.getAttribute('data-def') || '').trim();
    if (!term || !definition) return;

    el.dataset.spuTermReady = '1';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-expanded', 'false');
    el.setAttribute('data-definition', definition);
    el.removeAttribute('title');

    const pop = document.createElement('span');
    pop.className = 'spu-term-pop';
    pop.setAttribute('role', 'tooltip');

    const title = document.createElement('strong');
    title.textContent = term;
    const body = document.createElement('span');
    body.className = 'spu-term-pop__def';
    body.innerHTML = sanitizeDefinition(definition);
    pop.append(title, body);
    document.body.appendChild(pop);
    portalPops.push(pop);
    popByTerm.set(el, pop);

    const position = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      const below = rect.top < 150 && window.innerHeight - rect.bottom > rect.top;
      const arrow = Math.min(Math.max(18, rect.left + rect.width / 2 - left), width - 18);
      pop.style.left = `${left}px`;
      pop.style.width = `${width}px`;
      pop.style.top = below ? `${rect.bottom + 10}px` : 'auto';
      pop.style.bottom = below ? 'auto' : `${window.innerHeight - rect.top + 10}px`;
      pop.style.setProperty('--spu-term-arrow', `${arrow}px`);
      pop.dataset.placement = below ? 'bottom' : 'top';
    };
    positionByTerm.set(el, position);

    const toggle = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = el.classList.toggle('spu-term-open');
      el.setAttribute('aria-expanded', open ? 'true' : 'false');
      pop.classList.toggle('is-open', open);
      if (open) {
        closeAll(el);
        position();
      }
    };

    el.addEventListener('click', toggle);
    el.addEventListener('keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') toggle(event);
      if (key === 'Escape') closeAll();
    });
  });

  const onClick = () => closeAll();
  document.addEventListener('click', onClick);
  const repositionOpen = () => {
    document.querySelectorAll('.spu-term-open').forEach((el) => positionByTerm.get(el)?.());
  };
  window.addEventListener('resize', repositionOpen);
  window.addEventListener('scroll', repositionOpen, true);
  return () => {
    document.removeEventListener('click', onClick);
    window.removeEventListener('resize', repositionOpen);
    window.removeEventListener('scroll', repositionOpen, true);
    portalPops.forEach((pop) => pop.remove());
  };
}

function sanitizeDefinition(value: string) {
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
  return box.innerHTML;
}
