import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dispatch, seal, unseal, validatePackage, validateUploadManifest } from './worker.js';

const origin = 'https://cgges-aprendizagem.github.io';
const host = 'https://pgip-publisher.example.workers.dev';
const repo = 'https://api.github.com/repos/cgges-aprendizagem/pgip';
const env = { GITHUB_CLIENT_SECRET: 'fake-test-only', SESSION_SECRET: 'a'.repeat(64) };
const stamp = Math.floor(Date.now() / 1000);
const materialSha = 'a'.repeat(40), head = 'b'.repeat(40), rootTree = 'c'.repeat(40), jsonSha = 'd'.repeat(40);
const auth = await seal({ purpose: 'session', token: 'test-user-token', login: 'test-user', exp: stamp + 60 }, env);
const headers = { Origin: origin, Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' };
const document = { schema: 1, meta: { title: 'M121 - Teste' }, blocks: [{ id: 'a', type: 'paragrafo', props: { text: 'Teste' } }], imageSlots: {} };
const files = [
  { path: 'index.html', content: btoa('<!doctype html><title>Teste</title>') },
  { path: 'projetom121.spu.json', content: btoa(JSON.stringify(document)) },
  { path: 'assets/images/a.png', content: btoa('PNG-test') },
];
const body = { material: 'm121', expectedMaterialSha: materialSha, source: { file: 'projetom121.spu.json', sha: jsonSha, directorySha: materialSha }, files };
const blobSHA = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
let calls = [];
const mock = async (url, options = {}) => {
  const streamed = options.body instanceof ReadableStream;
  const payload = options.body ? streamed ? await new Response(options.body).json() : JSON.parse(options.body) : null;
  calls.push({ url, method: options.method || 'GET', body: payload, streamed });
  assert.equal(options.headers.Authorization, 'Bearer test-user-token');
  if (url === repo) return Response.json({ permissions: { push: true } });
  if (url === `${repo}/git/ref/heads/main`) return Response.json({ object: { sha: head } });
  if (url === `${repo}/git/commits/${head}`) return Response.json({ tree: { sha: rootTree } });
  if (url === `${repo}/git/trees/${rootTree}`) return Response.json({ tree: [{ path: 'm121', type: 'tree', sha: materialSha }, { path: 'spu-builder', type: 'tree', sha: 'keep-builder' }] });
  if (url === `${repo}/git/trees/${materialSha}`) return Response.json({ tree: [{ path: 'projetom121.spu.json', type: 'blob', sha: jsonSha }, { path: 'custom-activity', type: 'tree', sha: 'keep-activity' }] });
  if (url === `${repo}/git/trees/${'f'.repeat(40)}`) return Response.json({ tree: [{ path: 'm121', type: 'tree', sha: '2'.repeat(40) }] });
  if (url.endsWith('/git/blobs')) return Response.json({ sha: blobSHA(Buffer.from(payload.content, 'base64')) }, { status: 201 });
  if (url.endsWith('/git/trees')) return Response.json({ sha: 'f'.repeat(40) }, { status: 201 });
  if (url.endsWith('/git/commits')) return Response.json({ sha: '1'.repeat(40) }, { status: 201 });
  if (url.endsWith('/git/refs/heads/main')) return Response.json({ object: { sha: '1'.repeat(40) } });
  throw new Error('Unexpected API call: ' + url);
};
const send = (value, fetcher = mock) => dispatch(new Request(host + '/publish', { method: 'POST', headers, body: JSON.stringify(value) }), env, fetcher);
let result = await dispatch(new Request(host + '/health'), {});
assert.equal((await result.json()).configured, false);
result = await dispatch(new Request(host + '/publish', { method: 'OPTIONS', headers: { Origin: 'https://evil.test' } }), env);
assert.equal(result.status, 403);
result = await dispatch(new Request(host + '/publish', { method: 'OPTIONS', headers: { Origin: origin } }), env);
assert.equal(result.status, 204);
assert.equal(result.headers.get('Access-Control-Allow-Origin'), origin);
result = await dispatch(new Request(host + '/session', { headers: { Origin: origin } }), env);
assert.equal(result.status, 401);
assert.equal((await unseal(auth, 'session', env)).login, 'test-user');
await assert.rejects(unseal(auth, 'oauth', env));
await assert.rejects(unseal(auth + 'x', 'session', env));
await assert.rejects(unseal(await seal({ purpose: 'session', exp: stamp - 1 }, env), 'session', env));
validatePackage(body);
for (const path of ['../m122/index.html', 'assets/../../.github/workflows/pages.yml', '.github/workflows/pages.yml', 'assets//bad.js', 'spu-builder/index.html']) {
  assert.throws(() => validatePackage({ ...body, files: [...files, { path, content: btoa('bad') }] }));
}
assert.throws(() => validatePackage({ ...body, material: '../m121' }));
assert.throws(() => validatePackage({ ...body, source: { file: '../file.spu.json', sha: jsonSha } }));
assert.throws(() => validatePackage({ ...body, material: 'm122', files: files.map(file => ({ ...file, path: file.path.replace('projetom121', 'projetom122') })) }));
assert.throws(() => validatePackage({ ...body, files: [...files, files[0]] }));
result = await send(body);
assert.equal(result.status, 200);
assert.equal((await result.json()).status, 'submitted');
const writes = calls.filter(call => call.method !== 'GET');
assert.equal(writes.length, 6);
assert.equal(writes.at(-1).method, 'PATCH');
assert.equal(writes.at(-1).body.force, false);
const tree = writes.find(call => call.url.endsWith('/git/trees')).body;
assert.equal(tree.base_tree, rootTree);
assert.ok(tree.tree.every(file => file.path.startsWith('m121/') && file.mode === '100644' && file.sha));
assert.ok(tree.tree.every(file => file.sha !== null), 'nenhum arquivo auxiliar é excluído');
assert.deepEqual(writes.find(call => call.url.endsWith('/git/commits')).body.parents, [head]);
calls = [];
result = await send({ ...body, expectedMaterialSha: '9'.repeat(40) });
assert.equal(result.status, 409);
assert.ok(calls.every(call => call.method === 'GET'), 'conflito é detectado antes do envio');
calls = [];
result = await send({ ...body, source: { file: 'projetom121.spu.json', sha: '9'.repeat(40) } });
assert.equal(result.status, 409);
assert.ok(calls.every(call => call.method === 'GET'), 'rascunho antigo não sobrescreve JSON novo');
result = await send({ ...body, source: { ...body.source, directorySha: '9'.repeat(40) } });
assert.equal(result.status, 409);
result = await send(body, async (url, options) => url.endsWith('/git/refs/heads/main') ? Response.json({}, { status: 422 }) : mock(url, options));
assert.equal(result.status, 409);
result = await send(body, async () => Response.json({ permissions: { push: false } }));
assert.equal(result.status, 403);
// Protocolo por arquivo: manifesto pequeno, conteúdo encaminhado por stream,
// hashes conferidos e avanço da branch somente ao finalizar todo o pacote.
const manifest = { ...body, title: document.meta.title, files: files.map(file => {
  const bytes = Buffer.from(file.content, 'base64');
  return { path: file.path, size: bytes.length, sha: blobSHA(bytes) };
}) };
const uploadRequest = (path, value, ticket = auth, fetcher = mock, extra = {}) => dispatch(new Request(host + path, {
  method: 'POST', headers: { ...headers, Authorization: `Bearer ${ticket}`, ...extra }, body: JSON.stringify(value),
}), env, fetcher);
result = await dispatch(new Request(host + '/health'), env);
assert.deepEqual(await result.json(), { service: 'PGIP Publisher', configured: true, uploadVersion: 2, maxFileMB: 70, maxPackageMB: null });
validateUploadManifest(manifest);
for (const path of ['../m122/index.html', 'assets/../../.github/workflows/pages.yml', 'assets//bad.js']) {
  assert.throws(() => validateUploadManifest({ ...manifest, files: [...manifest.files, { path, size: 1, sha: jsonSha }] }));
}
// A soma de 360 MiB é aceita: não existe teto de tamanho total do material.
validateUploadManifest({ ...manifest, files: [...manifest.files, ...['b', 'c', 'd'].map(name => ({ path: `assets/${name}.png`, size: 60 * 1024 * 1024, sha: jsonSha }))].map(file => ({ ...file, size: 60 * 1024 * 1024 })) });
assert.throws(() => validateUploadManifest({ ...manifest, files: manifest.files.map(file => ({ ...file, size: 71 * 1024 * 1024 })) }));
assert.throws(() => validateUploadManifest({ ...manifest, files: [...manifest.files, manifest.files[0]] }));
calls = [];
result = await uploadRequest('/publish/prepare', manifest);
assert.equal(result.status, 200);
const ticket = (await result.json()).upload;
assert.ok(calls.every(call => call.method === 'GET'));
assert.equal((await unseal(ticket, 'upload', env)).files.length, files.length);
await assert.rejects(unseal(ticket, 'session', env));
for (let i = 0; i < files.length; i++) {
  result = await uploadRequest(`/publish/blob?file=${i}`, { content: files[i].content, encoding: 'base64' }, ticket);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).sha, manifest.files[i].sha);
}
assert.ok(calls.filter(call => call.method === 'POST').every(call => call.url.endsWith('/git/blobs') && call.streamed));
assert.ok(!calls.some(call => call.method === 'PATCH'));
result = await uploadRequest('/publish/complete', {}, ticket);
assert.equal(result.status, 200);
assert.equal((await result.json()).jsonSha, manifest.files[1].sha);
assert.equal(calls.filter(call => call.method === 'PATCH').length, 1);
assert.deepEqual(calls.find(call => call.url.endsWith('/git/trees')).body.tree.map(file => file.sha), manifest.files.map(file => file.sha));
calls = [];
result = await uploadRequest('/publish/blob?file=0', { content: btoa('different'), encoding: 'base64' }, ticket);
assert.equal(result.status, 400);
result = await uploadRequest('/publish/blob?file=3', { content: '', encoding: 'base64' }, ticket);
assert.equal(result.status, 400);
result = await uploadRequest('/publish/blob?file=0', { content: files[0].content }, auth);
assert.equal(result.status, 401);
result = await uploadRequest('/publish/blob?file=0', {}, ticket, mock, { 'Content-Length': '100000' });
assert.equal(result.status, 413);
result = await uploadRequest('/publish/blob?file=0', { content: 'x'.repeat(5000) }, ticket);
assert.equal(result.status, 413);
assert.ok(!calls.some(call => call.method === 'PATCH'));
// Fluxo fragmentado não é convertido em um grande objeto no Worker.
const encoded = new TextEncoder().encode(JSON.stringify({ content: files[0].content, encoding: 'base64' }));
const stream = new ReadableStream({ start(controller) { for (let i = 0; i < encoded.length; i += 7) controller.enqueue(encoded.slice(i, i + 7)); controller.close(); } });
result = await dispatch(new Request(host + '/publish/blob?file=0', { method: 'POST', headers: { ...headers, Authorization: `Bearer ${ticket}` }, body: stream, duplex: 'half' }), env, mock);
assert.equal(result.status, 200);
calls = [];
result = await uploadRequest('/publish/complete', {}, ticket, async (url, options) => url === `${repo}/git/trees/${rootTree}` ? Response.json({ tree: [{ path: 'm121', type: 'tree', sha: '9'.repeat(40) }] }) : url === `${repo}/git/trees/${'9'.repeat(40)}` ? Response.json({ tree: [] }) : mock(url, options));
assert.equal(result.status, 409);
assert.ok(calls.every(call => call.method === 'GET'));
// Um blob ausente impede a árvore final, sem alterar a referência publicada.
result = await uploadRequest('/publish/complete', {}, ticket, async (url, options) => url.endsWith('/git/trees') ? Response.json({}, { status: 422 }) : mock(url, options));
assert.equal(result.status, 502);
assert.ok(!calls.some(call => call.method === 'PATCH'));
result = await uploadRequest('/publish/prepare', { ...manifest, expectedMaterialSha: '9'.repeat(40) });
assert.equal(result.status, 409);

// OAuth: cookie cifrado, state e PKCE; nenhum token cru volta ao navegador.
result = await dispatch(new Request(host + '/auth/start?return=' + encodeURIComponent(origin + '/pgip/spu-builder/?material=m121')), env);
assert.equal(result.status, 302);
const authorization = new URL(result.headers.get('Location'));
assert.equal(authorization.origin, 'https://github.com');
assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
const cookie = result.headers.get('Set-Cookie');
assert.match(cookie, /Secure; HttpOnly; SameSite=Lax/);
const cookieValue = cookie.split(';')[0];
const oauth = await unseal(cookieValue.slice(cookieValue.indexOf('=') + 1), 'oauth', env);
assert.equal(oauth.state, authorization.searchParams.get('state'));
result = await dispatch(new Request(host + '/auth/start?return=https://evil.test/'), env);
assert.equal(result.status, 400);
let exchanges = 0;
const oauthMock = async (url, options) => {
  if (url === 'https://github.com/login/oauth/access_token') {
    exchanges++;
    const request = JSON.parse(options.body);
    assert.equal(request.code_verifier, oauth.verifier);
    assert.equal(request.redirect_uri, host + '/auth/callback');
    return Response.json({ access_token: 'test-user-token', expires_in: 28800 });
  }
  if (url === 'https://api.github.com/user') return Response.json({ login: 'test-user' });
  return mock(url, options);
};
result = await dispatch(new Request(host + '/auth/callback?code=fake&state=wrong', { headers: { Cookie: cookieValue } }), env, oauthMock);
assert.equal(exchanges, 0);
assert.ok(new URL(result.headers.get('Location')).hash.includes('publish_error'));
result = await dispatch(new Request(`${host}/auth/callback?code=fake&state=${oauth.state}`, { headers: { Cookie: cookieValue } }), env, oauthMock);
assert.equal(result.status, 302);
const returned = new URL(result.headers.get('Location'));
assert.equal(returned.searchParams.get('material'), 'm121');
assert.ok(!returned.href.includes('test-user-token'));
const returnedAuth = new URLSearchParams(returned.hash.slice(1)).get('publish_session');
assert.equal((await unseal(returnedAuth, 'session', env)).login, 'test-user');
console.log('OK: uploads por stream sem teto total, hashes, falhas parciais e finalização; OAuth/state/PKCE, sessão cifrada, CORS, permissões, caminhos, publicação atômica, preservação de arquivos e conflitos. Nenhuma chamada real ao GitHub.');
