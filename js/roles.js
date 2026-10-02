/* ==========================================================================
   LeaCon II — Role interactions
   - focus fallback classes for browsers without :has()
   - marks the current role in the role navigation
   ========================================================================== */

(function () {
  "use strict";

  var focusables = document.querySelectorAll(".branch, .choice");
  Array.prototype.forEach.call(focusables, function (el) {
    var input = el.querySelector("input");
    var target = input || el;
    target.addEventListener("focus", function () {
      el.classList.add("is-focus");
    });
    target.addEventListener("blur", function () {
      el.classList.remove("is-focus");
    });
  });

  /* aria-current for the role footer navigation */
  var path = window.location.pathname.replace(/\\/g, "/").toLowerCase();
  var links = document.querySelectorAll('.role-nav__link[href*="roles/"]');
  Array.prototype.forEach.call(links, function (link) {
    var href = link.getAttribute("href") || "";
    if (path.indexOf(href.toLowerCase().replace("../", "").replace("./", "")) !== -1) {
      link.setAttribute("aria-current", "page");
    }
  });
})();
