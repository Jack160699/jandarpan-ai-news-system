import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const page = await context.newPage();

  // 1. Inspect all logged in accounts on Google
  console.log("Checking Google Accounts switcher...");
  await page.goto("https://accounts.google.com/SignOutOptions", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  const accountsText = await page.evaluate(() => document.body.innerText);
  console.log("Accounts text snippet:\n", accountsText.slice(0, 1500));

  // Extract all emails
  const foundEmails = Array.from(new Set(accountsText.match(/[a-zA-Z0-9._%+-]+@gmail\.com/g) || []));
  console.log("All detected Google accounts:", foundEmails);

  // 2. Check Analytics for each detected email or index
  const candidates = [
    ...foundEmails.map(e => `https://analytics.google.com/analytics/web/?authuser=${encodeURIComponent(e)}`),
    "https://analytics.google.com/analytics/web/?authuser=0",
    "https://analytics.google.com/analytics/web/?authuser=1",
    "https://analytics.google.com/analytics/web/?authuser=2",
    "https://analytics.google.com/analytics/web/?authuser=stratxcelsolutions@gmail.com",
    "https://analytics.google.com/analytics/web/?authuser=stratxcelgame@gmail.com"
  ];

  const testedUrls = new Set();

  for (const url of candidates) {
    if (testedUrls.has(url)) continue;
    testedUrls.add(url);
    console.log(`\n==============================================`);
    console.log(`Testing GA URL: ${url}`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
      await page.waitForTimeout(6000);
      const landed = page.url();
      const title = await page.title();
      console.log(`Landed: ${landed}`);
      console.log(`Title: ${title}`);

      // Check current user email in DOM
      const userEmail = await page.evaluate(() => {
        const text = document.body.innerText;
        const matches = text.match(/[a-zA-Z0-9._%+-]+@gmail\.com/g);
        return matches ? Array.from(new Set(matches)) : [];
      });
      console.log(`Emails present on page:`, userEmail);

      // Check for property picker or account names
      const pageText = await page.evaluate(() => document.body.innerText.slice(0, 3000));
      console.log(`Page text snippet:\n${pageText.slice(0, 500).replace(/\n+/g, " ")}`);

      // Look for Durg, Solar, Stratxcel, Darpan
      const keywords = ["durg", "bhilai", "solar", "stratxcel", "darpan", "jandarpan"];
      for (const kw of keywords) {
        if (pageText.toLowerCase().includes(kw)) {
          console.log(`>>> MATCH FOUND FOR KEYWORD "${kw}" in ${url}!`);
        }
      }

      // If we see account/property picker or admin link, click it or inspect
      const hasPicker = await page.evaluate(() => {
        // Find any element with aria-label or text containing "All accounts" or property name
        const el = Array.from(document.querySelectorAll('*')).find(e => 
          (e.getAttribute('aria-label') || '').includes('All accounts') ||
          (e.getAttribute('aria-label') || '').includes('Select an account') ||
          (e.textContent || '').includes('All accounts')
        );
        return !!el;
      });
      console.log(`Has account/property picker: ${hasPicker}`);

    } catch (err) {
      console.error(`Error loading ${url}:`, err.message);
    }
  }

  await page.close();
  browser.close();
}

main().catch(console.error);
