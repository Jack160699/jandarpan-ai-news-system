import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\shriyansh chandrakar\\.gemini\\antigravity-ide\\brain\\030cd03b-74e5-4148-9230-61309a430039';
const PROD_URL = 'https://www.jandarpan.news';

async function main() {
  console.log('Capturing remaining production evidence from', PROD_URL);
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // 1. Desktop Light (English)
  {
    console.log('\n--- Capturing Desktop Light (English) ---');
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light'
    });
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(6000); // let modal appear

    // Click EN button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.jd-auth-lang-btn'));
      const enBtn = btns.find(b => b.textContent.includes('EN'));
      if (enBtn) enBtn.click();
    });
    await page.waitForTimeout(600);

    const tagline = await page.$eval('.jd-auth-tagline', el => el.innerText).catch(() => '');
    const subtitle = await page.$eval('.jd-auth-subtitle', el => el.innerText).catch(() => '');
    const btnText = await page.$eval('#jd-google-signin-btn span', el => el.innerText).catch(() => '');
    console.log('English Tagline:', tagline);
    console.log('English Subtitle:', subtitle);
    console.log('English CTA:', btnText);

    const ssEn = path.join(ARTIFACT_DIR, 'prod_auth_gate_05_desktop_light_en.png');
    await page.screenshot({ path: ssEn });
    console.log('Saved:', ssEn);
    await ctx.close();
  }

  // 2. Mobile 390px Light
  {
    console.log('\n--- Capturing Mobile 390px Light ---');
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: 'light'
    });
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(6000); // let modal appear

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Mobile Light width: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, overflow=${scrollWidth > clientWidth}`);

    const ssMobLight = path.join(ARTIFACT_DIR, 'prod_auth_gate_06_mobile_390px_light.png');
    await page.screenshot({ path: ssMobLight });
    console.log('Saved:', ssMobLight);
    await ctx.close();
  }

  // 3. Mobile 390px Dark
  {
    console.log('\n--- Capturing Mobile 390px Dark ---');
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: 'dark'
    });
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(6000);

    // Toggle theme to dark
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);

    const ssMobDark = path.join(ARTIFACT_DIR, 'prod_auth_gate_07_mobile_390px_dark.png');
    await page.screenshot({ path: ssMobDark });
    console.log('Saved:', ssMobDark);
    await ctx.close();
  }

  // 4. Security & Direct Route Enforcement Test
  {
    console.log('\n--- Verifying Direct Route Protection ---');
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const routes = [
      `${PROD_URL}/live`,
      `${PROD_URL}/story/raipur-waterlogging-alert`,
      `${PROD_URL}/category/chhattisgarh`,
      `${PROD_URL}/district/raipur`
    ];

    const results = [];
    for (const r of routes) {
      await page.goto(r, { waitUntil: 'networkidle' });
      const currentUrl = page.url();
      const isLogin = currentUrl.includes('/login');
      const hasAuthGate = (await page.$('.jd-auth-gate-container')) !== null;
      console.log(`Testing ${r} -> Landed on ${currentUrl} | Gate Visible: ${hasAuthGate}`);
      results.push({ route: r, destination: currentUrl, protected: isLogin && hasAuthGate });
    }
    console.log('All direct routes protected?', results.every(x => x.protected));
    await ctx.close();
  }

  // 5. Google Button Click & Production Redirect URL
  {
    console.log('\n--- Testing Google Button Click on Production ---');
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(6000);

    // Click checkbox
    const checkbox = await page.$('#jd-terms-consent');
    if (checkbox) await checkbox.click();
    await page.waitForTimeout(300);

    console.log('Clicking Google button...');
    const googleBtn = await page.$('#jd-google-signin-btn');

    let destUrl = '';
    try {
      const [response] = await Promise.all([
        page.waitForNavigation({ timeout: 15000 }),
        googleBtn.click()
      ]);
      await page.waitForTimeout(3000);
      destUrl = page.url();
    } catch (e) {
      console.log('Navigation message:', e.message);
      destUrl = page.url();
    }

    console.log('Destination URL after Google click:', destUrl);
    const title = await page.title();
    const body = await page.evaluate(() => document.body.innerText).catch(() => '');
    console.log('Page Title:', title);
    console.log('Page text snippet:', body.slice(0, 300));

    const ssOauth = path.join(ARTIFACT_DIR, 'prod_auth_gate_08_google_oauth_response.png');
    await page.screenshot({ path: ssOauth });
    console.log('Saved:', ssOauth);
    await ctx.close();
  }

  await browser.close();
  console.log('\nAll remaining evidence successfully captured!');
}

main().catch(console.error);
