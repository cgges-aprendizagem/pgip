import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const storage = new Map();
const local = new Map();
let replacedURL; let assignedURL; let sent; let responseStatus = 200;
let files = { 'index.html': new TextEncoder().encode('<!doctype html>'), 'projetom121.spu.json': new TextEncoder().encode('{"teste":"á"}') };
const context = vm.createContext({
  URL, URLSearchParams, Uint8Array, btoa,
  window: { location: { href: 'https://cgges-aprendizagem.github.io/pgip/spu-builder/?material=m121#publish_session=sealed-session', hash: '#publish_session=sealed-session', assign: url => { assignedURL = url; } }, history: { replaceState: (_a, _b, url) => { replacedURL = url.href; } } },
  sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  localStorage: { getItem: key => local.get(key) || null },
  fetch: async (url, options) => { sent = { url, ...options }; return Response.json(responseStatus === 200 ? { status: 'submitted', jsonSha: 'a'.repeat(40) } : { error: 'Entre novamente' }, { status: responseStatus }); },
});
const source = readFileSync(new URL('../src/utils/githubPublisher.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(() => ({ buildAssetsPackage: async () => files }), module, module.exports);
const client = module.exports;
assert.ok(client.hasPublishSession());
assert.ok(!replacedURL.includes('#'));
assert.ok(!replacedURL.includes('sealed-session'));
assert.equal(client.materialCode('M134a - Complemento'), 'm134a');
assert.equal(client.materialCode('Rascunho'), '');
local.set('spu_published_revision_m121', JSON.stringify({ file: 'projetom121.spu.json', sha: 'a'.repeat(40) }));
assert.equal(client.originalSource('m121').sha, 'a'.repeat(40));
assert.equal(client.originalSource('m122'), undefined);
const version = { materialSha: 'b'.repeat(40), exists: true, jsonShas: {} };
await client.publishDocument({ meta: { title: 'M121 - Teste' } }, 'high', version, client.originalSource('m121'));
assert.equal(sent.method, 'POST');
assert.equal(sent.headers.Authorization, 'Bearer sealed-session');
const body = JSON.parse(sent.body);
assert.equal(body.material, 'm121');
assert.equal(body.expectedMaterialSha, version.materialSha);
assert.equal(body.source.sha, 'a'.repeat(40));
assert.equal(Buffer.from(body.files[1].content, 'base64').toString(), '{"teste":"á"}');
await assert.rejects(client.publishDocument({ meta: { title: 'Rascunho' } }, 'high', version), /código/);
files = { big: new Uint8Array(21 * 1024 * 1024) };
await assert.rejects(client.publishDocument({ meta: { title: 'M121 - Teste' } }, 'high', version), /20 MB/);
responseStatus = 401;
await assert.rejects(client.publisherAPI('/session'), /Entre novamente/);
assert.equal(client.hasPublishSession(), false);
client.publisherLogin();
const login = new URL(assignedURL);
assert.equal(login.pathname, '/auth/start');
assert.equal(new URL(login.searchParams.get('return')).hash, '');
assert.equal(new URL(login.searchParams.get('return')).searchParams.get('publicar'), '1');
console.log('OK: retorno do login, remoção do fragmento, sessão, versão de origem, base64 UTF-8, limites e reautenticação.');
