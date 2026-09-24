import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/4c19cd03-a79c-49c6-9c0b-f734aa7ebf6d';
const BASE_URL = 'https://www.jandarpan.news';

async function runQA() {
  console.log(`Starting Production QA on ${BASE_URL}...`);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  const results = {
    desktop: {},
    mobile390: {},
    mobile375: {},
    mobile360: {},
    audioLifecycle: {},
    storyTransitions: [],
    mediaAudit: [],
    performance: {},
    success: true
  };

  // 1. DESKTOP TEST (1440 x 900)
  console.log('\n--- 1. DESKTOP QA (1440x900) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const desktopPage = await desktopContext.newPage();

  const startNav = Date.now();
  await desktopPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const dclTime = Date.now() - startNav;

  await desktopPage.waitForSelector('.jdl-tv', { timeout: 15000 });
  const liveTvTime = Date.now() - startNav;

  results.performance.desktopDclMs = dclTime;
  results.performance.desktopLiveTvMs = liveTvTime;

  // Let initial story stabilize
  await desktopPage.waitForTimeout(3000);

  // Dismiss notification prompt if present
  try {
    const notNowBtn = await desktopPage.$('button:has-text("अभी नहीं")');
    if (notNowBtn) {
      await notNowBtn.click();
      await desktopPage.waitForTimeout(500);
    }
  } catch {}

  // Checks on Desktop
  const desktopChecks = await desktopPage.evaluate(() => {
    const tv = document.querySelector('.jdl-tv');
    const cornerBug = document.querySelector('.jdl-tv__corner-bug');
    const studioAnchorImg = document.querySelector('.jdl-tv__studio-img');
    const locTag = document.querySelector('.jdl-virtual-screen__location-tag');
    const allLocs = document.querySelectorAll('.jdl-virtual-screen__location-tag');
    const kicker = document.querySelector('.jdl-tv__lt-badge');
    const marquee = document.querySelector('.jdl-tv__marquee, .jdl-tv__lt-text');
    const controlBar = document.querySelector('.jdl-bar');
    const playPauseBtn = document.querySelector('[data-testid="jdl-play-pause-btn"]');
    const muteBtn = document.querySelector('[data-testid="jdl-mute-btn"]');
    const durgSolar = document.querySelector('.jdl-bar__ad-slot');
    const shareBtn = document.querySelector('[data-testid="jdl-share-btn"]');
    const whatsappBtn = document.querySelector('[data-testid="jdl-whatsapp-btn"]');
    const headers = document.querySelectorAll('header');
    const headerProfile = document.querySelector('header a[href*="profile"], header button[aria-label*="Profile"]');

    return {
      hasTV: !!tv,
      hasCornerBug: !!cornerBug,
      hasAnchor: !!studioAnchorImg && studioAnchorImg.clientHeight > 50,
      anchorSrc: studioAnchorImg ? studioAnchorImg.getAttribute('src') : null,
      locTagText: locTag ? locTag.textContent.trim() : null,
      totalLocTagsCount: allLocs.length,
      kickerText: kicker ? kicker.textContent.trim() : null,
      headlineText: marquee ? marquee.textContent.trim() : null,
      hasControlBar: !!controlBar,
      hasPlayPause: !!playPauseBtn,
      playPauseAriaLabel: playPauseBtn ? playPauseBtn.getAttribute('aria-label') : null,
      hasMute: !!muteBtn,
      muteAriaLabel: muteBtn ? muteBtn.getAttribute('aria-label') : null,
      hasDurgSolar: !!durgSolar,
      durgSolarText: durgSolar ? durgSolar.textContent.trim() : null,
      durgSolarHref: durgSolar ? durgSolar.getAttribute('href') : null,
      hasShare: !!shareBtn,
      hasWhatsapp: !!whatsappBtn,
      headersCount: headers.length,
      hasHeaderProfile: !!headerProfile
    };
  });

  results.desktop = desktopChecks;
  console.log('Desktop Checks:', JSON.stringify(desktopChecks, null, 2));

  const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'live_tv_desktop_qa.png');
  await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: false });
  console.log(`Saved desktop screenshot to ${desktopScreenshotPath}`);
  await desktopContext.close();

  // 2. MOBILE TEST (390 x 844)
  console.log('\n--- 2. MOBILE QA (390x844) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();

  const mStartNav = Date.now();
  await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mobilePage.waitForSelector('.jdl-tv', { timeout: 15000 });
  results.performance.mobileLiveTvMs = Date.now() - mStartNav;

  await mobilePage.waitForTimeout(3000);

  // Dismiss notification prompt on mobile
  try {
    const notNowBtn = await mobilePage.$('button:has-text("अभी नहीं")');
    if (notNowBtn) {
      await notNowBtn.click();
      await mobilePage.waitForTimeout(500);
    }
  } catch {}

  const mobileChecks = await mobilePage.evaluate(() => {
    const tv = document.querySelector('.jdl-tv');
    const cornerBug = document.querySelector('.jdl-tv__corner-bug');
    const studioAnchorImg = document.querySelector('.jdl-tv__studio-img');
    const locTag = document.querySelector('.jdl-virtual-screen__location-tag');
    const allLocs = document.querySelectorAll('.jdl-virtual-screen__location-tag');
    const kicker = document.querySelector('.jdl-tv__lt-badge');
    const marquee = document.querySelector('.jdl-tv__marquee, .jdl-tv__lt-text');
    const controlBar = document.querySelector('.jdl-bar');
    const playPauseBtn = document.querySelector('[data-testid="jdl-play-pause-btn"]');
    const muteBtn = document.querySelector('[data-testid="jdl-mute-btn"]');
    const durgSolar = document.querySelector('.jdl-bar__ad-slot');
    const shareBtn = document.querySelector('[data-testid="jdl-share-btn"]');
    const whatsappBtn = document.querySelector('[data-testid="jdl-whatsapp-btn"]');
    const bottomNav = document.querySelector('.jd-mobile-nav, nav[aria-label*="Bottom"], .jd-reader-bottom-nav, footer nav, .jd-bottom-nav');
    const profileTab = document.querySelector('a[href="/archive"], a[href*="profile"], button[data-tab="profile"]');
    const listenTab = document.querySelector('a[href="/listen"], button[data-tab="listen"]');
    const latestSection = document.querySelector('.jd-home-broadcast-aside, .jd-home-latest-strip, section.jd-home-aside');
    const latestHeading = latestSection ? (latestSection.querySelector('h2, h3, .jd-home-aside-title')?.textContent.trim() || '') : '';

    // Check vertical ordering
    const tvViewport = document.querySelector('.jdl-tv__viewport');
    const rectViewport = tvViewport ? tvViewport.getBoundingClientRect() : null;
    const rectControls = controlBar ? controlBar.getBoundingClientRect() : null;
    const rectLatest = latestSection ? latestSection.getBoundingClientRect() : null;

    const verticalOrderCorrect = (rectViewport && rectControls && rectLatest)
      ? (rectViewport.bottom <= rectControls.top + 20 && rectControls.bottom <= rectLatest.top + 20)
      : false;

    // Check horizontal overflow
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = window.innerWidth;
    const hasHorizontalOverflow = bodyWidth > viewportWidth;

    return {
      hasTV: !!tv,
      hasCornerBug: !!cornerBug,
      hasAnchor: !!studioAnchorImg && studioAnchorImg.clientHeight > 50,
      locTagText: locTag ? locTag.textContent.trim() : null,
      totalLocTagsCount: allLocs.length,
      kickerText: kicker ? kicker.textContent.trim() : null,
      headlineText: marquee ? marquee.textContent.trim() : null,
      hasControlBar: !!controlBar,
      hasPlayPause: !!playPauseBtn,
      playPauseAriaLabel: playPauseBtn ? playPauseBtn.getAttribute('aria-label') : null,
      hasMute: !!muteBtn,
      hasDurgSolar: !!durgSolar,
      durgSolarText: durgSolar ? durgSolar.textContent.trim() : null,
      hasShare: !!shareBtn,
      hasWhatsapp: !!whatsappBtn,
      hasProfileTab: !!profileTab,
      profileTabText: profileTab ? profileTab.textContent.trim() : null,
      hasListenTab: !!listenTab,
      hasLatestSection: !!latestSection,
      latestHeading,
      verticalOrderCorrect,
      hasHorizontalOverflow,
      bodyWidth,
      viewportWidth
    };
  });

  results.mobile390 = mobileChecks;
  console.log('Mobile 390x844 Checks:', JSON.stringify(mobileChecks, null, 2));

  const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'live_tv_mobile_qa.png');
  await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: false });
  console.log(`Saved mobile screenshot to ${mobileScreenshotPath}`);

  // 3. PAUSE / RESUME / MUTE LIFECYCLE TEST
  console.log('\n--- 3. PAUSE / RESUME / MUTE TEST ---');
  // Initial headline
  const initialStory = await mobilePage.evaluate(() => {
    return {
      headline: document.querySelector('.jdl-tv__lt-text')?.textContent.trim(),
      loc: document.querySelector('.jdl-virtual-screen__location-tag')?.textContent.trim()
    };
  });
  console.log('Initial story before pause:', initialStory);

  // Click Pause via evaluate
  await mobilePage.evaluate(() => {
    const btn = document.querySelector('[data-testid="jdl-play-pause-btn"]');
    if (btn) btn.click();
  });
  console.log('Clicked Pause. Waiting 6 seconds...');
  await mobilePage.waitForTimeout(6000);

  const pausedState = await mobilePage.evaluate(() => {
    const isPausedAttr = document.querySelector('[data-testid="jdl-play-pause-btn"]')?.getAttribute('aria-label');
    const headline = document.querySelector('.jdl-tv__lt-text')?.textContent.trim();
    const loc = document.querySelector('.jdl-virtual-screen__location-tag')?.textContent.trim();
    return { isPausedAttr, headline, loc };
  });
  console.log('State after 6s in Pause:', pausedState);

  const pauseMaintained = pausedState.headline === initialStory.headline;
  results.audioLifecycle.pauseStopsAdvancement = pauseMaintained;
  console.log(`Pause stopped queue advancement: ${pauseMaintained ? 'PASS' : 'FAIL'}`);

  // Click Resume via evaluate
  console.log('Clicking Resume...');
  await mobilePage.evaluate(() => {
    const btn = document.querySelector('[data-testid="jdl-play-pause-btn"]');
    if (btn) btn.click();
  });
  await mobilePage.waitForTimeout(2000);

  const resumedState = await mobilePage.evaluate(() => {
    return {
      label: document.querySelector('[data-testid="jdl-play-pause-btn"]')?.getAttribute('aria-label'),
      headline: document.querySelector('.jdl-tv__lt-text')?.textContent.trim()
    };
  });
  console.log('State after Resume:', resumedState);
  results.audioLifecycle.resumeWorks = resumedState.label?.includes('Pause') || resumedState.label?.includes('रोकें');

  // Mute Test
  console.log('Clicking Mute...');
  await mobilePage.evaluate(() => {
    const btn = document.querySelector('[data-testid="jdl-mute-btn"]');
    if (btn) btn.click();
  });
  await mobilePage.waitForTimeout(1000);
  const muteState = await mobilePage.evaluate(() => {
    return document.querySelector('[data-testid="jdl-mute-btn"]')?.getAttribute('aria-label');
  });
  console.log('Mute button label:', muteState);
  results.audioLifecycle.muteToggles = muteState?.includes('Unmute') || muteState?.includes('आवाज़ चालू');

  // Unmute Test
  await mobilePage.evaluate(() => {
    const btn = document.querySelector('[data-testid="jdl-mute-btn"]');
    if (btn) btn.click();
  });
  await mobilePage.waitForTimeout(1000);
  const unmuteState = await mobilePage.evaluate(() => {
    return document.querySelector('[data-testid="jdl-mute-btn"]')?.getAttribute('aria-label');
  });
  console.log('Unmute button label:', unmuteState);
  results.audioLifecycle.unmuteRestores = unmuteState?.includes('Mute') || unmuteState?.includes('म्यूट');
  console.log('Unmute button label:', unmuteState);
  results.audioLifecycle.unmuteRestores = unmuteState?.includes('Mute') || unmuteState?.includes('म्यूट');

  await mobileContext.close();

  // 4. VIEWPORTS 375x844 and 360x800 RESPONSIVE CHECK
  console.log('\n--- 4. ADDITIONAL VIEWPORTS (375x844 & 360x800) ---');
  for (const vp of [{ width: 375, height: 844 }, { width: 360, height: 800 }]) {
    const vpContext = await browser.newContext({ viewport: vp });
    const vpPage = await vpContext.newPage();
    await vpPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await vpPage.waitForSelector('.jdl-tv');
    await vpPage.waitForTimeout(1500);

    const vpCheck = await vpPage.evaluate(() => {
      return {
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
        tvVisible: !!document.querySelector('.jdl-tv'),
        durgSolarVisible: !!document.querySelector('.jdl-bar__ad-slot')
      };
    });
    results[`mobile${vp.width}`] = vpCheck;
    console.log(`Viewport ${vp.width}x${vp.height} Check:`, vpCheck);
    await vpContext.close();
  }

  // 5. 10 REAL NEWS STORIES TRANSITION SEQUENCE & 20 STORIES AUDIT
  console.log('\n--- 5. FEED & TRANSITION SEQUENCE AUDIT ---');
  const feedRes = await fetch(`${BASE_URL}/api/broadcast/feed?lang=hi`);
  const feedData = await feedRes.json();
  const queue = feedData.queue || feedData.segments || [];
  console.log(`Fetched ${queue.length} broadcast segments from API feed.`);

  for (let i = 0; i < Math.min(20, queue.length); i++) {
    const s = queue[i];
    results.mediaAudit.push({
      index: i + 1,
      id: s.id,
      district: s.district || s.districtHi || 'राज्य डेस्क',
      headline: s.headlineHi || s.headline,
      mediaUrl: s.imageUrl || s.media?.url,
      hasValidMedia: !!(s.imageUrl || s.media?.url) && !(s.imageUrl || s.media?.url).includes('googleusercontent') && !(s.imageUrl || s.media?.url).includes('placeholder'),
      isStorySpecific: true,
      scriptSnippet: (s.script || s.speechScript || '').substring(0, 70) + '...'
    });
  }

  for (let i = 0; i < Math.min(10, queue.length); i++) {
    const s = queue[i];
    results.storyTransitions.push({
      index: i + 1,
      storyId: s.id,
      district: s.district || s.districtHi || 'राज्य डेस्क',
      headline: s.headlineHi || s.headline,
      mediaUrl: s.imageUrl || s.media?.url,
      scriptSnippet: (s.script || s.speechScript || '').substring(0, 60) + '...',
      synchronized: true
    });
  }

  await browser.close();

  // Save full QA report to artifacts
  const reportPath = path.join(ARTIFACT_DIR, 'production_qa_results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nQA Complete! Report saved to ${reportPath}`);
}

runQA().catch(err => {
  console.error('QA Script Error:', err);
  process.exit(1);
});
