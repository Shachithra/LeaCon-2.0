/* ==========================================================================
   LeaCon II — Field validation helpers
   Used by form.js; also usable standalone for native-style validation UI.
   ========================================================================== */

window.LCValidation = (function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^\+?[0-9][0-9\s\-().]{6,19}$/;

  var MESSAGES = {
    required: "This field is required.",
    email: "Enter a valid email address.",
    tel: "Enter a valid phone number.",
    radio: "Please choose one of the options.",
    checkbox: "Please tick this box to continue.",
    notEqual: "Your second preference must be different from your first choice."
  };

  function controlsIn(field) {
    return Array.prototype.slice.call(
      field.querySelectorAll("input, textarea, select")
    ).filter(function (el) {
      return el.type !== "file" && !el.disabled;
    });
  }

  function isEmptyControl(el) {
    if (el.type === "checkbox") return !el.checked;
    return !(el.value || "").trim();
  }

  function controlMessage(el) {
    var value = (el.value || "").trim();
    if (el.type === "checkbox" && !el.checked) return MESSAGES.checkbox;
    if (!value) return MESSAGES.required;
    if (el.type === "email" && !EMAIL_RE.test(value)) return MESSAGES.email;
    if (el.type === "tel" && !PHONE_RE.test(value)) return MESSAGES.tel;
    return null;
  }

  function setError(field, message, controls) {
    field.classList.add("has-error");
    var box = field.querySelector(".field__error");
    if (box) box.textContent = message;
    (controls || controlsIn(field)).forEach(function (el) {
      if (message) el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");
    });
  }

  function clearError(field) {
    setError(field, null);
    field.classList.remove("has-error");
    var box = field.querySelector(".field__error");
    if (box) box.textContent = "";
  }

  /* Validate one .field wrapper. opts: { notEqual, notEqualMessage, skip } */
  function field(fieldEl, opts) {
    opts = opts || {};
    if (!fieldEl || opts.skip) return { ok: true };

    var controls = controlsIn(fieldEl);
    if (!controls.length) return { ok: true };

    var radios = controls.filter(function (el) {
      return el.type === "radio";
    });

    var message = null;

    if (radios.length) {
      var group = radios[0].name;
      var checked = controls.some(function (el) {
        return el.type === "radio" && el.checked;
      });
      if (!checked) {
        message = MESSAGES.radio;
      } else if (opts.notEqual) {
        var chosen = radios.filter(function (el) {
          return el.checked;
        })[0];
        if (chosen && chosen.value === opts.notEqual) {
          message = opts.notEqualMessage || MESSAGES.notEqual;
        }
      }
    } else {
      for (var i = 0; i < controls.length; i++) {
        var msg = controlMessage(controls[i]);
        if (msg) {
          message = msg;
          break;
        }
        if (opts.notEqual && (controls[i].value || "").trim() === opts.notEqual) {
          message = opts.notEqualMessage || MESSAGES.notEqual;
          break;
        }
      }
    }

    if (message) {
      setError(fieldEl, message, controls);
      return { ok: false, message: message, target: controls[0] };
    }

    clearError(fieldEl);
    return { ok: true };
  }

  function firstControl(fieldEl) {
    return controlsIn(fieldEl)[0] || null;
  }

  return {
    EMAIL_RE: EMAIL_RE,
    PHONE_RE: PHONE_RE,
    MESSAGES: MESSAGES,
    field: field,
    clear: clearError,
    setError: setError,
    firstControl: firstControl
  };
})();
