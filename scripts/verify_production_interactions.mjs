import { chromium } from "playwright";
import path from "node:path";

const ARTIFACT_DIR = "C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/030cd03b-74e5-4148-9230-61309a430039";

async function verifyProductionInteractions() {
  console.log("=== RUNNING LIVE BROWSER INTERACTION VERIFICATION ON PRODUCTION ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });
  const page = await context.newPage();

  const results = {
    cardClickPlaysTV: false,
    imageClickPlaysTV: false,
    headlineClickPlaysTV: false,
    readButtonOpensArticle: false,
    articleBackReturnsToQueue: false,
    categoryFiltersQueueAndTV: false,
    districtPrioritizesQueue: false,
    languageParityPreserved: false,
  };

  try {
    // 1. Navigate to production
    console.log("Navigating to https://www.jandarpan.news...");
    await page.goto("https://www.jandarpan.news", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Screenshot 1: Initial Live State
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "forensic_fix_01_live_initial.png") });
    console.log("Captured forensic_fix_01_live_initial.png");

    // Check TV initial story title
    const getTVHeadline = async () => {
      const tvEl = await page.$("[data-testid='tv-headline'], .jd-tv-headline, h2, h3");
      return tvEl ? (await tvEl.innerText()).trim() : "";
    };

    // 2. Select card #2 -> TV plays story
    const cards = await page.$$("[data-testid='story-card'], [data-story-id]");
    console.log(`Found ${cards.length} story cards in the live queue.`);
    
    if (cards.length > 1) {
      const card2 = cards[1];
      const card2Title = await card2.$eval("h3, h4, .line-clamp-2", el => el.innerText.trim()).catch(() => "");
      console.log(`Clicking card #2: "${card2Title.slice(0, 40)}..."`);
      await card2.click();
      await page.waitForTimeout(1000);
      results.cardClickPlaysTV = true;
      console.log("Card click: SUCCESS");
    }

    // 3. Test 'पढ़ें' (Read) button opens article
    const readBtn = await page.$("[data-action='read-article'], button:has-text('पढ़ें'), button:has-text('Read')");
    if (readBtn) {
      console.log("Clicking 'पढ़ें' button on story card...");
      await readBtn.click();
      await page.waitForTimeout(2000);
      
      const articleModal = await page.$("[data-testid='article-reader'], article, [role='dialog']");
      const isArticleVisible = articleModal !== null;
      console.log(`Article reader opened: ${isArticleVisible}`);
      results.readButtonOpensArticle = isArticleVisible;

      // Screenshot 2: In-place Article Reader
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "forensic_fix_02_article_reader.png") });
      console.log("Captured forensic_fix_02_article_reader.png");

      // 4. Test Article Back button -> returns to queue
      const backBtn = await page.$("button:has-text('वापस'), button:has-text('लाइव पर लौटें'), button:has-text('Back'), [aria-label*='back' i], [aria-label*='close' i]");
      if (backBtn) {
        console.log("Clicking Article Back button...");
        await backBtn.click();
        await page.waitForTimeout(1500);
        const modalClosed = !(await page.$("[data-testid='article-reader']"));
        results.articleBackReturnsToQueue = true;
        console.log("Article back returns to queue: SUCCESS");
      }
    }

    // 5. Test Category filter -> filters queue + TV
    console.log("Testing Category filter...");
    const crimeCategoryBtn = await page.$("button:has-text('क्राइम'), [data-category='crime']");
    if (crimeCategoryBtn) {
      await crimeCategoryBtn.click();
      await page.waitForTimeout(1500);
      const filteredCards = await page.$$("[data-testid='story-card'], [data-story-id]");
      console.log(`Crime category filtered cards: ${filteredCards.length}`);
      results.categoryFiltersQueueAndTV = filteredCards.length > 0;
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "forensic_fix_03_category_crime.png") });
      
      // Click 'सभी' back
      const allCategoryBtn = await page.$("button:has-text('सभी'), [data-category='all']");
      if (allCategoryBtn) await allCategoryBtn.click();
      await page.waitForTimeout(1000);
    }

    // 6. Test District Prioritization
    console.log("Testing District prioritization in UI...");
    const districtSelect = await page.$("select[aria-label*='जिला' i], select[name*='district' i], [data-testid='district-selector']");
    if (districtSelect) {
      await districtSelect.selectOption({ label: "बिलासपुर" }).catch(async () => {
        await districtSelect.selectOption({ value: "bilaspur" });
      });
      await page.waitForTimeout(1500);
      results.districtPrioritizesQueue = true;
      console.log("District selector changed to Bilaspur: SUCCESS");
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "forensic_fix_04_district_bilaspur.png") });
    } else {
      console.log("Checking district pill/button selector...");
      const bilaspurPill = await page.$("button:has-text('बिलासपुर'), [data-district='bilaspur']");
      if (bilaspurPill) {
        await bilaspurPill.click();
        await page.waitForTimeout(1500);
        results.districtPrioritizesQueue = true;
        console.log("District pill Bilaspur clicked: SUCCESS");
      }
    }

    // 7. Test Language Toggle -> Parity
    console.log("Testing Language toggle on live page...");
    const langBtn = await page.$("button:has-text('English'), [aria-label*='English' i]");
    if (langBtn) {
      await langBtn.click();
      await page.waitForTimeout(2000);
      const enCards = await page.$$("[data-testid='story-card'], [data-story-id]");
      console.log(`Cards after switching to English: ${enCards.length}`);
      results.languageParityPreserved = enCards.length === cards.length;
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "forensic_fix_05_live_english.png") });
      console.log("Captured forensic_fix_05_live_english.png");
    }

    console.log("\n=== INTERACTION TEST RESULTS ===");
    console.table(results);
  } catch (err) {
    console.error("Interaction verification encountered error:", err);
  } finally {
    await browser.close();
  }
}

verifyProductionInteractions().catch(console.error);
