import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = new URL("../", import.meta.url).href;
const OUT = fileURLToPath(new URL("./out/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--allow-file-access-from-files", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const checked = (name) => page.evaluate((n) => { const c = document.querySelector(`input[name="${n}"]:checked`); return c ? c.value : null; }, name);

// 1. deep-link from the OCP role page
await page.goto(BASE + "application.html?role=OCP", { waitUntil: "networkidle0" });
console.log("preselect first:", await checked("firstPreference"));

// 2. fill step 1, go to step 3, pick OCP first + OCP second (must be blocked)
await page.type("#fullName", "OCP Tester");
await page.type("#contactNumber", "+94770000000");
await page.type("#email", "ocp@example.com");
await page.evaluate(() => {
  document.querySelector('input[name="frontOffice"]').click();
  document.querySelector('input[name="backOffice"]').click();
});
await page.click(".step:not([hidden]) [data-next]"); await wait(400);
await page.evaluate(() => { document.querySelectorAll("#step-2 textarea").forEach((t) => { t.value = "Answer for testing OCP preference flow."; t.dispatchEvent(new Event("input", { bubbles: true })); }); });
await page.click(".step:not([hidden]) [data-next]"); await wait(400);
console.log("at step:", await page.evaluate(() => document.querySelector(".step:not([hidden])").dataset.step));
await page.evaluate(() => {
  document.querySelector('input[name="firstPreference"][value="OCP"]').click();
  document.querySelector('input[name="secondPreference"][value="OCP"]').click();
});
const summary = await page.evaluate(() => {
  const n = document.querySelector("[data-role-summary]");
  return { hidden: n.hidden, name: n.querySelector("[data-role-summary-name]").textContent, desc: n.querySelector("[data-role-summary-desc]").textContent.slice(0, 80) };
});
console.log("role summary:", JSON.stringify(summary));
await page.screenshot({ path: OUT + "step3-ocp-390.png" });
await page.click(".step:not([hidden]) [data-next]"); await wait(400);
const eqErr = await page.evaluate(() => ({ step: document.querySelector(".step:not([hidden])").dataset.step, err: document.getElementById("err-pref2").textContent.trim() }));
console.log("same-role blocked:", JSON.stringify(eqErr));

// 3. valid combo -> continue -> review shows OCP
await page.evaluate(() => { document.querySelector('input[name="secondPreference"][value="OCVP Marketing"]').click(); });
await page.click(".step:not([hidden]) [data-next]"); await wait(400);
console.log("at step:", await page.evaluate(() => document.querySelector(".step:not([hidden])").dataset.step));
const fileInput = await page.$('#step-4 input[type="file"]');
await fileInput.uploadFile(fileURLToPath(new URL("./test-photo.jpg", import.meta.url)));
await wait(600);
await page.click(".step:not([hidden]) [data-next]"); await wait(500);
const review = await page.evaluate(() => Array.from(document.querySelectorAll(".review__row")).map((r) => r.textContent.replace(/\s+/g, " ").trim()).filter((t) => /preference/i.test(t)));
console.log("review rows:", JSON.stringify(review));
await browser.close();
