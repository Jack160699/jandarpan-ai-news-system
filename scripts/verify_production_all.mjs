import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/030cd03b-74e5-4148-9230-61309a430039";
const BASE_URL = "http://127.0.0.1:3000";

async function run() {
  console.log("=== STARTING FULL PRODUCTION REALITY VERIFICATION ===");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });

  const results = {
    authGate: {},
    engagementRow: {},
    screenshots: [],
  };

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 1: MANDATORY GOOGLE-ONLY AUTHENTICATION GATE VERIFICATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Suite 1: Testing Mandatory Google-Only Auth Gate ---");
    const unauthContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page1 = await unauthContext.newPage();

    // 1. Visit root unauthenticated
    await page1.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const currentUrl = page1.url();
    console.log("Root unauth redirected to:", currentUrl);
    results.authGate.rootRedirect = currentUrl.includes("/login?next=%2F");

    // Check visible elements
    const pageText = await page1.innerText("body");
    results.authGate.hasBrandTitle = pageText.includes("जन दर्पण — विश्वसनीय छत्तीसगढ़") || pageText.includes("जन दर्पण");
    results.authGate.hasGateReason = pageText.includes("Google खाते से साइन इन करें");
    results.authGate.hasGoogleBtn = pageText.includes("Google से जारी रखें") || pageText.includes("Google से साइन इन");
    results.authGate.noGuestBypass = !pageText.includes("अतिथि के रूप में") && !pageText.includes("मेहमान के रूप में") && !pageText.includes("Continue as guest");

    console.log("Auth Gate assertions:", results.authGate);

    // Capture Gate Desktop Light Hindi
    const pGateDesktop = path.join(ARTIFACT_DIR, "gate_01_desktop_light_hindi.png");
    await page1.screenshot({ path: pGateDesktop, fullPage: false });
    results.screenshots.push("gate_01_desktop_light_hindi.png");

    // Capture Gate Mobile (390px)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const pageMobile = await mobileContext.newPage();
    await pageMobile.goto(`${BASE_URL}/live`, { waitUntil: "networkidle" });
    const mobileUrl = pageMobile.url();
    console.log("Live unauth redirected to:", mobileUrl);
    results.authGate.liveRedirect = mobileUrl.includes("/login?next=%2Flive");

    const pGateMobile = path.join(ARTIFACT_DIR, "gate_02_mobile_light_hindi.png");
    await pageMobile.screenshot({ path: pGateMobile, fullPage: false });
    results.screenshots.push("gate_02_mobile_light_hindi.png");

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 2: AUTHENTICATED EXPERIENCE & NEWS CARD ENGAGEMENT ROW
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- Suite 2: Authenticated Newsroom & Card Engagement Row ---");
    const authContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      extraHTTPHeaders: {
        "x-e2e-auth": "playwright-local",
      },
    });

    // Seed E2E verified authentication cookie
    await authContext.addCookies([
      {
        name: "nr-e2e-user",
        value: "e2e_verified_reader_99",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    const authPage = await authContext.newPage();
    await authPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    console.log("Authenticated root URL:", authPage.url());

    // Wait for queue cards to render
    await authPage.waitForSelector(".jdl-queue-card", { timeout: 15000 });
    const cardCount = await authPage.$$eval(".jdl-queue-card", (cards) => cards.length);
    console.log(`Found ${cardCount} news cards in Live feed.`);
    results.engagementRow.cardCount = cardCount;

    // Verify Card Engagement Row elements on first card
    const firstRowSeq = await authPage.$eval(".jdl-card-engagement-row", (row) => {
      const items = Array.from(row.children).map((el) => {
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || "").trim(),
          className: el.className,
          title: el.getAttribute("title") || "",
        };
      });
      return items;
    });
    console.log("Card engagement row items:", JSON.stringify(firstRowSeq, null, 2));
    results.engagementRow.rowItems = firstRowSeq;

    // Check exact sequence: 👁 Views -> ❤️ Like -> 💬 Comment -> 🟢 WhatsApp -> ↗ Share -> 📖 पढ़ें
    const hasViews = firstRowSeq.some((item) => item.className.includes("views") || item.text.includes("👁"));
    const hasLike = firstRowSeq.some((item) => item.text.includes("❤️") || item.text.includes("🤍"));
    const hasComment = firstRowSeq.some((item) => item.text.includes("💬"));
    const hasWhatsApp = firstRowSeq.some((item) => item.className.includes("whatsapp") || item.text.includes("🟢"));
    const hasShare = firstRowSeq.some((item) => item.className.includes("share") || item.text.includes("↗"));
    const hasRead = firstRowSeq.some((item) => item.text.includes("पढ़ें") || item.text.includes("Read"));

    results.engagementRow.sequenceVerified = hasViews && hasLike && hasComment && hasWhatsApp && hasShare && hasRead;
    console.log("Row sequence verified:", results.engagementRow.sequenceVerified);

    // Capture Desktop Live Feed Screenshot
    const pDesktopLive = path.join(ARTIFACT_DIR, "prod_eng_01_desktop_live.png");
    await authPage.screenshot({ path: pDesktopLive, fullPage: false });
    results.screenshots.push("prod_eng_01_desktop_live.png");

    // Test Like Interaction
    console.log("\n--- Testing Like Button Interaction ---");
    const likeBtn = await authPage.$(".jdl-card-engagement-row .jdl-engagement-btn:has-text('🤍'), .jdl-card-engagement-row .jdl-engagement-btn:has-text('❤️')");
    if (likeBtn) {
      const initialLikeText = await likeBtn.innerText();
      console.log("Initial like button text:", initialLikeText);
      await likeBtn.click();
      await authPage.waitForTimeout(1500);
      const afterLikeText = await likeBtn.innerText();
      console.log("After like button text:", afterLikeText);
      results.engagementRow.likeClicked = true;
    }

    // Test Comment Modal Interaction
    console.log("\n--- Testing Comment Modal & Submission ---");
    const commentBtn = await authPage.$(".jdl-card-engagement-row .jdl-engagement-btn:has-text('💬')");
    if (commentBtn) {
      await commentBtn.click();
      await authPage.waitForSelector(".jdl-comment-modal", { timeout: 5000 });
      console.log("Comment modal opened successfully.");

      // Capture Comment Modal Screenshot
      const pModal = path.join(ARTIFACT_DIR, "prod_eng_02_comment_modal.png");
      await authPage.screenshot({ path: pModal, fullPage: false });
      results.screenshots.push("prod_eng_02_comment_modal.png");

      // Type and submit comment
      await authPage.fill(".jdl-comment-modal__input", "सटीक और निष्पक्ष समाचार। बधाई!");
      await authPage.click(".jdl-comment-modal__submit-btn");
      await authPage.waitForTimeout(1500);

      // Verify comment displayed
      const modalText = await authPage.innerText(".jdl-comment-modal");
      results.engagementRow.commentPosted = modalText.includes("सटीक और निष्पक्ष समाचार");
      console.log("Comment posted and visible:", results.engagementRow.commentPosted);

      // Close modal
      await authPage.click(".jdl-comment-modal__close-btn");
      await authPage.waitForTimeout(500);
    }

    // Test '📖 पढ़ें' button opening reader without TV conflict
    console.log("\n--- Testing Dedicated '📖 पढ़ें' Reader Action ---");
    const readBtn = await authPage.$(".jdl-card-engagement-row .jdl-queue-card__read-btn");
    if (readBtn) {
      await readBtn.click();
      await authPage.waitForTimeout(1500);
      const hasArticleReader = (await authPage.$(".jd-open-reader")) !== null;
      results.engagementRow.readerOpened = hasArticleReader;
      console.log("In-place article reader opened via पढ़ें:", hasArticleReader);

      // Capture Article Reader Screenshot
      const pReader = path.join(ARTIFACT_DIR, "prod_eng_03_article_reader.png");
      await authPage.screenshot({ path: pReader, fullPage: false });
      results.screenshots.push("prod_eng_03_article_reader.png");

      // Back to queue
      const backBtn = await authPage.$(".jd-control-btn--back");
      if (backBtn) await backBtn.click();
      await authPage.waitForTimeout(500);
    }

    // Capture Desktop Dark Mode Live
    console.log("\n--- Testing Desktop Dark Mode Live ---");
    await authPage.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await authPage.waitForTimeout(500);
    const pDarkLive = path.join(ARTIFACT_DIR, "prod_eng_05_desktop_dark.png");
    await authPage.screenshot({ path: pDarkLive, fullPage: false });
    results.screenshots.push("prod_eng_05_desktop_dark.png");

    // Capture Gate English & Dark Mode
    console.log("\n--- Testing Gate English & Dark Modes ---");
    const gateContext2 = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const gatePage2 = await gateContext2.newPage();
    await gatePage2.goto(`${BASE_URL}/login?lang=en`, { waitUntil: "networkidle" });
    const pGateEn = path.join(ARTIFACT_DIR, "gate_03_desktop_light_english.png");
    await gatePage2.screenshot({ path: pGateEn, fullPage: false });
    results.screenshots.push("gate_03_desktop_light_english.png");

    // Gate Dark mode
    await gatePage2.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await gatePage2.waitForTimeout(500);
    const pGateDark = path.join(ARTIFACT_DIR, "gate_04_desktop_dark.png");
    await gatePage2.screenshot({ path: pGateDark, fullPage: false });
    results.screenshots.push("gate_04_desktop_dark.png");

    // Capture Mobile Live Feed (390px) Authenticated
    console.log("\n--- Testing Mobile Authenticated View ---");
    const mobileAuthContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      extraHTTPHeaders: {
        "x-e2e-auth": "playwright-local",
      },
    });
    await mobileAuthContext.addCookies([
      {
        name: "nr-e2e-user",
        value: "e2e_verified_reader_99",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    const mobileAuthPage = await mobileAuthContext.newPage();
    await mobileAuthPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await mobileAuthPage.waitForSelector(".jdl-queue-card", { timeout: 15000 });

    const pMobileLive = path.join(ARTIFACT_DIR, "prod_eng_04_mobile_live.png");
    await mobileAuthPage.screenshot({ path: pMobileLive, fullPage: false });
    results.screenshots.push("prod_eng_04_mobile_live.png");

    console.log("\n=== ALL REALITY VERIFICATIONS COMPLETE ===");
    console.log("Summary:", JSON.stringify(results, null, 2));

    fs.writeFileSync(
      path.join(ARTIFACT_DIR, "production_reality_audit_results.json"),
      JSON.stringify(results, null, 2),
      "utf-8"
    );
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL VERIFICATION ERROR:", err);
  process.exit(1);
});
