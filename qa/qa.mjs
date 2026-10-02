import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = new URL("../", import.meta.url).href;
const OUT = fileURLToPath(new URL("./out/", import.meta.url));

mkdirSync(OUT, { recursive: true });

const pages = (process.argv[2] || "index.html").split(",");
const widths = (process.argv[3] || "390,768,1280").split(",").map(Number);
const motion = process.argv.includes("--motion");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--allow-file-access-from-files", "--hide-scrollbars"],
});

for (const file of pages) {
  const slug = file.replace(/[\\/.]/g, "_").replace(/_html$/, "");
  for (const width of widths) {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height: width < 768 ? 844 : 900,
      isMobile: width < 768,
      hasTouch: width < 768,
      deviceScaleFactor: 1,
    });
    if (!motion) {
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    }
    await page.goto(BASE + file, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluate(async () => {
      await new Promise((res) => {
        let y = 0;
        const step = () => {
          y += window.innerHeight * 0.9;
          window.scrollTo(0, y);
          if (y < document.body.scrollHeight) setTimeout(step, 50);
          else {
            window.scrollTo(0, 0);
            setTimeout(res, 300);
          }
        };
        step();
      });
    });
    await new Promise((r) => setTimeout(r, motion ? 2200 : 500));
    await page.screenshot({ path: `${OUT}${slug}-${width}-full.png`, fullPage: true });
    await page.screenshot({ path: `${OUT}${slug}-${width}-top.png` });
    console.log("shot", file, width);
    await page.close();
  }
}

await browser.close();
console.log("done");
