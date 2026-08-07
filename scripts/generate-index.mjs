import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function textFromHead(html, pattern) {
  const match = html.match(pattern);
  return match?.[1]
    ?.replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim() || '';
}

const entries = await readdir(root);
const modules = [];

for (const name of entries) {
  if (!/^m/i.test(name)) continue;
  const directory = path.join(root, name);
  if (!(await stat(directory)).isDirectory()) continue;

  const entrypoint = path.join(directory, 'index.html');
  let html;
  try {
    html = await readFile(entrypoint, 'utf8');
  } catch {
    continue;
  }

  const rawTitle = textFromHead(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = textFromHead(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i)
    || textFromHead(html, /<meta\s+content=["']([^"']*)["']\s+name=["']description["'][^>]*>/i);
  const title = rawTitle.replace(new RegExp(`^${name}\\s*[-–—:]\\s*`, 'i'), '').replace(/,\s*SPU$/i, '') || name.toUpperCase();
  const digits = name.match(/\d+/)?.[0] || '';

  modules.push({
    code: name.toUpperCase(),
    description,
    href: `./${encodeURIComponent(name)}/`,
    search: `${name} ${rawTitle} ${description}`.toLocaleLowerCase('pt-BR'),
    title,
    track: digits.charAt(0) || 'other',
  });
}

modules.sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true }));

const cards = modules.map((module) => `
        <a class="content-card" href="${module.href}" data-search="${escapeHtml(module.search)}" data-track="${escapeHtml(module.track)}">
          <span class="content-card__code">${escapeHtml(module.code)}</span>
          <span class="content-card__title">${escapeHtml(module.title)}</span>
          ${module.description ? `<span class="content-card__description">${escapeHtml(module.description)}</span>` : ''}
          <span class="content-card__action">Abrir conteúdo <span aria-hidden="true">→</span></span>
        </a>`).join('');

const page = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Índice dos conteúdos publicados do Programa de Aprendizagem em Gestão de Imóveis Públicos.">
  <meta property="og:title" content="Conteúdos publicados · SPU">
  <meta property="og:description" content="Acesse os materiais do Programa de Aprendizagem em Gestão de Imóveis Públicos.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://luislindner.github.io/spu/">
  <meta property="og:image" content="https://luislindner.github.io/spu/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="629">
  <meta name="twitter:card" content="summary_large_image">
  <title>Conteúdos publicados · SPU</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172b2a;
      --muted: #5f6d6b;
      --petrol: #0f5b59;
      --petrol-dark: #123f3e;
      --terra: #c45f3c;
      --paper: #f7f4ed;
      --surface: #fffdf8;
      --line: #dcd8cf;
      --shadow: 0 18px 50px rgba(23, 43, 42, .09);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }
    html { background: var(--paper); }
    body { margin: 0; color: var(--ink); background: var(--paper); min-height: 100vh; }
    a { color: inherit; }

    .hero {
      position: relative;
      overflow: hidden;
      color: #fff;
      background: var(--petrol-dark);
      padding: clamp(2rem, 6vw, 5.5rem) max(1.25rem, calc((100vw - 1180px) / 2));
    }

    .hero::before {
      content: "";
      position: absolute;
      width: 36rem;
      height: 36rem;
      right: -12rem;
      top: -20rem;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 50%;
      box-shadow: 0 0 0 5rem rgba(255,255,255,.025), 0 0 0 10rem rgba(255,255,255,.018);
    }

    .hero__inner { position: relative; max-width: 760px; }
    .brand { display: flex; align-items: center; gap: .7rem; margin: 0 0 2.5rem; font-size: .76rem; font-weight: 750; letter-spacing: .16em; text-transform: uppercase; }
    .brand::before { content: ""; width: 2.5rem; height: 3px; background: var(--terra); }
    h1 { max-width: 680px; margin: 0; font-size: clamp(2.5rem, 7vw, 5.2rem); line-height: .96; letter-spacing: -.055em; }
    .hero p { max-width: 650px; margin: 1.5rem 0 0; color: rgba(255,255,255,.76); font-size: clamp(1rem, 2vw, 1.25rem); line-height: 1.65; }

    main { width: min(1180px, calc(100% - 2.5rem)); margin: 0 auto; padding: clamp(2.5rem, 6vw, 5rem) 0 5rem; }
    .catalog-head { display: grid; grid-template-columns: 1fr minmax(260px, 390px); align-items: end; gap: 2rem; margin-bottom: 2rem; }
    .eyebrow { margin: 0 0 .55rem; color: var(--terra); font-size: .72rem; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
    h2 { margin: 0; font-size: clamp(1.7rem, 3vw, 2.5rem); letter-spacing: -.035em; }
    .catalog-meta { margin: .65rem 0 0; color: var(--muted); }

    .search { display: grid; gap: .45rem; }
    .search label { font-size: .74rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
    .search input { width: 100%; border: 1px solid var(--line); border-radius: .8rem; background: var(--surface); color: var(--ink); padding: .9rem 1rem; font: inherit; box-shadow: 0 5px 16px rgba(23,43,42,.04); }
    .search input:focus { outline: 3px solid rgba(15,91,89,.18); border-color: var(--petrol); }

    .catalog { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    .content-card { --card-accent: var(--petrol); position: relative; display: flex; min-height: 230px; flex-direction: column; padding: 1.4rem; overflow: hidden; border: 1px solid var(--line); border-top: 4px solid var(--card-accent); border-radius: 1rem; background: var(--surface); box-shadow: 0 7px 24px rgba(23,43,42,.045); text-decoration: none; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
    .content-card[data-track="1"] { --card-accent: #c45f3c; }
    .content-card[data-track="2"] { --card-accent: #5a7655; }
    .content-card[data-track="4"] { --card-accent: #0f5b59; }
    .content-card:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--card-accent) 55%, var(--line)); box-shadow: var(--shadow); }
    .content-card:focus-visible { outline: 3px solid color-mix(in srgb, var(--card-accent) 28%, transparent); outline-offset: 3px; }
    .content-card__code { align-self: flex-start; margin-bottom: 1.3rem; padding: .38rem .58rem; border-radius: 999px; background: color-mix(in srgb, var(--card-accent) 11%, transparent); color: var(--card-accent); font-size: .72rem; font-weight: 850; letter-spacing: .1em; }
    .content-card__title { font-size: 1.15rem; line-height: 1.3; font-weight: 760; letter-spacing: -.02em; }
    .content-card__description { display: -webkit-box; margin-top: .7rem; overflow: hidden; color: var(--muted); font-size: .88rem; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
    .content-card__action { display: flex; justify-content: space-between; gap: 1rem; margin-top: auto; padding-top: 1.5rem; color: var(--card-accent); font-size: .83rem; font-weight: 760; }

    .empty { display: none; padding: 3rem 1rem; border: 1px dashed var(--line); border-radius: 1rem; color: var(--muted); text-align: center; }
    .empty.is-visible { display: block; }
    footer { border-top: 1px solid var(--line); padding: 1.5rem max(1.25rem, calc((100vw - 1180px) / 2)); color: var(--muted); font-size: .8rem; }

    @media (max-width: 880px) {
      .catalog { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .catalog-head { grid-template-columns: 1fr; align-items: start; }
    }

    @media (max-width: 560px) {
      .hero { padding-top: 2rem; padding-bottom: 3.25rem; }
      .brand { margin-bottom: 2rem; }
      main { width: min(100% - 1.5rem, 1180px); padding-top: 2.5rem; }
      .catalog { grid-template-columns: 1fr; }
      .content-card { min-height: 205px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .content-card { transition: none; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="hero__inner">
      <p class="brand">SPU · Gestão de Imóveis Públicos</p>
      <h1>Conteúdos publicados</h1>
      <p>Uma porta de entrada para os materiais do Programa de Aprendizagem em Gestão de Imóveis Públicos.</p>
    </div>
  </header>

  <main>
    <div class="catalog-head">
      <div>
        <p class="eyebrow">Biblioteca</p>
        <h2>Materiais disponíveis</h2>
        <p class="catalog-meta"><strong id="result-count">${modules.length}</strong> conteúdos publicados</p>
      </div>
      <div class="search">
        <label for="search">Buscar por código ou título</label>
        <input id="search" type="search" placeholder="Ex.: M411 ou função socioambiental" autocomplete="off">
      </div>
    </div>

    <section class="catalog" id="catalog" aria-label="Conteúdos publicados">${cards}
    </section>
    <p class="empty" id="empty">Nenhum conteúdo encontrado para esta busca.</p>
  </main>

  <footer>Secretaria do Patrimônio da União · Programa de Aprendizagem em Gestão de Imóveis Públicos</footer>

  <script>
    const input = document.getElementById('search');
    const cards = Array.from(document.querySelectorAll('.content-card'));
    const count = document.getElementById('result-count');
    const empty = document.getElementById('empty');

    input.addEventListener('input', () => {
      const query = input.value.trim().toLocaleLowerCase('pt-BR');
      let visible = 0;
      cards.forEach((card) => {
        const match = !query || card.dataset.search.includes(query);
        card.hidden = !match;
        if (match) visible += 1;
      });
      count.textContent = String(visible);
      empty.classList.toggle('is-visible', visible === 0);
    });
  </script>
</body>
</html>
`;

await writeFile(path.join(root, 'index.html'), page, 'utf8');
console.log(`Generated index.html with ${modules.length} published contents.`);
