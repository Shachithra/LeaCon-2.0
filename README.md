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
js/         main, navigation, animations, gallery, roles, form, validation
scripts/    gen-placeholders.mjs — regenerates every SVG placeholder image
apps-script/ Code.gs + appsscript.json — the Google Sheets submission endpoint
assets/     branding / fonts / icons / images / textures
qa/         Puppeteer-based QA harness (dev only, not shipped)
```

---

## Configuration checklist (before launch)

| What | Where | Current state |
|---|---|---|
| Apps Script endpoint | `js/form.js` → `APPS_SCRIPT_ENDPOINT` | `""` → submit shows an honest "Submission not connected yet" error |
| Applications open/closed | `js/form.js` → `APPLICATIONS_OPEN` | `true`; set `false` to show the closed-state panel instead of the form |
| Application deadline | `<!-- CONFIRM: application deadline -->` in `index.html`, `application.html` | "Deadline: to be announced" |
| OCP / EM contacts | `<!-- CONFIRM: official OCP and Event Manager contacts -->` in `index.html` | placeholder note |
| OCP profile | `index.html` contact section | `[ OCP name ]` |
| Social links | footer `nav[aria-label="Footer social"]` on every page | `href="#"` (inert — `js/main.js` blocks the jump) |

**Role deep-link preselect** — role pages send candidates to
`application.html?role=…` with these exact values (they must match the
`firstPreference` radio values in `application.html`):

```
OCP · OCVP Delegates · OCVP Marketing · OCVP Partnership Development · OCVP Events%20%26%20Logistics
```

---

## Google Sheets integration

The form posts to a Google Apps Script Web App, which appends a row to a Sheet
(photos travel as base64 and are stored in Drive).

1. Create a Google Sheet named **LeaCon II OC Applications**.
2. **Extensions → Apps Script** → paste `apps-script/Code.gs` as `Code.gs`.
3. **Project Settings** → tick *Show `appsscript.json` manifest file* → replace it with
   `apps-script/appsscript.json`.
4. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the `/exec` URL into `js/form.js` → `APPS_SCRIPT_ENDPOINT`.

Server-side hardening already built in (`Code.gs`): honeypot field, minimum fill-time
check, per-email rate limit, role whitelisting, payload length caps. Never trust the
frontend — re-validate everything there.

To switch the site to "closed", set `APPLICATIONS_OPEN = false` in `js/form.js` —
visitors then see the closed-state panel instead of the form.

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
node qa.mjs index.html,application.html,roles/ocp.html "390,768,1280"   # full-page screenshots → out/
node qa-el.mjs index.html ".org" 390 org-390     # single-element screenshot
node test-form.mjs     # end-to-end form: preselect → validation → 5 steps → upload → review → submit
node check-fonts.mjs   # which font families actually resolved
```

`test-form.mjs` is expected to end with the honest "endpoint not set" error while
`APPS_SCRIPT_ENDPOINT` is empty — that is the correct behaviour, not a failure.

## Launch checklist

1. Fonts: drop the real `LemonMilk-{Regular,Bold}.woff2/.woff` and `Andyou-Regular.woff2/.woff` files into `assets/fonts/` so visitors without the fonts installed still get them (`local()` only helps on machines where the font is installed). Confirm with `qa/check-fonts.mjs`.
2. Swap every placeholder photo (same ratios, meaningful `alt`).
3. Fill all `<!-- CONFIRM -->` items: deadline, contacts, OCP name, social URLs.
4. Deploy the Apps Script, paste the endpoint, submit one test row.
5. Run `qa/audit.mjs` + `qa/test-form.mjs` against the deployed URL.
