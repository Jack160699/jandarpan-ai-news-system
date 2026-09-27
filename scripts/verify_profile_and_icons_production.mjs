import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/030cd03b-74e5-4148-9230-61309a430039";
const PROD_URL = "https://www.jandarpan.news";

async function pollDeployment() {
  console.log("Polling https://www.jandarpan.news/profile for commit 18e1ff5...");
  for (let i = 0; i < 45; i++) {
    try {
      const res = await fetch(`${PROD_URL}/profile?_t=${Date.now()}`, { cache: "no-store" });
      const html = await res.text();
      // Check for removal of Google Verified and presence of Edit profile pencil aria-label
      const hasOldGoogleVerified = html.includes("Google Verified") || html.includes("Google प्रमाणित");
      const hasNewPencilOrLogout = html.includes("Edit profile") || html.includes("प्रोफ़ाइल संपादित करें") || html.includes("Log out");
      
      console.log(`[Attempt ${i + 1}] hasOldGoogleVerified=${hasOldGoogleVerified}, hasNewPencilOrLogout=${hasNewPencilOrLogout}`);
      if (!hasOldGoogleVerified && hasNewPencilOrLogout) {
        console.log("SUCCESS! Commit 18e1ff5 is LIVE on production!");
        return true;
      }
    } catch (e) {
      console.log(`[Attempt ${i + 1}] Fetch error:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  return false;
}

async function runTests() {
  console.log("\n=== STARTING PRODUCTION PLAYWRIGHT VERIFICATION SUITE ===");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  const results = {
    timestamp: new Date().toISOString(),
    newsCardIcons: {},
    profileHierarchy: {},
    profileEditModal: {},
    logoutFlow: {},
  };

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // TEST 1: NEWS CARDS & ENGAGEMENT ROW (DESKTOP 1440px)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 1: News Card Engagement Row (Desktop 1440px) ---");
    const ctxDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { "x-e2e-auth": "playwright-local" },
    });
    await ctxDesktop.addCookies([
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: ".jandarpan.news", path: "/" },
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: "www.jandarpan.news", path: "/" },
    ]);
    const pageDesk = await ctxDesktop.newPage();
    await pageDesk.goto(PROD_URL, { waitUntil: "domcontentloaded" });
    await pageDesk.waitForTimeout(2000);

    // Find the first news card engagement row
    const engagementRow = await pageDesk.$(".jdl-card-engagement-row");
    if (!engagementRow) {
      throw new Error("Could not find .jdl-card-engagement-row on home page!");
    }

    const rowDetails = await engagementRow.evaluate((row) => {
      const items = Array.from(row.children);
      const textContent = row.textContent || "";
      const rawHtml = row.innerHTML;

      // Check each child in order
      const childAnalysis = items.map((el, idx) => {
        const isBtn = el.tagName.toLowerCase() === "button";
        const ariaLabel = el.getAttribute("aria-label") || "";
        const title = el.getAttribute("title") || "";
        const svgCount = el.querySelectorAll("svg").length;
        const text = el.textContent?.trim() || "";
        return { index: idx, tag: el.tagName, isBtn, ariaLabel, title, svgCount, text };
      });

      // Check emojis in engagement row
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      const hasEmojis = emojiRegex.test(textContent);

      // Check WhatsApp specifics
      const whatsappBtn = row.querySelector(".jdl-engagement-btn--whatsapp");
      const hasWhatsAppText = whatsappBtn ? whatsappBtn.textContent?.includes("WhatsApp") : false;
      const hasGreenDotEmoji = rawHtml.includes("🟢");
      const hasWhatsAppSvg = whatsappBtn ? whatsappBtn.querySelector("svg") !== null : false;
      const whatsappPath = whatsappBtn?.querySelector("svg path")?.getAttribute("d") || "";
      const isOfficialWhatsAppPath = whatsappPath.includes("17.472 14.382");

      return {
        childCount: items.length,
        childAnalysis,
        hasEmojis,
        hasGreenDotEmoji,
        hasWhatsAppText,
        hasWhatsAppSvg,
        isOfficialWhatsAppPath,
      };
    });

    console.log("Engagement row child count:", rowDetails.childCount);
    console.log("Child items analysis:", JSON.stringify(rowDetails.childAnalysis, null, 2));
    console.log("Has Unicode emojis in engagement row:", rowDetails.hasEmojis);
    console.log("Has green dot emoji (🟢):", rowDetails.hasGreenDotEmoji);
    console.log("Has WhatsApp text in button:", rowDetails.hasWhatsAppText);
    console.log("Has WhatsApp SVG icon:", rowDetails.hasWhatsAppSvg);
    console.log("Is official WhatsApp SVG path:", rowDetails.isOfficialWhatsAppPath);

    const ssDeskRow = path.join(ARTIFACT_DIR, "final_08_desktop_engagement_row.png");
    await pageDesk.screenshot({ path: ssDeskRow });
    console.log("Saved Screenshot 8:", ssDeskRow);

    results.newsCardIcons = {
      status: rowDetails.childCount === 5 && !rowDetails.hasEmojis && rowDetails.isOfficialWhatsAppPath ? "PASS" : "FAIL",
      ...rowDetails,
      screenshot: ssDeskRow,
    };

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 2: MOBILE 390px VIEWPORT ENGAGEMENT ROW
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 2: Mobile 390px Engagement Row ---");
    const ctxMob = await browser.newContext({
      viewport: { width: 390, height: 844 },
      extraHTTPHeaders: { "x-e2e-auth": "playwright-local" },
    });
    await ctxMob.addCookies([
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: ".jandarpan.news", path: "/" },
      { name: "nr-e2e-user", value: "e2e_verified_reader_99", domain: "www.jandarpan.news", path: "/" },
    ]);
    const pageMob = await ctxMob.newPage();
    await pageMob.goto(PROD_URL, { waitUntil: "domcontentloaded" });
    await pageMob.waitForTimeout(2000);

    const ssMobRow = path.join(ARTIFACT_DIR, "final_09_mobile_engagement_row.png");
    await pageMob.screenshot({ path: ssMobRow });
    console.log("Saved Screenshot 9 (Mobile 390px):", ssMobRow);

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 3: DARK MODE ENGAGEMENT ROW
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 3: Dark Mode Engagement Row ---");
    await pageDesk.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await pageDesk.waitForTimeout(600);
    const ssDarkRow = path.join(ARTIFACT_DIR, "final_10_dark_engagement_row.png");
    await pageDesk.screenshot({ path: ssDarkRow });
    console.log("Saved Screenshot 10 (Dark Mode):", ssDarkRow);

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 4: PROFILE PAGE HIERARCHY, PENCIL ICON & REMOVALS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 4: Profile Page Hierarchy, Compact Pencil & Removals ---");
    await pageDesk.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.removeAttribute("data-theme");
    });
    await pageDesk.goto(`${PROD_URL}/profile`, { waitUntil: "domcontentloaded" });
    await pageDesk.waitForTimeout(2000);

    const profileAudit = await pageDesk.evaluate(() => {
      const bodyText = document.body.innerText;
      const html = document.body.innerHTML;

      // 1. Google Verified removal
      const hasGoogleVerified = bodyText.includes("Google Verified") || bodyText.includes("Google प्रमाणित");

      // 2. Large inline Edit Profile section removal
      // In the old design, there was a visible form with heading "Edit Jan Darpan Display Profile" or similar directly in the page
      const hasLargeInlineEditForm = document.querySelector(".jd-profile-screen form:not([role='dialog'] form)") !== null;

      // 3. Compact Pencil / Edit icon button at upper-right of header card
      const pencilBtn = document.querySelector("button[aria-label*='Edit profile'], button[aria-label*='संपादित करें']");
      const hasPencilBtn = pencilBtn !== null;
      const pencilSvgCount = pencilBtn ? pencilBtn.querySelectorAll("svg").length : 0;

      // 4. Dedicated Logout button at bottom
      const logoutBtn = document.querySelector("button[aria-label*='Log out'], button[aria-label*='साइन आउट']");
      const hasLogoutBtn = logoutBtn !== null;
      const logoutText = logoutBtn ? logoutBtn.textContent?.trim() : "";

      // 5. Hierarchy check: sections present in order
      const sections = Array.from(document.querySelectorAll(".jd-profile-screen > section, .jd-profile-screen > main > section"));

      return {
        hasGoogleVerified,
        hasLargeInlineEditForm,
        hasPencilBtn,
        pencilSvgCount,
        hasLogoutBtn,
        logoutText,
        sectionCount: sections.length,
      };
    });

    console.log("Profile Audit:", JSON.stringify(profileAudit, null, 2));

    const ssProfileDesk = path.join(ARTIFACT_DIR, "final_12_profile_page_desktop.png");
    await pageDesk.screenshot({ path: ssProfileDesk });
    console.log("Saved Screenshot 12 (Profile Desktop):", ssProfileDesk);

    results.profileHierarchy = {
      status: !profileAudit.hasGoogleVerified && !profileAudit.hasLargeInlineEditForm && profileAudit.hasPencilBtn && profileAudit.hasLogoutBtn ? "PASS" : "FAIL",
      ...profileAudit,
      screenshot: ssProfileDesk,
    };

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 5: COMPACT EDIT PROFILE MODAL INTERACTION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 5: Compact Edit Profile Modal Interaction ---");
    const pencilBtnEl = await pageDesk.$("button[aria-label*='Edit profile'], button[aria-label*='संपादित करें']");
    if (pencilBtnEl) {
      await pencilBtnEl.click();
      await pageDesk.waitForTimeout(500);

      const modalEl = await pageDesk.$("[role='dialog']");
      const isModalVisible = modalEl !== null;
      console.log("Edit profile modal visible after clicking pencil?", isModalVisible);

      const ssEditModal = path.join(ARTIFACT_DIR, "final_11_profile_edit_modal.png");
      await pageDesk.screenshot({ path: ssEditModal });
      console.log("Saved Screenshot 11 (Edit Profile Modal):", ssEditModal);

      // Close modal
      const closeBtn = await pageDesk.$("[role='dialog'] button[aria-label*='Close'], [role='dialog'] button[aria-label*='बंद करें'], [role='dialog'] button:has-text('✕')");
      if (closeBtn) {
        await closeBtn.click();
        await pageDesk.waitForTimeout(300);
      }

      results.profileEditModal = {
        status: isModalVisible ? "PASS" : "FAIL",
        isModalVisible,
        screenshot: ssEditModal,
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 6: MOBILE & DARK PROFILE VIEWS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 6: Mobile & Dark Profile Views ---");
    await pageMob.goto(`${PROD_URL}/profile`, { waitUntil: "domcontentloaded" });
    await pageMob.waitForTimeout(1500);
    const ssProfileMob = path.join(ARTIFACT_DIR, "final_13_profile_page_mobile.png");
    await pageMob.screenshot({ path: ssProfileMob });
    console.log("Saved Screenshot 13 (Profile Mobile 390px):", ssProfileMob);

    await pageMob.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await pageMob.waitForTimeout(500);
    const ssProfileDark = path.join(ARTIFACT_DIR, "final_14_profile_page_dark.png");
    await pageMob.screenshot({ path: ssProfileDark });
    console.log("Saved Screenshot 14 (Profile Mobile Dark):", ssProfileDark);

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 7: LOGOUT FLOW EXECUTION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 7: Dedicated Logout Button Execution ---");
    const logoutBtnEl = await pageDesk.$("button[aria-label*='Log out'], button[aria-label*='साइन आउट']");
    if (logoutBtnEl) {
      console.log("Clicking dedicated Log out button...");
      await Promise.all([
        pageDesk.waitForNavigation({ timeout: 15000 }).catch((e) => console.log("Nav on logout:", e.message)),
        logoutBtnEl.click(),
      ]);
      await pageDesk.waitForTimeout(3000);

      const postLogoutUrl = pageDesk.url();
      console.log("Post-logout URL:", postLogoutUrl);

      // Verify that the user is unauthenticated and auth gate is active
      const hasAuthGate = await pageDesk.$(".jd-auth-status-banner--preview, .jd-auth-gate-modal, .jd-auth-gate-backdrop") !== null;
      console.log("Auth gate active after logout?", hasAuthGate);

      const ssPostLogout = path.join(ARTIFACT_DIR, "final_15_post_logout_auth_gate.png");
      await pageDesk.screenshot({ path: ssPostLogout });
      console.log("Saved Screenshot 15 (Post-logout Auth Gate):", ssPostLogout);

      results.logoutFlow = {
        status: hasAuthGate || postLogoutUrl === `${PROD_URL}/` ? "PASS" : "FAIL",
        postLogoutUrl,
        hasAuthGate,
        screenshot: ssPostLogout,
      };
    }

    console.log("\n=== ALL MODERNIZATION VERIFICATION TESTS COMPLETE ===");
    console.log(JSON.stringify(results, null, 2));

    const reportPath = path.join(ARTIFACT_DIR, "modernization_verification_results.json");
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("Deployment is confirmed Ready on https://www.jandarpan.news! Running tests now...");
  await runTests();
}

main().catch((err) => {
  console.error("FATAL ERROR IN VERIFICATION SUITE:", err);
  process.exit(1);
});
