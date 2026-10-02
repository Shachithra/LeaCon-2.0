/* ==========================================================================
   LeaCon II — Multi-step application form
   HTML form → JavaScript → Google Apps Script Web App → Google Sheet
   ========================================================================== */

(function () {
  "use strict";

   /* ------------------------------------------------------------------ *
    * CONFIG
    * SCRIPT_URL  — the deployed Google Apps Script Web App URL (ends in
    *               /exec). Never use the deployment ID here. See
    *               README.md ("Google Sheets integration").
    * Open/closed — comes from js/site-config.js (window.LC_SITE), the
    *               single source of truth for the whole site. Flip
    *               applicationStatus there, not here.
    * ------------------------------------------------------------------ */
  var SCRIPT_URL =
    "https://script.google.com/a/macros/aiesec.net/s/AKfycbx4RSKlUIKESCpYXfXtAx5TA1KiZfD_ta4xhU7edtFrQ1ehjweDIFZ1ol-3SgIFPeg-/exec";
  var APPLICATIONS_OPEN =
    !window.LC_SITE || window.LC_SITE.applicationStatus === "open";

  var MAX_PHOTO_BYTES = 3 * 1024 * 1024;
  var SUBMIT_LABEL = "Submit application";

  var ROLE_SUMMARIES = {
    OCP:
      "Lead the entire organizing and coordination process of LeaCon II and guide every function to delivery.",
    "OCVP Delegates":
      "Recruit, communicate with and serve every delegate — mailers, registrations and the delegate experience.",
    "OCVP Marketing":
      "Own promotion and production of every visual and message LeaCon II puts out.",
    "OCVP Partnership Development":
      "Raise the funding, gift partners and financial reporting that make LeaCon II possible.",
    "OCVP Events & Logistics":
      "Venue, agenda, transport and resources — the backbone of a smooth event."
  };

  var STEP_NAMES = [
    "Basic information",
    "Experience & motivation",
    "Role preferences",
    "Professional photo",
    "Review & submit"
  ];

  var form = document.getElementById("applicationForm");
  if (!form) return;

  var V = window.LCValidation;
  var closedState = document.getElementById("closed-state");
  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var progressStep = document.getElementById("progress-step");
  var progressName = document.getElementById("progress-name");
  var progressBar = document.getElementById("progress-bar");
  var summary = document.getElementById("error-summary");
  var statusBox = document.getElementById("errorMessage");
  var successBox = document.getElementById("successMessage");
  var btnSubmit = document.getElementById("submitApplication");
  var reviewBox = document.getElementById("review");
  var photoField = document.getElementById("field-photo");
  var photoInput = document.getElementById("professionalPhoto");
  var photoDrop = document.getElementById("photo-drop");
  var photoPreview = document.getElementById("photo-preview");
  var photoThumb = document.getElementById("photo-thumb");
  var photoName = document.getElementById("photo-name");
  var photoSize = document.getElementById("photo-size");
  var roleSummary = document.querySelector("[data-role-summary]");
  var header = document.querySelector(".site-header");

  var current = 0;
  var photo = null;
  var submitting = false;

  if (!APPLICATIONS_OPEN) {
    form.hidden = true;
    var intro = document.querySelector(".form-intro");
    if (intro) intro.hidden = true;
    if (closedState) closedState.hidden = false;
    return;
  }

  var reduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Helpers ---------------------------------------------------------------- */

  function value(name) {
    var el = form.elements[name];
    if (!el) return "";
    if (el.length !== undefined && el.value !== undefined && el[0] && el[0].type === "radio") {
      return el.value;
    }
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return (el.value || "").trim();
    return (el.value || "").trim();
  }

  function optsFor(field) {
    if (field.id === "field-pref2") {
      return { notEqual: value("firstPreference") };
    }
    return {};
  }

  function smooth() {
    return reduced ? "auto" : "smooth";
  }

  function navOffset() {
    return (header ? header.offsetHeight : 0) + 16;
  }

  /* Error summary ---------------------------------------------------------- */

  function hideSummary() {
    summary.classList.remove("is-visible");
    var ul = summary.querySelector("ul");
    if (ul) ul.innerHTML = "";
  }

  function showSummary(results) {
    var ul = summary.querySelector("ul");
    ul.innerHTML = "";
    results.forEach(function (r) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#";
      a.textContent = r.message;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        if (!r.target) return;
        r.target.focus({ preventScroll: true });
        r.target.scrollIntoView({ block: "center", behavior: smooth() });
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
    summary.classList.add("is-visible");
    summary.focus({ preventScroll: true });
  }

  /* Photo validation ------------------------------------------------------- */

  function validatePhotoField() {
    if (photo) {
      V.clear(photoField);
      return { ok: true };
    }
    V.setError(photoField, "Please choose a photo to continue.", [photoInput]);
    return {
      ok: false,
      message: "Please choose a photo to continue.",
      target: photoInput
    };
  }

  /* Step validation -------------------------------------------------------- */

  function validateStep(index) {
    var results = [];
    var fields = Array.prototype.slice.call(steps[index].querySelectorAll(".field"));

    fields.forEach(function (field) {
      if (field === photoField) {
        results.push(validatePhotoField());
        return;
      }
      var res = V.field(field, optsFor(field));
      if (!res.ok) {
        res.target = res.target || V.firstControl(field);
        results.push(res);
      }
    });

    return results.filter(function (r) {
      return !r.ok;
    });
  }

  /* Step machine ------------------------------------------------------------ */

  function showStep(index, direction) {
    steps.forEach(function (s, i) {
      s.hidden = i !== index;
    });
    current = index;

    var active = steps[index];
    active.style.setProperty("--step-dir", direction > 0 ? "1.75rem" : "-1.75rem");
    active.classList.remove("step--enter");
    void active.offsetWidth;
    active.classList.add("step--enter");

    progressStep.textContent = "Step 0" + (index + 1) + " / 05";
    progressName.textContent = STEP_NAMES[index];
    progressBar.style.transform = "scaleX(" + (index + 1) / 5 + ")";

    hideSummary();
    hideStatus();

    if (index === 4) buildReview();

    if (direction !== null) {
      var heading = active.querySelector(".step__title");
      if (heading) heading.focus({ preventScroll: true });
      var rect = form.getBoundingClientRect();
      if (rect.top < navOffset() || rect.top > window.innerHeight * 0.5) {
        window.scrollTo({
          top: window.scrollY + rect.top - navOffset(),
          behavior: smooth()
        });
      }
    }
  }

  function goNext() {
    var errors = validateStep(current);
    if (errors.length) {
      showSummary(errors);
      return;
    }
    hideSummary();
    if (current < steps.length - 1) showStep(current + 1, 1);
  }

  function goBack() {
    hideSummary();
    if (current > 0) showStep(current - 1, -1);
  }

  form.addEventListener("click", function (e) {
    if (e.target.closest("[data-next]")) goNext();
    else if (e.target.closest("[data-back]")) goBack();
  });

  /* Live validation on input ------------------------------------------------ */

  form.addEventListener(
    "blur",
    function (e) {
      var el = e.target;
      if (!el.closest || !el.closest(".field")) return;
      var field = el.closest(".field");
      if (field === photoField) return;
      if (field.classList.contains("has-error")) V.field(field, optsFor(field));
    },
    true
  );

  form.addEventListener("input", function (e) {
    var field = e.target.closest && e.target.closest(".field");
    if (!field || field === photoField) return;
    if (field.classList.contains("has-error")) V.field(field, optsFor(field));
    if (statusBox.classList.contains("is-visible")) hideStatus();
  });

  form.addEventListener("change", function (e) {
    var field = e.target.closest && e.target.closest(".field");
    if (!field || field === photoField) return;
    if (field.classList.contains("has-error")) V.field(field, optsFor(field));
    if (field.id === "field-pref1") updateRoleSummary();
    if (e.target.id === "check-accurate" || e.target.id === "policiesAccepted") {
      updateReviewConsent();
    }
  });

  /* Role summary ------------------------------------------------------------ */

  function updateRoleSummary() {
    if (!roleSummary) return;
    var chosen = value("firstPreference");
    if (!chosen || !ROLE_SUMMARIES[chosen]) {
      roleSummary.hidden = true;
      return;
    }
    roleSummary.querySelector("[data-role-summary-name]").textContent = chosen;
    roleSummary.querySelector("[data-role-summary-desc]").textContent =
      ROLE_SUMMARIES[chosen];
    roleSummary.hidden = false;
  }

  /* Deep link: application.html?role=OCVP%20Marketing ------------------------ */

  (function preselectRole() {
    var params = new URLSearchParams(window.location.search);
    var role = params.get("role");
    if (!role || !ROLE_SUMMARIES[role]) return;
    var input = form.querySelector(
      'input[name="firstPreference"][value="' +
        role.replace(/"/g, '\\"') +
        '"]'
    );
    if (input) {
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  })();

  /* Photo handling ----------------------------------------------------------- */

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function photoError(message) {
    V.setError(photoField, message, [photoInput]);
  }

  function renderPhoto() {
    if (!photo) {
      photoPreview.hidden = true;
      photoDrop.hidden = false;
      photoThumb.removeAttribute("src");
      return;
    }
    photoThumb.src = photo.dataUrl;
    photoName.textContent = photo.name;
    photoSize.textContent = formatSize(photo.size) + " · JPG / PNG";
    photoDrop.hidden = true;
    photoPreview.hidden = false;
    V.clear(photoField);
  }

  function setPhoto(dataUrl, name, size, type) {
    photo = { dataUrl: dataUrl, name: name, size: size, type: type };
    renderPhoto();
  }

  function optimizeAndSet(dataUrl, file) {
    var img = new Image();
    img.onload = function () {
      try {
        var max = 1920;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var needsReEncode = scale < 1 || file.size > 1.5 * 1024 * 1024;
        if (!needsReEncode && file.type === "image/jpeg") {
          setPhoto(dataUrl, file.name, file.size, file.type);
          return;
        }
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        var out = canvas.toDataURL("image/jpeg", 0.86);
        var approx = Math.round((out.length - out.indexOf(",") - 1) * 0.75);
        setPhoto(out, file.name.replace(/\.[^.]+$/, "") + ".jpg", approx, "image/jpeg");
      } catch (err) {
        setPhoto(dataUrl, file.name, file.size, file.type);
      }
    };
    img.onerror = function () {
      photoError("Could not read that image. Please try another photo.");
    };
    img.src = dataUrl;
  }

  function handleFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png)$/i.test(file.type)) {
      photoError("Please choose a JPG or PNG image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      photoError("That file is larger than 3 MB. Please choose a smaller photo.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      optimizeAndSet(e.target.result, file);
    };
    reader.onerror = function () {
      photoError("Could not read that file. Please try again.");
    };
    reader.readAsDataURL(file);
  }

  photoInput.addEventListener("change", function () {
    handleFile(photoInput.files && photoInput.files[0]);
    photoInput.value = "";
  });

  var browseBtn = form.querySelector("[data-photo-browse]");
  if (browseBtn) {
    browseBtn.addEventListener("click", function () {
      photoInput.value = "";
      photoInput.click();
    });
  }

  photoDrop.addEventListener("click", function (e) {
    if (e.target.closest("[data-photo-browse]")) return;
    photoInput.value = "";
    photoInput.click();
  });

  ["dragenter", "dragover"].forEach(function (type) {
    photoDrop.addEventListener(type, function (e) {
      e.preventDefault();
      photoDrop.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach(function (type) {
    photoDrop.addEventListener(type, function (e) {
      e.preventDefault();
      photoDrop.classList.remove("is-dragover");
    });
  });

  photoDrop.addEventListener("drop", function (e) {
    var files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) handleFile(files[0]);
  });

  var replaceBtn = form.querySelector("[data-photo-replace]");
  if (replaceBtn) {
    replaceBtn.addEventListener("click", function () {
      photoInput.value = "";
      photoInput.click();
    });
  }

  var removeBtn = form.querySelector("[data-photo-remove]");
  if (removeBtn) {
    removeBtn.addEventListener("click", function () {
      photo = null;
      photoInput.value = "";
      renderPhoto();
      photoInput.focus({ preventScroll: true });
    });
  }

  /* Review step -------------------------------------------------------------- */

  function reviewRow(label, valueText, extraClass) {
    var row = document.createElement("div");
    row.className = "review__row";
    var l = document.createElement("span");
    l.className = "review__label";
    l.textContent = label;
    var v = document.createElement("span");
    v.className = "review__value" + (extraClass ? " " + extraClass : "");
    v.textContent = valueText;
    row.appendChild(l);
    row.appendChild(v);
    return row;
  }

  function buildReview() {
    reviewBox.innerHTML = "";
    var rows = [
      ["Full name", value("fullName") || "—"],
      ["Contact number", value("contactNumber") || "—"],
      ["Email", value("email") || "—"],
      ["Front office function", value("frontOffice") || "—"],
      ["Back office function", value("backOffice") || "—"],
      ["First preference", value("firstPreference") || "—"],
      ["Second preference", value("secondPreference") || "—"]
    ];

    rows.forEach(function (r) {
      reviewBox.appendChild(reviewRow(r[0], r[1]));
    });

    /* Photo row with thumbnail */
    var photoRow = document.createElement("div");
    photoRow.className = "review__row";
    var pl = document.createElement("span");
    pl.className = "review__label";
    pl.textContent = "Professional photo";
    var pv = document.createElement("span");
    pv.className = "review__value review__value--photo";
    if (photo) {
      var img = document.createElement("img");
      img.src = photo.dataUrl;
      img.alt = "";
      var nameSpan = document.createElement("span");
      nameSpan.textContent = photo.name;
      pv.appendChild(img);
      pv.appendChild(nameSpan);
    } else {
      pv.textContent = "—";
    }
    photoRow.appendChild(pl);
    photoRow.appendChild(pv);
    reviewBox.appendChild(photoRow);

    /* Live consent rows */
    var accurate = document.createElement("div");
    accurate.className = "review__row";
    var al = document.createElement("span");
    al.className = "review__label";
    al.textContent = "Information accurate";
    var av = document.createElement("span");
    av.className = "review__value";
    av.id = "review-accurate";
    accurate.appendChild(al);
    accurate.appendChild(av);
    reviewBox.appendChild(accurate);

    var policies = document.createElement("div");
    policies.className = "review__row";
    var pol = document.createElement("span");
    pol.className = "review__label";
    pol.textContent = "Policies accepted";
    var pov = document.createElement("span");
    pov.className = "review__value";
    pov.id = "review-policies";
    policies.appendChild(pol);
    policies.appendChild(pov);
    reviewBox.appendChild(policies);

    updateReviewConsent();
  }

  function updateReviewConsent() {
    var a = document.getElementById("review-accurate");
    var p = document.getElementById("review-policies");
    if (a) {
      a.textContent = document.getElementById("check-accurate").checked
        ? "Confirmed"
        : "Not yet confirmed";
    }
    if (p) {
      p.textContent = document.getElementById("policiesAccepted").checked
        ? "Accepted"
        : "Not yet accepted";
    }
  }

  /* Submission status -------------------------------------------------------- */

  function showStatus(title, body) {
    statusBox.querySelector(".form-status__title").textContent = title;
    statusBox.querySelector(".form-status__body").textContent = body;
    statusBox.classList.add("is-visible");
    statusBox.focus({ preventScroll: true });
    statusBox.scrollIntoView({ block: "center", behavior: smooth() });
  }

  function hideStatus() {
    statusBox.classList.remove("is-visible");
  }

  /* After a failed POST, tell apart "endpoint unreachable / restricted"
     from "sending failed": a harmless GET (doGet) probes reachability. */
  function diagnoseAndShowError(err) {
    if (err.fromServer || err.restricted) {
      showStatus("Submission failed", err.message);
      return Promise.resolve();
    }

    if (navigator.onLine === false) {
      showStatus(
        "Submission failed",
        "You appear to be offline. Please check your internet connection and try again — your answers are still here."
      );
      return Promise.resolve();
    }

    return fetch(SCRIPT_URL, { method: "GET" })
      .then(function (res) {
        return res.text().then(function (text) {
          try {
            JSON.parse(text);
            return true;
          } catch (parseError) {
            return false;
          }
        });
      })
      .catch(function () {
        return false;
      })
      .then(function (reachable) {
        console.error("[LeaCon II] endpoint probe after failure:", {
          reachable: reachable,
          onLine: navigator.onLine
        });
        showStatus(
          "Submission failed",
          reachable
            ? "The application service is reachable, but sending your application failed. Your answers are still here — please try again in a moment."
            : "The application service is temporarily restricted or unavailable. Your answers are still here — please try again a little later, or contact the team from the homepage."
        );
      });
  }

  function buildData() {
    var data = new URLSearchParams();

    data.append("fullName", value("fullName"));
    data.append("email", value("email"));
    data.append("contactNumber", value("contactNumber"));
    data.append("frontOffice", value("frontOffice"));
    data.append("backOffice", value("backOffice"));
    data.append("inspiration", value("inspiration"));
    data.append("skills", value("skills"));
    data.append("leadershipExperience", value("leadershipExperience"));
    data.append("challengeHandling", value("challengeHandling"));
    data.append("successfulEvent", value("successfulEvent"));
    data.append("strengths", value("strengths"));
    data.append("weaknesses", value("weaknesses"));
    data.append("firstPreference", value("firstPreference"));
    data.append("secondPreference", value("secondPreference"));
    data.append(
      "policiesAccepted",
      document.getElementById("policiesAccepted").checked ? "Yes" : "No"
    );
    data.append(
      "accurateConfirmation",
      document.getElementById("check-accurate").checked ? "Yes" : "No"
    );

    if (photo) {
      data.append("photoBase64", photo.dataUrl);
      data.append("photoName", photo.name);
      data.append("photoType", photo.type);
    }

    /* Honeypot — humans never fill this; Apps Script rejects it. */
    data.append("website", form.elements.website ? form.elements.website.value : "");

    return data;
  }

  function showSuccess(applicationId) {
    form.hidden = true;
    document.getElementById("success-ref").textContent = applicationId || "—";
    document.getElementById("success-time").textContent = new Date().toLocaleString(
      undefined,
      { dateStyle: "medium", timeStyle: "short" }
    );
    successBox.hidden = false;
    var title = successBox.querySelector(".success__title");
    if (title) title.focus({ preventScroll: true });
    var panel = successBox.closest(".form-panel");
    if (panel) {
      window.scrollTo({
        top: window.scrollY + panel.getBoundingClientRect().top - navOffset(),
        behavior: smooth()
      });
    }
  }

  function restoreSubmit() {
    submitting = false;
    btnSubmit.disabled = false;
    btnSubmit.textContent = SUBMIT_LABEL;
    form.removeAttribute("aria-busy");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return;

    hideStatus();
    var errors = validateStep(4);
    if (errors.length) {
      showSummary(errors);
      return;
    }

    var data = buildData();

    submitting = true;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Submitting application…";
    form.setAttribute("aria-busy", "true");

    fetch(SCRIPT_URL, { method: "POST", body: data })
      .then(function (res) {
        return res.text().then(function (text) {
          var result = null;
          try {
            result = JSON.parse(text);
          } catch (parseError) {
            /* Non-JSON body — handled below. */
          }

          if (!result) {
            /* Usually a Google sign-in / "You need access" page because the
               Apps Script deployment is not public, or an infrastructure
               error. Log everything needed to debug (blueprint §24). */
            console.error("[LeaCon II] Endpoint returned a non-JSON response:", {
              status: res.status,
              finalUrl: res.url,
              contentType: res.headers.get("content-type"),
              bodyPreview: String(text).slice(0, 200)
            });
            var restrictedError = new Error(
              "The application service is temporarily restricted or unavailable. " +
                "Your answers are still here — please try again a little later, " +
                "or contact the team from the homepage."
            );
            restrictedError.restricted = true;
            throw restrictedError;
          }

          if (!result.success) {
            console.error("[LeaCon II] Endpoint returned:", {
              status: res.status,
              finalUrl: res.url,
              result: result
            });
            if (result.result === "success") {
              console.error(
                "[LeaCon II] The deployed Code.gs still uses the old response " +
                  "format — redeploy apps-script/Code.gs as a new version."
              );
            }
            var serverError = new Error(
              result.message || "Application submission failed."
            );
            serverError.fromServer = true;
            throw serverError;
          }

          showSuccess(result.applicationId);
        });
      })
      .catch(function (err) {
        console.error("[LeaCon II] submission failed:", err);
        return diagnoseAndShowError(err);
      })
      .then(function () {
        restoreSubmit();
      });
  });

  /* Init ---------------------------------------------------------------------- */

  progressBar.style.transform = "scaleX(" + 1 / 5 + ")";
  updateRoleSummary();
})();
