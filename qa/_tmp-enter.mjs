import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = new URL("../", import.meta.url).href;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(BASE + "application.html", { waitUntil: "networkidle0" });
await page.focus("#fullName");
await page.type("#fullName", "Test Person");
await page.keyboard.press("Enter");
await new Promise((r) => setTimeout(r, 400));
const res = await page.evaluate(() => ({
  summaryVisible: document.getElementById("error-summary").classList.contains("is-visible"),
  summaryText: document.getElementById("error-summary").innerText.replace(/\s+/g, " ").slice(0, 220),
  active: document.activeElement.id || document.activeElement.tagName,
  step: document.getElementById("progress-step").textContent,
  step1Hidden: document.getElementById("step-1").hidden
}));
console.log(JSON.stringify(res, null, 1));

/* check photo file input focus visibility size */
const res2 = await page.evaluate(() => {
  const i = document.getElementById("professionalPhoto");
  const cs = getComputedStyle(i);
  return { w: cs.width, h: cs.height, opacity: cs.opacity, position: cs.position, rect: JSON.stringify(i.getBoundingClientRect()) };
});
console.log("photo input:", JSON.stringify(res2));
await browser.close();
