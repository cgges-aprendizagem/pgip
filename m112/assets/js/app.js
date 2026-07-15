/* ============================================================
   Interações da página — vanilla JS, sem dependências.
   Reproduz os comportamentos dos componentes do DS (spu-builder):
   Timeline (eras + marcos), Figure (lightbox) e chips do mapa mental.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Timeline: abas de era ---------- */
  var eraBtns = Array.prototype.slice.call(document.querySelectorAll(".spu-tl__era"));
  var eraBlocks = Array.prototype.slice.call(document.querySelectorAll(".spu-tl__era-block"));

  eraBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.getAttribute("data-era");
      eraBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("spu-tl__era--active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      eraBlocks.forEach(function (blk) {
        blk.hidden = blk.getAttribute("data-era") !== target;
      });
      // rolar suavemente até o topo da linha do tempo em telas pequenas
      var tl = document.getElementById("linha-do-tempo");
      if (tl && window.innerWidth < 720) {
        tl.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
      }
    });
  });

  /* ---------- Timeline: marcos (acordeão) ---------- */
  Array.prototype.slice.call(document.querySelectorAll(".spu-tl__mbtn")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".spu-tl__item");
      var content = item.querySelector(".spu-tl__content");
      var open = item.classList.toggle("spu-tl__item--open");
      if (content) content.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ---------- Figure: lightbox (zoom) ---------- */
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
      close.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      overlay.appendChild(big);
      overlay.appendChild(close);
      function destroy() {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
      }
      function onKey(e) { if (e.key === "Escape") destroy(); }
      overlay.addEventListener("click", destroy);
      document.addEventListener("keydown", onKey);
      document.body.appendChild(overlay);
      close.focus();
    });
  });

  /* ---------- Mapa mental: chips de conceito ---------- */
  var conceitos = {
    propriedade: {
      cor: "var(--petrol-600)",
      titulo: "Propriedade",
      texto: "É o domínio pleno reconhecido pelo direito. No Brasil, ela nasce de concessões (sesmarias) e, depois, da compra (Lei de Terras) — nunca de um ponto zero neutro. Desde 1988, só se justifica se cumprir função social. Para a gestão pública, provar propriedade é reconstruir essa cadeia histórica."
    },
    posse: {
      cor: "var(--ochre-600)",
      titulo: "Posse",
      texto: "É a ocupação de fato, com ou sem título. Entre 1822 e 1850 foi a principal via de acesso à terra — e nunca deixou de sê-lo na prática. A tensão entre posse e propriedade estrutura a regularização fundiária e o tratamento das ocupações em áreas públicas."
    },
    titulo: {
      cor: "var(--terra-600)",
      titulo: "Título",
      texto: "É o documento — e o registro — que transforma posse em propriedade. O sistema registral brasileiro chegou depois da ocupação do território, por isso tantas cadeias dominiais são incompletas. Para o patrimônio público, registrar e georreferenciar é defender o que é de todos."
    },
    publicas: {
      cor: "var(--green-600)",
      titulo: "Terras públicas",
      texto: "Da Coroa aos entes federativos: terras devolutas (dos estados, desde 1891), terrenos de marinha e demais bens da União (art. 20 da CF/88), além dos patrimônios estaduais e municipais. São o resíduo histórico do que nunca saiu validamente do domínio público — e a base física das políticas de Estado."
    },
    funcao: {
      cor: "var(--petrol-800)",
      titulo: "Função socioambiental",
      texto: "É o \u201cpara quê\u201d da propriedade desde a Constituição de 1988 — inclusive da propriedade pública. Destinar imóveis para habitação, conservação ambiental, comunidades tradicionais e equipamentos públicos não é favor: é cumprimento da Constituição."
    }
  };

  var chips = Array.prototype.slice.call(document.querySelectorAll(".pg-chips .spu-tag"));
  var painel = document.getElementById("mapa-panel");
  var painelTitulo = document.getElementById("mapa-titulo");
  var painelTexto = document.getElementById("mapa-texto");

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var d = conceitos[chip.getAttribute("data-conceito")];
      if (!d) return;
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("spu-tag--active", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
        if (on) c.style.setProperty("--_cc", d.cor);
      });
      if (painel) painel.style.setProperty("--_pc", d.cor);
      if (painelTitulo) painelTitulo.textContent = d.titulo;
      if (painelTexto) painelTexto.textContent = d.texto;
    });
  });

  function prefersReduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
})();
