import { chromium } from "playwright";
import path from "path";

const ARTIFACTS_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/50e7bc10-7e9a-4ba6-af91-1935a0e83997";
const executablePath = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe";

async function capture() {
  const browser = await chromium.launch({ executablePath, headless: true });
  const articleUrl = "https://www.jandarpan.news/story/security-forces-recover-ak-47-live-rounds-naxal-dump-bij-b07c76bf";

  console.log("1. Desktop 1440px Homepage...");
  const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctxDesktop.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } catch {}
  });
  const p1 = await ctxDesktop.newPage();
  await p1.goto("https://www.jandarpan.news/", { waitUntil: "networkidle" });
  await p1.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await p1.waitForTimeout(500);
  await p1.screenshot({ path: path.join(ARTIFACTS_DIR, "post-01-home-desktop.png"), fullPage: false });

  // Scroll to show section dividers (Mera Jila, Chhattisgarh, Bharat, World, etc.)
  await p1.evaluate(() => {
    window.scrollBy(0, 1150);
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await p1.waitForTimeout(500);
  await p1.screenshot({ path: path.join(ARTIFACTS_DIR, "post-01b-home-sections-desktop.png"), fullPage: false });
  await ctxDesktop.close();

  // 2. Mobile 375px Homepage
  console.log("2. Mobile 375px Homepage...");
  const ctxMobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  });
  await ctxMobile.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } catch {}
  });
  const p2 = await ctxMobile.newPage();
  await p2.goto("https://www.jandarpan.news/", { waitUntil: "networkidle" });
  await p2.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await p2.waitForTimeout(500);
  await p2.screenshot({ path: path.join(ARTIFACTS_DIR, "post-02-home-mobile.png"), fullPage: false });

  // Scroll to show IMAGE LEFT, HEADLINE RIGHT card orientation on mobile
  await p2.evaluate(() => {
    window.scrollBy(0, 850);
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await p2.waitForTimeout(500);
  await p2.screenshot({ path: path.join(ARTIFACTS_DIR, "post-02b-home-mobile-cards.png"), fullPage: false });
  await ctxMobile.close();

  // 3. Desktop Article Page
  console.log("3. Desktop Article Page...");
  const ctxArticleDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctxArticleDesktop.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } catch {}
  });
  const p3 = await ctxArticleDesktop.newPage();
  await p3.goto(articleUrl, { waitUntil: "networkidle" });
  await p3.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await p3.waitForTimeout(500);
  await p3.screenshot({ path: path.join(ARTIFACTS_DIR, "post-03-article-desktop.png"), fullPage: false });

  // Scroll to actions (WhatsApp, Share, Listen)
  await p3.evaluate(() => {
    window.scrollBy(0, 500);
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await p3.waitForTimeout(500);
  await p3.screenshot({ path: path.join(ARTIFACTS_DIR, "post-03b-article-actions-desktop.png"), fullPage: false });
  await ctxArticleDesktop.close();

  // 4. Mobile Article Page
  console.log("4. Mobile Article Page...");
  const ctxArticleMobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  });
  await ctxArticleMobile.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } catch {}
  });
  const p4 = await ctxArticleMobile.newPage();
  await p4.goto(articleUrl, { waitUntil: "networkidle" });
  await p4.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await p4.waitForTimeout(500);
  await p4.screenshot({ path: path.join(ARTIFACTS_DIR, "post-04-article-mobile.png"), fullPage: false });

  // Scroll to mobile actions
  await p4.evaluate(() => {
    window.scrollBy(0, 450);
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await p4.waitForTimeout(500);
  await p4.screenshot({ path: path.join(ARTIFACTS_DIR, "post-04b-article-mobile-actions.png"), fullPage: false });
  await ctxArticleMobile.close();

  // 5. Desktop Durg District Page
  console.log("5. Desktop Durg District Page...");
  const ctxDurg = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctxDurg.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } catch {}
  });
  const p5 = await ctxDurg.newPage();
  await p5.goto("https://www.jandarpan.news/district/durg", { waitUntil: "networkidle" });
  await p5.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await p5.waitForTimeout(500);
  await p5.screenshot({ path: path.join(ARTIFACTS_DIR, "post-05-durg-desktop.png"), fullPage: false });
  await ctxDurg.close();

  // 6. Desktop Bharat (National) Page
  console.log("6. Desktop Bharat Page...");
  const ctxBharat = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctxBharat.addInitScript(() => {
    try {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    } catch {}
  });
  const p6 = await ctxBharat.newPage();
  await p6.goto("https://www.jandarpan.news/news/national", { waitUntil: "networkidle" });
  await p6.evaluate(() => {
    document.querySelectorAll('[role="dialog"]').forEach((d) => d.remove());
  });
  await p6.waitForTimeout(500);
  await p6.screenshot({ path: path.join(ARTIFACTS_DIR, "post-06-bharat-desktop.png"), fullPage: false });
  await ctxBharat.close();

  console.log("All post-optimization screenshots successfully captured!");
  await browser.close();
}

capture().catch(console.error);
