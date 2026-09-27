import { chromium } from "playwright";

async function main() {
  console.log("Checking if Profile 1 can access Google Cloud Console...");
  try {
    const context = await chromium.launchPersistentContext(
      "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data",
      {
        channel: "chrome",
        headless: true,
        args: [
          "--profile-directory=Profile 1",
          "--no-first-run",
          "--no-default-browser-check"
        ]
      }
    );

    const page = context.pages()[0] || await context.newPage();
    console.log("Navigating to https://console.cloud.google.com/apis/credentials?project=jan-daarpan ...");
    await page.goto("https://console.cloud.google.com/apis/credentials?project=jan-daarpan", {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });
    await page.waitForTimeout(10000);

    console.log("Final URL:", page.url());
    console.log("Page Title:", await page.title());
    const text = await page.evaluate(() => document.body.innerText.slice(0, 3000));
    console.log("Page Text:\n", text);

    await context.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
