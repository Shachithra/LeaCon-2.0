import puppeteer from "puppeteer-core";
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = new URL("../", import.meta.url).href;
const PAGES = ["index.html","application.html","roles/ocp.html","roles/partnership-development.html","roles/marketing.html","roles/events-logistics.html","roles/delegates.html"];
const WIDTHS = [390, 768, 1024, 1280, 1920];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--allow-file-access-from-files"] });
let bad = 0;
for (const file of PAGES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.goto(BASE + file, { waitUntil: "networkidle0" });
    const r = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("h1,h2,h3,p,span,a,li,button").forEach((el) => {
        if (!el.clientWidth) return;
        const cs = getComputedStyle(el);
        if (cs.overflow !== "visible" || cs.position === "absolute") return;
        const over = el.scrollWidth - el.clientWidth;
        if (over > 3) out.push({ tag: el.tagName + "." + String(el.className).slice(0, 40), over, txt: el.textContent.trim().slice(0, 35) });
      });
      return out;
    });
    if (r.length) { bad += r.length; console.log(file, width, JSON.stringify(r)); }
    await page.close();
  }
}
console.log(bad === 0 ? "NO OVERFLOWS" : bad + " overflowing elements");
await browser.close();
