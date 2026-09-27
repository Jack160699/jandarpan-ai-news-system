import { chromium } from "playwright";

async function main() {
  console.log("Attempting launchPersistentContext on real Profile 1...");
  const userDataDir = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Google\\Chrome\\User Data";
  try {
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chrome",
      headless: true,
      args: [
        "--profile-directory=Profile 1",
        "--no-first-run",
        "--no-default-browser-check"
      ]
    });
    const page = context.pages()[0] || await context.newPage();
    console.log("Navigating to https://myaccount.google.com ...");
    await page.goto("https://myaccount.google.com", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    const title = await page.title();
    console.log("MyAccount Page Title:", title);
    const body = await page.evaluate(() => document.body.innerText);
    const emails = Array.from(new Set(body.match(/[a-zA-Z0-9._%+-]+@gmail\.com/g) || []));
    console.log("Found emails on page:", emails);

    console.log("Navigating to https://console.cloud.google.com/apis/credentials?project=jan-daarpan ...");
    await page.goto("https://console.cloud.google.com/apis/credentials?project=jan-daarpan", {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });
    await page.waitForTimeout(8000);
    console.log("Landed URL:", page.url());
    console.log("Cloud Console Title:", await page.title());
    const cloudText = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    console.log("Cloud Console Snippet:\n", cloudText);

    await context.close();
  } catch (err) {
    console.error("Error launching persistent context:", err);
  }
}

main();
