// This script is used to prefetch the pages when the user hovers over the links
// Kudos to McMaster-Carr

(function () {
  var cache = new Map();
  var prefetching = new Set();
  var FADE_MS = 120;

  document.body.style.transition = "opacity " + (FADE_MS / 1000) + "s ease";
  requestAnimationFrame(function () {
    document.body.style.opacity = "1";
  });

  function fullUrl(href) {
    return new URL(href, location.href).href;
  }

  function sameOrigin(href) {
    try {
      return new URL(href, location.href).origin === location.origin;
    } catch (e) {
      return false;
    }
  }

  function prefetch(url) {
    if (cache.has(url) || prefetching.has(url)) return;
    prefetching.add(url);
    fetch(url, { credentials: "same-origin" })
      .then(function (r) { return r.text(); })
      .then(function (html) { cache.set(url, html); })
      .catch(function () { prefetching.delete(url); });
  }

  // Prefetch other nav pages on load so they're ready before hover/click
  var navLinks = document.querySelectorAll("nav a[href]");
  for (var i = 0; i < navLinks.length; i++) {
    var href = navLinks[i].getAttribute("href");
    if (!href || href.startsWith("#")) continue;
    if (!sameOrigin(href)) continue;
    var url = fullUrl(href);
    if (url !== location.href) prefetch(url);
  }

  document.addEventListener(
    "mouseover",
    function (e) {
      var link = e.target.closest("nav a[href]");
      if (!link || link.target === "_blank") return;
      var href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (!sameOrigin(href)) return;
      prefetch(fullUrl(href));
    },
    true
  );

  document.addEventListener(
    "click",
    function (e) {
      var link = e.target.closest("nav a[href]");
      if (!link || link.target === "_blank") return;
      var href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!sameOrigin(href)) return;
      var url = fullUrl(href);
      if (url === location.href) return;
      if (!cache.has(url)) return;
      e.preventDefault();
      var html = cache.get(url);
      document.body.style.opacity = "0";
      setTimeout(function () {
        document.open();
        document.write(html);
        document.close();
        history.pushState({}, "", url);
      }, FADE_MS);
    },
    true
  );

  window.addEventListener("popstate", function () {
    location.reload();
  });
})();
