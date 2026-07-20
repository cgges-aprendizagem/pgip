/* Interações da página: carrossel, acordeões, lightbox e engrenagem. */
(function () {
  "use strict";

  var eraBlocks = Array.prototype.slice.call(document.querySelectorAll(".spu-tl__era-block"));
  var eraNames = ["Regime Sesmarial", "Regime de Posse", "Lei de Terras", "Período Republicano"];
  var eraColors = ["var(--terra-600)", "var(--ochre-600)", "var(--petrol-600)", "var(--green-600)"];
  var timeline = document.querySelector(".spu-tl");

  if (timeline && eraBlocks.length) {
    timeline.classList.add("spu-tl--enhanced");
    eraBlocks.forEach(function (block, index) {
      var era = block.getAttribute("data-era");
      var titleEl = block.querySelector(":scope > .spu-tl__head .spu-tl__title");
      var periodEl = block.querySelector(":scope > .spu-tl__head .spu-tl__period");
      var rail = block.querySelector(":scope > .spu-tl__rail");
      var quote = block.querySelector(":scope > .pg-era-extra .spu-quote");
      var originalChildren = Array.prototype.slice.call(block.children);
      var body = document.createElement("div");
      var trigger = document.createElement("button");
      var bodyId = "periodo-" + era;

      block.hidden = false;
      block.classList.toggle("is-open", index === 0);
      body.className = "spu-period__body";
      body.id = bodyId;
      body.hidden = index !== 0;
      trigger.type = "button";
      trigger.className = "spu-period__trigger";
      trigger.setAttribute("aria-expanded", index === 0 ? "true" : "false");
      trigger.setAttribute("aria-controls", bodyId);
      trigger.innerHTML =
        '<span class="spu-period__index">' + String(index + 1).padStart(2, "0") + '</span>' +
        '<span><span class="spu-period__label">' + eraNames[index] + '</span>' +
        '<span class="spu-period__title">' + (titleEl ? titleEl.textContent : "") + '</span>' +
        '<span class="spu-period__period">' + (periodEl ? periodEl.textContent : "") + '</span></span>' +
        '<svg class="spu-period__chev" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

      if (quote && rail) {
        var quoteText = quote.querySelector(".spu-quote__text");
        var idea = document.createElement("div");
        idea.className = "pg-idea-key";
        idea.innerHTML = '<span class="spu-kicker pg-idea-key__eyebrow"><span class="spu-kicker__rule"></span>Ideia-chave</span><p>' + (quoteText ? quoteText.textContent : "") + '</p>';
        rail.parentNode.insertBefore(idea, rail);
        quote.remove();
        originalChildren = Array.prototype.slice.call(block.children);
      }

      originalChildren.forEach(function (child, childIndex) {
        if (childIndex < 3) child.classList.add("spu-period__source");
        body.appendChild(child);
      });
      block.appendChild(trigger);
      block.appendChild(body);
      trigger.addEventListener("click", function () {
        if (!block.classList.contains("is-open")) {
          openEra(era, false);
          goToEra(index);
        }
      });
    });
  }

  function openEra(era, shouldScroll) {
    eraBlocks.forEach(function (block) {
      var open = block.getAttribute("data-era") === era;
      var trigger = block.querySelector(":scope > .spu-period__trigger");
      var body = block.querySelector(":scope > .spu-period__body");
      block.classList.toggle("is-open", open);
      if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (body) body.hidden = !open;
    });
    if (shouldScroll) {
      var target = eraBlocks.find(function (block) { return block.getAttribute("data-era") === era; });
      if (target) target.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    }
  }

  var carousel = document.querySelector("[data-era-carousel]");
  var track = carousel && carousel.querySelector("[data-carousel-track]");
  var slides = carousel ? Array.prototype.slice.call(carousel.querySelectorAll("[data-era-slide]")) : [];
  var navBtns = carousel ? Array.prototype.slice.call(carousel.querySelectorAll("[data-carousel-go]")) : [];
  var currentLabel = carousel && carousel.querySelector("[data-carousel-current]");
  var status = carousel && carousel.querySelector("[data-carousel-status]");
  var currentEra = 0;
  var pointerStart = null;

  function goToEra(index) {
    if (!slides.length) return;
    currentEra = (index + slides.length) % slides.length;
    if (track) track.style.transform = "translateX(-" + currentEra * 100 + "%)";
    if (carousel) carousel.style.setProperty("--_era", eraColors[currentEra]);
    if (currentLabel) currentLabel.textContent = String(currentEra + 1).padStart(2, "0");
    if (status) status.textContent = "Era " + (currentEra + 1) + " de " + slides.length + ": " + eraNames[currentEra];
    slides.forEach(function (slide, i) {
      var active = i === currentEra;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      slide.inert = !active;
    });
    navBtns.forEach(function (btn, i) {
      var active = i === currentEra;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.tabIndex = active ? 0 : -1;
    });
  }

  if (carousel) {
    var prev = carousel.querySelector("[data-carousel-prev]");
    var next = carousel.querySelector("[data-carousel-next]");
    if (prev) prev.addEventListener("click", function () { goToEra(currentEra - 1); });
    if (next) next.addEventListener("click", function () { goToEra(currentEra + 1); });
    navBtns.forEach(function (btn) {
      btn.addEventListener("click", function () { goToEra(Number(btn.getAttribute("data-carousel-go"))); });
    });
    carousel.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") { event.preventDefault(); goToEra(currentEra - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); goToEra(currentEra + 1); }
    });
    if (track) {
      track.addEventListener("pointerdown", function (event) { pointerStart = event.clientX; });
      track.addEventListener("pointerup", function (event) {
        if (pointerStart === null) return;
        var distance = event.clientX - pointerStart;
        if (Math.abs(distance) > 48) goToEra(currentEra + (distance < 0 ? 1 : -1));
        pointerStart = null;
      });
      track.addEventListener("pointercancel", function () { pointerStart = null; });
    }
    Array.prototype.slice.call(carousel.querySelectorAll("[data-open-era]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var era = btn.getAttribute("data-open-era");
        var index = slides.findIndex(function (slide) { return slide.getAttribute("data-era-slide") === era; });
        if (index > -1) goToEra(index);
        openEra(era, true);
      });
    });
    goToEra(0);
  }

  Array.prototype.slice.call(document.querySelectorAll(".spu-tl__mbtn")).forEach(function (btn) {
    var item = btn.closest(".spu-tl__item");
    var content = item && item.querySelector(".spu-tl__content");
    if (item) item.classList.add("spu-tl__item--open");
    if (content) content.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    btn.addEventListener("click", function () {
      var currentItem = btn.closest(".spu-tl__item");
      var currentContent = currentItem.querySelector(".spu-tl__content");
      var open = currentItem.classList.toggle("spu-tl__item--open");
      if (currentContent) currentContent.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  Array.prototype.slice.call(document.querySelectorAll(".spu-figure__frame[data-zoom]")).forEach(function (frame) {
    frame.addEventListener("click", function () {
      var img = frame.querySelector("img");
      if (!img) return;
      var overlay = document.createElement("div");
      overlay.className = "spu-lightbox";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-label", "Imagem ampliada");
      var big = document.createElement("img");
      big.src = img.currentSrc || img.src;
      big.alt = img.alt || "";
      var close = document.createElement("button");
      close.className = "spu-lightbox__close";
      close.setAttribute("aria-label", "Fechar");
      close.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      overlay.appendChild(big);
      overlay.appendChild(close);
      function destroy() { overlay.remove(); document.removeEventListener("keydown", onKey); }
      function onKey(event) { if (event.key === "Escape") destroy(); }
      overlay.addEventListener("click", destroy);
      document.addEventListener("keydown", onKey);
      document.body.appendChild(overlay);
      close.focus();
    });
  });

  var conceitos = {
    propriedade: { cor: "var(--petrol-600)", titulo: "Propriedade", texto: "É o domínio pleno reconhecido pelo direito. No Brasil, ele nasce das concessões de sesmarias e, posteriormente, da compra prevista na Lei de Terras. Desde 1988, a propriedade deve cumprir uma função social. Para a gestão pública, provar o domínio exige reconstruir essa cadeia histórica." },
    posse: { cor: "var(--ochre-600)", titulo: "Posse", texto: "É a ocupação de fato, com ou sem título. Entre 1822 e 1850, foi a principal via de acesso à terra e continuou presente na prática. A diferença entre posse e propriedade estrutura a regularização fundiária e o tratamento das ocupações em áreas públicas." },
    titulo: { cor: "var(--terra-600)", titulo: "Título", texto: "É o documento e o registro que formalizam a propriedade. O sistema registral brasileiro chegou depois da ocupação do território, por isso muitas cadeias dominiais são incompletas. Para o patrimônio público, registrar e georreferenciar ajudam a proteger o que é de todos." },
    publicas: { cor: "var(--green-600)", titulo: "Terras públicas", texto: "Da Coroa aos entes federativos, o conceito reúne terras devolutas, terrenos de marinha, demais bens da União e os patrimônios estaduais e municipais. Essas áreas incluem o que nunca saiu validamente do domínio público e formam a base física de muitas políticas de Estado." },
    funcao: { cor: "var(--petrol-800)", titulo: "Função socioambiental", texto: "É a finalidade da propriedade desde a Constituição de 1988, inclusive da propriedade pública. Destinar imóveis para habitação, conservação ambiental, comunidades tradicionais e equipamentos públicos concretiza esse dever constitucional." }
  };

  var chips = Array.prototype.slice.call(document.querySelectorAll(".pg-gear__tooth"));
  var painel = document.getElementById("mapa-panel");
  var painelTitulo = document.getElementById("mapa-titulo");
  var painelTexto = document.getElementById("mapa-texto");
  chips.forEach(function (chip, index) {
    chip.tabIndex = index === 0 ? 0 : -1;
    chip.addEventListener("click", function () {
      var data = conceitos[chip.getAttribute("data-conceito")];
      if (!data) return;
      chips.forEach(function (current) {
        var on = current === chip;
        current.classList.toggle("is-active", on);
        current.setAttribute("aria-selected", on ? "true" : "false");
        current.tabIndex = on ? 0 : -1;
      });
      if (painel) painel.style.setProperty("--_pc", data.cor);
      if (painelTitulo) painelTitulo.textContent = data.titulo;
      if (painelTexto) painelTexto.textContent = data.texto;
    });
    chip.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      var direction = event.key === "ArrowRight" ? 1 : -1;
      var nextChip = chips[(index + direction + chips.length) % chips.length];
      nextChip.click();
      nextChip.focus();
    });
  });

  function prefersReduced() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
})();
