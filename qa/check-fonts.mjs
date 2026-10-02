import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true, args: ["--no-sandbox", "--allow-file-access-from-files"] });
const pg = await b.newPage();
await pg.goto(new URL("../index.html", import.meta.url).href, { waitUntil: "networkidle0" });
const r = await pg.evaluate(async () => {
  await document.fonts.ready;
  return {
    lemon: document.fonts.check('700 16px "Lemon Milk"'),
    andyou: document.fonts.check('16px "Andyou"'),
    raleway: document.fonts.check('16px Raleway'),
    loaded: [...document.fonts].map((f) => f.family + ":" + f.status),
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
