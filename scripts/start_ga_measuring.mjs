import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const page = await context.newPage();

  console.log("Navigating to GA provision page for stratxcelgame@gmail.com ...");
  await page.goto("https://analytics.google.com/analytics/web/provision/?authuser=stratxcelgame@gmail.com#/provision", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(5000);

  console.log("Looking for 'Start measuring' button...");
  const button = await page.$("button:has-text('Start measuring')");
  if (button) {
    console.log("Clicking 'Start measuring'...");
    await button.click();
    await page.waitForTimeout(4000);
    console.log("URL after click:", page.url());
    const formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input, button, select"));
      return inputs.map((el) => ({
        tag: el.tagName,
        type: el.getAttribute("type"),
        name: el.getAttribute("name"),
        placeholder: el.getAttribute("placeholder"),
        ariaLabel: el.getAttribute("aria-label"),
        text: el.innerText,
      }));
    });
    console.log("Form elements found:", formFields);
  } else {
    console.log("Start measuring button not found!");
  }

  await page.close();
  browser.close();
}

main().catch(console.error);
