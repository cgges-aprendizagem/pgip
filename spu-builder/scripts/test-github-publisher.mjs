import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const storage = new Map(); const local = new Map();
let replacedURL; let assignedURL; let responseStatus = 200; let uploadVersion = 2; let prepared; let calls = []; let uploadedBytes = 0;
let files = { 'index.html': new TextEncoder().encode('<!doctype html>'), 'projetom121.spu.json': new TextEncoder().encode('{"teste":"á"}') };
const gitSHA = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const context = vm.createContext({
  URL, URLSearchParams, Uint8Array, btoa, crypto, TextEncoder,
  window: { location: { href: 'https://cgges-aprendizagem.github.io/pgip/spu-builder/?material=m121#publish_session=sealed-session', hash: '#publish_session=sealed-session', assign: url => { assignedURL = url; } }, history: { replaceState: (_a, _b, url) => { replacedURL = url.href; } } },
  sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  localStorage: { getItem: key => local.get(key) || null },
  fetch: async (url, options) => {
    calls.push({ url, headers: options.headers, method: options.method });
    if (responseStatus !== 200) return Response.json({ error: 'Entre novamente' }, { status: responseStatus });
    if (url.endsWith('/health')) return Response.json({ uploadVersion, configured: true });
    if (url.endsWith('/prepare')) { prepared = JSON.parse(options.body); return Response.json({ upload: 'upload-ticket' }); }
    if (url.includes('/blob?file=')) {
      assert.equal(options.headers.Authorization, 'Bearer upload-ticket');
      const file = prepared.files[Number(new URL(url).searchParams.get('file'))];
      const data = JSON.parse(options.body); assert.equal(data.encoding, 'base64');
      const decoded = Buffer.from(data.content, 'base64');
      assert.equal(decoded.length, file.size);
      assert.equal(gitSHA(decoded), file.sha);
      assert.deepEqual(decoded, Buffer.from(files[file.path]));
      uploadedBytes += decoded.length;
      return Response.json({ sha: file.sha });
    }
    return Response.json({ status: 'submitted', jsonSha: 'a'.repeat(40) });
  },
});
const source = readFileSync(new URL('../src/utils/githubPublisher.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(() => ({ buildAssetsPackage: async () => files }), module, module.exports);
const client = module.exports;
assert.ok(client.hasPublishSession()); assert.ok(!replacedURL.includes('#')); assert.ok(!replacedURL.includes('sealed-session'));
assert.equal(client.materialCode('M134a - Complemento'), 'm134a'); assert.equal(client.materialCode('Rascunho'), '');
local.set('spu_published_revision_m121', JSON.stringify({ file: 'projetom121.spu.json', sha: 'a'.repeat(40) }));
assert.equal(client.originalSource('m121').sha, 'a'.repeat(40)); assert.equal(client.originalSource('m122'), undefined);
const version = { materialSha: 'b'.repeat(40), exists: true, jsonShas: {} };
const doc = { meta: { title: 'M121 - Teste' } };
const progress = [];
await client.publishDocument(doc, 'high', version, client.originalSource('m121'), message => progress.push(message));
assert.equal(prepared.material, 'm121'); assert.equal(prepared.expectedMaterialSha, version.materialSha); assert.equal(prepared.source.sha, 'a'.repeat(40));
assert.ok(prepared.files.every(file => !('content' in file)));
assert.equal(calls[1].headers.Authorization, 'Bearer sealed-session');
assert.ok(calls.at(-1).url.endsWith('/publish/complete')); assert.equal(calls.at(-1).headers.Authorization, 'Bearer upload-ticket');
assert.ok(progress.some(text => text.includes('arquivo 2 de 2')));
await assert.rejects(client.publishDocument({ meta: { title: 'Rascunho' } }, 'high', version), /código/);
uploadVersion = 1;
await assert.rejects(client.publishDocument(doc, 'high', version), /atualizado/);
uploadVersion = 2;
// Reproduz o M121 com todos os originais incorporados ao JSON (mais de 32 MB).
const root = new URL('../../', import.meta.url);
const project = JSON.parse(readFileSync(new URL('m121/projetom121.spu.json', root), 'utf8'));
project.imageSlots = {}; files = {};
for (const name of readdirSync(new URL('m121/assets/images/', root))) {
  const data = readFileSync(new URL('m121/assets/images/' + name, root));
  files['assets/images/' + name] = new Uint8Array(data);
  project.imageSlots[name] = { u: 'data:image/png;base64,' + data.toString('base64'), s: 1, x: 0, y: 0 };
}
files['projetom121.spu.json'] = new TextEncoder().encode(JSON.stringify(project));
files['index.html'] = new Uint8Array(readFileSync(new URL('m121/index.html', root)));
const expectedBytes = Object.values(files).reduce((sum, bytes) => sum + bytes.length, 0);
assert.ok(expectedBytes > 32 * 1024 * 1024);
uploadedBytes = 0; calls = [];
await client.publishDocument(doc, 'high', version);
assert.equal(uploadedBytes, expectedBytes);
assert.equal(calls.filter(call => call.url.includes('/blob?file=')).length, Object.keys(files).length);
files = { big: { length: 71 * 1024 * 1024 } };
await assert.rejects(client.publishDocument(doc, 'high', version), /70 MB/);
responseStatus = 401;
await assert.rejects(client.publisherAPI('/session'), /Entre novamente/); assert.equal(client.hasPublishSession(), false);
client.publisherLogin(); const login = new URL(assignedURL);
assert.equal(login.pathname, '/auth/start'); assert.equal(new URL(login.searchParams.get('return')).hash, ''); assert.equal(new URL(login.searchParams.get('return')).searchParams.get('publicar'), '1');
console.log(`OK: envio por arquivo do M121 (${(expectedBytes / 1024 ** 2).toFixed(1)} MB), originais preservados, progresso, hashes e compatibilidade do Worker.`);
