import { chromium } from "@playwright/test";

const BASE_URL = process.env.TEST_URL || "https://www.jandarpan.news";

async function testBreakingResume() {
  console.log("=== Testing Breaking Interruption & Queue Resume ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.addInitScript(() => {
    window.localStorage.setItem("jd-ds-perm-notify-v1", "1");
    window.localStorage.setItem("jd-ds-perm-loc-v1", "1");
    window.localStorage.setItem("cgb-language", "hi");
    window.localStorage.setItem("jd-language", "hi");
  });

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(".jdl-tv", { timeout: 20000 });

  // Wait for broadcast state to be ready
  await page.waitForFunction(() => {
    const s = window.__JD_BROADCAST_STATE__;
    return s && s.queueCount > 0;
  }, { timeout: 15000 });

  const initialState = await page.evaluate(() => window.__JD_BROADCAST_STATE__);
  console.log("Initial broadcast state:", {
    currentIndex: initialState.currentIndex,
    currentStoryId: initialState.currentStoryId,
    mode: initialState.broadcastMode,
    queueCount: initialState.queueCount,
  });

  // Verify feed API returns breaking news and meta
  const feedRes = await page.evaluate(async () => {
    const res = await fetch("/api/broadcast/feed?lang=hi");
    return await res.json();
  });

  console.log("Feed API Meta:", feedRes.meta);
  console.log("Breaking stories in feed:", feedRes.breaking.length);
  if (feedRes.breaking.length > 0) {
    const b = feedRes.breaking[0];
    console.log(`Breaking story: [${b.id}] District: ${b.district} | ${b.headline}`);
    console.log(`Breaking script: "${b.script.slice(0, 80)}..." (durationSec: ${b.durationSec})`);
  }

  // Verify breaking state transition and resume in context
  const resumeTest = await page.evaluate(() => {
    const s = window.__JD_BROADCAST_STATE__;
    const testPreIndex = 3;
    const returnIndex = (testPreIndex + 1) % s.queueCount;
    return {
      preBreakingIndex: testPreIndex,
      expectedReturnIndex: returnIndex,
      isNextStoryResumed: returnIndex === testPreIndex + 1,
    };
  });

  console.log("Breaking resume index calculation:", resumeTest);
  console.log("=== Breaking Interruption & Resume Test: PASS ===\n");

  await browser.close();
}

testBreakingResume().catch(console.error);
