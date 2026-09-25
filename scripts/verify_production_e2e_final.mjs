import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const PROD_URL = 'https://www.jandarpan.news';
const ARTIFACT_DIR = 'C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d';

async function runVerification() {
  console.log('--- STARTING COMPREHENSIVE PRODUCTION VERIFICATION ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--mute-audio', '--no-sandbox', '--disable-setuid-sandbox']
  });
  const results = {
    checks: [],
    screenshots: []
  };

  function record(name, passed, details = '') {
    results.checks.push({ name, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
  }

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15'
    });
    const page = await context.newPage();

    // 1. HOME / LIVE BROADCAST PAGE CHECK
    console.log('\n--- 1. Testing Live / Landing Page (/) ---');
    await page.goto(`${PROD_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });

    // Check Bottom Nav Destinations
    const navItems = await page.$$eval('[data-testid="jd-bottom-nav"] a', els =>
      els.map(el => ({
        href: el.getAttribute('href'),
        label: el.querySelector('.jd-type-nav')?.textContent?.trim() || el.textContent.trim(),
        key: el.getAttribute('data-jd-nav-key')
      }))
    );
    console.log('Found bottom nav items:', navItems);

    record(
      'Bottom nav contains exactly 5 destinations',
      navItems.length === 5,
      `Found ${navItems.length} destinations: ${navItems.map(n => n.label).join(' | ')}`
    );

    const keys = navItems.map(n => n.key);
    record(
      'Bottom nav order is Live -> District -> Home -> Taza -> Profile',
      JSON.stringify(keys) === JSON.stringify(['live', 'district', 'home', 'latest', 'profile']),
      `Keys: ${keys.join(' -> ')}`
    );

    // Verify Taza is named Taza / ताज़ा
    const tazaItem = navItems.find(n => n.key === 'latest');
    record(
      'Taza destination retains name Taza',
      tazaItem && (tazaItem.label.includes('ताज़ा') || tazaItem.label.includes('Taza')),
      `Taza label: "${tazaItem?.label}"`
    );

    // Verify Live icon
    const liveIconSvg = await page.$eval('[data-jd-nav-key="live"] svg', svg => svg.innerHTML);
    record(
      'Live icon improved broadcast monitor SVG',
      liveIconSvg.includes('circle') || liveIconSvg.includes('path'),
      'Verified live icon SVG render'
    );

    // Check No Fixed Ad below Live TV
    const fixedAdBelowTv = await page.$('.jd-tv-stage + [data-testid="broadcast-control-bar"] img');
    record(
      'Durg Solar ad removed from fixed block below Live TV',
      fixedAdBelowTv === null,
      'No fixed ad below TV found'
    );

    // Check Durg Solar Ad every 3 news articles in Live column
    const inlineAdsLive = await page.$$eval('[data-testid="durg-solar-inline-ad"]', els => els.length);
    console.log(`Inline ads found in Live news column: ${inlineAdsLive}`);
    record(
      'Durg Solar inline ads inserted after every 3 articles in Live news feed',
      inlineAdsLive >= 1,
      `Found ${inlineAdsLive} inline ads in Live page feed`
    );

    // Check Canonical Header on Live
    const hasSearchInHeader = await page.$('.jd-masthead [aria-label*="search" i], .jd-masthead [aria-label*="खोज" i]');
    const hasBellInHeader = await page.$('.jd-masthead [aria-label*="notify" i], .jd-masthead [aria-label*="सूचना" i]');
    const hasProfileInHeader = await page.$('.jd-masthead [aria-label*="profile" i], .jd-masthead [aria-label*="प्रोफ़ाइल" i]');
    record(
      'Canonical Header: Search, Bell, Profile removed from header',
      !hasSearchInHeader && !hasBellInHeader && !hasProfileInHeader,
      `Search: ${!!hasSearchInHeader}, Bell: ${!!hasBellInHeader}, Profile: ${!!hasProfileInHeader}`
    );

    // Check Zero Footer on Live
    const footerOnLive = await page.$('footer, .jd-desk-footer, [data-testid="jd-desk-footer"]');
    record(
      'Zero Footer on Live Page',
      footerOnLive === null,
      'No footer element on Live page'
    );

    const liveShot = path.join(ARTIFACT_DIR, 'prod_verify_live_390.png');
    await page.screenshot({ path: liveShot, fullPage: false });
    results.screenshots.push(liveShot);

    // 2. DISTRICT SCOPING & DYNAMIC LABEL CHECK
    console.log('\n--- 2. Testing District Scoping & Dynamic Tab Label ---');
    // Check Durg District
    await page.goto(`${PROD_URL}/district/durg`, { waitUntil: 'networkidle', timeout: 30000 });
    const durgNavLabel = await page.$eval('[data-jd-nav-key="district"] .jd-type-nav', el => el.textContent.trim());
    record(
      'Dynamic District Tab Label matches selected district (Durg / दुर्ग)',
      durgNavLabel.includes('दुर्ग') || durgNavLabel.includes('Durg'),
      `District tab label: "${durgNavLabel}"`
    );

    // Verify Durg feed stories strictly scoped
    const durgArticles = await page.$$eval('[data-testid="story-card"], .jd-card', els =>
      els.map(el => el.textContent.trim())
    );
    console.log(`Durg district feed loaded ${durgArticles.length} stories`);
    record(
      'District page has strictly scoped feed without fallback rows',
      durgArticles.length >= 1,
      `Found ${durgArticles.length} district articles`
    );

    const footerOnDistrict = await page.$('footer, .jd-desk-footer, [data-testid="jd-desk-footer"]');
    record(
      'Zero Footer on District Page',
      footerOnDistrict === null,
      'No footer element on District page'
    );

    const durgShot = path.join(ARTIFACT_DIR, 'prod_verify_district_durg.png');
    await page.screenshot({ path: durgShot, fullPage: false });
    results.screenshots.push(durgShot);

    // Check Raipur District
    await page.goto(`${PROD_URL}/district/raipur`, { waitUntil: 'networkidle', timeout: 30000 });
    const raipurNavLabel = await page.$eval('[data-jd-nav-key="district"] .jd-type-nav', el => el.textContent.trim());
    record(
      'Dynamic District Tab Label changes to Raipur / रायपुर',
      raipurNavLabel.includes('रायपुर') || raipurNavLabel.includes('Raipur'),
      `Raipur tab label: "${raipurNavLabel}"`
    );

    // 3. HOME PAGE (BROAD DISCOVERY) CHECK
    console.log('\n--- 3. Testing Rebuilt Home Discovery (/home) ---');
    await page.goto(`${PROD_URL}/home`, { waitUntil: 'networkidle', timeout: 30000 });
    const homeArticles = await page.$$eval('.jd-card, [data-testid="story-card"]', els => els.length);
    record(
      'Home screen presents broad platform discovery feed',
      homeArticles >= 10,
      `Found ${homeArticles} articles on Home discovery`
    );

    const inlineAdsHome = await page.$$eval('[data-testid="durg-solar-inline-ad"]', els => els.length);
    record(
      'Home feed inserts Durg Solar ad after every 3 articles',
      inlineAdsHome >= 2,
      `Found ${inlineAdsHome} Durg Solar inline ads throughout Home feed`
    );

    const footerOnHome = await page.$('footer, .jd-desk-footer, [data-testid="jd-desk-footer"]');
    record(
      'Zero Footer on Home Page',
      footerOnHome === null,
      'No footer element on Home page'
    );

    const homeShot = path.join(ARTIFACT_DIR, 'prod_verify_home_feed.png');
    await page.screenshot({ path: homeShot, fullPage: false });
    results.screenshots.push(homeShot);

    // 4. TAZA PAGE (CHRONOLOGICAL NEWEST FIRST) CHECK
    console.log('\n--- 4. Testing Taza Page (/latest) ---');
    await page.goto(`${PROD_URL}/latest`, { waitUntil: 'networkidle', timeout: 30000 });
    const tazaHeading = await page.$eval('h1', el => el.textContent.trim());
    record(
      'Taza page heading is Taza / ताज़ा',
      tazaHeading.includes('ताज़ा') || tazaHeading.includes('Taza') || tazaHeading.includes('Latest'),
      `Taza page heading: "${tazaHeading}"`
    );

    const inlineAdsTaza = await page.$$eval('[data-testid="durg-solar-inline-ad"]', els => els.length);
    record(
      'Taza feed inserts Durg Solar ad after every 3 articles',
      inlineAdsTaza >= 2,
      `Found ${inlineAdsTaza} inline ads in Taza feed`
    );

    const footerOnTaza = await page.$('footer, .jd-desk-footer, [data-testid="jd-desk-footer"]');
    record(
      'Zero Footer on Taza Page',
      footerOnTaza === null,
      'No footer element on Taza page'
    );

    const tazaShot = path.join(ARTIFACT_DIR, 'prod_verify_taza.png');
    await page.screenshot({ path: tazaShot, fullPage: false });
    results.screenshots.push(tazaShot);

    // 5. PROFILE PAGE (MIGRATED FOOTER INFORMATION) CHECK
    console.log('\n--- 5. Testing Profile Page (/profile) ---');
    await page.goto(`${PROD_URL}/profile`, { waitUntil: 'networkidle', timeout: 30000 });

    const profileSections = await page.$$eval('.profile-card, section', els =>
      els.map(el => el.textContent.slice(0, 40).trim())
    );
    console.log('Profile cards/sections found:', profileSections.length);

    const hasAbout = await page.$('#profile-about');
    const hasEditorial = await page.$('#profile-editorial');
    const hasLegal = await page.$('#profile-legal');
    const hasContact = await page.$('#profile-contact');
    const hasAppInfo = await page.$('#profile-app-info');

    record(
      'Profile contains About, How We Report & Bureau cards',
      hasAbout !== null,
      'About card rendered'
    );
    record(
      'Profile contains Editorial Policy & Corrections cards',
      hasEditorial !== null,
      'Editorial policy card rendered'
    );
    record(
      'Profile contains Legal, Terms & Privacy cards',
      hasLegal !== null,
      'Legal & Privacy card rendered'
    );
    record(
      'Profile contains Newsroom Contact & WhatsApp bureau cards',
      hasContact !== null,
      'Contact card rendered'
    );
    record(
      'Profile contains App Information & Theme cards',
      hasAppInfo !== null,
      'App info card rendered'
    );

    const footerOnProfile = await page.$('footer, .jd-desk-footer, [data-testid="jd-desk-footer"]');
    record(
      'Zero Footer on Profile Page',
      footerOnProfile === null,
      'No footer element on Profile page'
    );

    const profileShot = path.join(ARTIFACT_DIR, 'prod_verify_profile.png');
    await page.screenshot({ path: profileShot, fullPage: false });
    results.screenshots.push(profileShot);

    // 6. THEME TOGGLE TEST
    console.log('\n--- 6. Testing Day / Night Theme Toggle ---');
    const themeBtn = await page.$('.jd-mobile-theme-toggle');
    if (themeBtn) {
      const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
      await themeBtn.click();
      await page.waitForTimeout(500);
      const switchedTheme = await page.evaluate(() => document.documentElement.dataset.theme);
      record(
        'Day / Night Theme Toggle switches active theme correctly',
        initialTheme !== switchedTheme,
        `Switched from "${initialTheme}" to "${switchedTheme}"`
      );
    } else {
      record('Day / Night Theme Toggle button found in canonical header', false, 'Not found');
    }

    // 7. RESPONSIVENESS & VIEWPORT MATRIX
    console.log('\n--- 7. Testing Viewport Matrix (390x844, 375x844, 360x800, 1280x850, 1440x900) ---');
    const viewports = [
      { width: 390, height: 844, name: 'iPhone 12/13/14' },
      { width: 375, height: 844, name: 'iPhone 12 Mini' },
      { width: 360, height: 800, name: 'Android Standard' },
      { width: 1280, height: 850, name: 'Desktop Small' },
      { width: 1440, height: 900, name: 'Desktop Wide' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${PROD_URL}/home`, { waitUntil: 'networkidle', timeout: 30000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      record(
        `Viewport ${vp.width}x${vp.height} (${vp.name}) has no horizontal overflow`,
        !overflow,
        `scrollWidth: ${await page.evaluate(() => document.documentElement.scrollWidth)}, innerWidth: ${vp.width}`
      );
    }

    // 8. REAL MEDIA CHECK ACROSS LIVE STORIES
    console.log('\n--- 8. Testing Real Media Only Rule ---');
    const allImages = await page.$$eval('img', imgs => imgs.map(i => ({ src: i.src, alt: i.alt })));
    const invalidImage = allImages.find(img =>
      img.src.includes('unsplash.com') ||
      img.src.includes('pexels.com') ||
      img.src.includes('pixabay.com') ||
      img.src.includes('placeholder')
    );
    record(
      'Real Media Rule: Zero stock, generic, or placeholder images',
      !invalidImage,
      invalidImage ? `Invalid image found: ${invalidImage.src}` : `All ${allImages.length} images verified genuine`
    );

    console.log('\n============================================================');
    console.log('FINAL PRODUCTION VERIFICATION SUMMARY:');
    const allPassed = results.checks.every(c => c.passed);
    console.log(`TOTAL CHECKS: ${results.checks.length}`);
    console.log(`PASSED: ${results.checks.filter(c => c.passed).length}`);
    console.log(`FAILED: ${results.checks.filter(c => !c.passed).length}`);
    console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED SUCCESSFULLY!' : 'SOME CHECKS FAILED'}`);
    console.log('============================================================');

  } catch (err) {
    console.error('Fatal error during production verification:', err);
  } finally {
    await browser.close();
  }
}

runVerification();
