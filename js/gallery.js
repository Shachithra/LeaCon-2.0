/* ==========================================================================
   LeaCon II — Gallery / photography (desktop-only subtle parallax)
   Disabled on touch widths and for prefers-reduced-motion.
   ========================================================================== */

(function () {
  "use strict";

  var reduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktop =
    window.matchMedia && window.matchMedia("(min-width: 1024px)").matches;

  if (reduced || !desktop || !("IntersectionObserver" in window)) return;

  var figures = Array.prototype.slice.call(
    document.querySelectorAll(".gallery-grid .figure, .motion-grid .figure")
  );
  if (!figures.length) return;

  var MAX_SHIFT = 14;
  var active = [];
  var ticking = false;

  function apply(fig) {
    var img = fig.querySelector("img");
    if (!img || img.dataset.parallaxReady !== "on") return;
    var frame = fig.querySelector(".figure__frame");
    if (!frame) return;
    var rect = frame.getBoundingClientRect();
    if (rect.bottom < -80 || rect.top > window.innerHeight + 80) return;
    var centerDelta =
      (window.innerHeight / 2 - (rect.top + rect.height / 2)) / window.innerHeight;
    var y = Math.max(-1, Math.min(1, centerDelta)) * MAX_SHIFT;
    img.style.transform = "translate3d(0, " + y.toFixed(2) + "px, 0) scale(1.07)";
  }

  function tick() {
    ticking = false;
    for (var i = 0; i < active.length; i++) apply(active[i]);
  }

  function requestTick() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(tick);
  }

  var visibility = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var idx = active.indexOf(entry.target);
        if (entry.isIntersecting && idx === -1) active.push(entry.target);
        else if (!entry.isIntersecting && idx > -1) active.splice(idx, 1);
      });
      requestTick();
    },
    { rootMargin: "12% 0px" }
  );

  var revealWatch = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var fig = entry.target;
        revealWatch.unobserve(fig);
        /* Wait for the mask/scale reveal to finish, then allow parallax. */
        window.setTimeout(function () {
          fig.dataset.parallaxFig = "on";
          var img = fig.querySelector("img");
          if (img) img.dataset.parallaxReady = "on";
          if (active.indexOf(fig) === -1) visibility.observe(fig);
          requestTick();
        }, 1750);
      });
    },
    { rootMargin: "0px", threshold: 0.15 }
  );

  figures.forEach(function (fig) {
    revealWatch.observe(fig);
  });

  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick, { passive: true });
})();
