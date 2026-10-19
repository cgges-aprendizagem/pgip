import assert from 'node:assert/strict';
import { readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Migração local dos projetos antigos. Valida todo o lote antes de gravar.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const plans = [];
const missing = [];
let projects = 0, imageCount = 0, converted = 0;
for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory() || !/^m\d+[a-z]?$/i.test(entry.name)) continue;
  const directory = path.join(root, entry.name);
  const names = await readdir(directory);
  const files = names.filter(name => name.endsWith('.spu.json'));
  if (!files.length) { missing.push(entry.name); continue; }
  for (const name of files) {
    const file = path.join(directory, name);
    const original = await readFile(file, 'utf8');
    const doc = JSON.parse(original);
    assert(Array.isArray(doc.blocks) && typeof doc.meta?.title === 'string', `${entry.name}: projeto inválido`);
    projects++;
    let slots = doc.imageSlots;
    if (slots === undefined) {
      assert(!check, `${entry.name}: JSON sem imageSlots`);
      const html = await readFile(path.join(directory, 'index.html'), 'utf8');
      const sidecar = html.match(/<script\b[^>]*\bid=["']spu-image-slots["'][^>]*>([\s\S]*?)<\/script\s*>/i);
      assert(sidecar, `${entry.name}: HTML sem os dados de imagens`);
      slots = JSON.parse(sidecar[1]);
    }
    assert(slots && typeof slots === 'object' && !Array.isArray(slots), `${entry.name}: imagens inválidas`);
    const embedded = structuredClone(slots);
    for (const [id, slot] of Object.entries(slots)) {
      const source = typeof slot === 'string' ? slot : slot?.u;
      assert(typeof source === 'string' && source, `${entry.name}/${id}: referência inválida`);
      imageCount++;
      if (source.startsWith('data:image/')) {
        assert(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/.test(source), `${entry.name}/${id}: imagem incorporada inválida`);
        continue;
      }
      assert(!check, `${entry.name}/${id}: imagem ainda externa`);
      const base = new URL(`https://migration.invalid/${entry.name}/`);
      const url = new URL(source, base);
      assert(url.origin === base.origin && url.pathname.startsWith(base.pathname), `${entry.name}/${id}: caminho fora do material`);
      const relative = decodeURIComponent(url.pathname.slice(base.pathname.length));
      assert(relative.startsWith('assets/'), `${entry.name}/${id}: imagem fora de assets`);
      const imagePath = await realpath(path.join(directory, relative));
      const actualDirectory = await realpath(directory);
      assert(imagePath.startsWith(actualDirectory + path.sep), `${entry.name}/${id}: imagem fora do material`);
      const type = mime[path.extname(imagePath).toLowerCase()];
      assert(type, `${entry.name}/${id}: formato de imagem desconhecido`);
      const bytes = await readFile(imagePath);
      assert(bytes.length > 0, `${entry.name}/${id}: imagem vazia`);
      const data = `data:${type};base64,${bytes.toString('base64')}`;
      assert(Buffer.from(data.split(',')[1], 'base64').equals(bytes), `${entry.name}/${id}: dados alterados`);
      if (typeof slot === 'string') embedded[id] = data;
      else {
        embedded[id].u = data;
        const { u: oldURL, ...before } = slot;
        const { u: newURL, ...after } = embedded[id];
        assert.deepEqual(after, before, `${entry.name}/${id}: enquadramento alterado`);
      }
      converted++;
    }
    const updated = { ...doc, imageSlots: embedded };
    const { imageSlots: oldSlots, ...before } = doc;
    const { imageSlots: newSlots, ...after } = updated;
    assert.deepEqual(after, before, `${entry.name}: conteúdo do projeto alterado`);
    if (JSON.stringify(doc) !== JSON.stringify(updated)) {
      const content = JSON.stringify(updated, null, 2) + '\n';
      assert.deepEqual(JSON.parse(content), updated);
      plans.push({ file, content, images: Object.keys(embedded).length });
    }
  }
}
for (const plan of plans) await writeFile(plan.file, plan.content);
console.log(JSON.stringify({ mode: check ? 'check' : 'embed', projects, images: imageCount, converted, updated: plans.length, missingProjects: missing }, null, 2));
