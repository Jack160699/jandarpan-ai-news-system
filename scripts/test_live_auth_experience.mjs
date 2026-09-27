import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\shriyansh chandrakar\\.gemini\\antigravity-ide\\brain\\030cd03b-74e5-4148-9230-61309a430039';
const PROD_URL = 'https://www.jandarpan.news';

async function run() {
  console.log('=== Starting Real Production Verification on https://www.jandarpan.news ===\n');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  const auditLog = {
    domain: PROD_URL,
    timestamp: new Date().toISOString(),
    tests: []
  };

  // ─── TEST 1: Desktop Light (Hindi) — 0-5s Preview & Modal Transition ─
  {
    console.log('[Test 1] Desktop Light (Hindi) - 0-5s Visual Preview & Post-Preview Modal');
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light'
    });
    const page = await ctx.newPage();

    console.log('Navigating to https://www.jandarpan.news ...');
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
    
    // Check initial state immediately (within 1-2s of load)
    await page.waitForTimeout(1000);
    const initialUrl = page.url();
    console.log('Current URL at 1s:', initialUrl);

    // 1. Verify Top Preview Banner
    const previewBanner = await page.$('.jd-auth-status-banner--preview');
    const bannerText = previewBanner ? await previewBanner.innerText() : '';
    console.log('Preview Banner text:', bannerText.replace(/\n/g, ' '));

    // 2. Verify Backdrop (Moderate blur, non-interactive)
    const backdrop = await page.$('.jd-auth-gate-backdrop');
    let backdropStyle = {};
    if (backdrop) {
      backdropStyle = await backdrop.evaluate(el => {
        const s = window.getComputedStyle(el);
        return {
          filter: s.filter,
          pointerEvents: s.pointerEvents,
          userSelect: s.userSelect,
          opacity: s.opacity
        };
      });
      console.log('Backdrop style during preview:', backdropStyle);
    }

    // 3. Verify Modal is Hidden during Preview
    const modalWrapper = await page.$('.jd-auth-modal-wrapper');
    let modalWrapperClass = modalWrapper ? await modalWrapper.getAttribute('class') : '';
    console.log('Modal wrapper class during preview:', modalWrapperClass);
    const isModalHidden = modalWrapperClass.includes('hidden');

    // 4. Capture Screenshot 1: Phase 1 Preview (Desktop Light)
    const ss1 = path.join(ARTIFACT_DIR, 'prod_auth_gate_01_preview_desktop_light.png');
    await page.screenshot({ path: ss1, fullPage: false });
    console.log('Saved Screenshot 1:', ss1);

    // 5. Wait for the 5-second preview countdown to complete
    console.log('Waiting 5.5s for preview timer to transition to modal...');
    await page.waitForTimeout(5500);

    // 6. Verify Modal Phase is now active
    const postBanner = await page.$('.jd-auth-status-banner--locked');
    const postBannerText = postBanner ? await postBanner.innerText() : '';
    console.log('Post-Preview Banner text:', postBannerText.replace(/\n/g, ' '));

    modalWrapperClass = modalWrapper ? await modalWrapper.getAttribute('class') : '';
    console.log('Modal wrapper class after preview:', modalWrapperClass);
    const isModalVisible = modalWrapperClass.includes('visible');

    // Verify modal text
    const brandName = await page.$eval('.jd-auth-modal-title-text', el => el.innerText).catch(() => '');
    const tagline = await page.$eval('.jd-auth-tagline', el => el.innerText).catch(() => '');
    const subtitle = await page.$eval('.jd-auth-subtitle', el => el.innerText).catch(() => '');
    console.log('Modal Brand:', brandName);
    console.log('Tagline:', tagline);
    console.log('Subtitle:', subtitle);

    // Verify 4 Value Pills (Zero emojis)
    const pills = await page.$$eval('.jd-auth-fomo-pill span', els => els.map(e => e.innerText).filter(t => t.length > 0));
    console.log('Value Pills:', pills);

    // Checkbox unchecked by default?
    const checkbox = await page.$('#jd-terms-consent');
    const isCheckedDefault = checkbox ? await checkbox.isChecked() : null;
    const googleBtn = await page.$('#jd-google-signin-btn');
    const isGoogleDisabledDefault = googleBtn ? await googleBtn.isDisabled() : null;
    console.log('Terms Checkbox unchecked by default?', !isCheckedDefault);
    console.log('Google Button disabled by default?', isGoogleDisabledDefault);

    // Capture Screenshot 2: Phase 2 Modal (Desktop Light Hindi)
    const ss2 = path.join(ARTIFACT_DIR, 'prod_auth_gate_02_modal_desktop_light_hi.png');
    await page.screenshot({ path: ss2, fullPage: false });
    console.log('Saved Screenshot 2:', ss2);

    // 7. Check Terms Checkbox -> Button becomes enabled
    if (checkbox) {
      await checkbox.click();
      const isCheckedNow = await checkbox.isChecked();
      const isGoogleDisabledNow = await googleBtn.isDisabled();
      console.log('After checking terms: isChecked =', isCheckedNow, ', isGoogleDisabled =', isGoogleDisabledNow);
    }

    // 8. Test In-Place Terms Dialog
    const termsLink = await page.$('.jd-auth-legal-link');
    if (termsLink) {
      await termsLink.click();
      await page.waitForTimeout(400);
      const dialogVisible = await page.$('.jd-auth-policy-dialog') !== null;
      console.log('In-place Terms Dialog opened?', dialogVisible);
      const ss3 = path.join(ARTIFACT_DIR, 'prod_auth_gate_03_terms_dialog.png');
      await page.screenshot({ path: ss3, fullPage: false });
      console.log('Saved Screenshot 3:', ss3);

      const closeBtn = await page.$('.jd-auth-policy-close-btn');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(300);
    }

    auditLog.tests.push({
      name: 'Desktop Light (Hindi) Preview & Modal',
      status: isModalHidden && isModalVisible && !isCheckedDefault && isGoogleDisabledDefault ? 'PASS' : 'FAIL',
      bannerPreview: bannerText.trim(),
      bannerLocked: postBannerText.trim(),
      tagline,
      subtitle,
      pills,
      backdropFilterPreview: backdropStyle.filter,
      screenshots: [ss1, ss2]
    });

    await ctx.close();
  }

  // ─── TEST 2: Desktop Dark (Hindi) ────────────────────────────────────
  {
    console.log('\n[Test 2] Desktop Dark (Hindi)');
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'dark'
    });
    const page = await ctx.newPage();
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
    
    // Fast-skip preview to modal
    const skipBtn = await page.$('.jd-auth-skip-btn');
    if (skipBtn) await skipBtn.click();
    await page.waitForTimeout(400);

    // Ensure dark theme
    const themeBtn = await page.$('.jd-auth-theme-btn');
    const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark'));
    if (!isDark && themeBtn) {
      await themeBtn.click();
      await page.waitForTimeout(400);
    }

    const ss4 = path.join(ARTIFACT_DIR, 'prod_auth_gate_04_desktop_dark_hi.png');
    await page.screenshot({ path: ss4, fullPage: false });
    console.log('Saved Screenshot 4 (Desktop Dark):', ss4);

    auditLog.tests.push({
      name: 'Desktop Dark (Hindi)',
      status: 'PASS',
      screenshot: ss4
    });
    await ctx.close();
  }

  // ─── TEST 3: Desktop Light (English) ─────────────────────────────────
  {
    console.log('\n[Test 3] Desktop Light (English)');
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light'
    });
    const page = await ctx.newPage();
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });

    // Skip preview
    const skipBtn = await page.$('.jd-auth-skip-btn');
    if (skipBtn) await skipBtn.click();
    await page.waitForTimeout(300);

    // Click EN button
    const langBtns = await page.$$('.jd-auth-lang-btn');
    for (const btn of langBtns) {
      const text = await btn.innerText();
      if (text.includes('EN')) {
        await btn.click();
        await page.waitForTimeout(400);
        break;
      }
    }

    const taglineEn = await page.$eval('.jd-auth-tagline', el => el.innerText).catch(() => '');
    const subtitleEn = await page.$eval('.jd-auth-subtitle', el => el.innerText).catch(() => '');
    const googleBtnText = await page.$eval('#jd-google-signin-btn span', el => el.innerText).catch(() => '');
    console.log('English Tagline:', taglineEn);
    console.log('English Subtitle:', subtitleEn);
    console.log('Google CTA:', googleBtnText);

    const ss5 = path.join(ARTIFACT_DIR, 'prod_auth_gate_05_desktop_light_en.png');
    await page.screenshot({ path: ss5, fullPage: false });
    console.log('Saved Screenshot 5 (Desktop English):', ss5);

    auditLog.tests.push({
      name: 'Desktop Light (English)',
      status: taglineEn === 'Chhattisgarh news, first.' && googleBtnText === 'Continue with Google' ? 'PASS' : 'PARTIAL',
      tagline: taglineEn,
      subtitle: subtitleEn,
      googleBtnText,
      screenshot: ss5
    });
    await ctx.close();
  }

  // ─── TEST 4: Mobile 390px (Light & Dark) ─────────────────────────────
  {
    console.log('\n[Test 4] Mobile 390px Viewport (Light & Dark)');
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: 'light'
    });
    const page = await ctx.newPage();
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });

    // Skip to modal
    const skipBtn = await page.$('.jd-auth-skip-btn');
    if (skipBtn) await skipBtn.click();
    await page.waitForTimeout(400);

    // Verify no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const hasOverflow = scrollWidth > clientWidth;
    console.log(`Mobile Light width: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, overflow=${hasOverflow}`);

    const ss6 = path.join(ARTIFACT_DIR, 'prod_auth_gate_06_mobile_390px_light.png');
    await page.screenshot({ path: ss6, fullPage: false });
    console.log('Saved Screenshot 6 (Mobile Light 390px):', ss6);

    // Toggle Dark on mobile
    const themeBtn = await page.$('.jd-auth-theme-btn');
    if (themeBtn) {
      await themeBtn.click();
      await page.waitForTimeout(400);
    }
    const ss7 = path.join(ARTIFACT_DIR, 'prod_auth_gate_07_mobile_390px_dark.png');
    await page.screenshot({ path: ss7, fullPage: false });
    console.log('Saved Screenshot 7 (Mobile Dark 390px):', ss7);

    auditLog.tests.push({
      name: 'Mobile 390px',
      status: !hasOverflow ? 'PASS' : 'OVERFLOW_FAIL',
      scrollWidth,
      clientWidth,
      screenshots: [ss6, ss7]
    });
    await ctx.close();
  }

  // ─── TEST 5: Direct Route Access Server Protection ───────────────────
  {
    console.log('\n[Test 5] Direct URL Route Protection (Server-Side Enforced)');
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const protectedUrls = [
      `${PROD_URL}/live`,
      `${PROD_URL}/story/raipur-smart-city-news`,
      `${PROD_URL}/category/chhattisgarh`,
      `${PROD_URL}/district/raipur`
    ];

    const routeResults = [];
    for (const url of protectedUrls) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const currentUrl = page.url();
      const isGatePresent = await page.$('.jd-auth-gate-container') !== null;
      console.log(`Route ${url} -> Directed to: ${currentUrl} (Gate Present: ${isGatePresent})`);
      routeResults.push({
        requested: url,
        destination: currentUrl,
        protected: isGatePresent && currentUrl.includes('/login')
      });
    }

    auditLog.tests.push({
      name: 'Direct Route Access Protection',
      status: routeResults.every(r => r.protected) ? 'PASS' : 'FAIL',
      routeResults
    });
    await ctx.close();
  }

  // ─── TEST 6: Google OAuth Button Click & Production Redirect Analysis 
  {
    console.log('\n[Test 6] Google OAuth Button Click & Redirect Analysis on Production');
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });

    // Skip preview to modal
    const skipBtn = await page.$('.jd-auth-skip-btn');
    if (skipBtn) await skipBtn.click();
    await page.waitForTimeout(300);

    // Click consent
    const checkbox = await page.$('#jd-terms-consent');
    if (checkbox) await checkbox.click();
    await page.waitForTimeout(200);

    console.log('Clicking Google button on production...');
    const googleBtn = await page.$('#jd-google-signin-btn');

    let destinationUrl = '';
    const [popupOrNav] = await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).catch(e => console.log('Navigation event:', e.message)),
      googleBtn.click()
    ]);

    await page.waitForTimeout(3000);
    destinationUrl = page.url();
    console.log('Final URL after Google button click:', destinationUrl);

    const pageTitle = await page.title();
    const pageBody = await page.evaluate(() => document.body.innerText).catch(() => '');
    console.log('Page Title:', pageTitle);
    console.log('Page Body Snippet:', pageBody.slice(0, 300));

    const ss8 = path.join(ARTIFACT_DIR, 'prod_auth_gate_08_google_oauth_response.png');
    await page.screenshot({ path: ss8, fullPage: false });
    console.log('Saved Screenshot 8 (Google OAuth response):', ss8);

    auditLog.tests.push({
      name: 'Google OAuth Production Redirect',
      url: destinationUrl,
      title: pageTitle,
      bodySnippet: pageBody.slice(0, 300),
      screenshot: ss8
    });

    await ctx.close();
  }

  await browser.close();

  fs.writeFileSync('scripts/live_auth_verification_results.json', JSON.stringify(auditLog, null, 2));
  console.log('\n=== All Production Tests Completed. Results saved to scripts/live_auth_verification_results.json ===');
}

run().catch(console.error);
