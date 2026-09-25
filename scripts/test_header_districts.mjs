import { chromium } from "@playwright/test";

async function testHeader() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("https://www.jandarpan.news", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  const districtBtn = page.locator("[data-testid='district-selector-trigger']");
  const isDistrictVisible = await districtBtn.isVisible();
  const districtText = await districtBtn.textContent();
  console.log("District button visible:", isDistrictVisible, "Initial Text:", districtText?.trim());

  const langButtons = page.locator(".jd-mobile-lang button");
  const langCount = await langButtons.count();
  console.log("Language buttons count:", langCount);
  for (let i = 0; i < langCount; i++) {
    console.log("  - Lang btn", i, await langButtons.nth(i).textContent());
  }

  const themeToggle = page.locator(".jd-mobile-theme-toggle");
  console.log("Theme toggle visible:", await themeToggle.isVisible());

  const dialog = page.locator("[data-testid='jd-district-picker-dialog']");

  // 1. Select Raipur
  await districtBtn.click();
  await page.waitForTimeout(600);
  console.log("Dialog visible:", await dialog.isVisible());
  const raipurBtn = dialog.locator("button:has-text('रायपुर')").first();
  await raipurBtn.click();
  await page.waitForTimeout(1000);
  console.log("Selected Raipur. New district button text:", (await districtBtn.textContent())?.trim());
  let firstCardTag = await page.locator(".jdl-queue-card .jdl-queue-card__tag").first().textContent();
  console.log("First card tag after Raipur selection:", firstCardTag?.trim());

  // 2. Select Bilaspur
  await districtBtn.click();
  await page.waitForTimeout(600);
  const bilaspurBtn = dialog.locator("button:has-text('बिलासपुर')").first();
  await bilaspurBtn.click();
  await page.waitForTimeout(1000);
  console.log("Selected Bilaspur. New district button text:", (await districtBtn.textContent())?.trim());
  firstCardTag = await page.locator(".jdl-queue-card .jdl-queue-card__tag").first().textContent();
  console.log("First card tag after Bilaspur selection:", firstCardTag?.trim());

  // 3. Select Durg
  await districtBtn.click();
  await page.waitForTimeout(600);
  const durgBtn = dialog.locator("button:has-text('दुर्ग')").first();
  await durgBtn.click();
  await page.waitForTimeout(1000);
  console.log("Selected Durg. New district button text:", (await districtBtn.textContent())?.trim());
  firstCardTag = await page.locator(".jdl-queue-card .jdl-queue-card__tag").first().textContent();
  console.log("First card tag after Durg selection:", firstCardTag?.trim());

  // 4. Select Rajnandgaon
  await districtBtn.click();
  await page.waitForTimeout(600);
  const rajBtn = dialog.locator("button:has-text('राजनांदगांव'), button:has-text('राजनांदगाँव')").first();
  await rajBtn.click();
  await page.waitForTimeout(1000);
  console.log("Selected Rajnandgaon. New district button text:", (await districtBtn.textContent())?.trim());
  firstCardTag = await page.locator(".jdl-queue-card .jdl-queue-card__tag").first().textContent();
  console.log("First card tag after Rajnandgaon selection:", firstCardTag?.trim());

  await browser.close();
}

testHeader().catch(console.error);
