import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = new URL("../", import.meta.url).href;
const PAGES = [
  "index.html",
  "application.html",
  "roles/ocp.html",
  "roles/partnership-development.html",
  "roles/marketing.html",
  "roles/events-logistics.html",
  "roles/delegates.html",
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--allow-file-access-from-files"],
});

for (const file of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE + file, { waitUntil: "networkidle0" });
  const r = await page.evaluate(() => {
    const out = {};
    out.lang = document.documentElement.lang;
    out.title = document.title;
    out.h1 = Array.from(document.querySelectorAll("h1")).map((h) => h.textContent.trim().slice(0, 50));
    const levels = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => +h.tagName[1]);
    let skip = null;
    for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) { skip = `${levels[i - 1]}->${levels[i]}`; break; }
    out.headingSkip = skip;
    out.imgsNoAlt = Array.from(document.querySelectorAll("img:not([alt])")).length;
    out.emptyAltDecorative = Array.from(document.querySelectorAll('img[alt=""]')).length;
    out.inputsNoLabel = Array.from(document.querySelectorAll("input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea, select")).filter((el) => {
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
      if (el.id && document.querySelector(`label[for="${el.id}"]`)) return false;
      if (el.closest("label")) return false;
      return true;
    }).map((el) => el.id || el.name || el.className);
    out.radiosNoLabel = Array.from(document.querySelectorAll('input[type=radio]')).filter((el) => {
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
      if (el.id && document.querySelector(`label[for="${el.id}"]`)) return false;
      if (el.closest("label")) return false;
      return true;
    }).length;
    out.checkboxesNoLabel = Array.from(document.querySelectorAll('input[type=checkbox]')).filter((el) => {
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
      if (el.id && document.querySelector(`label[for="${el.id}"]`)) return false;
      if (el.closest("label")) return false;
      return true;
    }).length;
    const ids = Array.from(document.querySelectorAll("[id]")).map((e) => e.id);
    const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
    out.duplicateIds = [...new Set(dupes)];
    out.linksNoName = Array.from(document.querySelectorAll("a[href]")).filter((a) => !a.textContent.trim() && !a.getAttribute("aria-label") && !a.querySelector("img[alt]:not([alt=''])")).map((a) => a.getAttribute("href"));
    out.buttonsNoName = Array.from(document.querySelectorAll("button")).filter((b) => !b.textContent.trim() && !b.getAttribute("aria-label")).length;
    out.landmarks = { main: document.querySelectorAll("main").length, nav: document.querySelectorAll("nav").length, footer: document.querySelectorAll("footer").length };
    out.ariaControlsMissing = Array.from(document.querySelectorAll("[aria-controls]")).filter((el) => !document.getElementById(el.getAttribute("aria-controls"))).map((el) => el.getAttribute("aria-controls"));
    // contrast probe: sample text nodes' computed color vs effective bg
    // (composites translucent backgrounds; accounts for painted ::before/::after)
    function parseC(c) {
      const m = c.match(/[\d.]+/g).map(Number);
      return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 };
    }
    function over(f, b) {
      return { r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 };
    }
    function lum(c) {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    }
    const pageBg = { r: 247, g: 247, b: 244, a: 1 };
    function bgOf(el) {
      const layers = [];
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && bg !== "transparent" && !/rgba\(0, 0, 0, 0\)/.test(bg)) {
          const c = parseC(bg);
          if (c.a > 0) layers.push(c);
          if (c.a === 1) break;
        }
        n = n.parentElement;
      }
      let base = layers.length ? layers.pop() : pageBg;
      if (base.a < 1) base = over(base, pageBg);
      for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
      // element painted by an absolutely-positioned ::before/::after (e.g. .btn)
      // only if the pseudo box roughly covers the element (skip thin bars/arrows)
      const ew = el.offsetWidth, eh = el.offsetHeight;
      for (const pseudo of ["::before", "::after"]) {
        const ps = getComputedStyle(el, pseudo);
        if (ps && ps.position === "absolute" && ps.backgroundColor && ps.backgroundColor !== "transparent" && !/rgba\(0, 0, 0, 0\)/.test(ps.backgroundColor)) {
          const pw = parseFloat(ps.width) || 0, ph = parseFloat(ps.height) || 0;
          if (ew > 0 && eh > 0 && pw >= ew * 0.5 && ph >= eh * 0.5) {
            const c = parseC(ps.backgroundColor);
            if (c.a > 0) base = c.a >= 1 ? c : over(c, base);
          }
        }
      }
      return base;
    }
    const seen = new Set();
    out.lowContrast = [];
    document.querySelectorAll("p, span, a, li, h1, h2, h3, h4, label, button, td, th, div").forEach((el) => {
      const txt = (el.childNodes.length && Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) ? el.textContent.trim() : "";
      if (!txt || txt.length > 80) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return;
      if (el.offsetWidth === 0 && el.offsetHeight === 0) return; // not rendered (hidden subtree)
      const bg = bgOf(el);
      let fg = parseC(cs.color);
      if (fg.a > 0 && fg.a < 1) fg = over(fg, bg);
      const key = cs.color + "|" + [bg.r, bg.g, bg.b].map(Math.round).join(",") + "|" + cs.fontSize + "|" + cs.fontWeight;
      if (seen.has(key)) return;
      seen.add(key);
      const L1 = lum(fg), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(cs.fontSize);
      const weight = +cs.fontWeight >= 700;
      const large = size >= 24 || (size >= 18.66 && weight);
      const need = large ? 3 : 4.5;
      if (ratio < need) { let path = el.tagName; let n = el; while (n && n !== document.body) { path = n.tagName + (n.className && typeof n.className === "string" && n.className.trim() ? "." + n.className.trim().split(/\s+/).join(".") : "") + " > " + path; n = n.parentElement; } out.lowContrast.push({ ratio: +ratio.toFixed(2), need, fg: cs.color, bg: [bg.r, bg.g, bg.b].map(Math.round).join(","), size: cs.fontSize, weight: cs.fontWeight, sample: txt.slice(0, 40), path: path.slice(0, 160) }); }
    });
    return out;
  });
  console.log("=== " + file + " ===");
  console.log(JSON.stringify(r, null, 1));
  await page.close();
}
await browser.close();
