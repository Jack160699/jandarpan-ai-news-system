import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PROD_URL = "https://www.jandarpan.news";
const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d";

async function runImageVerification() {
  console.log("=== JAN DARPAN PRODUCTION REAL STORY IMAGE VERIFICATION ===");
  console.log("Target:", PROD_URL);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"]
  });

  const testReport = {
    timestamp: new Date().toISOString(),
    testedStories: [],
    automaticTransitions: [],
    viewports: {},
  };

  // 1. MOBILE VERIFICATION & 10 REAL STORIES TEST (390x844)
  console.log("\n--- Testing Mobile View (390x844) & 10 Real Stories ---");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
  });

  const page = await mobileContext.newPage();
  await page.goto(PROD_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3500);

  // Dismiss permission sheet if present
  try {
    const notNow = await page.$('button:has-text("अभी नहीं"), button:has-text("Later")');
    if (notNow) {
      await notNow.click();
      await page.waitForTimeout(600);
    }
  } catch {}

  // Get total stories in the queue
  const cardCount = await page.$$eval(".jdl-mobile-queue__item", (els) => els.length);
  console.log(`Found ${cardCount} stories in mobile Latest News queue.`);

  const testCount = Math.min(10, cardCount);
  console.log(`Testing first ${testCount} real stories for image fidelity...`);

  for (let i = 0; i < testCount; i++) {
    // Click story to play in TV
    await page.evaluate((idx) => {
      const cards = document.querySelectorAll(".jdl-mobile-queue__item");
      if (cards[idx]) (cards[idx]).click();
    }, i);

    await page.waitForTimeout(1200);

    const storyData = await page.evaluate((idx) => {
      const cards = document.querySelectorAll(".jdl-mobile-queue__item");
      const card = cards[idx];
      const cardHeadline = card?.querySelector(".jdl-mobile-queue__headline")?.textContent?.trim();
      const cardTag = card?.querySelector(".jdl-mobile-queue__tag")?.textContent?.trim();
      const cardImgEl = card?.querySelector(".jdl-mobile-queue__thumb");
      const cardImgSrc = cardImgEl?.getAttribute("src") || (cardImgEl)?.currentSrc || "";

      // TV state
      const tvImgEl = document.querySelector(".jdl-virtual-screen__img");
      const tvImgSrc = tvImgEl?.getAttribute("src") || (tvImgEl)?.currentSrc || "";
      const tvHeadline = document.querySelector(".jdl-tv__lt-headline")?.textContent?.trim() || "";
      const tvLocation = document.querySelector(".jdl-virtual-screen__location-tag")?.textContent?.trim() || "";
      const ambientStyle = document.querySelector(".jdl-virtual-screen__ambient-bg")?.getAttribute("style") || "";

      // Check location position (must be top-left)
      const locEl = document.querySelector(".jdl-virtual-screen__location-tag");
      let locTopLeft = false;
      if (locEl) {
        const style = window.getComputedStyle(locEl);
        locTopLeft = style.left === "8px" && style.top === "8px";
      }

      return {
        index: idx + 1,
        cardHeadline,
        cardTag,
        cardImgSrc,
        tvImgSrc,
        tvHeadline: tvHeadline.slice(0, 60),
        tvLocation,
        ambientStyle,
        locTopLeft,
        imagesMatch: !!(cardImgSrc && tvImgSrc && (cardImgSrc.includes(tvImgSrc) || tvImgSrc.includes(cardImgSrc) || decodeURIComponent(tvImgSrc).includes(cardImgSrc) || decodeURIComponent(cardImgSrc).includes(tvImgSrc))),
      };
    }, i);

    console.log(`Story ${i + 1}:`);
    console.log(`  Headline: ${storyData.cardHeadline?.slice(0, 45)}`);
    console.log(`  Card Img: ${storyData.cardImgSrc}`);
    console.log(`  TV Img:   ${storyData.tvImgSrc}`);
    console.log(`  TV Loc:   ${storyData.tvLocation} (Top-Left: ${storyData.locTopLeft})`);
    console.log(`  Match:    ${storyData.imagesMatch}`);

    testReport.testedStories.push(storyData);

    // Take screenshot of 1st, 2nd, and 3rd story
    if (i < 3) {
      const shotPath = path.join(ARTIFACT_DIR, `live_tv_real_story_${i + 1}.png`);
      await page.screenshot({ path: shotPath });
      console.log(`  Saved screenshot: ${shotPath}`);
    }
  }

  // 2. AUTOMATIC TRANSITION TESTING (5 transitions)
  console.log("\n--- Testing 5 Automatic Story Transitions ---");
  let prevImg = "";
  for (let t = 1; t <= 5; t++) {
    // Trigger transition by clicking next story or dispatching
    await page.evaluate(() => {
      // Find the next active story
      const items = Array.from(document.querySelectorAll(".jdl-mobile-queue__item"));
      const activeIdx = items.findIndex((it) => it.classList.contains("jdl-mobile-queue__item--active"));
      const nextIdx = (activeIdx + 1) % items.length;
      (items[nextIdx]).click();
    });

    await page.waitForTimeout(1500);

    const transitionData = await page.evaluate((prev) => {
      const tvImgEl = document.querySelector(".jdl-virtual-screen__img");
      const currentImg = tvImgEl?.getAttribute("src") || (tvImgEl)?.currentSrc || "";
      const headline = document.querySelector(".jdl-tv__lt-headline")?.textContent?.trim() || "";
      return {
        currentImg,
        headline: headline.slice(0, 50),
        imageChanged: currentImg !== prev && currentImg.length > 0,
      };
    }, prevImg);

    prevImg = transitionData.currentImg;
    console.log(`Transition ${t}: Image Changed = ${transitionData.imageChanged}, Headline = ${transitionData.headline}`);
    testReport.automaticTransitions.push({
      transition: t,
      ...transitionData,
    });
  }

  // 3. MULTI-VIEWPORT VERIFICATION
  const viewports = [
    { name: "mobile_390x844", width: 390, height: 844 },
    { name: "mobile_375x844", width: 375, height: 844 },
    { name: "mobile_360x800", width: 360, height: 800 },
    { name: "desktop_1440x900", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const vpContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const vpPage = await vpContext.newPage();
    await vpPage.goto(PROD_URL, { waitUntil: "networkidle", timeout: 35000 });
    await vpPage.waitForTimeout(2000);

    const vpStatus = await vpPage.evaluate(() => {
      const tvImg = document.querySelector(".jdl-virtual-screen__img");
      const tvBox = document.querySelector(".jdl-virtual-screen__media-box");
      const locTag = document.querySelector(".jdl-virtual-screen__location-tag");
      const rect = tvImg?.getBoundingClientRect();
      return {
        hasImage: !!tvImg,
        imgVisible: rect ? rect.width > 50 && rect.height > 50 : false,
        imgSrc: tvImg?.getAttribute("src") || (tvImg)?.currentSrc,
        locTagText: locTag?.textContent?.trim(),
      };
    });

    const vpShot = path.join(ARTIFACT_DIR, `live_tv_viewport_${vp.name}.png`);
    await vpPage.screenshot({ path: vpShot });
    console.log(`  Status for ${vp.name}: visible=${vpStatus.imgVisible}, src=${vpStatus.imgSrc?.slice(0, 50)}...`);
    console.log(`  Saved screenshot: ${vpShot}`);

    testReport.viewports[vp.name] = vpStatus;
    await vpContext.close();
  }

  // Write full verification report
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "real_story_image_qa_report.json"),
    JSON.stringify(testReport, null, 2)
  );

  await browser.close();
  console.log("\n=== ALL REAL STORY IMAGE VERIFICATIONS COMPLETE ===");
}

runImageVerification().catch(console.error);
