(function () {
  "use strict";

  function setupNavigation() {
    var header = document.querySelector("[data-site-header]");
    var toggle = document.querySelector(".menu-toggle");
    var nav = document.getElementById("site-nav");
    if (!header || !toggle || !nav) return;
    var syncHeader = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    var closeMenu = function () { nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
    nav.addEventListener("click", function (event) { if (event.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeMenu(); });
    window.addEventListener("scroll", syncHeader, { passive: true });
    syncHeader();
  }

  function setupReadingProgress() {
    var progress = document.querySelector("[data-reading-progress]");
    var article = document.querySelector("[data-article]");
    if (!progress || !article) return;
    var syncProgress = function () {
      var top = article.getBoundingClientRect().top + window.scrollY;
      var height = article.offsetHeight - window.innerHeight;
      var ratio = height > 0 ? Math.min(1, Math.max(0, (window.scrollY - top) / height)) : 0;
      progress.style.width = (ratio * 100) + "%";
    };
    window.addEventListener("scroll", syncProgress, { passive: true });
    syncProgress();
  }

  function setupCodeCopy() {
    var copyLabel = document.body.dataset.copyLabel;
    var copiedLabel = document.body.dataset.copiedLabel;
    var blocks = document.querySelectorAll(".post-content pre");
    blocks.forEach(function (block) {
      var code = block.querySelector("code");
      if (!code || block.querySelector(".code-copy")) return;
      var button = document.createElement("button");
      button.className = "code-copy";
      button.type = "button";
      button.setAttribute("aria-label", copyLabel);
      button.innerHTML = "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='8' y='8' width='11' height='11' rx='1'></rect><path d='M16 8V5H5v11h3'></path></svg>";
      button.addEventListener("click", function () {
        navigator.clipboard.writeText(code.textContent).then(function () {
          button.setAttribute("aria-label", copiedLabel);
          window.setTimeout(function () { button.setAttribute("aria-label", copyLabel); }, 1400);
        }).catch(function (error) { console.error("复制代码失败", error); });
      });
      block.appendChild(button);
    });
  }

  function setupImageLightbox() {
    var images = Array.from(document.querySelectorAll(".post-content img"));
    if (images.length === 0) return;
    var currentIndex = 0;
    var trigger;
    var overlay = document.createElement("div");
    var figure = document.createElement("figure");
    var largeImage = document.createElement("img");
    var caption = document.createElement("figcaption");
    var counter = document.createElement("span");
    var closeButton = document.createElement("button");
    var previousButton = document.createElement("button");
    var nextButton = document.createElement("button");
    overlay.className = "image-lightbox" + (images.length === 1 ? " image-lightbox-single" : "");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.hidden = true;
    figure.className = "image-lightbox-figure";
    largeImage.className = "image-lightbox-image";
    caption.className = "image-lightbox-caption";
    counter.className = "image-lightbox-counter";
    closeButton.className = "image-lightbox-button image-lightbox-close";
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", document.body.dataset.closeImageLabel);
    previousButton.className = "image-lightbox-button image-lightbox-previous";
    previousButton.type = "button";
    previousButton.textContent = "←";
    previousButton.setAttribute("aria-label", document.body.dataset.previousImageLabel);
    nextButton.className = "image-lightbox-button image-lightbox-next";
    nextButton.type = "button";
    nextButton.textContent = "→";
    nextButton.setAttribute("aria-label", document.body.dataset.nextImageLabel);
    figure.appendChild(largeImage);
    figure.appendChild(caption);
    overlay.appendChild(closeButton);
    overlay.appendChild(counter);
    overlay.appendChild(previousButton);
    overlay.appendChild(figure);
    overlay.appendChild(nextButton);
    document.body.appendChild(overlay);
    var renderImage = function () {
      var image = images[currentIndex];
      largeImage.src = image.currentSrc || image.src;
      largeImage.alt = image.alt;
      caption.textContent = image.alt;
      caption.hidden = image.alt.length === 0;
      counter.textContent = (currentIndex + 1) + " / " + images.length;
    };
    var open = function (index, source) {
      currentIndex = index;
      trigger = source;
      renderImage();
      overlay.hidden = false;
      document.body.classList.add("has-lightbox");
      closeButton.focus();
    };
    var close = function () {
      overlay.hidden = true;
      document.body.classList.remove("has-lightbox");
      if (trigger) trigger.focus();
    };
    var previous = function () { currentIndex = (currentIndex - 1 + images.length) % images.length; renderImage(); };
    var next = function () { currentIndex = (currentIndex + 1) % images.length; renderImage(); };
    images.forEach(function (image, index) {
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.addEventListener("click", function (event) { event.preventDefault(); open(index, image); });
      image.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(index, image); } });
    });
    closeButton.addEventListener("click", close);
    previousButton.addEventListener("click", previous);
    nextButton.addEventListener("click", next);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) close(); });
    document.addEventListener("keydown", function (event) {
      if (overlay.hidden) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft" && images.length > 1) previous();
      if (event.key === "ArrowRight" && images.length > 1) next();
    });
  }

  function setupSearch() {
    var input = document.getElementById("searchInput");
    var resultsList = document.getElementById("searchResults");
    var hint = document.getElementById("searchHint");
    if (!input || !resultsList || !hint || typeof elasticlunr === "undefined") return;
    var indexPromise;
    var loadIndex = function () {
      if (!indexPromise) indexPromise = fetch(input.dataset.searchIndex).then(function (response) { if (!response.ok) throw new Error("搜索索引加载失败: " + response.status); return response.json(); }).then(function (data) { return elasticlunr.Index.load(data); });
      return indexPromise;
    };
    var render = function (items) {
      resultsList.innerHTML = items.slice(0, 12).map(function (item) { var title = item.doc.title; return "<li class='search-result'><a href='" + item.ref + "'><span class='search-result-title'>" + title + "</span><span class='search-result-path'>" + item.ref + "</span></a></li>"; }).join("");
      hint.hidden = items.length > 0;
    };
    var timer;
    input.addEventListener("input", function () { window.clearTimeout(timer); timer = window.setTimeout(function () { var term = input.value.trim(); if (!term) { resultsList.innerHTML = ""; hint.hidden = false; return; } loadIndex().then(function (index) { render(index.search(term, { bool: "AND", fields: { title: { boost: 2 }, body: { boost: 1 } } })); }); }, 160); });
  }

  document.addEventListener("DOMContentLoaded", function () { setupNavigation(); setupReadingProgress(); setupCodeCopy(); setupImageLightbox(); setupSearch(); });
}());
