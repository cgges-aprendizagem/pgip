export const HIDDEN_BLOCKS = new Set(['reflexao', 'collapsebreak', 'sectionslide']);

const ICON_SET_CACHE = new WeakMap<string[], Set<string>>();

export function getAvailableIconSet(names: string[]): Set<string> {
  const cached = ICON_SET_CACHE.get(names);
  if (cached) return cached;
  const icons = new Set(names);
  ICON_SET_CACHE.set(names, icons);
  return icons;
}

const ICON_FALLBACK: Record<string, string> = {
  layout: 'maximize', heading: 'file-text', type: 'file-text', grid: 'scale',
  list: 'plus', square: 'target', flower: 'sparkles', image: 'maximize',
  'book-marked': 'book-open', 'check-circle': 'check', 'help-circle': 'check',
};

export function resolveBlockIcon(icon: string, available: Set<string>) {
  return available.has(icon) ? icon : (ICON_FALLBACK[icon] || 'file-text');
}
