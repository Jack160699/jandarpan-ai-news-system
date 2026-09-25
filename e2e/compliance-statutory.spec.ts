import { test, expect } from "@playwright/test";

test.describe("Jan Darpan Statutory Compliance & Grievance E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });
  });

  test("Ownership & Publisher Disclosure on /about", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveTitle(/About Jan Darpan/);

    // Verify canonical publisher entity
    await expect(page.locator("body")).toContainText("STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED");
    await expect(page.locator("body")).toContainText("U70200CT2025OPC017739");
    await expect(page.locator("body")).toContainText("638-JUHI TALPURI, B-BLOCK");
    await expect(page.locator("body")).toContainText("Bhilai");
    await expect(page.locator("body")).toContainText("490006");
    await expect(page.locator("body")).toContainText("Shriyansh Chandrakar");

    // Verify statutory grievance link
    const grievanceLink = page.locator('a[href="/grievance-redressal"]').first();
    await expect(grievanceLink).toBeVisible();
  });

  test("Grievance Redressal Mechanism & Officer on /grievance-redressal", async ({ page }) => {
    await page.goto("/grievance-redressal");
    await expect(page).toHaveTitle(/Grievance Redressal Mechanism/);

    // Verify Grievance Officer details
    await expect(page.locator("body")).toContainText("Shriyansh Chandrakar");
    await expect(page.locator("body")).toContainText("Grievance Officer, Jan Darpan");
    await expect(page.locator("body")).toContainText("+91 95847 35857");
    await expect(page.locator("body")).toContainText("shriyanshchandrakar@gmail.com");

    // Verify WhatsApp CTA button
    const whatsappCta = page.locator("#whatsapp-grievance-cta");
    await expect(whatsappCta).toBeVisible();
    const href = await whatsappCta.getAttribute("href");
    expect(href).toContain("wa.me/919584735857");

    // Verify statutory timelines
    await expect(page.locator("body")).toContainText("24 Hours");
    await expect(page.locator("body")).toContainText("15 Days");

    // Verify SRB honest pending status
    await expect(page.locator("body")).toContainText("LEVEL-II SRB MEMBERSHIP: PENDING EXTERNAL ACTION");
  });

  test("Web Grievance Submission and 24h Acknowledgement Generation", async ({ page }) => {
    await page.goto("/grievance-redressal");

    // Fill the web grievance form
    await page.fill("#complainant-name", "Test Citizen Compliant");
    await page.fill("#complainant-phone", "+91 98765 43210");
    await page.fill("#complainant-email", "citizen.test@example.com");
    await page.fill("#article-url", "https://www.jandarpan.news/story/test-article");
    await page.fill("#article-headline", "Test Story Concerning Local Infrastructure");
    await page.fill(
      "#grounds-of-grievance",
      "The article states an incorrect date regarding fund clearance which misrepresents the timeline."
    );
    await page.check("#consent-given");

    // Submit form
    await page.click('button[type="submit"]');

    // Expect successful registration with JD-GR reference ID and acknowledgment text
    await expect(page.locator("body")).toContainText("Grievance Registered Successfully");
    await expect(page.locator("body")).toContainText("JD-GR-");
    await expect(page.locator("body")).toContainText("Official Acknowledgment Note");
  });

  test("Rule 19 Public Monthly Compliance Disclosures on /compliance", async ({ page }) => {
    await page.goto("/compliance");
    await expect(page).toHaveTitle(/Monthly Compliance Disclosures/);
    await expect(page.locator("body")).toContainText("STRATXCEL SOLUTIONS (OPC) PRIVATE LIMITED");
    await expect(page.locator("body")).toContainText("Rule 19");
  });

  test("Contact Page shows distinct grievance vs business WhatsApp on /contact", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("body")).toContainText("Statutory Grievance Redressal · Rule 11");
    await expect(page.locator("body")).toContainText("+91 95847 35857");
    await expect(page.locator("body")).toContainText("+91 77778 12777");
    await expect(page.locator("body")).toContainText("shriyanshchandrakar@gmail.com");
  });

  test("Mobile Viewport QA without horizontal overflow", async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 },
      { width: 375, height: 667 },
      { width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto("/grievance-redressal");
      
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // Allow subpixel rounding
    }
  });
});
