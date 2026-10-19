// Cloudflare Worker (ES module). Configure os dois secrets na Cloudflare.
const CLIENT_ID = 'Iv23liM0WNblbYs6ffuA';
const BUILDER = 'https://cgges-aprendizagem.github.io/pgip/spu-builder/';
const REPO = 'cgges-aprendizagem/pgip';
const API = `https://api.github.com/repos/${REPO}`;
const ORIGIN = new URL(BUILDER).origin;
const COOKIE = '__Host-pgip-oauth';
const MAX_REQUEST = 28 * 1024 * 1024;
const MAX_FILES = 40; // Formato legado, mantido para abas já abertas.
const MAX_UPLOAD_FILES = 100;
const MAX_UPLOAD_FILE = 70 * 1024 * 1024;
const MAX_DECODED = 20 * 1024 * 1024;
const encoder = new TextEncoder();

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function assert(condition, status, message) { if (!condition) throw new HttpError(status, message); }
function base64(bytes) {
  let value = '';
  for (let i = 0; i < bytes.length; i += 8192) value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
function url64(bytes) { return base64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); }
function from64(value) {
  const text = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
  return Uint8Array.from(text, c => c.charCodeAt(0));
}
const random = () => url64(crypto.getRandomValues(new Uint8Array(32)));
const now = () => Math.floor(Date.now() / 1000);
async function key(env) {
  assert(typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length >= 32, 503, 'O serviço de publicação ainda precisa ser configurado.');
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', encoder.encode(env.SESSION_SECRET)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(env), encoder.encode(JSON.stringify(value)));
  return `${url64(iv)}.${url64(new Uint8Array(data))}`;
}
export async function unseal(value, purpose, env) {
  try {
    assert(typeof value === 'string' && value.length < 64000, 401, 'Entre novamente com o GitHub.');
    const parts = value.split('.');
    assert(parts.length === 2, 401, 'Entre novamente com o GitHub.');
    const decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: from64(parts[0]) }, await key(env), from64(parts[1]));
    const data = JSON.parse(new TextDecoder().decode(decoded));
    assert(data.purpose === purpose && Number.isFinite(data.exp) && data.exp > now(), 401, 'A autorização expirou. Entre novamente com o GitHub.');
    return data;
  } catch { throw new HttpError(401, 'A autorização expirou ou é inválida. Entre novamente com o GitHub.'); }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function redirect(url, cookie = '') {
  const headers = { Location: url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(null, { status: 302, headers });
}
function returnURL(input) {
  const url = new URL(input || BUILDER);
  assert(url.origin === ORIGIN && url.pathname === new URL(BUILDER).pathname, 400, 'Endereço de retorno inválido.');
  url.hash = '';
  url.searchParams.set('publicar', '1');
  return url;
}
function checkOrigin(request) {
  assert(request.headers.get('Origin') === ORIGIN, 403, 'Solicitação não autorizada. Abra o builder do PGIP.');
}
async function github(url, token, method = 'GET', body, fetcher = fetch) {
  const response = await fetcher(url, { method, headers: {
    Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'PGIP-Publisher',
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
  }, ...(body === undefined ? {} : { body: body instanceof ReadableStream ? body : JSON.stringify(body) }) });
  if (!response.ok) {
    const conflict = method === 'PATCH' && [409, 422].includes(response.status);
    throw new HttpError(conflict ? 409 : response.status === 401 ? 401 : response.status === 403 || response.status === 404 ? 403 : 502,
      conflict ? 'O repositório foi atualizado durante o envio. Confira a versão publicada e tente novamente.'
      : response.status === 401 ? 'Entre novamente com o GitHub.'
      : 'O GitHub recusou a operação. Verifique a instalação do aplicativo e sua permissão de escrita no PGIP.');
  }
  return response.status === 204 ? null : response.json();
}
async function access(token, fetcher) {
  const repo = await github(API, token, 'GET', undefined, fetcher);
  assert(repo.permissions?.push === true, 403, 'Sua conta precisa de permissão de escrita no PGIP.');
  return repo;
}
async function snapshot(token, material, fetcher) {
  const ref = await github(`${API}/git/ref/heads/main`, token, 'GET', undefined, fetcher);
  const commit = await github(`${API}/git/commits/${ref.object.sha}`, token, 'GET', undefined, fetcher);
  const root = await github(`${API}/git/trees/${commit.tree.sha}`, token, 'GET', undefined, fetcher);
  assert(!root.truncated, 502, 'Não foi possível conferir a versão atual do repositório.');
  const entry = root.tree.find(item => item.path === material);
  assert(!entry || entry.type === 'tree', 409, 'O destino do material não é uma pasta.');
  const jsonShas = {};
  if (entry) {
    const directory = await github(`${API}/git/trees/${entry.sha}`, token, 'GET', undefined, fetcher);
    assert(!directory.truncated, 502, 'Não foi possível conferir os arquivos do material.');
    for (const file of directory.tree) if (file.type === 'blob' && file.path.endsWith('.spu.json')) jsonShas[file.path] = file.sha;
  }
  return { head: ref.object.sha, tree: commit.tree.sha, materialSha: entry?.sha || 'missing', jsonShas };
}
async function session(request, env, purpose = 'session') {
  const authorization = request.headers.get('Authorization') || '';
  assert(authorization.startsWith('Bearer '), 401, 'Entre com o GitHub para publicar.');
  return unseal(authorization.slice(7), purpose, env);
}
async function bodyJSON(request, maximum = MAX_REQUEST) {
  assert(request.headers.get('Content-Type')?.startsWith('application/json'), 415, 'Formato de envio inválido.');
  assert(Number(request.headers.get('Content-Length') || 0) <= maximum, 413, 'O pacote é grande demais para a publicação direta. Use a exportação ZIP.');
  const reader = request.body?.getReader();
  assert(reader, 400, 'Pacote ausente.');
  const chunks = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maximum) { await reader.cancel(); throw new HttpError(413, 'O pacote é grande demais para a publicação direta. Use a exportação ZIP.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new HttpError(400, 'Pacote de publicação inválido.'); }
}
export function validatePackage(body) {
  assert(body && /^m\d+[a-z]?$/.test(body.material), 400, 'Código do material inválido.');
  assert(typeof body.expectedMaterialSha === 'string' && /^(missing|[a-f0-9]{40})$/.test(body.expectedMaterialSha), 400, 'Confira a versão atual antes de publicar.');
  assert(Array.isArray(body.files) && body.files.length > 0 && body.files.length <= MAX_FILES, 400, 'Quantidade de arquivos inválida.');
  if (body.source) assert(typeof body.source.file === 'string' && /^[^/\\]+\.spu\.json$/.test(body.source.file) && !body.source.file.includes('..') && /^[a-f0-9]{40}$/.test(body.source.sha), 400, 'Versão de origem inválida.');
  if (body.source?.directorySha) assert(/^[a-f0-9]{40}$/.test(body.source.directorySha), 400, 'Versão da pasta de origem inválida.');
  const seen = new Set(); let size = 0; let project; let html;
  for (const file of body.files) {
    assert(file && typeof file.path === 'string' && typeof file.content === 'string', 400, 'Arquivo inválido.');
    const allowed = file.path === 'index.html' || file.path === `projeto${body.material}.spu.json` || /^assets\/[a-zA-Z0-9_./-]+$/.test(file.path);
    assert(allowed && file.path.split('/').every(part => part && part !== '.' && part !== '..') && !seen.has(file.path), 400, 'O pacote contém um caminho inválido ou repetido.');
    seen.add(file.path);
    assert(file.content.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(file.content), 400, 'Conteúdo de arquivo inválido.');
    let bytes;
    try { bytes = from64(file.content); } catch { throw new HttpError(400, 'Conteúdo de arquivo inválido.'); }
    size += bytes.length;
    assert(size <= MAX_DECODED, 413, 'O pacote ultrapassa 20 MB. Escolha imagens compactas ou exporte o ZIP.');
    if (file.path.endsWith('.spu.json')) {
      try { project = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'JSON do projeto inválido.'); }
    }
    if (file.path === 'index.html') html = new TextDecoder().decode(bytes);
  }
  const code = project?.meta?.title?.match(/\b(m\d+[a-z]?)\b/i)?.[1].toLowerCase();
  assert(code === body.material && Array.isArray(project.blocks) && project.imageSlots && typeof project.imageSlots === 'object' && !Array.isArray(project.imageSlots), 400, 'O título e o JSON precisam corresponder ao código do material.');
  assert(typeof html === 'string' && /<!doctype html/i.test(html), 400, 'A página HTML está ausente ou é inválida.');
  return body;
}
async function commitFiles(auth, body, current, tree, jsonSha, fetcher) {
  const createdTree = await github(`${API}/git/trees`, auth.token, 'POST', { base_tree: current.tree, tree }, fetcher);
  const commit = await github(`${API}/git/commits`, auth.token, 'POST', { message: `Atualizar ${body.material.toUpperCase()} pelo SPU Builder (${auth.login})`, tree: createdTree.sha, parents: [current.head] }, fetcher);
  const committedRoot = await github(`${API}/git/trees/${createdTree.sha}`, auth.token, 'GET', undefined, fetcher);
  const materialSha = committedRoot.tree.find(file => file.path === body.material)?.sha;
  assert(!committedRoot.truncated && /^[a-f0-9]{40}$/.test(materialSha || ''), 502, 'Não foi possível conferir o pacote criado. A versão publicada não foi alterada.');
  await github(`${API}/git/refs/heads/main`, auth.token, 'PATCH', { sha: commit.sha, force: false }, fetcher);
  return json({ commit: `https://github.com/${REPO}/commit/${commit.sha}`, url: `https://cgges-aprendizagem.github.io/pgip/${body.material}/`, status: 'submitted', jsonSha, materialSha });
}
function checkVersion(body, current) {
  assert(current.materialSha === body.expectedMaterialSha, 409, 'Este material foi alterado no GitHub após sua conferência. Abra a versão publicada antes de tentar novamente.');
  if (body.source) assert(current.jsonShas[body.source.file] === body.source.sha, 409, 'O JSON mudou desde que você começou a editar. Abra a versão publicada antes de substituir o trabalho de outra pessoa.');
  if (body.source?.directorySha) assert(body.source.directorySha === current.materialSha, 409, 'Os arquivos do material mudaram desde que você começou a editar. Abra a versão publicada antes de tentar novamente.');
}
export function validateUploadManifest(body) {
  assert(body && /^m\d+[a-z]?$/.test(body.material), 400, 'Código do material inválido.');
  assert(typeof body.title === 'string' && body.title.match(/\b(m\d+[a-z]?)\b/i)?.[1].toLowerCase() === body.material, 400, 'O título precisa corresponder ao código do material.');
  assert(/^(missing|[a-f0-9]{40})$/.test(body.expectedMaterialSha || ''), 400, 'Confira a versão atual antes de publicar.');
  assert(Array.isArray(body.files) && body.files.length > 0 && body.files.length <= MAX_UPLOAD_FILES, 400, 'O pacote pode conter até 100 arquivos.');
  if (body.source) assert(typeof body.source.file === 'string' && /^[^/\\]+\.spu\.json$/.test(body.source.file) && !body.source.file.includes('..') && /^[a-f0-9]{40}$/.test(body.source.sha) && (!body.source.directorySha || /^[a-f0-9]{40}$/.test(body.source.directorySha)), 400, 'Versão de origem inválida.');
  const paths = new Set();
  const files = body.files.map(file => {
    const allowed = typeof file?.path === 'string' && file.path.length <= 180 && (file.path === 'index.html' || file.path === `projeto${body.material}.spu.json` || /^assets\/[a-zA-Z0-9_./-]+$/.test(file.path));
    assert(allowed && file.path.split('/').every(part => part && part !== '.' && part !== '..') && !paths.has(file.path), 400, 'Caminho inválido ou repetido.');
    assert(Number.isSafeInteger(file.size) && file.size >= 0 && file.size <= MAX_UPLOAD_FILE, 413, 'Cada arquivo pode ter até 70 MB neste serviço.');
    assert(/^[a-f0-9]{40}$/.test(file.sha || ''), 400, 'Identificação do arquivo inválida.');
    paths.add(file.path);
    return { path: file.path, size: file.size, sha: file.sha };
  });
  assert(paths.has('index.html') && paths.has(`projeto${body.material}.spu.json`), 400, 'O pacote precisa conter o HTML e o JSON editável.');
  return { material: body.material, title: body.title, expectedMaterialSha: body.expectedMaterialSha, source: body.source ? { file: body.source.file, sha: body.source.sha, ...(body.source.directorySha ? { directorySha: body.source.directorySha } : {}) } : undefined, files };
}
function limitedBlobBody(request, size) {
  const maximum = Math.ceil(size / 3) * 4 + 256;
  assert(Number(request.headers.get('Content-Length') || 0) <= maximum, 413, 'O arquivo enviado é maior que o informado.');
  assert(request.headers.get('Content-Type')?.startsWith('application/json') && request.body, 415, 'Formato de envio inválido.');
  let count = 0;
  return request.body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      count += chunk.byteLength;
      assert(count <= maximum, 413, 'O arquivo enviado é maior que o informado.');
      controller.enqueue(chunk);
    },
  }));
}
async function handle(request, env, fetcher) {
  const url = new URL(request.url);
  if (url.pathname === '/health') return json({ service: 'PGIP Publisher', configured: Boolean(env.GITHUB_CLIENT_SECRET && env.SESSION_SECRET?.length >= 32), uploadVersion: 2, maxFileMB: 70, maxPackageMB: null });
  if (url.pathname === '/') return new Response('PGIP Publisher. Abra o SPU Builder para publicar materiais.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  assert(env.GITHUB_CLIENT_SECRET && env.SESSION_SECRET?.length >= 32, 503, 'O serviço de publicação ainda precisa ser configurado na Cloudflare.');
  const callback = `${url.origin}/auth/callback`;
  if (request.method === 'GET' && url.pathname === '/auth/start') {
    const target = returnURL(url.searchParams.get('return'));
    const state = random(); const verifier = random();
    const cookie = await seal({ purpose: 'oauth', state, verifier, returnTo: target.href, exp: now() + 600 }, env);
    const auth = new URL('https://github.com/login/oauth/authorize');
    const challenge = url64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
    auth.search = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: callback, state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    return redirect(auth.href, `${COOKIE}=${cookie}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`);
  }
  if (request.method === 'GET' && url.pathname === '/auth/callback') {
    const value = request.headers.get('Cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    const clear = `${COOKIE}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
    let target = new URL(BUILDER);
    try {
      const oauth = await unseal(value, 'oauth', env);
      target = returnURL(oauth.returnTo);
      assert(!url.searchParams.has('error') && url.searchParams.get('state') === oauth.state && url.searchParams.get('code'), 400, 'A autorização do GitHub foi cancelada ou é inválida.');
      const response = await fetcher('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get('code'), redirect_uri: callback, code_verifier: oauth.verifier }) });
      const token = await response.json();
      assert(response.ok && token.access_token, 401, 'Não foi possível concluir o login com o GitHub.');
      await access(token.access_token, fetcher);
      const user = await github('https://api.github.com/user', token.access_token, 'GET', undefined, fetcher);
      const auth = await seal({ purpose: 'session', token: token.access_token, login: user.login, exp: now() + Math.min(token.expires_in || 3600, 3600) }, env);
      target.hash = new URLSearchParams({ publish_session: auth }).toString();
    } catch (error) {
      target.searchParams.set('publicar', '1');
      target.hash = new URLSearchParams({ publish_error: error instanceof HttpError ? error.message : 'Não foi possível concluir o login com o GitHub.' }).toString();
    }
    return redirect(target.href, clear);
  }
  checkOrigin(request);
  const uploading = ['/publish/blob', '/publish/complete'].includes(url.pathname);
  const auth = await session(request, env, uploading ? 'upload' : 'session');
  if (request.method === 'GET' && url.pathname === '/session') {
    await access(auth.token, fetcher);
    return json({ login: auth.login, repository: REPO, expiresAt: auth.exp });
  }
  if (request.method === 'GET' && url.pathname === '/material') {
    const code = url.searchParams.get('code');
    assert(/^m\d+[a-z]?$/.test(code || ''), 400, 'Código do material inválido.');
    await access(auth.token, fetcher);
    const current = await snapshot(auth.token, code, fetcher);
    return json({ material: code, materialSha: current.materialSha, exists: current.materialSha !== 'missing', jsonShas: current.jsonShas });
  }
  if (request.method === 'POST' && url.pathname === '/publish/prepare') {
    const body = validateUploadManifest(await bodyJSON(request, 64 * 1024));
    await access(auth.token, fetcher);
    const current = await snapshot(auth.token, body.material, fetcher);
    checkVersion(body, current);
    const upload = await seal({ ...body, purpose: 'upload', token: auth.token, login: auth.login, exp: Math.min(auth.exp, now() + 1800) }, env);
    return json({ upload });
  }
  if (request.method === 'POST' && url.pathname === '/publish/blob') {
    const body = validateUploadManifest(auth);
    const index = url.searchParams.get('file');
    assert(/^(0|[1-9]\d*)$/.test(index || ''), 400, 'Arquivo não informado.');
    const file = body.files[Number(index)];
    assert(file, 400, 'Arquivo fora do pacote autorizado.');
    // Encaminha o corpo ao GitHub sem carregar o arquivo inteiro na memória
    // ou converter suas imagens no Worker. O navegador prepara o base64.
    const blob = await github(`${API}/git/blobs`, auth.token, 'POST', limitedBlobBody(request, file.size), fetcher);
    assert(blob.sha === file.sha, 400, 'O arquivo recebido difere do pacote preparado. Tente enviar novamente.');
    return json({ sha: blob.sha });
  }
  if (request.method === 'POST' && url.pathname === '/publish/complete') {
    const body = validateUploadManifest(auth);
    await access(auth.token, fetcher);
    const current = await snapshot(auth.token, body.material, fetcher);
    checkVersion(body, current);
    const tree = body.files.map(file => ({ path: `${body.material}/${file.path}`, mode: '100644', type: 'blob', sha: file.sha }));
    const jsonSha = body.files.find(file => file.path === `projeto${body.material}.spu.json`).sha;
    return commitFiles(auth, body, current, tree, jsonSha, fetcher);
  }
  if (request.method === 'POST' && url.pathname === '/publish') {
    const body = validatePackage(await bodyJSON(request));
    await access(auth.token, fetcher);
    const current = await snapshot(auth.token, body.material, fetcher);
    assert(current.materialSha === body.expectedMaterialSha, 409, 'Este material foi alterado no GitHub após sua conferência. Abra a versão publicada antes de tentar novamente.');
    if (body.source) assert(current.jsonShas[body.source.file] === body.source.sha, 409, 'O JSON deste material mudou desde que você começou a editar. Abra a versão publicada para evitar substituir alterações de outra pessoa.');
    if (body.source?.directorySha) assert(body.source.directorySha === current.materialSha, 409, 'Os arquivos deste material mudaram desde que você começou a editar. Abra a versão publicada antes de substituir o trabalho de outra pessoa.');
    const tree = [];
    let jsonSha;
    // Os arquivos existentes fora do pacote, inclusive atividades auxiliares,
    // são preservados. A referência só muda depois de criar o pacote inteiro.
    for (const file of body.files) {
      const blob = await github(`${API}/git/blobs`, auth.token, 'POST', { content: file.content, encoding: 'base64' }, fetcher);
      if (file.path.endsWith('.spu.json')) jsonSha = blob.sha;
      tree.push({ path: `${body.material}/${file.path}`, mode: '100644', type: 'blob', sha: blob.sha });
    }
    return commitFiles(auth, body, current, tree, jsonSha, fetcher);
  }
  throw new HttpError(404, 'Endereço não encontrado.');
}
export async function dispatch(request, env, fetcher = fetch) {
  let response;
  try {
    if (request.method === 'OPTIONS') {
      checkOrigin(request);
      response = new Response(null, { status: 204, headers: { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600' } });
    } else response = await handle(request, env, fetcher);
  } catch (error) { response = json({ error: error instanceof HttpError ? error.message : 'Não foi possível concluir a operação. Tente novamente.' }, error instanceof HttpError ? error.status : 500); }
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  if (request.headers.get('Origin') === ORIGIN) { headers.set('Access-Control-Allow-Origin', ORIGIN); headers.set('Vary', 'Origin'); }
  return new Response(response.body, { status: response.status, headers });
}
export default { fetch: (request, env) => dispatch(request, env) };
