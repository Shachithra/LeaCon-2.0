/* ==========================================================================
   LeaCon II — Navigation (sticky header, overlay menu, active section)
   ========================================================================== */

(function () {
  "use strict";

  var header = document.querySelector("[data-header]");
  var toggle = document.querySelector(".menu-toggle");
  var menu = document.getElementById("site-menu");
  var closeBtn = document.querySelector("[data-menu-close]");

  /* Sticky state ------------------------------------------------------------ */

  var stuck = false;
  function onScroll() {
    var next = window.scrollY > 8;
    if (next !== stuck) {
      stuck = next;
      if (header) header.classList.toggle("is-stuck", stuck);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Overlay menu ------------------------------------------------------------ */

  var lastFocused = null;
  var open = false;

  function focusables() {
    if (!menu) return [];
    return Array.prototype.slice
      .call(menu.querySelectorAll("a[href], button:not([disabled]), [tabindex]"))
      .filter(function (el) {
        return (
          el.getAttribute("tabindex") !== "-1" &&
          el.getAttribute("aria-hidden") !== "true" &&
          !el.disabled
        );
      });
  }

  function openMenu() {
    if (!menu || !toggle || open) return;
    open = true;
    lastFocused = document.activeElement;
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("is-locked");
    var items = focusables();
    if (items.length) items[0].focus();
    document.addEventListener("keydown", onKeydown, true);
  }

  function closeMenu(restoreFocus) {
    if (!menu || !toggle || !open) return;
    open = false;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked");
    document.removeEventListener("keydown", onKeydown, true);
    if (restoreFocus !== false && lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key !== "Tab") return;
    var items = focusables();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      open ? closeMenu() : openMenu();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      closeMenu();
    });
  }

  if (menu) {
    menu.addEventListener("click", function (e) {
      var link = e.target.closest("a[href]");
      if (link) closeMenu(false);
    });
  }

  window.addEventListener("resize", function () {
    if (open && window.matchMedia("(min-width: 1180px)").matches) closeMenu();
  });

  /* Active section indicator ------------------------------------------------ */

  var sectionLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav__list a[href^="#"], .menu__list a[href^="#"]')
  );

  if ("IntersectionObserver" in window && sectionLinks.length) {
    var map = {};
    var ids = [];
    sectionLinks.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var section = id && document.getElementById(id);
      if (!section) return;
      (map[id] = map[id] || []).push(link);
      if (ids.indexOf(id) === -1) ids.push(id);
    });

    var current = null;
    var setActive = function (id) {
      if (id === current) return;
      current = id;
      Object.keys(map).forEach(function (key) {
        map[key].forEach(function (link) {
          if (key === id) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    };

    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );

    ids.forEach(function (id) {
      sectionObserver.observe(document.getElementById(id));
    });
  }
})();
