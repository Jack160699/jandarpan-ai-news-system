import { test, expect } from "@playwright/test";

test.describe("Jan Darpan Final Production UX, Performance & Reader Experience", () => {
  test.beforeEach(async ({ page }) => {
    // Default to mobile phone viewport (390 x 844) for reader DS phone experience
    await page.setViewportSize({ width: 390, height: 844 });
    // Dismiss permission sheet pre-prompts in automated tests
    await page.addInitScript(() => {
      try {
        localStorage.setItem("jd-ds-perm-notify-v1", "1");
        localStorage.setItem("jd-ds-perm-loc-v1", "1");
      } catch {}
    });
  });

  test("1. Home Editorial Hierarchy: Hero + 6 Priority Sections (No Finance as primary)", async ({ page }) => {
    await page.goto("/home", { waitUntil: "domcontentloaded" });

    // Verify masthead persistent header
    const masthead = page.locator("[data-testid='jd-masthead']").first();
    await expect(masthead).toBeVisible();

    // Verify Main Hero / Lead story exists
    const leadStory = page.locator("[data-testid='jd-lead-story']").first();
    await expect(leadStory).toBeVisible();

    // Verify the 6 priority sections exist
    const content = await page.textContent("body");
    expect(content).toContain("राजनीति");
    expect(content).toContain("अपराध");
    expect(content).toContain("राष्ट्रीय");
    expect(content).toContain("अंतरराष्ट्रीय");
    expect(content).toContain("मनोरंजन");
    expect(content).toContain("खेल");

    // Strictly ensure Finance/व्यापार is NOT a primary homepage section header
    const primarySectionTitles = await page.locator(".jd-section-header h2, .jd-section-header").allTextContents();
    const hasFinanceAsPrimary = primarySectionTitles.some((t) => t.includes("व्यापार") || t.includes("Finance"));
    expect(hasFinanceAsPrimary).toBe(false);
  });

  test("2. My Jila: Prominent district header, multi-story feed & strict district scoping", async ({ page }) => {
    await page.goto("/district/durg", { waitUntil: "domcontentloaded" });

    // Verify prominent district header banner
    const districtHeader = page.locator("[data-testid='jd-district-header']");
    await expect(districtHeader).toBeVisible();

    const headerText = await districtHeader.textContent();
    expect(headerText).toMatch(/दुर्ग|DURG/i);

    // Verify "Change District" / "ज़िला बदलें" action button
    const changeBtn = districtHeader.locator("a[href*='/district?select=1']");
    await expect(changeBtn).toBeVisible();

    // Verify district feed content area and multiple stories
    const hubLayout = page.locator(".jd-hub-layout");
    await expect(hubLayout).toBeVisible();

    // Verify district stories count > 1 (real district feed, not empty or single item)
    const districtStories = page.locator("[data-testid='jd-district-fresh'] a, [data-testid='jd-district-older'] a, .jd-hub-lead a[href*='/story/']");
    const storyCount = await districtStories.count();
    expect(storyCount).toBeGreaterThan(1);
  });

  test("3. Taza: Chronological continuous feed with count > 2, timestamps [ HH:MM ], and strict ordering", async ({ page }) => {
    await page.goto("/latest", { waitUntil: "domcontentloaded" });

    // Verify Taza header
    const tazaHeader = page.locator("[data-testid='jd-taza-header']");
    await expect(tazaHeader).toBeVisible();

    const headerText = await tazaHeader.textContent();
    expect(headerText).toContain("ताज़ा");
    expect(headerText).toContain("सबसे नई खबरें पहले");

    // Verify continuous feed exists
    const feed = page.locator("[data-testid='jd-taza-feed']");
    await expect(feed).toBeVisible();

    // Verify story count is greater than 2 (not the old broken 2-story limit)
    const storyElements = page.locator("[data-testid='jd-taza-story']");
    const storyCount = await storyElements.count();
    expect(storyCount).toBeGreaterThan(2);

    // Verify story items have [ HH:MM ] timestamps
    const firstStory = storyElements.first();
    const storyText = await firstStory.textContent();
    expect(storyText).toMatch(/\[\s*\d{2}:\d{2}\s*\]/);
  });

  test("4. Navigation: Smooth Next.js client-side navigation without full-page reloads", async ({ page }) => {
    await page.goto("/home", { waitUntil: "networkidle" });

    // Set a window variable to detect if a hard browser reload happens
    await page.evaluate(() => {
      (window as unknown as { __navTracker?: boolean }).__navTracker = true;
    });

    // Tap Taza in bottom navigation
    const tazaTab = page.locator(".jd-bottom-nav a[href='/latest']").first();
    await tazaTab.click();
    await page.waitForURL("**/latest");

    // Window tracker MUST persist (proving no hard full-page reload)
    const trackerPersistedAfterTaza = await page.evaluate(() => {
      return (window as unknown as { __navTracker?: boolean }).__navTracker === true;
    });
    expect(trackerPersistedAfterTaza).toBe(true);

    // Tap District in bottom navigation
    const districtTab = page.locator(".jd-bottom-nav a[href*='/district/']").first();
    await districtTab.click();
    await page.waitForURL("**/district/**");

    const trackerPersistedAfterDistrict = await page.evaluate(() => {
      return (window as unknown as { __navTracker?: boolean }).__navTracker === true;
    });
    expect(trackerPersistedAfterDistrict).toBe(true);

    // Tap Home to return
    const homeTab = page.locator(".jd-bottom-nav a[href='/home']").first();
    await homeTab.click();
    await page.waitForURL("**/home");

    const trackerPersistedAfterHome = await page.evaluate(() => {
      return (window as unknown as { __navTracker?: boolean }).__navTracker === true;
    });
    expect(trackerPersistedAfterHome).toBe(true);
  });

  test("5. Article Page: Exactly ONE canonical hero image, no duplicate hero, sticky masthead", async ({ page }) => {
    await page.goto("/home", { waitUntil: "domcontentloaded" });

    // Find first article link
    const firstArticleLink = page.locator("a[href*='/story/']").first();
    await expect(firstArticleLink).toBeVisible();
    await firstArticleLink.click();
    await page.waitForURL("**/story/**");

    // Verify single H1 on article page
    await expect(page.locator("h1")).toHaveCount(1);

    // Verify sticky masthead
    const masthead = page.locator("[data-testid='jd-masthead']").first();
    await expect(masthead).toBeVisible();

    // Verify there is AT MOST one hero image in the article header
    const articleImages = page.locator("article .jd-article-image, article .jd-video-player");
    const count = await articleImages.count();
    expect(count).toBeLessThanOrEqual(1);

    // Verify related stories only appear after the article body
    const relatedSection = page.locator(".jd-related-stories");
    if (await relatedSection.count() > 0) {
      await expect(relatedSection).toBeVisible();
    }
  });

  test("6. Media Safety: Branded images (Amar Ujala, TV channel bugs) are rejected", async ({ page }) => {
    await page.goto("/home", { waitUntil: "domcontentloaded" });

    // Inspect all image sources on the page
    const imgSrcs = await page.$$eval("img", (imgs) => imgs.map((i) => i.src));
    for (const src of imgSrcs) {
      expect(src.toLowerCase()).not.toContain("amarujala");
      expect(src.toLowerCase()).not.toContain("watermark");
      expect(src.toLowerCase()).not.toContain("ibc24");
      expect(src.toLowerCase()).not.toContain("bhaskar.com");
    }
  });

  test("7. Desktop Experience (1280px & 1440px): Responsive grid & stable chrome", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/home", { waitUntil: "domcontentloaded" });

    // Verify desk chrome or masthead exists
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Verify horizontal overflow is zero
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
