import { chromium } from "playwright";

async function main() {
  console.log("Attempting to launch persistent context with real Chrome Profile 1...");
  try {
    const context = await chromium.launchPersistentContext(
      "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data",
      {
        channel: "chrome",
        headless: true,
        args: ["--profile-directory=Profile 1"]
      }
    );

    const page = context.pages()[0] || await context.newPage();
    console.log("Navigating to https://myaccount.google.com ...");
    await page.goto("https://myaccount.google.com", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    const emails = await page.evaluate(() => {
      const match = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@gmail\.com/g);
      return Array.from(new Set(match || []));
    });
    console.log("Logged in emails in Profile 1:", emails);

    console.log("Navigating to https://analytics.google.com ...");
    await page.goto("https://analytics.google.com/analytics/web/", { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(7000);
    console.log("Landed GA URL:", page.url());
    console.log("GA Page Title:", await page.title());
    const snippet = await page.evaluate(() => document.body.innerText.slice(0, 2000).replace(/\n+/g, " "));
    console.log("GA Snippet:", snippet);

    await context.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
