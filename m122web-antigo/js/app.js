/* M122 — interações estáticas (sem framework) */
(function () {
  'use strict';

  var SECTIONS = [
    { id: 'abertura', label: 'Início' },
    { id: 'infraestrutura', label: 'Infraestrutura' },
    { id: 'ambiental', label: 'Ambiental' },
    { id: 'social', label: 'Social' },
    { id: 'economica', label: 'Econômica' },
    { id: 'conexoes', label: 'Conexões' },
    { id: 'conclusao', label: 'Conclusão' },
    { id: 'fontes', label: 'Fontes' }
  ];

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var bar = document.querySelector('.op-progress__bar');
    var summary = document.querySelector('.op-summary');
    var toggle = summary && summary.querySelector('.op-summary__toggle');

    /* —— Sumário: construir painel —— */
    var panel = null, links = {};
    if (summary) {
      panel = document.createElement('nav');
      panel.className = 'op-summary__panel';
      panel.style.display = 'none';
      var title = document.createElement('p');
      title.className = 'op-summary__title';
      title.textContent = 'Neste conteúdo';
      panel.appendChild(title);
      SECTIONS.forEach(function (s, i) {
        var a = document.createElement('a');
        a.href = '#' + s.id;
        var num = document.createElement('span');
        num.className = 'op-summary__num';
        num.textContent = String(i + 1).padStart(2, '0');
        var lbl = document.createElement('span');
        lbl.textContent = s.label;
        a.appendChild(num); a.appendChild(lbl);
        a.addEventListener('click', function () { close(); });
        panel.appendChild(a);
        links[s.id] = a;
      });
      summary.appendChild(panel);

      var open = false;
      function setOpen(v) {
        open = v;
        panel.style.display = v ? 'grid' : 'none';
        toggle.setAttribute('aria-expanded', v ? 'true' : 'false');
      }
      function close() { setOpen(false); }
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!open);
      });
      document.addEventListener('mousedown', function (e) {
        if (open && !summary.contains(e.target)) close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
      });
    }

    /* —— Barra de progresso + seção ativa —— */
    function onScroll() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      if (bar) bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
      var active = SECTIONS[0].id;
      for (var i = 0; i < SECTIONS.length; i++) {
        var el = document.getElementById(SECTIONS[i].id);
        if (el && el.getBoundingClientRect().top <= 120) active = SECTIONS[i].id;
      }
      for (var id in links) {
        if (links.hasOwnProperty(id)) links[id].classList.toggle('is-active', id === active);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* —— Parallax do hero —— */
    var hero = document.querySelector('.m122-hero');
    var heroBg = hero && hero.querySelector('.m122-hero__bg');
    var heroBoxes = hero && hero.querySelector('.m122-hero__boxes');
    if (hero && heroBg && heroBoxes) {
      var mq = window.matchMedia('(max-width: 720px), (prefers-reduced-motion: reduce)');
      var raf = 0;
      function update() {
        raf = 0;
        if (mq.matches) { heroBg.style.transform = ''; heroBoxes.style.transform = ''; return; }
        var y = -hero.getBoundingClientRect().top;
        heroBg.style.transform = 'translate3d(0,' + (y * 0.22) + 'px,0)';
        heroBoxes.style.transform = 'translate3d(0,' + (y * -0.16) + 'px,0)';
      }
      function req() { if (!raf) raf = requestAnimationFrame(update); }
      update();
      window.addEventListener('scroll', req, { passive: true });
      window.addEventListener('resize', req);
    }

    /* —— Lightbox (ampliar imagens) —— */
    var overlay = null;
    function openLightbox(src, alt) {
      overlay = document.createElement('div');
      overlay.className = 'm122-lightbox';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      var img = document.createElement('img');
      img.src = src; img.alt = alt || '';
      overlay.appendChild(img);
      overlay.addEventListener('click', closeLightbox);
      document.body.appendChild(overlay);
      document.addEventListener('keydown', escClose);
    }
    function closeLightbox() {
      if (overlay) { overlay.remove(); overlay = null; }
      document.removeEventListener('keydown', escClose);
    }
    function escClose(e) { if (e.key === 'Escape') closeLightbox(); }
    var zoomables = document.querySelectorAll('.m122-fig__frame img, .m122-bleedimg img, .m122-cover img');
    Array.prototype.forEach.call(zoomables, function (img) {
      img.addEventListener('click', function () { openLightbox(img.currentSrc || img.src, img.alt); });
    });
  });
})();
