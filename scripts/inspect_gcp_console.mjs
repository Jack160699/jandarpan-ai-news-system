import { chromium } from "playwright";

async function main() {
  console.log("Navigating to Google Cloud Console with temp profile...");
  const tempDir = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\Temp\\ChromeTempProfile1";

  const context = await chromium.launchPersistentContext(tempDir, {
    channel: "chrome",
    headless: true,
    args: [
      "--profile-directory=Profile 1",
      "--no-first-run",
      "--no-default-browser-check"
    ]
  });

  const page = context.pages()[0] || await context.newPage();
  
  // Go to credentials page for jan-daarpan
  console.log("Navigating to https://console.cloud.google.com/apis/credentials?project=jan-daarpan ...");
  await page.goto("https://console.cloud.google.com/apis/credentials?project=jan-daarpan", {
    waitUntil: "domcontentloaded",
    timeout: 45000
  });
  
  await page.waitForTimeout(8000);
  console.log("Page URL:", page.url());
  console.log("Page Title:", await page.title());
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("Snippet:\n", text.slice(0, 1500));
  
  // Check if credentials are listed
  const clientMatch = text.includes("502200355392");
  console.log("Contains client 502200355392?", clientMatch);
  
  await page.screenshot({ path: "scripts/cloud_console_credentials.png" });
  console.log("Saved scripts/cloud_console_credentials.png");

  await context.close();
}

main().catch(console.error);
