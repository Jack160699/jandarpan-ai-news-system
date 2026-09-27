import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const pages = browser.contexts()[0].pages();
  const page = pages.find((p) => p.url().includes("analytics.google.com"));
  if (!page) {
    console.error("No GA page open");
    return;
  }

  console.log("Current GA page URL:", page.url());

  // Click 'Select one' button
  console.log("Clicking 'Select one' button...");
  const selectBtn = await page.$("button:has-text('Select one')");
  if (selectBtn) {
    await selectBtn.click();
    await page.waitForTimeout(1000);
    // Print visible options
    const options = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll("[role='option'], .mat-option, mat-option, div[role='menuitem'], button[role='menuitem']"));
      return items.map((el) => el.innerText);
    });
    console.log("Options found:", options);

    // Click Books & Literature or News or first option
    const optToClick = await page.$(
      "[role='option']:has-text('News'), [role='option']:has-text('Books & Literature'), [role='option']:has-text('Entertainment'), mat-option:has-text('News'), [role='option']"
    );
    if (optToClick) {
      console.log("Clicking option:", await optToClick.innerText());
      await optToClick.click();
    }
  }

  // Click Small radio
  console.log("Clicking 'Small - 1 to 10 employees'...");
  const smallRadio = await page.$("mat-radio-button:has-text('Small - 1 to 10 employees'), label:has-text('Small - 1 to 10 employees')");
  if (smallRadio) {
    await smallRadio.click();
  }

  // Click Next
  console.log("Clicking Next on Step 3...");
  const nextBtn = await page.$(".mat-horizontal-content-container button:has-text('Next')");
  if (nextBtn) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
  }

  // Now Step 4
  console.log("Checking Step 4 content...");
  const step4Snippet = await page.evaluate(() => {
    const container = document.querySelector(".mat-horizontal-content-container");
    return container ? container.innerText : "no container";
  });
  console.log("Step 4 snippet:\n", step4Snippet.slice(0, 500));

  // Select "Get baseline reports" or first objective
  const baseline = await page.$("mat-radio-button:has-text('Get baseline reports'), mat-checkbox:has-text('Examine user behavior'), mat-checkbox");
  if (baseline) {
    console.log("Selecting objective...");
    await baseline.click();
  }

  // Click Create
  console.log("Clicking Create button...");
  const createBtn = await page.$("button:has-text('Create')");
  if (createBtn) {
    await createBtn.click();
    await page.waitForTimeout(4000);
  }

  // Handle Terms of Service modal if present
  console.log("Checking for Terms of Service modal...");
  await page.screenshot({ path: "ga_tos_dialog.png" });
  const tosText = await page.evaluate(() => {
    const dialog = document.querySelector("mat-dialog-container, [role='dialog']");
    return dialog ? dialog.innerText : "No dialog";
  });
  console.log("TOS Dialog text:\n", tosText.slice(0, 500));

  if (tosText !== "No dialog") {
    // Check all checkboxes in the dialog
    const cbs = await page.$$("mat-dialog-container input[type='checkbox'], [role='dialog'] input[type='checkbox'], mat-dialog-container mat-checkbox, [role='dialog'] mat-checkbox");
    console.log(`Found ${cbs.length} checkboxes in dialog. Clicking each...`);
    for (const cb of cbs) {
      await cb.click();
      await page.waitForTimeout(500);
    }
    const acceptBtn = await page.$("mat-dialog-container button:has-text('I Accept'), [role='dialog'] button:has-text('I Accept'), button:has-text('I Accept')");
    if (acceptBtn) {
      console.log("Clicking I Accept...");
      await acceptBtn.click();
      await page.waitForTimeout(6000);
    }
  }

  console.log("URL after creation:", page.url());
  await page.screenshot({ path: "ga_after_creation_done.png" });

  browser.close();
}

main().catch(console.error);
