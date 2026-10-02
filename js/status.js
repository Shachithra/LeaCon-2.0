/* ==========================================================================
   LeaCon II — Application status renderer
   Reads window.LC_SITE (js/site-config.js) and applies it to the page.
   Marks used in the HTML:
     [data-app-status]        status label (tag)
     [data-app-deadline]      deadline text
     [data-apply-cta]         any "Apply" button/link
     [data-app-closed-title]  heading of the closed-state panel
     [data-app-closed-body]   body copy of the closed-state panel
   ========================================================================== */

(function () {
  "use strict";

  var cfg = window.LC_SITE || {};
  var status = /^(open|closed|upcoming)$/.test(cfg.applicationStatus)
    ? cfg.applicationStatus
    : "open";
  var deadline = String(cfg.applicationDeadline || "").trim();

  var LABEL = {
    open: "Applications open",
    closed: "Applications closed",
    upcoming: "Applications open soon"
  };
  var TAG_MODIFIER = {
    open: "tag--open",
    closed: "tag--closed",
    upcoming: "tag--upcoming"
  };
  var ALL_MODIFIERS = ["tag--open", "tag--closed", "tag--upcoming"];

  document.documentElement.setAttribute("data-application-status", status);

  function each(selector, fn) {
    var list = document.querySelectorAll(selector);
    Array.prototype.forEach.call(list, fn);
  }

  function deadlineText() {
    return deadline ? "Deadline: " + deadline : "";
  }

  function closedCopy() {
    if (status === "upcoming") {
      return {
        title: "Applications open soon.",
        body:
          "Applications for the LeaCon II Organizing Committee open soon" +
          (deadline ? " — the deadline is " + deadline + "." : ".") +
          " Check back here, or talk to the team from the homepage."
      };
    }
    return {
      title: "Applications are now closed.",
      body:
        "Thank you for your interest in LeaCon II. Applications for Term 26.27" +
        (deadline ? " closed on " + deadline : " are no longer being accepted") +
        " — follow AIESEC in Saegis for future opportunities."
    };
  }

  function apply() {
    each("[data-app-status]", function (el) {
      el.textContent = LABEL[status];
      ALL_MODIFIERS.forEach(function (modifier) {
        el.classList.remove(modifier);
      });
      el.classList.add(TAG_MODIFIER[status]);
    });

    if (deadline) {
      each("[data-app-deadline]", function (el) {
        var prefix = el.getAttribute("data-deadline-prefix");
        el.textContent =
          prefix === null || prefix === "" ? "Deadline: " + deadline : prefix + deadline;
      });
    } else {
      /* No deadline configured — hide every slot instead of showing a stub. */
      each("[data-app-deadline]", function (el) {
        el.hidden = true;
      });
    }

    if (status !== "open") {
      var label = status === "closed" ? "Applications closed" : "Applications open soon";
      each("[data-apply-cta]", function (el) {
        var href = el.getAttribute("href") || "";
        var base = href.split("#")[0].split("?")[0];
        el.setAttribute("href", base + "#closed-state");
        el.textContent = label;
      });
    }

    var copy = closedCopy();
    if (status !== "open") {
      each("[data-app-closed-title]", function (el) {
        el.textContent = copy.title;
      });
      each("[data-app-closed-body]", function (el) {
        el.textContent = copy.body;
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
