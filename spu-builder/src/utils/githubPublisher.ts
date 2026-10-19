import type { Doc } from '../types/ds';
import { buildAssetsPackage, type ImageQuality } from './exportFormats';

export const PUBLISHER = 'https://pgip-publisher.luis-lindner-ifsc.workers.dev';
const SESSION_KEY = 'pgip_publisher_session';
const hash = new URLSearchParams(window.location.hash.slice(1));
export const initialPublishError = hash.get('publish_error') || '';
if (hash.has('publish_session')) sessionStorage.setItem(SESSION_KEY, hash.get('publish_session')!);
if (hash.has('publish_session') || hash.has('publish_error')) {
  const clean = new URL(window.location.href); clean.hash = '';
  window.history.replaceState(null, '', clean);
}
export const hasPublishSession = () => Boolean(sessionStorage.getItem(SESSION_KEY));
export const disconnectPublisher = () => sessionStorage.removeItem(SESSION_KEY);
export const materialCode = (title: string) => title.match(/\b(m\d+[a-z]?)\b/i)?.[1].toLowerCase() || '';
export type PublishedSource = { file: string; sha: string; directorySha?: string };
export type MaterialVersion = { materialSha: string; exists: boolean; jsonShas: Record<string, string> };
export function originalSource(material: string): PublishedSource | undefined {
  try {
    const source = JSON.parse(localStorage.getItem(`spu_published_revision_${material}`) || 'null');
    return source && typeof source.file === 'string' && typeof source.sha === 'string' ? source : undefined;
  } catch { return undefined; }
}
export async function publisherAPI<T>(path: string, body?: unknown, upload?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(PUBLISHER + path, { method: body === undefined ? 'GET' : 'POST', cache: 'no-store', headers: {
      ...((upload || hasPublishSession()) ? { Authorization: `Bearer ${upload || sessionStorage.getItem(SESSION_KEY)}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch { throw new Error('Não foi possível acessar o serviço de publicação. Verifique sua conexão ou a configuração na Cloudflare.'); }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('O serviço de publicação ainda precisa receber o código e a configuração na Cloudflare.'); }
  if (!response.ok) {
    if (response.status === 401) disconnectPublisher();
    throw new Error(data.error || 'Não foi possível concluir a publicação.');
  }
  return data as T;
}
export function publisherLogin() {
  const target = new URL(window.location.href); target.hash = '';
  target.searchParams.set('publicar', '1');
  window.location.assign(`${PUBLISHER}/auth/start?return=${encodeURIComponent(target.href)}`);
}
function base64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
async function gitBlobSHA(bytes: Uint8Array): Promise<string> {
  const prefix = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const data = new Uint8Array(prefix.length + bytes.length);
  data.set(prefix); data.set(bytes, prefix.length);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', data)), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function publishDocument(doc: Doc, quality: ImageQuality, version: MaterialVersion, source?: PublishedSource, progress?: (message: string) => void) {
  const material = materialCode(doc.meta.title);
  if (!material) throw new Error('Inclua o código do material no título, por exemplo: M121 - Bens imóveis públicos.');
  progress?.('Preparando arquivos…');
  const health = await publisherAPI<{ uploadVersion?: number }>('/health');
  if ((health.uploadVersion || 0) < 2) throw new Error('O serviço de publicação precisa ser atualizado na Cloudflare para receber arquivos grandes.');
  const files = Object.entries(await buildAssetsPackage(doc, quality));
  if (files.length > 100) throw new Error('O pacote contém mais de 100 arquivos. Use a exportação ZIP para este material.');
  const manifest = [];
  for (const [path, bytes] of files) {
    if (bytes.length > 70 * 1024 * 1024) throw new Error(`O arquivo ${path} ultrapassa 70 MB. Use imagens compactas ou exporte o ZIP.`);
    manifest.push({ path, size: bytes.length, sha: await gitBlobSHA(bytes) });
  }
  const prepared = await publisherAPI<{ upload: string }>('/publish/prepare', {
    material, title: doc.meta.title, expectedMaterialSha: version.materialSha, source, files: manifest,
  });
  for (let index = 0; index < files.length; index++) {
    progress?.(`Enviando arquivo ${index + 1} de ${files.length}…`);
    const result = await publisherAPI<{ sha: string }>(`/publish/blob?file=${index}`, { encoding: 'base64', content: base64(files[index][1]) }, prepared.upload);
    if (result.sha !== manifest[index].sha) throw new Error('Um arquivo não foi recebido integralmente. Tente publicar novamente.');
  }
  progress?.('Concluindo a atualização no GitHub…');
  return publisherAPI<{ commit: string; url: string; status: 'submitted'; jsonSha: string; materialSha: string }>('/publish/complete', {}, prepared.upload);
}
