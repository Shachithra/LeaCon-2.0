/* LeaCon II — keyboard / focus accessibility checks (review item 12)
   Usage: node test-keyboard.mjs                                                    */

import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = new URL("../", import.meta.url).href;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--allow-file-access-from-files"],
});

let fail = 0;
const chk = (cond, msg) => {
  console.log((cond ? "  ok   " : "  FAIL ") + msg);
  if (!cond) fail++;
};

/* Overlay menu (390px) ---------------------------------------------------- */
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 900 });
await page.goto(BASE + "index.html", { waitUntil: "networkidle0" });

await page.keyboard.press("Tab");
chk(
  await page.evaluate(() => document.activeElement.classList.contains("skip-link")),
  "first Tab focuses the skip link"
);
await page.keyboard.press("Enter");
chk(await page.evaluate(() => location.hash === "#main"), "skip link jumps to #main");

await page.focus(".menu-toggle");
await page.keyboard.press("Enter");
await new Promise((r) => setTimeout(r, 400));
chk(
  await page.evaluate(() => document.querySelector(".menu-toggle").getAttribute("aria-expanded") === "true"),
  "Enter opens the overlay menu (aria-expanded=true)"
);
chk(
  await page.evaluate(() => !!document.activeElement.closest("#site-menu")),
  "focus moves into the menu: " + (await page.evaluate(() => document.activeElement.className))
);
chk(
  await page.evaluate(() => document.activeElement.getAttribute("aria-hidden") !== "true"),
  "initial focus target is not aria-hidden"
);

let leak = null;
for (let i = 1; i <= 40 && !leak; i++) {
  await page.keyboard.press("Tab");
  if (!(await page.evaluate(() => !!document.activeElement.closest("#site-menu")))) leak = "Tab #" + i;
}
chk(!leak, "Tab x40 stays inside the open menu" + (leak ? " -> " + leak : ""));

for (let i = 1; i <= 40 && !leak; i++) {
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  if (!(await page.evaluate(() => !!document.activeElement.closest("#site-menu")))) leak = "Shift+Tab #" + i;
}
chk(!leak, "Shift+Tab x40 stays inside the open menu" + (leak ? " -> " + leak : ""));

await page.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 300));
chk(
  await page.evaluate(() => document.querySelector(".menu-toggle").getAttribute("aria-expanded") === "false"),
  "Escape closes the menu"
);
chk(
  await page.evaluate(() => document.activeElement === document.querySelector(".menu-toggle")),
  "focus returns to the menu toggle"
);
chk(await page.evaluate(() => !document.body.classList.contains("is-locked")), "body scroll is unlocked");
await page.close();

/* Desktop (1440px) — overlay menu must be out of the tab order ------------ */
const desk = await browser.newPage();
await desk.setViewport({ width: 1440, height: 900 });
await desk.goto(BASE + "index.html", { waitUntil: "networkidle0" });
chk(
  await desk.evaluate(() => getComputedStyle(document.querySelector(".menu-toggle")).display === "none"),
  "overlay menu toggle hidden at 1440px (desktop nav is used)"
);
await desk.close();

/* Accessible names on every focusable control ----------------------------- */
for (const file of ["index.html", "application.html", "roles/ocp.html", "roles/delegates.html"]) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  await p.goto(BASE + file, { waitUntil: "networkidle0" });
  const res = await p.evaluate(() => {
    const sel = "a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex='-1'])";
    const nameOf = (e) => {
      const ids = e.getAttribute("aria-labelledby");
      if (ids) {
        const text = ids
          .split(/\s+/)
          .map((id) => (document.getElementById(id) || {}).textContent || "")
          .join(" ")
          .trim();
        if (text) return text;
      }
      if (e.labels && e.labels[0]) return e.labels[0].textContent;
      return (e.getAttribute("aria-label") || e.textContent || e.value || "").trim();
    };
    const all = [...document.querySelectorAll(sel)];
    return {
      count: all.length,
      unnamed: all.filter((e) => !nameOf(e)).map((e) => e.outerHTML.slice(0, 90)),
    };
  });
  chk(res.unnamed.length === 0, `${file}: ${res.count} focusable controls all have a name (${res.unnamed.length} unnamed)`);
  res.unnamed.forEach((u) => console.log("      " + u));
  await p.close();
}

console.log(fail === 0 ? "\nKEYBOARD A11Y PASSED" : "\n" + fail + " FAILURES");
await browser.close();
process.exit(fail === 0 ? 0 : 1);
