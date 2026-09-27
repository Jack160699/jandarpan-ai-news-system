import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const page = await context.newPage();

  console.log("Navigating to GA create page...");
  await page.goto("https://analytics.google.com/analytics/web/provision/?authuser=stratxcelgame@gmail.com#/provision/create", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(4000);

  // Take screenshot of step 1
  await page.screenshot({ path: "ga_step1.png" });
  console.log("On page:", page.url(), await page.title());

  // Step 1: Account Name
  console.log("Filling Account Name...");
  const accountInput = await page.$("input[placeholder='My New Account Name']");
  if (accountInput) {
    await accountInput.fill("Jan Darpan");
  } else {
    const input = await page.$("input[name='name']");
    if (input) await input.fill("Jan Darpan");
  }

  // Click Next
  console.log("Clicking Next for Step 1...");
  await page.click("button:has-text('Next')");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "ga_step2.png" });

  // Step 2: Property creation
  console.log("Filling Property Name...");
  // Look for property name input
  const propertyInput = await page.$("input[formcontrolname='propertyName'], input[aria-label*='Property name' i], input[placeholder*='Property name' i]");
  if (propertyInput) {
    await propertyInput.fill("Jan Darpan Production");
  } else {
    // evaluate all text inputs visible
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input[type='text']"));
      for (const inp of inputs) {
        if (!inp.value) {
          inp.value = "Jan Darpan Production";
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.dispatchEvent(new Event("change", { bubbles: true }));
          break;
        }
      }
    });
  }

  // Check what inputs are visible now
  const step2Text = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  console.log("Step 2 text:\n", step2Text);

  await page.close();
  browser.close();
}

main().catch(console.error);
