import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { unzipSync, strFromU8 } from 'fflate';

const require = createRequire(import.meta.url);
const image = 'data:image/png;base64,iVBORw0KGgo=';
let slots = {
  figure: { u: image, s: 1.5, x: 20, y: -10 },
  nested: image,
  unused: { u: image },
  hidden: { u: image },
};
let downloaded;
let downloadName;
const runtime = {
  snapshot: () => JSON.stringify(slots),
  replace: content => { slots = JSON.parse(content); },
};
const context = vm.createContext({
  console, Blob, Uint8Array, atob, btoa, Number, JSON,
  window: { __SPU_IMAGE_SLOT_RUNTIME: runtime },
  localStorage: { setItem() {}, removeItem() {} },
  URL: { createObjectURL(blob) { downloaded = blob; return 'blob:test'; }, revokeObjectURL() {} },
  document: { createElement: () => ({ click() { downloadName = this.download; }, remove() {} }), body: { appendChild() {} } },
  setTimeout: fn => fn(),
  fetch: async () => ({ ok: true, text: async () => '' }),
});
const loaded = new Map();
function load(name) {
  if (loaded.has(name)) return loaded.get(name);
  const source = readFileSync(new URL(`../src/utils/${name}.ts`, import.meta.url), 'utf8')
    .replaceAll('import.meta.env.BASE_URL', "'/'");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  loaded.set(name, module.exports);
  const localRequire = id => id === './lucideCatalog'
    ? { getDocumentLucideAssets: async () => ({ icons: {}, license: '' }) }
    : id.startsWith('./') ? load(id.slice(2)) : require(id);
  vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(localRequire, module, module.exports);
  return module.exports;
}
const { projectFileName, serializeProject, saveProject, exportAssetsZip, exportScormZip, exportSelfContained } = load('exportFormats');
const { parseProjectFile } = load('projectFile');
const { replaceImageSlots } = load('imageSlotStore');
const doc = { schemaVersion: 1, meta: { title: 'M121 - Teste' }, blocks: [
  { id: 'a', type: 'Figure', props: { slot: 'figure' } },
  { id: 'b', type: 'Columns', props: {}, children: [
    { id: 'c', type: 'Hero', props: { heroSlot: 'nested' } },
  ] },
  { id: 'd', type: 'Figure', props: { slot: 'hidden', showImage: false } },
] };
for (const [title, expected] of [
  ['M121 - Bens imóveis públicos', 'projetom121.spu.json'],
  ['m134a · Complemento', 'projetom134a.spu.json'],
  ['Teste', 'projeto.spu.json'],
  ['', 'projeto.spu.json'],
  ['AM1210XYZ', 'projeto.spu.json'],
]) {
  assert.equal(projectFileName({ ...doc, meta: { title } }), expected);
}
const originalDoc = JSON.stringify(doc);
const expectedSlots = { figure: slots.figure, nested: slots.nested };
const json = await serializeProject(doc);
assert.deepEqual(JSON.parse(json).imageSlots, expectedSlots);
assert.equal(JSON.stringify(doc), originalDoc, 'saving must not mutate the editor document');
const parsed = parseProjectFile(json, 'projeto.spu.json');
assert.deepEqual(JSON.parse(JSON.stringify(parsed.raw)), doc);
slots = {};
await replaceImageSlots(parsed.imageSlots);
assert.deepEqual(slots, expectedSlots, 'opening in a fresh editor restores images and framing');
assert.equal(parseProjectFile(originalDoc, 'antigo.json').imageSlots, undefined);
assert.equal(parseProjectFile(JSON.stringify({ ...doc, imageSlots: {} }), 'vazio.json').imageSlots, '{}');
assert.throws(() => parseProjectFile(JSON.stringify({ ...doc, imageSlots: [] }), 'invalido.json'));
await saveProject(doc);
assert.equal(downloadName, 'projetom121.spu.json');
assert.deepEqual(JSON.parse(await downloaded.text()).imageSlots, expectedSlots);
for (const exportZip of [exportAssetsZip, exportScormZip]) {
  for (const quality of ['high', 'compact']) {
    await exportZip(doc, quality);
    const files = unzipSync(new Uint8Array(await downloaded.arrayBuffer()));
    assert.equal(files['projeto.spu.json'], undefined);
    const project = parseProjectFile(strFromU8(files['projetom121.spu.json']), 'projetom121.spu.json');
    assert.deepEqual(JSON.parse(project.imageSlots), expectedSlots);
    const html = strFromU8(files['index.html']);
    assert.match(html, /assets\/images\//);
    const imageFiles = Object.keys(files).filter(name => name.startsWith('assets/images/'));
    assert.equal(imageFiles.length, 2);
    assert.deepEqual([...files[imageFiles[0]]], [...Uint8Array.from(atob(image.split(',')[1]), c => c.charCodeAt(0))]);
    slots = {};
    await replaceImageSlots(project.imageSlots);
    assert.deepEqual(slots, expectedSlots);
  }
}
await exportSelfContained(doc);
assert.match(await downloaded.text(), /data:image\/png;base64/);
console.log('OK: standalone JSON, HTML/SCORM ZIPs (both qualities), fresh-editor restore, framing, nested slots, legacy JSON and self-contained HTML.');
