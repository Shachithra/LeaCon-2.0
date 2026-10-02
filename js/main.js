/* ==========================================================================
   LeaCon II — Global behaviour
   ========================================================================== */

(function () {
  "use strict";

  /* Placeholder links (href="#") should not jump the page to the top.
     Replace them with real URLs when they are confirmed. */
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('a[href="#"]');
    if (link) e.preventDefault();
  });
})();
