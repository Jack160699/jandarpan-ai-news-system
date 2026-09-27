import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const page = await context.newPage();

  // 1. Check who is logged in on Google Accounts / Analytics
  console.log("Navigating to https://myaccount.google.com ...");
  await page.goto("https://myaccount.google.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  const accountEmail = await page.evaluate(() => {
    return document.body.innerText.match(/[a-zA-Z0-9._%+-]+@gmail\.com/g);
  });
  console.log("Emails found on myaccount:", Array.from(new Set(accountEmail || [])));

  // 2. Check Google Cloud Console API & Services / Credentials for project 502200355392 / jan-daarpan
  console.log("\nNavigating to Google Cloud Console Credentials...");
  await page.goto("https://console.cloud.google.com/apis/credentials?project=jan-daarpan", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(6000);
  console.log("Cloud Console URL:", page.url());
  const cloudText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
  console.log("Cloud Console snippet:\n", cloudText);

  await page.close();
  browser.close(); // disconnect
}

main().catch(console.error);
