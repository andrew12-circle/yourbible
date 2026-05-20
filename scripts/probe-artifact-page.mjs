import { chromium } from "playwright";

const urls = [
  "http://127.0.0.1:8080/framework/artifacts/fbc9f758-847a-46dc-8686-f6530eff0fe5",
  "http://127.0.0.1:8083/framework/artifacts/fbc9f758-847a-46dc-8686-f6530eff0fe5",
];

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

for (const url of urls) {
  errors.length = 0;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(5000);
    const text = await page.locator("body").innerText();
    console.log("\n===", url, "===");
    console.log("body:", text.slice(0, 500).replace(/\s+/g, " "));
    console.log("errors:", errors.length ? errors : "(none)");
  } catch (e) {
    console.log("\n===", url, "===");
    console.log("nav failed:", e.message);
    console.log("errors:", errors);
  }
}

await browser.close();
