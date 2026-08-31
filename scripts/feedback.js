(function () {
  'use strict';

  var script = document.currentScript;
  var endpoint = script && script.dataset ? script.dataset.endpoint || '' : '';
  var material = script && script.dataset ? script.dataset.material || '' : '';
  var endpointReady = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(endpoint);
  var selected = null;
  var hovered = null;
  var markerCount = 0;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function escapeSelector(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, function (char) {
      return '\\' + char;
    });
  }

  function selectorFor(element) {
    if (!element || element === document.body) return 'body';
    if (element.id) return '#' + escapeSelector(element.id);

    var anchor = element.closest('[data-block-id], [data-id], section[id], article[id]');
    if (anchor) {
      if (anchor.id) return '#' + escapeSelector(anchor.id);
      if (anchor.dataset.blockId) return '[data-block-id="' + String(anchor.dataset.blockId).replace(/"/g, '\\"') + '"]';
      if (anchor.dataset.id) return '[data-id="' + String(anchor.dataset.id).replace(/"/g, '\\"') + '"]';
    }

    var parts = [];
    var current = element;
    while (current && current.nodeType === 1 && current !== document.body && parts.length < 5) {
      var part = current.tagName.toLowerCase();
      var parent = current.parentElement;
      if (parent) {
        var siblings = Array.prototype.filter.call(parent.children, function (child) {
          return child.tagName === current.tagName;
        });
        if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
      }
      parts.unshift(part);
      current = parent;
    }
    return parts.join(' > ') || element.tagName.toLowerCase();
  }

  function textFor(element) {
    var text = (element.innerText || element.getAttribute('aria-label') || element.alt || '').replace(/\s+/g, ' ').trim();
    return text.slice(0, 240);
  }

  function showToast(message, isError) {
    var old = document.querySelector('.spu-feedback-toast');
    if (old) old.remove();
    var toast = document.createElement('div');
    toast.className = 'spu-feedback-toast' + (isError ? ' is-error' : '');
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.getElementById('spu-feedback-root').appendChild(toast);
    window.setTimeout(function () { toast.remove(); }, 5200);
  }

  function removeHovered() {
    if (hovered) hovered.classList.remove('spu-feedback-target');
    hovered = null;
  }

  function stopSelecting() {
    document.body.classList.remove('spu-feedback-selecting');
    removeHovered();
    document.removeEventListener('mousemove', onHover, true);
    document.removeEventListener('click', onSelect, true);
    document.removeEventListener('keydown', onSelectingKey, true);
    var help = document.querySelector('.spu-feedback-help');
    if (help) help.remove();
    var launcher = document.querySelector('.spu-feedback-launcher');
    if (launcher) launcher.setAttribute('aria-pressed', 'false');
  }

  function onHover(event) {
    var target = event.target.closest('h1, h2, h3, h4, p, li, img, figure, button, a, section, article, div');
    if (!target || target.closest('#spu-feedback-root')) return;
    if (target !== hovered) {
      removeHovered();
      hovered = target;
      hovered.classList.add('spu-feedback-target');
    }
  }

  function onSelectingKey(event) {
    if (event.key === 'Escape') {
      stopSelecting();
      showToast('Comentário cancelado.');
    }
  }

  function onSelect(event) {
    var target = event.target.closest('h1, h2, h3, h4, p, li, img, figure, button, a, section, article, div');
    if (!target || target.closest('#spu-feedback-root')) return;
    event.preventDefault();
    event.stopPropagation();

    var pageX = event.pageX;
    var pageY = event.pageY;
    var width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, 1);
    var height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 1);
    selected = {
      element: target,
      selector: selectorFor(target),
      excerpt: textFor(target),
      pageX: pageX,
      pageY: pageY,
      x: Math.round((pageX / width) * 10000) / 100,
      y: Math.round((pageY / height) * 10000) / 100
    };
    stopSelecting();
    openModal();
  }

  function beginSelecting() {
    if (!endpointReady) {
      showToast('O piloto está instalado, mas falta publicar o Google Apps Script e informar sua URL.', true);
      return;
    }
    closeModal();
    document.body.classList.add('spu-feedback-selecting');
    document.querySelector('.spu-feedback-launcher').setAttribute('aria-pressed', 'true');

    var help = document.createElement('div');
    help.className = 'spu-feedback-help';
    help.textContent = 'Clique no ponto que deseja comentar · Esc para cancelar';
    document.getElementById('spu-feedback-root').appendChild(help);

    document.addEventListener('mousemove', onHover, true);
    document.addEventListener('click', onSelect, true);
    document.addEventListener('keydown', onSelectingKey, true);
  }

  function closeModal() {
    var backdrop = document.querySelector('.spu-feedback-backdrop');
    if (backdrop) backdrop.remove();
  }

  function openModal() {
    closeModal();
    var backdrop = document.createElement('div');
    backdrop.className = 'spu-feedback-backdrop';
    backdrop.innerHTML =
      '<section class="spu-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="spu-feedback-title">' +
        '<header class="spu-feedback-modal__header">' +
          '<div><h2 id="spu-feedback-title">Comentar ajuste</h2><p>O comentário será associado ao ponto selecionado nesta página.</p></div>' +
          '<button class="spu-feedback-close" type="button" aria-label="Fechar">×</button>' +
        '</header>' +
        '<form class="spu-feedback-form">' +
          '<div class="spu-feedback-selected"></div>' +
          '<div class="spu-feedback-field"><label for="spu-feedback-author">Seu nome</label><input id="spu-feedback-author" name="author" maxlength="120" required autocomplete="name"></div>' +
          '<div class="spu-feedback-field"><label for="spu-feedback-type">Tipo de ajuste</label><select id="spu-feedback-type" name="type"><option>Texto</option><option>Imagem</option><option>Link</option><option>Layout</option><option>Acessibilidade</option><option>Outro</option></select></div>' +
          '<div class="spu-feedback-field"><label for="spu-feedback-comment">Comentário</label><textarea id="spu-feedback-comment" name="comment" maxlength="2000" required placeholder="Descreva objetivamente o que precisa ser ajustado."></textarea></div>' +
          '<div class="spu-feedback-actions"><button class="spu-feedback-cancel" type="button">Cancelar</button><button class="spu-feedback-submit" type="submit">Enviar comentário</button></div>' +
        '</form>' +
      '</section>';

    var excerpt = selected && selected.excerpt ? 'Trecho: “' + selected.excerpt + '”' : 'Elemento visual selecionado.';
    backdrop.querySelector('.spu-feedback-selected').textContent = excerpt;
    backdrop.querySelector('#spu-feedback-author').value = localStorage.getItem('spu-feedback-author') || '';
    backdrop.querySelector('.spu-feedback-close').addEventListener('click', closeModal);
    backdrop.querySelector('.spu-feedback-cancel').addEventListener('click', closeModal);
    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop) closeModal();
    });
    backdrop.querySelector('form').addEventListener('submit', submitFeedback);
    document.getElementById('spu-feedback-root').appendChild(backdrop);
    backdrop.querySelector(selected && localStorage.getItem('spu-feedback-author') ? '#spu-feedback-comment' : '#spu-feedback-author').focus();
  }

  function addMarker() {
    markerCount += 1;
    var marker = document.createElement('span');
    marker.className = 'spu-feedback-marker';
    marker.textContent = String(markerCount);
    marker.style.left = selected.pageX + 'px';
    marker.style.top = selected.pageY + 'px';
    marker.setAttribute('aria-hidden', 'true');
    document.body.appendChild(marker);
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'spu-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function submitFeedback(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var submit = form.querySelector('.spu-feedback-submit');
    var author = form.elements.author.value.trim();
    var comment = form.elements.comment.value.trim();
    if (!author || !comment) return;

    localStorage.setItem('spu-feedback-author', author);
    submit.disabled = true;
    submit.textContent = 'Enviando…';

    var params = new URLSearchParams({
      id: makeId(),
      material: material || 'M212',
      page: window.location.pathname,
      pageTitle: document.title,
      type: form.elements.type.value,
      comment: comment,
      author: author,
      selector: selected.selector,
      excerpt: selected.excerpt,
      x: String(selected.x),
      y: String(selected.y),
      viewport: window.innerWidth + '×' + window.innerHeight,
      userAgent: navigator.userAgent
    });

    fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString()
    }).then(function () {
      addMarker();
      closeModal();
      showToast('Comentário enviado. Obrigado!');
      selected = null;
    }).catch(function () {
      submit.disabled = false;
      submit.textContent = 'Enviar comentário';
      showToast('Não foi possível enviar. Verifique sua conexão e tente novamente.', true);
    });
  }

  ready(function () {
    var root = document.createElement('div');
    root.id = 'spu-feedback-root';
    root.innerHTML = '<button class="spu-feedback-launcher" type="button" aria-pressed="false"><span aria-hidden="true">✎</span><span>Comentar ajuste</span></button>';
    document.body.appendChild(root);
    root.querySelector('.spu-feedback-launcher').addEventListener('click', beginSelecting);
  });
})();
