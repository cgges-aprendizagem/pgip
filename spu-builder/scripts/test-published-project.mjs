import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const context = vm.createContext({
  URL, Map, console,
  DOMParser: class {
    parseFromString(html) {
      const match = html.match(/<script[^>]*id=["']spu-image-slots["'][^>]*>([\s\S]*?)<\/script>/);
      return { getElementById: () => match ? { textContent: match[1] } : null };
    }
  },
  FileReader: class {
    readAsDataURL(blob) { blob.arrayBuffer().then(bytes => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`; this.onload(); }); }
  },
});
const loaded = new Map();
function load(name) {
  if (loaded.has(name)) return loaded.get(name);
  const source = readFileSync(new URL(`../src/utils/${name}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(id => load(id.slice(2)), module, module.exports);
  loaded.set(name, module.exports);
  return module.exports;
}
const { publishedProjectLocation, projectStorageSuffix, loadPublishedProject } = load('publishedProject');
const base = 'https://example.com/pgip/spu-builder/';
assert.equal(publishedProjectLocation(base), null);
assert.equal(publishedProjectLocation(`${base}?material=M134a`).json.href, 'https://example.com/pgip/m134a/projetom134a.spu.json');
assert.equal(publishedProjectLocation(`${base}?material=m121&arquivo=projeto.spu.json`).json.href, 'https://example.com/pgip/m121/projeto.spu.json');
for (const query of ['material=../m121', 'material=m121&arquivo=../file.spu.json', 'material=m121&arquivo=https://evil.test/a.spu.json']) assert.throws(() => publishedProjectLocation(base + '?' + query));
assert.equal(projectStorageSuffix(base), '');
assert.equal(projectStorageSuffix(base + '?material=m121'), '_m121');
assert.equal(projectStorageSuffix(base + '?material=m122'), '_m122');
const builder = { migrate: raw => raw, sanitize: doc => ({ ...doc, sanitized: true }) };
const doc = { schema: 1, meta: { title: 'M121 - Teste' }, blocks: [] };
const embedded = { figure: { u: 'data:image/png;base64,aGVsbG8=', s: 2, x: 10, y: -5 } };
const fetchJSON = async () => new Response(JSON.stringify({ ...doc, imageSlots: embedded }));
let result = await loadPublishedProject(base + '?material=m121', builder, fetchJSON);
assert.equal(result.doc.sanitized, true);
assert.deepEqual(JSON.parse(result.imageSlots), embedded);
const requests = [];
const legacySlots = { figure: { u: 'assets/images/a.png', s: 2, x: 10, y: -5 }, repeated: 'assets/images/a.png' };
result = await loadPublishedProject(base + '?material=m121', builder, async url => {
  requests.push(url);
  if (url.endsWith('.json')) return new Response(JSON.stringify(doc));
  if (url.endsWith('index.html')) return new Response(`<script id="spu-image-slots">${JSON.stringify(legacySlots)}</script>`);
  return new Response(new Blob(['hello'], { type: 'image/png' }));
});
assert.equal(requests.length, 3, 'uma imagem repetida é baixada uma única vez');
assert.equal(JSON.parse(result.imageSlots).figure.u, embedded.figure.u);
assert.equal(JSON.parse(result.imageSlots).figure.x, 10);
assert.equal(legacySlots.figure.u, 'assets/images/a.png');
await assert.rejects(loadPublishedProject(base + '?material=m121', builder, async () => new Response('', { status: 404 })), /JSON/);
await assert.rejects(loadPublishedProject(base + '?material=m121', builder, async () => new Response('<html>404</html>')));
await assert.rejects(loadPublishedProject(base + '?material=m121', builder, async () => new Response('{}')), /projeto válido/);
await assert.rejects(loadPublishedProject(base + '?material=m121', builder, async () => new Response(JSON.stringify({ ...doc, imageSlots: { a: '../other/a.png' } }))), /fora da pasta/);
await assert.rejects(loadPublishedProject(base + '?material=m121', builder, async () => new Response(JSON.stringify({ ...doc, imageSlots: { a: 'https://evil.test/a.png' } }))), /fora da pasta/);
// Todos os materiais atuais são compatíveis com o carregamento automático.
const root = new URL('../../', import.meta.url);
const { readdirSync } = await import('node:fs');
let materials = 0;
for (const code of readdirSync(root).filter(name => /^m\d+[a-z]?$/i.test(name))) {
  const files = readdirSync(new URL(code + '/', root));
  const file = files.find(name => name.endsWith('.spu.json'));
  if (!file) continue;
  const opened = await loadPublishedProject(`${base}?material=${code}&arquivo=${file}`, builder, async url => {
    const pathname = new URL(url).pathname.replace('/pgip/', '');
    const bytes = readFileSync(new URL(pathname, root));
    if (pathname.endsWith('.json') || pathname.endsWith('.html')) return new Response(bytes);
    const ext = pathname.split('.').pop().toLowerCase();
    return new Response(new Blob([bytes], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` }));
  });
  assert.ok(Array.isArray(opened.doc.blocks));
  materials++;
}
assert.equal(materials, 37);
console.log('OK: links, namespace de rascunhos, JSON inválido/ausente, recuperação de imagens antigas, enquadramento e todos os 37 materiais publicados.');
