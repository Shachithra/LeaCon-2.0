/* ==========================================================================
   LeaCon II — Animation triggers (IntersectionObserver + CSS)
   Motion only runs when html.js-anim is present and reduced motion is off.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;

  function enable() {
    root.classList.add("js-anim");
  }

  try {
    var reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduced && !root.classList.contains("js-anim")) enable();

    var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

    targets.forEach(function (el) {
      var delay = el.getAttribute("data-delay");
      if (delay) el.style.setProperty("--d", delay + "ms");
    });

    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("is-in");
      });
      window.__animReady = true;
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });

    window.__animReady = true;
  } catch (err) {
    root.classList.remove("js-anim");
    window.__animReady = true;
  }
})();
