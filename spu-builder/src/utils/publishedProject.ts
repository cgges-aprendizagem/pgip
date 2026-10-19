import type { Doc, BuilderExportType } from '../types/ds';
import { parseProjectFile } from './projectFile';
import { normalizeProjectContent } from './projectCompat';

export function publishedProjectLocation(href: string) {
  const page = new URL(href);
  const code = page.searchParams.get('material');
  if (code === null) return null;
  if (!/^m\d+[a-z]?$/i.test(code)) throw new Error('O código do material informado no link é inválido.');
  const material = code.toLowerCase();
  const file = page.searchParams.get('arquivo') || `projeto${material}.spu.json`;
  if (!/^[^/\\]+\.spu\.json$/i.test(file) || file.includes('..')) throw new Error('O nome do arquivo de projeto é inválido.');
  const directory = new URL(`../${material}/`, page);
  return { material, directory, json: new URL(encodeURIComponent(file), directory) };
}

export function projectStorageSuffix(href: string): string {
  try {
    const location = publishedProjectLocation(href);
    return location ? `_${location.material}` : '';
  } catch { return ''; }
}

async function imageAsDataURL(url: URL, fetcher: typeof fetch): Promise<string> {
  const response = await fetcher(url.href, { cache: 'no-cache' });
  if (!response.ok) throw new Error('Não foi possível recuperar uma imagem do material.');
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('O arquivo de imagem publicado é inválido.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler uma imagem do material.'));
    reader.readAsDataURL(blob);
  });
}

export async function loadPublishedProject(href: string, builder: BuilderExportType, fetcher: typeof fetch = fetch): Promise<{ doc: Doc; imageSlots: string; sourceJsonSha: string; sourceFile: string; sourceDirectorySha?: string }> {
  const location = publishedProjectLocation(href);
  if (!location) throw new Error('O link não informa qual material abrir.');
  const response = await fetcher(location.json.href, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Não foi possível carregar ${location.material.toUpperCase()}. Verifique se o JSON está publicado.`);
  const text = await response.text();
  const bytes = new TextEncoder().encode(text);
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const gitBlob = new Uint8Array(header.length + bytes.length);
  gitBlob.set(header); gitBlob.set(bytes, header.length);
  const sourceJsonSha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', gitBlob)), byte => byte.toString(16).padStart(2, '0')).join('');
  const sourceFile = decodeURIComponent(location.json.pathname.split('/').pop()!);
  let sourceDirectorySha: string | undefined;
  try {
    const manifest = await fetcher(new URL('../materials-state.json', location.directory).href, { cache: 'no-cache' });
    if (manifest.ok) {
      const entry = (await manifest.json())[location.material];
      if (entry?.jsonFile === sourceFile && entry?.jsonSha === sourceJsonSha && /^[a-f0-9]{40}$/.test(entry?.directorySha)) sourceDirectorySha = entry.directorySha;
    }
  } catch { /* Compatibilidade com publicações anteriores ao manifesto. */ }
  const parsed = parseProjectFile(text, location.json.pathname);
  const raw = parsed.raw as Partial<Doc> | null;
  if (!raw || !Array.isArray(raw.blocks) || !raw.meta || typeof raw.meta.title !== 'string') throw new Error('O JSON publicado não contém um projeto válido do builder.');
  const migrated = builder.migrate(normalizeProjectContent(raw));
  const doc = builder.sanitize ? builder.sanitize(migrated) : migrated;
  let slots = parsed.imageSlots;
  // Publicações antigas guardam as imagens no sidecar do HTML.
  if (slots === undefined) {
    const htmlResponse = await fetcher(new URL('index.html', location.directory).href, { cache: 'no-cache' });
    if (!htmlResponse.ok) throw new Error('Não foi possível recuperar as imagens da publicação antiga.');
    const html = new DOMParser().parseFromString(await htmlResponse.text(), 'text/html');
    slots = html.getElementById('spu-image-slots')?.textContent || '{}';
  }
  const images = JSON.parse(slots);
  if (!images || typeof images !== 'object' || Array.isArray(images)) throw new Error('As imagens publicadas são inválidas.');
  const conversions = new Map<string, Promise<string>>();
  const convert = (source: string) => {
    if (!source || source.startsWith('data:image/')) return Promise.resolve(source);
    const url = new URL(source, location.directory);
    if (url.origin !== location.directory.origin || !url.pathname.startsWith(location.directory.pathname)) throw new Error('Uma imagem aponta para fora da pasta do material.');
    if (!conversions.has(url.href)) conversions.set(url.href, imageAsDataURL(url, fetcher));
    return conversions.get(url.href)!;
  };
  await Promise.all(Object.entries(images).map(async ([id, slot]) => {
    if (typeof slot === 'string') images[id] = await convert(slot);
    else if (slot && typeof slot === 'object' && 'u' in slot && typeof slot.u === 'string') slot.u = await convert(slot.u);
  }));
  return { doc, imageSlots: JSON.stringify(images), sourceJsonSha, sourceFile, sourceDirectorySha };
}
