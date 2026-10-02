import puppeteer from "puppeteer-core";
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = new URL("../", import.meta.url).href;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--allow-file-access-from-files", "--hide-scrollbars"] });
for (const width of [1920, 1440, 1280, 1024, 900, 768]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE + "index.html", { waitUntil: "networkidle0" });
  const r = await page.evaluate(() => {
    const rect = (s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height) }; };
    const h2 = document.querySelector("#policies-title");
    const hb = h2.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(h2);
    const lines = Array.from(range.getClientRects()).map((c) => ({ x: Math.round(c.x), w: Math.round(c.width) }));
    const intro = document.querySelector(".policies-intro");
    const list = document.querySelector(".policies-list");
    return {
      wrap: rect(".policies-wrap"), intro: rect(".policies-intro"), list: rect(".policies-list"),
      h2: { x: Math.round(hb.x), w: Math.round(hb.width), fs: getComputedStyle(h2).fontSize },
      h2lines: lines,
      overflow: Math.round(Math.max(...lines.map((l) => l.x + l.w)) - (intro.getBoundingClientRect().x + intro.getBoundingClientRect().width)),
    };
  });
  console.log(width, JSON.stringify(r));
  await page.close();
}
await browser.close();
