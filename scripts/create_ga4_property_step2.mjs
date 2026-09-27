import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const page = await context.newPage();

  console.log("Navigating to GA create page...");
  await page.goto(
    "https://analytics.google.com/analytics/web/provision/?authuser=stratxcelgame@gmail.com#/provision/create",
    { waitUntil: "domcontentloaded", timeout: 30000 }
  );
  await page.waitForTimeout(4000);

  // Step 1: Account Name
  console.log("Step 1: Account Name...");
  const accountInput = await page.$("input[placeholder='My New Account Name']");
  if (accountInput) await accountInput.fill("Jan Darpan");
  await page.click("button:has-text('Next')");
  await page.waitForTimeout(2000);

  // Step 2: Property Name
  console.log("Step 2: Property Name...");
  const propInputs = await page.$$("input[type='text']");
  for (const input of propInputs) {
    const val = await input.inputValue();
    if (!val) {
      await input.fill("Jan Darpan Production");
      break;
    }
  }

  // Click Next on Step 2
  console.log("Clicking Next on Step 2...");
  const nextBtns = await page.$$("button:has-text('Next')");
  for (const btn of nextBtns) {
    if (await btn.isVisible()) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(3000);

  // Step 3: Business Details
  console.log("Step 3: Checking Business details...");
  const step3Text = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  console.log("Step 3 visible text:\n", step3Text);

  // Look for Next or radio buttons or dropdowns
  const radios = await page.$$("input[type='radio'], mat-radio-button");
  if (radios.length > 0) {
    console.log(`Found ${radios.length} radio options. Selecting first option...`);
    await radios[0].click();
  }

  // Click Next on Step 3
  const step3Next = await page.$$("button:has-text('Next')");
  for (const btn of step3Next) {
    if (await btn.isVisible()) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(3000);

  // Step 4: Business objectives
  console.log("Step 4: Business objectives...");
  const step4Text = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  console.log("Step 4 visible text:\n", step4Text);

  const checkboxes = await page.$$("input[type='checkbox'], mat-checkbox");
  if (checkboxes.length > 0) {
    console.log(`Found ${checkboxes.length} checkboxes. Selecting first...`);
    await checkboxes[0].click();
  }

  // Look for Create or Next button
  const createBtn = await page.$("button:has-text('Create')");
  if (createBtn && (await createBtn.isVisible())) {
    console.log("Clicking 'Create' button!");
    await createBtn.click();
  } else {
    const nextBtn4 = await page.$("button:has-text('Next')");
    if (nextBtn4 && (await nextBtn4.isVisible())) {
      await nextBtn4.click();
    }
  }

  await page.waitForTimeout(4000);
  console.log("URL after creation/terms:", page.url());
  const afterText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  console.log("After text:\n", afterText);

  await page.close();
  browser.close();
}

main().catch(console.error);
