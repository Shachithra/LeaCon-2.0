import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
mkdirSync(fileURLToPath(new URL("./out/", import.meta.url)), { recursive: true });

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = new URL("../", import.meta.url).href;
const OUT = fileURLToPath(new URL("./out/", import.meta.url));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--allow-file-access-from-files", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
page.on("console", (m) => { if (m.type() === "error") console.log("PAGE-ERROR:", m.text()); });
page.on("pageerror", (e) => console.log("PAGE-EXCEPTION:", e.message));

// Never hit the live Apps Script endpoint: mock the response and inspect the
// outgoing payload so QA can verify the contract without writing a Sheet row.
const SCRIPT_URL = "https://script.google.com/a/macros/aiesec.net/s/";
let postedPayload = null;
await page.setRequestInterception(true);
page.on("request", (req) => {
  if (req.url().startsWith(SCRIPT_URL)) {
    postedPayload = Object.fromEntries(new URLSearchParams(req.postData() || ""));
    console.log("payload-keys:", JSON.stringify(Object.keys(postedPayload).sort()));
    req.respond({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        applicationId: "LEACON-TEST-000000-000000",
        message: "Application submitted successfully.",
      }),
    });
  } else {
    req.continue();
  }
});

const log = (...a) => console.log(...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const currentStep = () =>
  page.evaluate(() => {
    const s = document.querySelector(".step:not([hidden])");
    return s ? s.dataset.step : null;
  });

// 1. Deep-link preselect
await page.goto(BASE + "application.html?role=OCVP%20Marketing", { waitUntil: "networkidle0" });
const preselect = await page.evaluate(() => {
  const names = ["firstPreference", "secondPreference"];
  const out = {};
  for (const n of names) {
    const c = document.querySelector(`input[name="${n}"]:checked`);
    out[n] = c ? c.value : null;
  }
  return out;
});
log("preselect:", JSON.stringify(preselect));

// 2. Empty next -> validation
await page.click(".step:not([hidden]) [data-next]");
await wait(300);
const errState = await page.evaluate(() => ({
  invalid: document.querySelectorAll("[aria-invalid='true']").length,
  errs: Array.from(document.querySelectorAll(".field__error")).map((e) => e.textContent.trim()).filter(Boolean),
  summary: document.getElementById("error-summary").hidden ? null : document.getElementById("error-summary").textContent.replace(/\s+/g, " ").trim().slice(0, 200),
}));
log("empty-next:", JSON.stringify(errState));
log("step after empty next:", await currentStep());

// 3. Fill step 1
await page.type("#fullName", "Test Applicant");
await page.type("#contactNumber", "+94771234567");
await page.type("#email", "test@example.com");
await page.evaluate(() => {
  document.querySelector('input[name="frontOffice"]').click();
  document.querySelector('input[name="backOffice"]').click();
});
await page.click(".step:not([hidden]) [data-next]");
await wait(500);
log("step after fill:", await currentStep());
await page.screenshot({ path: OUT + "form-step2.png" });

// 4. Step 2 textareas
await page.evaluate(() => {
  document.querySelectorAll("#step-2 textarea").forEach((t, i) => {
    t.value = "Sample answer number " + (i + 1) + " used to test the review builder.";
    t.dispatchEvent(new Event("input", { bubbles: true }));
    t.dispatchEvent(new Event("blur", { bubbles: true }));
  });
});
await page.click(".step:not([hidden]) [data-next]");
await wait(500);
log("step:", await currentStep());

// 5. Step 3 preferences (both groups)
await page.evaluate(() => {
  const pick = (name, i) => {
    const g = document.querySelectorAll(`input[name="${name}"]`);
    if (g[i]) g[i].click();
  };
  pick("firstPreference", 1);
  pick("secondPreference", 0);
});
await page.click(".step:not([hidden]) [data-next]");
await wait(500);
log("step:", await currentStep());
await page.screenshot({ path: OUT + "form-step4.png" });

// 6. Step 4 photo required -> upload test photo -> review
const fileInput = await page.$('#step-4 input[type="file"]');
if (fileInput) {
  await fileInput.uploadFile(fileURLToPath(new URL("./test-photo.jpg", import.meta.url)));
  await wait(800);
  const photoState = await page.evaluate(() => {
    const preview = document.getElementById("photo-thumb");
    const err = document.getElementById("err-photo");
    return {
      previewShown: preview ? preview.src.startsWith("data:") : false,
      err: err ? err.textContent.trim() : null,
      hasData: !!document.querySelector('input[name="photoData"], #photo-data'),
    };
  });
  log("photo:", JSON.stringify(photoState));
}
await page.screenshot({ path: OUT + "form-step4-photo.png" });
await page.click(".step:not([hidden]) [data-next]");
await wait(600);
log("step:", await currentStep());
await page.screenshot({ path: OUT + "form-review.png" });
const review = await page.evaluate(() => ({
  rows: document.querySelectorAll(".review__row").length,
  reviewText: document.querySelector(".step:not([hidden])")?.textContent.replace(/\s+/g, " ").trim().slice(0, 500),
}));
log("review:", JSON.stringify(review));

// 7. Consent + submit
await page.evaluate(() => {
  document.querySelectorAll('.step:not([hidden]) input[type="checkbox"]').forEach((c) => { if (!c.checked) c.click(); });
});
const consentState = await page.evaluate(() => {
  const boxes = Array.from(document.querySelectorAll('.step:not([hidden]) input[type="checkbox"]'));
  return boxes.map((b) => ({ id: b.id, checked: b.checked }));
});
log("consent:", JSON.stringify(consentState));
await page.click("#submitApplication");
await wait(7000);
const after = await page.evaluate(() => {
  const success = document.getElementById("successMessage");
  const alerts = Array.from(document.querySelectorAll("[role='alert'], .form__error, .form-status"))
    .filter((e) => (e.checkVisibility ? e.checkVisibility() : true))
    .map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
  return {
    successShown: success ? !success.hidden : false,
    applicationId: document.getElementById("success-ref")?.textContent.trim(),
    alerts: alerts.slice(0, 4),
    submittingBtn: document.getElementById("submitApplication")?.textContent.trim(),
  };
});
log("after-submit:", JSON.stringify(after));
log("sent-to-endpoint:", JSON.stringify({
  fullName: postedPayload?.fullName,
  email: postedPayload?.email,
  contactNumber: postedPayload?.contactNumber,
  frontOffice: postedPayload?.frontOffice,
  backOffice: postedPayload?.backOffice,
  firstPreference: postedPayload?.firstPreference,
  secondPreference: postedPayload?.secondPreference,
  policiesAccepted: postedPayload?.policiesAccepted,
  website: postedPayload?.website,
  photoName: postedPayload?.photoName,
  photoType: postedPayload?.photoType,
  photoBase64Bytes: postedPayload?.photoBase64?.length ?? 0,
}));
await page.screenshot({ path: OUT + "form-after-submit.png" });

await browser.close();

