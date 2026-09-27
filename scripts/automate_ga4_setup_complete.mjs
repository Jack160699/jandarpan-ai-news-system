import { chromium } from "playwright";

async function main() {
  console.log("Connecting to Chrome on CDP...");
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
  console.log("--- Step 1: Account Setup ---");
  const accountInput = await page.$("input[placeholder='My New Account Name']");
  if (accountInput) await accountInput.fill("Jan Darpan");
  await page.click("button:has-text('Next')");
  await page.waitForTimeout(2000);

  // Step 2: Property details
  console.log("--- Step 2: Property Setup ---");
  const propInputs = await page.$$("input[type='text']");
  for (const input of propInputs) {
    const val = await input.inputValue();
    if (!val) {
      await input.fill("Jan Darpan Production");
      break;
    }
  }

  // Click Next on Step 2
  const nextBtns2 = await page.$$("button:has-text('Next')");
  for (const btn of nextBtns2) {
    if (await btn.isVisible()) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(3000);

  // Step 3: Business details
  console.log("--- Step 3: Business Details ---");
  // Select industry category
  const selectTrigger = await page.$(
    "mat-select, [role='combobox'], [aria-label*='Industry' i]"
  );
  if (selectTrigger) {
    console.log("Opening Industry category dropdown...");
    await selectTrigger.click();
    await page.waitForTimeout(1000);
    // Find News or Books & Literature or Other in options
    const option = await page.$(
      "mat-option:has-text('News'), mat-option:has-text('Books & Literature'), mat-option:has-text('Other'), [role='option']:has-text('News'), [role='option']:has-text('Other')"
    );
    if (option) {
      console.log("Selecting Industry category option...");
      await option.click();
    } else {
      // Pick first option
      const firstOpt = await page.$("mat-option, [role='option']");
      if (firstOpt) await firstOpt.click();
    }
    await page.waitForTimeout(1000);
  }

  // Select Business size: Small
  console.log("Selecting Business size: Small...");
  const smallRadio = await page.$(
    "mat-radio-button:has-text('Small'), label:has-text('Small'), input[value*='SMALL' i]"
  );
  if (smallRadio) {
    await smallRadio.click();
  } else {
    const firstRadio = await page.$("mat-radio-button, input[type='radio']");
    if (firstRadio) await firstRadio.click();
  }
  await page.waitForTimeout(1000);

  // Click Next on Step 3
  console.log("Clicking Next on Step 3...");
  const nextBtns3 = await page.$$("button:has-text('Next')");
  for (const btn of nextBtns3) {
    if (await btn.isVisible()) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(3000);

  // Step 4: Business objectives
  console.log("--- Step 4: Business Objectives ---");
  const baselineOpt = await page.$(
    "mat-radio-button:has-text('Get baseline reports'), mat-checkbox:has-text('Examine user behavior'), label:has-text('Get baseline reports'), label:has-text('Examine user behavior')"
  );
  if (baselineOpt) {
    console.log("Selecting baseline / user behavior objective...");
    await baselineOpt.click();
  } else {
    const firstCheck = await page.$(
      "mat-checkbox, mat-radio-button, input[type='checkbox'], input[type='radio']"
    );
    if (firstCheck) await firstCheck.click();
  }
  await page.waitForTimeout(1000);

  // Click Create
  console.log("Clicking 'Create' button...");
  const createBtn = await page.$("button:has-text('Create')");
  if (createBtn) {
    await createBtn.click();
  } else {
    const nextBtn4 = await page.$("button:has-text('Next')");
    if (nextBtn4) await nextBtn4.click();
  }
  await page.waitForTimeout(4000);

  // Step 5: Terms of Service Modal
  console.log("Checking for Terms of Service modal...");
  const tosDialog = await page.$("mat-dialog-container, [role='dialog']");
  if (tosDialog) {
    console.log("Terms of service modal detected! Accepting checkboxes...");
    const checkboxes = await tosDialog.$$(
      "mat-checkbox, input[type='checkbox']"
    );
    for (const cb of checkboxes) {
      await cb.click();
      await page.waitForTimeout(500);
    }
    const acceptBtn = await tosDialog.$(
      "button:has-text('I Accept'), button:has-text('Accept')"
    );
    if (acceptBtn) {
      console.log("Clicking I Accept...");
      await acceptBtn.click();
      await page.waitForTimeout(5000);
    }
  }

  console.log("URL after creation:", page.url());
  await page.screenshot({ path: "ga_after_creation.png" });

  // Step 6: Platform selection (Web)
  console.log("Looking for Web platform button...");
  const webBtn = await page.$(
    "button:has-text('Web'), [role='button']:has-text('Web'), div:has-text('Web') >> visible=true"
  );
  if (webBtn) {
    console.log("Clicking Web platform...");
    await webBtn.click();
    await page.waitForTimeout(3000);

    console.log("Filling Website URL and Stream name...");
    // Find website url input
    const urlInput = await page.$(
      "input[placeholder*='example.com' i], input[aria-label*='Website URL' i], input[formcontrolname='uri']"
    );
    if (urlInput) {
      await urlInput.fill("www.jandarpan.news");
    }

    const streamNameInput = await page.$(
      "input[placeholder*='My website' i], input[aria-label*='Stream name' i], input[formcontrolname='streamName']"
    );
    if (streamNameInput) {
      await streamNameInput.fill("Jan Darpan Web");
    }

    console.log("Clicking Create stream button...");
    const createStreamBtn = await page.$(
      "button:has-text('Create stream'), button:has-text('Create & continue')"
    );
    if (createStreamBtn) {
      await createStreamBtn.click();
      await page.waitForTimeout(6000);
    }
  }

  // Check Web stream details and extract Measurement ID (G-...)
  await page.screenshot({ path: "ga_stream_details.png" });
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log("Stream Details Page Snippet:\n", pageText.slice(0, 1500));

  const gMatch = pageText.match(/G-[A-Z0-9]{6,14}/);
  if (gMatch) {
    console.log("FOUND GA4 MEASUREMENT ID:", gMatch[0]);
  }

  const propMatch = page.url().match(/p([0-9]{8,12})/);
  if (propMatch) {
    console.log("FOUND GA4 PROPERTY ID:", propMatch[1]);
  }

  await page.close();
  browser.close();
}

main().catch(console.error);
