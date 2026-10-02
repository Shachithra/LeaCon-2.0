# LeaCon II — Organizing Committee Applications

A complete, responsive recruitment microsite for the **LeaCon II Organizing Committee**
(AIESEC in Saegis · Term 26.27). Static HTML5 + CSS3 + vanilla JavaScript — no build
step, no framework. Deploy by copying the folder to any static host.

- `index.html` — the full campaign page (hero, about, structure, roles, expectations, policies, contact, gallery, application CTA)
- `application.html` — the 5-step application form
- `roles/*.html` — five in-depth role briefs (OCP + four OCVP roles)

## Run locally

No build required. Either open `index.html` directly, or serve the folder:

```bash
python -m http.server 8080        # or: npx serve .
```

---

## Project structure

```
index.html / application.html / roles/*.html
css/        reset → tokens → base → layout → components → pages → animations → responsive
            (responsive.css is loaded LAST — all media queries live there, mobile-first,
            breakpoints: 640 / 768 / 900 / 1024 / 1180 / 1280)
js/         main, navigation, status, animations, gallery, roles, form, validation
            site-config.js is a plain config file loaded synchronously in every <head>;
            status.js applies it to the page (loaded first among the deferred scripts)
scripts/    gen-placeholders.mjs — regenerates every SVG placeholder image
apps-script/ Code.gs + appsscript.json — the Google Sheets submission endpoint
assets/     branding / fonts / icons / images / textures
qa/         Puppeteer-based QA harness (dev only, not shipped)
```

---

## Configuration checklist (before launch)

| What | Where | Current state |
|---|---|---|
| Application status | `js/site-config.js` → `applicationStatus` | `"open"` (`"open"` / `"closed"` / `"upcoming"`) — the **only** switch; hero strips, every Apply button, the application hero and the form all read it |
| Application deadline | `js/site-config.js` → `applicationDeadline` | `10 October 2026, 11.59 pm` — rendered into every `[data-app-deadline]` slot |
| Apps Script endpoint | `js/form.js` → `SCRIPT_URL` | preset to the deployed `/exec` Web App URL (never the deployment ID) |
| IGP contact | `index.html` contact section → `<!-- CONFIRM: IGP … -->` | `[ IGP name ]`, `WhatsApp [ number ]`, `[ email ]` |
| Event Manager contacts ×2 | `index.html` contact section → `<!-- CONFIRM: first/second Event Manager … -->` | `[ Event Manager name ]`, `WhatsApp [ number ]`, `[ email ]` |
| Social links | footer `nav[aria-label="Footer social"]` on every page | `href="#"` (inert — `js/main.js` blocks the jump) |

**Application status marks** — `js/status.js` fills these on every page; keep the HTML
defaults in sync with `site-config.js` so the page is correct even without JS:

```
[data-app-status]        status tag (tag--open / tag--closed / tag--upcoming)
[data-app-deadline]      deadline slot, optional data-deadline-prefix
[data-apply-cta]         every Apply button — relabelled + pointed at #closed-state
[data-app-closed-title]  closed/upcoming panel heading
[data-app-closed-body]   closed/upcoming panel copy
```

**Role deep-link preselect** — role pages send candidates to
`application.html?role=…` with these exact values (they must match the
`firstPreference` radio values in `application.html`):

```
OCP · OCVP Delegates · OCVP Marketing · OCVP Partnership Development · OCVP Events%20%26%20Logistics
```

---

## Google Sheets integration

The form is connected to a deployed Google Apps Script Web App, which appends a
row to the **Applications** sheet and stores photos in Google Drive.

- Frontend endpoint — `js/form.js` → `SCRIPT_URL` (the live `/exec` URL)
- Backend — `apps-script/Code.gs`:
  - `SPREADSHEET_ID` `1vjHm51yX-PWH2-H-oIcI24Cl-QX14OPfjgF6NVdsqEA`
  - `SHEET_NAME` `Applications` (exact tab name — the script looks it up by name)
  - `PHOTO_FOLDER_ID` `1qK7NDEtN_1TXBIuBvhVClC54bfLJWlvP` (private folder)
  - 18 columns, order fixed: Timestamp · Application ID · Email · Full Name ·
    Contact Number · Front Office Function · Back Office Function · Inspiration ·
    Skills · Leadership Experience · Challenge Handling · Successful Event ·
    Strengths · Weaknesses · First Preference · Second Preference ·
    Professional Photo URL · Policies Accepted

**Contract** (both sides must stay aligned): the frontend POSTs
`URLSearchParams` (Apps Script reads `e.parameter` — never send JSON), and the
script answers `{ success: true, applicationId, message }` or
`{ success: false, message }`. The Application ID looks like
`LEACON-20261002-153000` and is shown on the success screen.

**Server-side hardening** (`Code.gs`): required-field validation, first ≠ second
preference, OC policies accepted, photo type/3 MB checks, honeypot field,
**one application per email** (duplicate check against the Sheet), per-email
rate limit, role whitelisting and payload length caps. Never trust the frontend
— everything is re-validated there.

**Deployment access** (critical for external applicants): the script lives in the
`aiesec.net` Workspace, so in *Deploy → Manage deployments* keep:

- Execute as: **Me**
- Who has access: **Anyone**

Then test in an incognito window and on a phone not signed into AIESEC — if an
applicant ever sees a Google login or "You need access" page, the deployment is
not truly public and the Workspace admin is restricting Apps Script access.

After any `Code.gs` change: *Deploy → Manage deployments → Edit → New version →
Deploy* (the `/exec` URL stays the same), then re-test.

To switch the site to "closed", set `applicationStatus = "closed"` in `js/site-config.js`
— the hero strips, every Apply button, the application hero and the form itself all
follow it (visitors then see the closed-state panel instead of the form).

---

## Replacing the placeholder photos

Every image is a **branded SVG placeholder** (no stock photography). Replace each with
a real LeaCon photo of the same aspect ratio, keeping the `width`/`height` attributes
so layouts never shift:

```html
<picture>
  <source srcset="assets/images/hero/hero-900.jpg" media="(max-width: 640px)">
  <img src="assets/images/hero/hero-leacon.jpg"
       alt="Delegates arriving at the LeaCon registration desk"
       width="1600" height="1000" loading="lazy" decoding="async">
</picture>
```

| Slot | File | Ratio |
|---|---|---|
| Hero figure | `assets/images/hero/hero-leacon.svg` | 16:10 (cropped to 4:5 on mobile) |
| About ×2 | `assets/images/about/{session,obt}-photo.svg` | 4:3 |
| Structure band | `assets/images/branding/oc-team.svg` | 16:9 |
| Motion gallery ×4 | `assets/images/gallery/motion-0{1..4}.svg` | 3:4 · 4:3 · 1:1 · 16:9 |
| Pre-application band | `assets/images/gallery/preapply.svg` | 12:5 (cropped to 2:1 on mobile) |
| Last-year gallery ×6 | `assets/images/gallery/gallery-0{1..6}.svg` | 3:4 · 1:1 · 1:1 · 21:9 · 4:5 · 3:2 |

Regenerate placeholders after a wipe: `node scripts/gen-placeholders.mjs`.

---

## Fonts

| Family | Role | Loading |
|---|---|---|
| **LEMON MILK** | display headlines | `local()` first in `css/base.css` — install on your dev machine, and drop `LemonMilk-*.woff2/.woff` into `assets/fonts/` for visitors |
| **Raleway** | body / UI | Google Fonts CDN (`<link>` in every page `<head>`) |
| **ANDYOU** | script accent only ("Lead. Experience. Build.") | `local()` + `assets/fonts/Andyou-Regular.woff2/.woff` |

**Expected console noise until Andyou is installed:** the two
`ERR_FILE_NOT_FOUND … Andyou-Regular.woff2/.woff` errors are harmless — the accent text
renders in the *Segoe Print / Bradley Hand* fallback stack. To silence them and ship the
real font, drop `Andyou-Regular.woff2` + `.woff` into `assets/fonts/`.

Verify what actually loaded:

```bash
cd qa && node check-fonts.mjs
```

---

## Design system quick reference

- **Brand**: indigo `#2E286B`, teal `#2097A7`, green `#5BA46B` — tokens in `css/tokens.css`.
  For *small text on light surfaces* use the accessible variants
  `--color-teal-ink` `#14707D`, `--color-green-ink` `#356E45`, `--color-number` `#87877F`;
  on indigo panels use `--color-teal-on-indigo` `#7FD6E1`.
- **Cut-corner motif**: `clip-path: var(--cut-corner)` — note clip-path clips descendants
  (including `::after`), which is why structural decorations are separate elements.
- **Sections**: warm-white `section`, soft-grey `section section--surface`,
  indigo `section section--indigo`. Headings: `display display--section`, eyebrow labels
  `eyebrow`. Buttons: `.btn` (+ `--secondary` / `--on-indigo` / `--sm`).
- **Never**: gradients-as-brand, glassmorphism, one rounded card per item, pill badges,
  centered-everything, stock photography.

## Animations

Pure CSS transitions + IntersectionObserver (`js/animations.js`). Elements opt in with
`data-reveal` (+ optional `data-delay`). Everything is skipped when the user prefers
reduced motion, and a 3-second failsafe reveals anything left hidden. Do not rely on
animation for content visibility.

## Accessibility

Skip link, single `h1` per page, labelled landmarks/inputs, keyboard-operable menu
(focus moves in and is restored on Escape), `aria-current` navigation state, and
WCAG AA text contrast — enforced by `npm run audit`.

---

## QA harness (`qa/`)

Dev-only Puppeteer checks (Node ≥ 18, Chrome or set `CHROME_PATH`):

```bash
cd qa
npm install            # once (puppeteer-core only; Chrome is used from the system)

node audit.mjs         # structure + WCAG contrast audit, all 7 pages → expect zero issues
node probe-ovf.mjs     # horizontal-overflow sweep, 7 pages × 320→1920 → expect "NO OVERFLOWS"
node qa.mjs index.html,application.html,roles/ocp.html "390,768,1280"   # full-page screenshots → out/
node qa-el.mjs index.html ".org" 390 org-390     # single-element screenshot
node test-form.mjs     # end-to-end form: preselect → validation → 5 steps → upload → review → submit
node test-ocp.mjs      # OCP deep-link preselect + first ≠ second preference guard
node test-keyboard.mjs # skip link, overlay-menu focus trap (Tab + Shift+Tab + Escape),
                       # accessible names on every focusable control → expect "KEYBOARD A11Y PASSED"
node check-fonts.mjs   # which font families actually resolved
```

`MOCK=restricted|html node test-form.mjs` exercises the two failure branches (Google
login wall / non-JSON answer): expect `successShown:false`, the error panel visible and
the answers left in place.

`test-form.mjs` intercepts the request to `script.google.com` and answers it
with a mocked `{ success: true, applicationId }` response, so the end-to-end run
never writes a real Sheet row while still verifying the payload contract.

## Launch checklist

1. Fonts: drop the real `LemonMilk-{Regular,Bold}.woff2/.woff` and `Andyou-Regular.woff2/.woff` files into `assets/fonts/` so visitors without the fonts installed still get them (`local()` only helps on machines where the font is installed). Confirm with `qa/check-fonts.mjs`.
2. Swap every placeholder photo (same ratios, meaningful `alt`).
3. Fill the remaining `<!-- CONFIRM -->` items: IGP contact, both Event Manager contacts, social URLs. (Status and deadline now live in `js/site-config.js`.)
4. Confirm the Apps Script deployment is public (Execute as: Me / Anyone), submit one real test row, then delete it from the Sheet.
5. Run `qa/audit.mjs` + `qa/test-keyboard.mjs` + `qa/test-form.mjs` against the deployed URL, plus `qa/probe-ovf.mjs` for the responsive sweep (320 → 1920).
