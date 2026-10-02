import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = new URL("../", import.meta.url).href;
const OUT = fileURLToPath(new URL("./out/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const file = process.argv[2] || "index.html";
const selector = process.argv[3];
const width = Number(process.argv[4] || 1280);
const name = process.argv[5] || "el";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--allow-file-access-from-files", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width, height: 900 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(BASE + file, { waitUntil: "networkidle0" });
const el = await page.$(selector);
if (!el) {
  console.log("not found:", selector);
} else {
  await el.scrollIntoView();
  await new Promise((r) => setTimeout(r, 400));
  await el.screenshot({ path: `${OUT}${name}.png` });
  console.log("shot", selector, "->", name);
}
await browser.close();
