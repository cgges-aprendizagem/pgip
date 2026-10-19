import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = await mkdtemp(path.join(tmpdir(), 'spu-index-test-'));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const commit = (date) => {
  git('add', '.');
  execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'Fixture'], {
    cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  });
};
try {
  await mkdir(path.join(root, 'scripts'));
  await copyFile(new URL('./generate-index.mjs', import.meta.url), path.join(root, 'scripts/generate-index.mjs'));
  git('init', '-q');
  for (const code of ['m112', 'm121', 'm134a', 'm212', 'm411']) {
    await mkdir(path.join(root, code));
    await writeFile(path.join(root, code, 'index.html'), `<title>${code} - Bens &amp; imóveis</title>`);
  }
  await writeFile(path.join(root, 'm121/projetom121.spu.json'), '{}');
  await writeFile(path.join(root, 'm134a/projetom134a.spu.json'), '{}');
  await writeFile(path.join(root, 'm212/projeto.spu.json'), '{}');
  await writeFile(path.join(root, 'm411/Material.spu.json'), '{}');
  commit('2026-10-01T12:00:00Z');
  await mkdir(path.join(root, 'm121/assets'));
  await writeFile(path.join(root, 'm121/assets/image.svg'), '<svg/>');
  // 20/10 UTC corresponde a 19/10 em São Paulo.
  commit('2026-10-20T01:00:00Z');
  await writeFile(path.join(root, 'unrelated.txt'), 'Unrelated change');
  commit('2026-10-21T12:00:00Z');
  execFileSync(process.execPath, ['scripts/generate-index.mjs'], { cwd: root });
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const cards = [...html.matchAll(/<article class="content-card"[\s\S]*?<\/article>/g)].map(match => match[0]);
  assert.equal(cards.length, 5);
  assert.match(cards[0], /JSON para edição indisponível/);
  assert.doesNotMatch(cards[0], /download=/);
  assert.match(cards[1], /href="\.\/m121\/projetom121\.spu\.json" download="projetom121\.spu\.json"/);
  assert.match(cards[1], />19\/10\/2026<\/time>/);
  assert.match(cards[0], />01\/10\/2026<\/time>/);
  assert.match(cards[2], /download="projetom134a.spu.json"/);
  assert.match(cards[3], /href="\.\/m212\/projeto.spu.json" download="projetom212.spu.json"/);
  assert.match(cards[4], /href="\.\/m411\/Material.spu.json"/);
  assert.match(html, /Bens &amp; imóveis/);
  assert.match(html, /\.content-card\[hidden\] \{ display: none; \}/);
  // Nenhum link fica aninhado dentro de outro link.
  for (const card of cards) assert.doesNotMatch(card, /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/);
  console.log('OK: named/legacy JSON links, suffix codes, missing JSON, nested asset dates, independent directory history and São Paulo dates.');
} finally {
  await rm(root, { recursive: true, force: true });
}
