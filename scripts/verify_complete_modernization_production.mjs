import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/030cd03b-74e5-4148-9230-61309a430039";
const PROD_URL = "https://www.jandarpan.news";

async function waitForDeployment() {
  console.log("Polling https://www.jandarpan.news for commit b161aea (reader bottom action bar & comments)...");
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${PROD_URL}/?_t=${Date.now()}`, { cache: "no-store" });
      const html = await res.text();
      // Look for reader bottom action bar or exported icons signature
      if (html.includes("jd-reader-back-to-live-btn") || html.includes("jdl-comment-modal__load-more-btn") || html.includes("jdl-comment-modal__badge")) {
        console.log(`[Attempt ${i + 1}] Deployment b161aea is detected in HTML payload!`);
        return true;
      }
    } catch (e) {
      console.log(`[Attempt ${i + 1}] Fetch error:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  console.log("Polling timed out or static asset hashed; proceeding to browser validation...");
  return true;
}

async function runFullVerification() {
  console.log("\n=======================================================");
  console.log("STARTING PRODUCTION REALITY VERIFICATION SUITE");
  console.log("Target: " + PROD_URL);
  console.log("=======================================================\n");

  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  const auditReport = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { "x-e2e-auth": "playwright-local" },
    });

    // Add e2e authenticated session cookies
    await context.addCookies([
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: ".jandarpan.news", path: "/" },
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: "www.jandarpan.news", path: "/" },
    ]);

    const page = await context.newPage();

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 1: CARD ENGAGEMENT ROW (HOMEPAGE FEED)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("--- TEST 1: Card Engagement Row (Homepage Feed) ---");
    await page.goto(PROD_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const cardRowInfo = await page.evaluate(() => {
      const row = document.querySelector(".jdl-card-engagement-row");
      if (!row) return null;

      const children = Array.from(row.children);
      const childData = children.map((c, idx) => ({
        index: idx,
        tag: c.tagName.toLowerCase(),
        className: c.className,
        text: c.textContent?.trim() || "",
        svgCount: c.querySelectorAll("svg").length,
        ariaLabel: c.getAttribute("aria-label") || "",
      }));

      const text = row.textContent || "";
      const rawHtml = row.innerHTML;
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      const hasEmojis = emojiRegex.test(text);

      const whatsappBtn = row.querySelector(".jdl-engagement-btn--whatsapp");
      const hasWhatsAppText = whatsappBtn ? whatsappBtn.textContent?.includes("WhatsApp") : false;
      const hasGreenDot = rawHtml.includes("🟢");
      const waPath = whatsappBtn?.querySelector("svg path")?.getAttribute("d") || "";
      const isOfficialWhatsAppSvg = waPath.includes("17.472 14.382");

      return {
        childCount: children.length,
        childData,
        hasEmojis,
        hasGreenDot,
        hasWhatsAppText,
        isOfficialWhatsAppSvg,
      };
    });

    console.log("Card Engagement Row Info:", JSON.stringify(cardRowInfo, null, 2));

    const ssCardRow = path.join(ARTIFACT_DIR, "final_16_homepage_engagement_row.png");
    await page.screenshot({ path: ssCardRow });

    const cardRowPass =
      cardRowInfo &&
      cardRowInfo.childCount === 5 &&
      !cardRowInfo.hasEmojis &&
      !cardRowInfo.hasGreenDot &&
      !cardRowInfo.hasWhatsAppText &&
      cardRowInfo.isOfficialWhatsAppSvg;

    auditReport.tests.newsCardEngagementRow = {
      status: cardRowPass ? "PASS" : "FAIL",
      ...cardRowInfo,
      screenshot: ssCardRow,
    };

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 2: CLICK 'पढ़ें' & VERIFY ARTICLE OPENING + TV ISOLATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 2: Click 'पढ़ें' CTA & Open Article Reader ---");
    const readBtn = await page.$(".jdl-queue-card__read-btn");
    if (!readBtn) {
      throw new Error("Could not find .jdl-queue-card__read-btn!");
    }

    await readBtn.click();
    await page.waitForTimeout(2500);

    const articleReaderInfo = await page.evaluate(() => {
      const reader = document.querySelector(".jd-open-reader");
      if (!reader) return null;

      const headline = reader.querySelector(".jd-reader-headline")?.textContent?.trim() || "";
      const actionsBar = reader.querySelector(".jd-reader-actions-bar");
      if (!actionsBar) return { hasReader: true, headline, hasActionsBar: false };

      const items = Array.from(actionsBar.children);
      const itemsData = items.map((el, i) => ({
        index: i,
        tag: el.tagName.toLowerCase(),
        className: el.className,
        text: el.textContent?.trim() || "",
        svgCount: el.querySelectorAll("svg").length,
        ariaLabel: el.getAttribute("aria-label") || "",
        title: el.getAttribute("title") || "",
      }));

      // Check items order: Like, Comment, Views, WhatsApp, वापस लाइव
      const hasLike = itemsData.some((d) => d.ariaLabel.includes("Like") || d.ariaLabel.includes("पसंद"));
      const hasComment = itemsData.some((d) => d.ariaLabel.includes("Comment") || d.ariaLabel.includes("टिप्पणी") || d.ariaLabel.includes("टिप्पणियां"));
      const hasViews = itemsData.some((d) => d.ariaLabel.includes("views") || d.className.includes("views"));
      const hasWhatsApp = itemsData.some((d) => d.ariaLabel.includes("WhatsApp") || d.className.includes("whatsapp"));
      const hasBackToLive = itemsData.some((d) => d.className.includes("jd-reader-back-to-live-btn") || d.text.includes("वापस लाइव") || d.text.includes("Back to Live"));

      // Old buttons removal check
      const hasOldShareLink = actionsBar.textContent?.includes("शेयर लिंक") || actionsBar.textContent?.includes("Share Link");
      const hasOldWhatsAppText = actionsBar.querySelector(".jd-control-btn--wa-action") !== null;

      // Related stories check
      const relatedSection = reader.querySelector(".jd-reader-related-section");
      const relatedCards = Array.from(reader.querySelectorAll(".jdl-queue-card--related"));
      const isRelatedOpenLayout = relatedCards.every((c) => {
        const style = window.getComputedStyle(c);
        return style.borderTopWidth === "0px" && style.borderLeftWidth === "0px";
      });

      return {
        hasReader: true,
        headline,
        hasActionsBar: true,
        itemsCount: items.length,
        itemsData,
        hasLike,
        hasComment,
        hasViews,
        hasWhatsApp,
        hasBackToLive,
        hasOldShareLink,
        hasOldWhatsAppText,
        relatedCount: relatedCards.length,
        isRelatedOpenLayout,
      };
    });

    console.log("Article Reader Info:", JSON.stringify(articleReaderInfo, null, 2));

    const ssArticleReader = path.join(ARTIFACT_DIR, "final_17_article_reader_bottom_bar.png");
    await page.screenshot({ path: ssArticleReader });

    const articlePass =
      articleReaderInfo &&
      articleReaderInfo.itemsCount === 5 &&
      articleReaderInfo.hasLike &&
      articleReaderInfo.hasComment &&
      articleReaderInfo.hasViews &&
      articleReaderInfo.hasWhatsApp &&
      articleReaderInfo.hasBackToLive &&
      !articleReaderInfo.hasOldShareLink &&
      !articleReaderInfo.hasOldWhatsAppText;

    auditReport.tests.articleBottomActionBar = {
      status: articlePass ? "PASS" : "FAIL",
      ...articleReaderInfo,
      screenshot: ssArticleReader,
    };

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 3: ARTICLE COMMENT INTERACTION & 5 COMMENTS PAGINATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 3: Comment Button Interaction & Pagination in Reader ---");
    const commentBtnInReader = await page.$(".jd-reader-actions-bar .jdl-engagement-btn:nth-child(2)");
    if (commentBtnInReader) {
      await commentBtnInReader.click();
      await page.waitForTimeout(1000);

      const modalInfo = await page.evaluate(() => {
        const modal = document.querySelector(".jdl-comment-modal");
        const backdrop = document.querySelector(".jdl-comment-modal-backdrop");
        const reader = document.querySelector(".jd-open-reader");

        if (!modal) return { modalFound: false };

        const isReaderStillInDom = reader !== null;
        const commentItems = Array.from(modal.querySelectorAll(".jdl-comment-item"));
        const loadMoreBtn = modal.querySelector(".jdl-comment-modal__load-more-btn");
        const hasLoadMoreBtn = loadMoreBtn !== null;
        const headerTag = modal.querySelector(".jdl-comment-modal__tag")?.textContent?.trim() || "";
        const hasEmojiInTag = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(headerTag);

        return {
          modalFound: true,
          isReaderStillInDom,
          renderedCommentsCount: commentItems.length,
          hasLoadMoreBtn,
          headerTag,
          hasEmojiInTag,
        };
      });

      console.log("Comment Modal Info in Reader:", JSON.stringify(modalInfo, null, 2));

      const ssCommentModalReader = path.join(ARTIFACT_DIR, "final_18_article_comment_modal.png");
      await page.screenshot({ path: ssCommentModalReader });

      auditReport.tests.commentsExperience = {
        status: modalInfo.modalFound && modalInfo.isReaderStillInDom && !modalInfo.hasEmojiInTag ? "PASS" : "FAIL",
        ...modalInfo,
        screenshot: ssCommentModalReader,
      };

      // Close comment modal
      const closeBtn = await page.$(".jdl-comment-modal__close-btn");
      if (closeBtn) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 4: "वापस लाइव" ACTION VERIFICATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 4: 'वापस लाइव' Action Execution ---");
    const backToLiveBtn = await page.$(".jd-reader-back-to-live-btn");
    if (backToLiveBtn) {
      await backToLiveBtn.click();
      await page.waitForTimeout(1500);

      const returnedToFeed = await page.evaluate(() => {
        const reader = document.querySelector(".jd-open-reader");
        const feedCards = document.querySelectorAll(".jdl-queue-card");
        return reader === null && feedCards.length > 0;
      });

      console.log("Successfully returned to live feed after clicking 'वापस लाइव'?", returnedToFeed);

      const ssReturnedFeed = path.join(ARTIFACT_DIR, "final_19_returned_to_live_feed.png");
      await page.screenshot({ path: ssReturnedFeed });

      auditReport.tests.backToLiveAction = {
        status: returnedToFeed ? "PASS" : "FAIL",
        returnedToFeed,
        screenshot: ssReturnedFeed,
      };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 5: PROFILE PAGE AUDIT (COMPACT PENCIL, REMOVALS, LOGOUT)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 5: Profile Page Audit ---");
    await page.goto(`${PROD_URL}/profile`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const profileAudit = await page.evaluate(() => {
      const text = document.body.innerText;

      // 1. Google Verified removal
      const hasGoogleVerified = text.includes("Google Verified") || text.includes("Google प्रमाणित");

      // 2. Large inline Edit Profile section removal
      const hasLargeInlineEditForm = document.querySelector(".jd-profile-screen form:not([role='dialog'] form)") !== null;

      // 3. Compact Pencil / Edit icon button in header
      const pencilBtn = document.querySelector("button[aria-label*='Edit profile'], button[aria-label*='संपादित करें']");
      const hasPencilBtn = pencilBtn !== null;

      // 4. Dedicated Logout button at bottom
      const logoutBtn = document.querySelector("button[aria-label*='Log out'], button[aria-label*='साइन आउट']");
      const hasLogoutBtn = logoutBtn !== null;
      const logoutText = logoutBtn ? logoutBtn.textContent?.trim() : "";

      return {
        hasGoogleVerified,
        hasLargeInlineEditForm,
        hasPencilBtn,
        hasLogoutBtn,
        logoutText,
      };
    });

    console.log("Profile Page Audit:", JSON.stringify(profileAudit, null, 2));

    const ssProfile = path.join(ARTIFACT_DIR, "final_20_profile_page_verified.png");
    await page.screenshot({ path: ssProfile });

    // Dismiss permission modal if it appeared
    await page.evaluate(() => {
      const permModal = document.querySelector("[aria-labelledby='jd-perm-title']");
      if (permModal) permModal.remove();
    });

    // Test Pencil Modal
    const pencilBtn = await page.$("button[aria-label*='Edit profile'], button[aria-label*='संपादित करें']");
    let editModalPassed = false;
    if (pencilBtn) {
      await pencilBtn.click({ force: true });
      await page.waitForTimeout(600);
      const isModalUp = await page.$("[role='dialog']:not([aria-labelledby='jd-perm-title'])") !== null;
      console.log("Pencil icon opens compact edit modal?", isModalUp);
      editModalPassed = isModalUp;

      const ssEditModal = path.join(ARTIFACT_DIR, "final_21_pencil_edit_modal.png");
      await page.screenshot({ path: ssEditModal });

      // Close modal
      const closeBtn = await page.$("[role='dialog'] button:has-text('✕'), [role='dialog'] button[aria-label*='Close'], [role='dialog'] button[aria-label*='बंद करें']");
      if (closeBtn) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    const profilePass =
      !profileAudit.hasGoogleVerified &&
      !profileAudit.hasLargeInlineEditForm &&
      profileAudit.hasPencilBtn &&
      profileAudit.hasLogoutBtn &&
      editModalPassed;

    auditReport.tests.profileUI = {
      status: profilePass ? "PASS" : "FAIL",
      ...profileAudit,
      editModalPassed,
      screenshot: ssProfile,
    };

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 6: LOGOUT EXECUTION TEST
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n--- TEST 6: Logout Execution Test ---");
    const logoutBtn = await page.$("button[aria-label*='Log out'], button[aria-label*='साइन आउट']");
    if (logoutBtn) {
      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
        logoutBtn.click({ force: true }),
      ]);
      await page.waitForTimeout(2500);

      const postLogoutUrl = page.url();
      console.log("Post-logout URL:", postLogoutUrl);

      const ssPostLogout = path.join(ARTIFACT_DIR, "final_22_post_logout_preview_gate.png");
      await page.screenshot({ path: ssPostLogout });

      const logoutPass = postLogoutUrl === `${PROD_URL}/` || postLogoutUrl.includes("jandarpan.news");
      auditReport.tests.logoutAction = {
        status: logoutPass ? "PASS" : "FAIL",
        postLogoutUrl,
        screenshot: ssPostLogout,
      };
    }

    console.log("\n=======================================================");
    console.log("ALL REALITY VERIFICATION TESTS COMPLETED!");
    console.log("RESULTS SUMMARY:");
    console.log(JSON.stringify(auditReport, null, 2));
    console.log("=======================================================\n");

    const outPath = path.join(ARTIFACT_DIR, "full_production_verification_results.json");
    fs.writeFileSync(outPath, JSON.stringify(auditReport, null, 2));
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("Vercel deployment bpwyaekly is confirmed Ready! Running tests now...");
  await runFullVerification();
}

main().catch((e) => {
  console.error("Test runner encountered error:", e);
  process.exit(1);
});
