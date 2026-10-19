import type { Doc, NS } from '../types/ds';

type LucideModule = typeof import('../generated/lucideCatalog');

let catalogPromise: Promise<LucideModule> | null = null;

export function loadLucideCatalog(): Promise<LucideModule> {
  catalogPromise ??= import('../generated/lucideCatalog');
  return catalogPromise;
}

export async function installLucideCatalog(ns: NS): Promise<void> {
  const { LUCIDE_ICONS, LUCIDE_SEARCH_TERMS } = await loadLucideCatalog();
  Object.assign(ns.ICONS, LUCIDE_ICONS);
  ns.ICON_SEARCH = LUCIDE_SEARCH_TERMS;

  const known = new Set(ns.ICON_NAMES);
  for (const name of Object.keys(LUCIDE_ICONS)) {
    if (!known.has(name)) ns.ICON_NAMES.push(name);
  }
  ns.ICON_NAMES.sort((a, b) => a.localeCompare(b));
}

function isIconProperty(key: string): boolean {
  return /icon(?:name)?$/i.test(key);
}

export async function getDocumentLucideAssets(doc: Doc): Promise<{
  icons: Record<string, string>;
  license: string;
}> {
  const { LUCIDE_ICONS, LUCIDE_LICENSE_NOTICE } = await loadLucideCatalog();
  const selected = new Set<string>();

  function walk(value: unknown, key = ''): void {
    if (typeof value === 'string') {
      if (isIconProperty(key) && LUCIDE_ICONS[value]) selected.add(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, key);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [childKey, childValue] of Object.entries(value)) walk(childValue, childKey);
  }

  walk(doc);
  return {
    icons: Object.fromEntries([...selected].sort().map((name) => [name, LUCIDE_ICONS[name]])),
    license: LUCIDE_LICENSE_NOTICE,
  };
}
