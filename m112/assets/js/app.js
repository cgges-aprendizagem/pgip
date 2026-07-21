/* Interações da página: carrossel, acordeões, lightbox e engrenagem. */
(function () {
  "use strict";

  var eraBlocks = Array.prototype.slice.call(document.querySelectorAll(".spu-tl__era-block"));

  eraBlocks.forEach(function (block, index) {
    var era = block.getAttribute("data-era");
    var trigger = block.querySelector(":scope > .spu-period__trigger");
    if (!trigger) return;
    trigger.addEventListener("click", function () {
      if (block.classList.contains("is-open")) {
        setEraState(era, false, false);
      } else {
        setEraState(era, true, false);
        goToEra(index);
      }
    });
  });

  function setEraState(era, open, shouldScroll) {
    eraBlocks.forEach(function (block) {
      var isTarget = block.getAttribute("data-era") === era;
      var shouldBeOpen = open && isTarget;
      var trigger = block.querySelector(":scope > .spu-period__trigger");
      var body = block.querySelector(":scope > .spu-period__body");
      block.classList.toggle("is-open", shouldBeOpen);
      if (trigger) trigger.setAttribute("aria-expanded", shouldBeOpen ? "true" : "false");
      if (body) body.hidden = !shouldBeOpen;
    });
    if (shouldScroll && open) {
      var target = eraBlocks.find(function (block) { return block.getAttribute("data-era") === era; });
      if (target) target.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    }
  }

  function openEra(era, shouldScroll) {
    setEraState(era, true, shouldScroll);
  }

  setEraState(null, false, false);

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
    if (carousel) carousel.style.setProperty("--_era", getComputedStyle(slides[currentEra]).getPropertyValue("--_slide"));
    if (currentLabel) currentLabel.textContent = String(currentEra + 1).padStart(2, "0");
    if (status) {
      var caption = slides[currentEra].querySelector("figcaption");
      status.textContent = "Era " + (currentEra + 1) + " de " + slides.length + ": " + (caption ? caption.textContent : "");
    }
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

  var chips = Array.prototype.slice.call(document.querySelectorAll(".pg-gear__tooth"));
  var conceptPanels = Array.prototype.slice.call(document.querySelectorAll("[data-conceito-panel]"));
  chips.forEach(function (chip, index) {
    chip.addEventListener("click", function () {
      var concept = chip.getAttribute("data-conceito");
      chips.forEach(function (current) {
        var on = current === chip;
        current.classList.toggle("is-active", on);
        current.setAttribute("aria-selected", on ? "true" : "false");
        current.tabIndex = on ? 0 : -1;
      });
      conceptPanels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-conceito-panel") !== concept;
      });
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
