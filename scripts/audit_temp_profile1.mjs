import { chromium } from "playwright";

async function main() {
  console.log("Launching persistent context with copied Profile 1...");
  const tempDir = "C:\\Users\\shriyansh chandrakar\\AppData\Local\\Temp\\ChromeTempProfile1";
  
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

  // 1. Verify user email in this profile
  console.log("Navigating to https://myaccount.google.com ...");
  await page.goto("https://myaccount.google.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  const accountText = await page.evaluate(() => document.body.innerText);
  const emails = Array.from(new Set(accountText.match(/[a-zA-Z0-9._%+-]+@gmail\.com/g) || []));
  console.log("Verified logged-in emails in Profile 1:", emails);

  // 2. Navigate to Google Analytics
  console.log("\nNavigating to Google Analytics...");
  await page.goto("https://analytics.google.com/analytics/web/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(8000);
  console.log("Landed GA URL:", page.url());
  console.log("GA Title:", await page.title());

  const gaText = await page.evaluate(() => document.body.innerText);
  console.log("GA Text preview (first 1000 chars):\n", gaText.slice(0, 1000).replace(/\n+/g, " "));

  // Search for keywords
  const keywords = ["durg", "bhilai", "solar", "stratxcel", "darpan", "jandarpan", "g-", "property"];
  for (const kw of keywords) {
    if (gaText.toLowerCase().includes(kw)) {
      console.log(`>>> MATCH FOUND FOR KEYWORD "${kw}"!`);
    }
  }

  // Look for any measurement IDs like G-XXXXXXXXXX
  const measurementMatches = gaText.match(/G-[A-Z0-9]{8,12}/g);
  if (measurementMatches) {
    console.log("Found Measurement IDs in page:", Array.from(new Set(measurementMatches)));
  }

  // 3. Inspect Admin / Property picker
  // Try to click the account/property selector if present
  console.log("\nInspecting Account/Property selector...");
  const selectorInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], [aria-haspopup="true"]'));
    return buttons.map(b => ({
      text: (b.innerText || '').trim(),
      ariaLabel: b.getAttribute('aria-label') || '',
      id: b.id || ''
    })).filter(b => b.text || b.ariaLabel);
  });
  console.log("Buttons found on GA page:", selectorInfo.slice(0, 20));

  await context.close();
}

main().catch(console.error);
