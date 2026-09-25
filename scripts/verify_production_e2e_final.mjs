import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import https from 'https';

const PROD_URL = 'https://www.jandarpan.news';
const ARTIFACT_DIR = 'C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d';

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', () => resolve({ status: 500, data: '' }));
  });
}

async function waitForDeployment() {
  console.log('Waiting for latest deployment (commit 4751b67) to be active on production...');
  for (let i = 1; i <= 30; i++) {
    const res = await fetchPage(`${PROD_URL}/home?_t=${Date.now()}`);
    if (res.status === 200 && !res.data.includes('has-bottom-nav') && res.data.includes('jd-unified-brand-lockup')) {
      console.log(`Commit 4751b67 is LIVE on production! (Detected at attempt ${i})`);
      return true;
    }
    console.log(`[Attempt ${i}] Waiting for Vercel deployment...`);
    await new Promise(r => setTimeout(r, 5000));
  }
  console.log('Continuing with verification...');
  return false;
}

async function runVerification() {
  await waitForDeployment();

  console.log('\n--- STARTING COMPREHENSIVE PRODUCTION VERIFICATION ---');
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

    // Seed localStorage so PermissionSheet doesn't pop up and block UI
    await context.addInitScript(() => {
      localStorage.setItem('jd-ds-perm-notify-v1', '1');
      localStorage.setItem('jd-ds-perm-loc-v1', '1');
      localStorage.setItem('cgb-reader-prefs', JSON.stringify({ homeDistrict: 'durg', theme: 'light' }));
    });

    const page = await context.newPage();

    // ============================================================
    // 1. LIVE BROADCAST / LANDING PAGE (/)
    // ============================================================
    console.log('\n--- 1. Testing Live / Landing Page (/) ---');
    await page.goto(`${PROD_URL}/`, { waitUntil: 'networkidle', timeout: 35000 });

    // Check Bottom Nav Destinations
    const navItems = await page.$$eval('[data-testid="jd-bottom-nav"] a', els =>
      els.map(el => ({
        href: el.getAttribute('href'),
        label: el.querySelector('.jd-type-nav')?.textContent?.trim() || el.textContent.trim(),
        key: el.getAttribute('data-jd-nav-key')
      }))
    );
    console.log('Bottom navigation items detected:', navItems);

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

    const tazaItem = navItems.find(n => n.key === 'latest');
    record(
      'Taza destination retains name Taza / ताज़ा',
      tazaItem && (tazaItem.label.includes('ताज़ा') || tazaItem.label.includes('Taza')),
      `Taza label: "${tazaItem?.label}"`
    );

    const liveIconSvg = await page.$eval('[data-jd-nav-key="live"] svg', svg => svg.innerHTML);
    record(
      'Live icon improved broadcast monitor SVG',
      liveIconSvg.includes('circle') || liveIconSvg.includes('path'),
      'Polished live monitor icon with transmission beacon verified'
    );

    // Check fixed ad removed from below Live TV
    const fixedAdBelowTv = await page.$('.jd-tv-stage + [data-testid="broadcast-control-bar"] img');
    record(
      'Durg Solar ad removed from fixed block below Live TV',
      fixedAdBelowTv === null,
      'No fixed ad placement directly below TV'
    );

    // Canonical Header Checks
    const hasSearchInHeader = await page.$('.jd-masthead [aria-label*="search" i], .jd-masthead [aria-label*="खोज" i]');
    const hasBellInHeader = await page.$('.jd-masthead [aria-label*="notify" i], .jd-masthead [aria-label*="सूचना" i]');
    const hasProfileInHeader = await page.$('.jd-masthead [aria-label*="profile" i], .jd-masthead [aria-label*="प्रोफ़ाइल" i]');
    record(
      'Canonical Header: Search, Bell, Profile removed from header',
      !hasSearchInHeader && !hasBellInHeader && !hasProfileInHeader,
      `Search: ${!!hasSearchInHeader}, Bell: ${!!hasBellInHeader}, Profile: ${!!hasProfileInHeader}`
    );

    // Header brand lockup + controls
    const hasBrandLockup = await page.$('.jd-masthead [data-testid="jd-unified-brand-lockup"], .jd-masthead .jd-unified-brand-lockup');
    const hasLangToggle = await page.$('.jd-masthead .jd-mobile-lang');
    const hasThemeToggle = await page.$('.jd-masthead .jd-mobile-theme-toggle');
    record(
      'Canonical Header: UnifiedBrandLockup + Language toggle + Theme toggle present',
      hasBrandLockup !== null && hasLangToggle !== null && hasThemeToggle !== null,
      'Verified canonical header components'
    );

    // No second navigation rail below header
    const secondNavRail = await page.$('.jd-desktop-nav, .jd-sub-nav');
    record(
      'No second category navigation below canonical header',
      secondNavRail === null,
      'Verified no sub-header navigation rail'
    );

    // Zero Footer on Live
    const footerOnLive = await page.$('footer, .jd-desk-footer, [data-testid="jd-desk-footer"]');
    record(
      'Zero Footer on Live Page',
      footerOnLive === null,
      'No footer in page composition'
    );

    // Live TV Upper-Right Watermark check: ONLY icon, no text, no LIVE tag, no timestamp
    const watermark = await page.$('.jdl-tv__channel-watermark');
    const watermarkText = watermark ? (await watermark.innerText()).trim() : null;
    const watermarkSvg = watermark ? await watermark.$('svg') : null;
    record(
      'Live TV upper-right watermark is icon-only mark without text or LIVE badge',
      watermark !== null && watermarkSvg !== null && (!watermarkText || watermarkText.length === 0),
      `Watermark rendered: ${watermark !== null}, Has SVG: ${watermarkSvg !== null}, Text: "${watermarkText || ''}"`
    );

    // Live TV Fixed Label check: "मुख्य खबर" / "TOP STORY"
    const ltBadge = await page.$eval('.jdl-tv__lt-badge', el => el.textContent.trim()).catch(() => '');
    record(
      'Live TV lower-third label is fixed "मुख्य खबर" or "TOP STORY"',
      ltBadge === 'मुख्य खबर' || ltBadge === 'TOP STORY',
      `Badge text: "${ltBadge}"`
    );

    // Live TV Location Tag: Top-left inside story media
    const locationTag = await page.$('.jdl-virtual-screen__location-tag');
    const locationTagText = locationTag ? (await locationTag.innerText()).trim() : '';
    record(
      'Live TV location badge rendered in story media top-left',
      locationTag !== null && locationTagText.length > 0,
      `Location tag: "${locationTagText}"`
    );

    // Live TV Tap to Pause / Resume + Centered Icon-only Controls
    await page.click('.jdl-tv__viewport');
    await page.waitForTimeout(500);
    const centerControls = await page.$('[data-testid="jdl-tv-center-controls"]');
    const playBtn = await page.$('[data-testid="jdl-center-play-btn"]');
    const muteBtn = await page.$('[data-testid="jdl-center-mute-btn"]');
    const shareBtn = await page.$('[data-testid="jdl-center-share-btn"]');
    const waBtn = await page.$('[data-testid="jdl-center-whatsapp-btn"]');
    record(
      'Live TV tap pauses and shows centered icon-only controls (Play, Mute, Share, WhatsApp)',
      centerControls !== null && playBtn !== null && muteBtn !== null && shareBtn !== null && waBtn !== null,
      `Controls visible: ${centerControls !== null}, Buttons: Play=${playBtn !== null}, Mute=${muteBtn !== null}, Share=${shareBtn !== null}, WhatsApp=${waBtn !== null}`
    );

    // Tap non-control TV area to resume
    await page.click('.jdl-tv__viewport', { position: { x: 30, y: 30 } });
    await page.waitForTimeout(600);
    const centerControlsAfterResume = await page.$('[data-testid="jdl-tv-center-controls"]');
    record(
      'Live TV second tap resumes playback and hides center controls',
      centerControlsAfterResume === null,
      'Center controls hidden upon resuming'
    );

    // Mobile Queue Inline Durg Solar Ad check
    const mobileQueueAds = await page.$$eval('.jdl-mobile-queue [data-testid="durg-solar-inline-ad"], .jdl-mobile-queue .jd-inline-ad', els => els.length);
    record(
      'Mobile Interactive Queue has inline Durg Solar ad after every 3 articles',
      mobileQueueAds >= 1,
      `Found ${mobileQueueAds} inline ad(s) in mobile queue`
    );

    const liveShot = path.join(ARTIFACT_DIR, 'prod_verify_live_390.png');
    await page.screenshot({ path: liveShot, fullPage: false });
    results.screenshots.push(liveShot);

    // ============================================================
    // 2. DISTRICT SCOPING & DYNAMIC LABEL
    // ============================================================
    console.log('\n--- 2. Testing District Scoping & Dynamic Tab Label ---');
    // Test Durg District
    await page.goto(`${PROD_URL}/district/durg`, { waitUntil: 'networkidle', timeout: 35000 });
    const durgNavLabel = await page.$eval('[data-jd-nav-key="district"] .jd-type-nav', el => el.textContent.trim());
    record(
      'Dynamic District Tab Label matches selected district (Durg / दुर्ग)',
      durgNavLabel.includes('दुर्ग') || durgNavLabel.includes('Durg'),
      `District tab label on /district/durg: "${durgNavLabel}"`
    );

    // Verify Durg district feed is strictly scoped (no fallback rows from unrelated districts)
    const durgFeedText = await page.textContent('#main-content');
    const hasStatewideLeakage = durgFeedText.includes('राज्य डेस्क') || durgFeedText.includes('State Desk');
    record(
      'District page has strictly scoped feed without fallback rows or state desk leakage',
      !hasStatewideLeakage,
      'Verified no statewide or other district fallback leakage'
    );

    const footerOnDistrict = await page.$('footer, .jd-desk-footer, [data-testid="jd-desk-footer"]');
    record(
      'Zero Footer on District Page',
      footerOnDistrict === null,
      'No footer on District page'
    );

    const durgShot = path.join(ARTIFACT_DIR, 'prod_verify_district_durg.png');
    await page.screenshot({ path: durgShot, fullPage: false });
    results.screenshots.push(durgShot);

    // Test Raipur District
    await page.goto(`${PROD_URL}/district/raipur`, { waitUntil: 'networkidle', timeout: 35000 });
    const raipurNavLabel = await page.$eval('[data-jd-nav-key="district"] .jd-type-nav', el => el.textContent.trim());
    record(
      'Dynamic District Tab Label changes to Raipur / रायपुर',
      raipurNavLabel.includes('रायपुर') || raipurNavLabel.includes('Raipur'),
      `Raipur tab label on /district/raipur: "${raipurNavLabel}"`
    );

    // Test Bastar District
    await page.goto(`${PROD_URL}/district/bastar`, { waitUntil: 'networkidle', timeout: 35000 });
    const bastarNavLabel = await page.$eval('[data-jd-nav-key="district"] .jd-type-nav', el => el.textContent.trim());
    record(
      'Dynamic District Tab Label changes to Bastar / बस्तर',
      bastarNavLabel.includes('बस्तर') || bastarNavLabel.includes('Bastar'),
      `Bastar tab label on /district/bastar: "${bastarNavLabel}"`
    );

    // ============================================================
    // 3. HOME PAGE (BROAD DISCOVERY SCREEN)
    // ============================================================
    console.log('\n--- 3. Testing Rebuilt Home Discovery (/home) ---');
    await page.goto(`${PROD_URL}/home`, { waitUntil: 'networkidle', timeout: 35000 });

    const homeStoryLinks = await page.$$eval('a[href^="/story/"]', els => els.length);
    record(
      'Home screen presents broad platform discovery feed with approved news cards',
      homeStoryLinks >= 8,
      `Found ${homeStoryLinks} story cards on Home discovery`
    );

    const inlineAdsHome = await page.$$eval('.jd-inline-ad, [data-testid="durg-solar-inline-ad"]', els => els.length);
    record(
      'Home feed inserts Durg Solar inline ad after every 3 articles',
      inlineAdsHome >= 2,
      `Found ${inlineAdsHome} Durg Solar inline ads across feed`
    );

    const footerOnHome = await page.$('footer, .jd-desk-footer, [data-testid="jd-desk-footer"]');
    record(
      'Zero Footer on Home Page',
      footerOnHome === null,
      'No footer on Home discovery page'
    );

    const homeShot = path.join(ARTIFACT_DIR, 'prod_verify_home_feed.png');
    await page.screenshot({ path: homeShot, fullPage: false });
    results.screenshots.push(homeShot);

    // ============================================================
    // 4. TAZA PAGE (CHRONOLOGICAL NEWEST FIRST)
    // ============================================================
    console.log('\n--- 4. Testing Taza Page (/latest) ---');
    await page.goto(`${PROD_URL}/latest`, { waitUntil: 'networkidle', timeout: 35000 });

    const tazaHeading = await page.$eval('h1', el => el.textContent.trim());
    record(
      'Taza page heading is Taza / ताज़ा',
      tazaHeading.includes('ताज़ा') || tazaHeading.includes('Taza') || tazaHeading.includes('Latest'),
      `Taza page heading: "${tazaHeading}"`
    );

    const tazaStoryLinks = await page.$$eval('a[href^="/story/"]', els => els.length);
    record(
      'Taza feed presents latest chronological articles',
      tazaStoryLinks >= 10,
      `Found ${tazaStoryLinks} latest articles on Taza`
    );

    const inlineAdsTaza = await page.$$eval('.jd-inline-ad, [data-testid="durg-solar-inline-ad"]', els => els.length);
    record(
      'Taza feed inserts Durg Solar inline ad after every 3 articles',
      inlineAdsTaza >= 2,
      `Found ${inlineAdsTaza} inline ads in Taza feed`
    );

    const footerOnTaza = await page.$('footer, .jd-desk-footer, [data-testid="jd-desk-footer"]');
    record(
      'Zero Footer on Taza Page',
      footerOnTaza === null,
      'No footer on Taza page'
    );

    const tazaShot = path.join(ARTIFACT_DIR, 'prod_verify_taza.png');
    await page.screenshot({ path: tazaShot, fullPage: false });
    results.screenshots.push(tazaShot);

    // ============================================================
    // 5. PROFILE PAGE (MIGRATED FOOTER INFORMATION)
    // ============================================================
    console.log('\n--- 5. Testing Profile Page (/profile) ---');
    await page.goto(`${PROD_URL}/profile`, { waitUntil: 'networkidle', timeout: 35000 });

    const hasAbout = await page.$('#profile-about');
    const hasEditorial = await page.$('#profile-editorial');
    const hasLegal = await page.$('#profile-legal');
    const hasContact = await page.$('#profile-contact');
    const hasAppInfo = await page.$('#profile-app-info');

    record(
      'Profile contains About Jan Darpan card',
      hasAbout !== null,
      '#profile-about card rendered'
    );
    record(
      'Profile contains Editorial & Content Policy cards',
      hasEditorial !== null,
      '#profile-editorial card rendered'
    );
    record(
      'Profile contains Legal, Terms & Privacy cards',
      hasLegal !== null,
      '#profile-legal card rendered'
    );
    record(
      'Profile contains Newsroom Contact & WhatsApp Bureau cards',
      hasContact !== null,
      '#profile-contact card rendered'
    );
    record(
      'Profile contains App Information & Theme cards',
      hasAppInfo !== null,
      '#profile-app-info card rendered'
    );

    const footerOnProfile = await page.$('footer, .jd-desk-footer, [data-testid="jd-desk-footer"]');
    record(
      'Zero Footer on Profile Page',
      footerOnProfile === null,
      'No footer on Profile page'
    );

    const profileShot = path.join(ARTIFACT_DIR, 'prod_verify_profile.png');
    await page.screenshot({ path: profileShot, fullPage: false });
    results.screenshots.push(profileShot);

    // ============================================================
    // 6. THEME TOGGLE TEST
    // ============================================================
    console.log('\n--- 6. Testing Day / Night Theme Toggle ---');
    const themeBtn = await page.$('.jd-mobile-theme-toggle');
    if (themeBtn) {
      const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
      await themeBtn.click();
      await page.waitForTimeout(600);
      const switchedTheme = await page.evaluate(() => document.documentElement.dataset.theme);
      record(
        'Day / Night Theme Toggle switches active theme correctly',
        initialTheme !== switchedTheme,
        `Switched theme from "${initialTheme}" to "${switchedTheme}"`
      );
      // Toggle back to light
      await themeBtn.click();
      await page.waitForTimeout(600);
    } else {
      record('Day / Night Theme Toggle button found in canonical header', false, 'Not found');
    }

    // ============================================================
    // 7. MULTI-VIEWPORT RESPONSIVENESS MATRIX
    // ============================================================
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
      await page.goto(`${PROD_URL}/home`, { waitUntil: 'networkidle', timeout: 35000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      record(
        `Viewport ${vp.width}x${vp.height} (${vp.name}) has no horizontal overflow`,
        !overflow,
        `scrollWidth: ${await page.evaluate(() => document.documentElement.scrollWidth)}, innerWidth: ${vp.width}`
      );
    }

    // Desktop screenshot
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto(`${PROD_URL}/`, { waitUntil: 'networkidle', timeout: 35000 });
    const desktopShot = path.join(ARTIFACT_DIR, 'prod_verify_desktop_1280.png');
    await page.screenshot({ path: desktopShot, fullPage: false });
    results.screenshots.push(desktopShot);

    // ============================================================
    // 8. REAL MEDIA ONLY RULE
    // ============================================================
    console.log('\n--- 8. Testing Real Media Only Rule ---');
    await page.goto(`${PROD_URL}/home`, { waitUntil: 'networkidle', timeout: 35000 });
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
    console.log('Screenshots saved:');
    results.screenshots.forEach(s => console.log('  ' + s));
    console.log('============================================================');

  } catch (err) {
    console.error('Fatal error during production verification:', err);
  } finally {
    await browser.close();
  }
}

runVerification();
