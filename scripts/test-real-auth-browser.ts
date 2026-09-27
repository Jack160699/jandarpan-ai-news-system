import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const ROOT = process.cwd();
for (const line of fs.readFileSync('.env.production.local', 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (v && v !== '[SENSITIVE]') process.env[k] = v;
}

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  console.log('Acquiring real session via OTP...');
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'shriyanshchandrakar@gmail.com'
  });

  const { data: sessionData, error: otpErr } = await anon.auth.verifyOtp({
    email: 'shriyanshchandrakar@gmail.com',
    token: linkData!.properties!.email_otp!,
    type: 'email'
  });

  if (otpErr || !sessionData?.session) {
    console.error('OTP verify failed:', otpErr);
    return;
  }

  const session = sessionData.session;
  console.log('Got real session for:', session.user.email);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const viewports = [
    { name: '360', width: 360, height: 740 },
    { name: '390', width: 390, height: 844 },
    { name: '430', width: 430, height: 932 },
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    });

    const page = await ctx.newPage();
    console.log(`Setting session in browser context at ${vp.name}px...`);

    // Navigate to /login to establish origin, then set session in localStorage + cookies
    await page.goto('https://www.jandarpan.news/login', { waitUntil: 'domcontentloaded' });
    
    await page.evaluate(({ session, supabaseUrl }) => {
      const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
      const cookieKey = `sb-${projectRef}-auth-token`;
      localStorage.setItem(cookieKey, JSON.stringify(session));
      
      // Also chunk into document.cookie
      const str = JSON.stringify(session);
      const chunkSize = 3000;
      if (str.length > chunkSize) {
        const c0 = str.slice(0, chunkSize);
        const c1 = str.slice(chunkSize);
        document.cookie = `${cookieKey}.0=base64-${btoa(c0)}; path=/; domain=.jandarpan.news; max-age=604800; samesite=lax; secure`;
        document.cookie = `${cookieKey}.1=base64-${btoa(c1)}; path=/; domain=.jandarpan.news; max-age=604800; samesite=lax; secure`;
      } else {
        document.cookie = `${cookieKey}=base64-${btoa(str)}; path=/; domain=.jandarpan.news; max-age=604800; samesite=lax; secure`;
      }
    }, { session, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL! });

    // Now navigate to /
    console.log(`Navigating to / as authenticated user at ${vp.name}px...`);
    await page.goto('https://www.jandarpan.news/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    try {
      await page.waitForSelector('.jdl-card-engagement-row', { timeout: 15000 });
      console.log(`Found engagement row at ${vp.name}px!`);
    } catch {
      console.log(`Timed out waiting for engagement row at ${vp.name}px`);
    }

    await page.waitForTimeout(3000);
    const filename = `real_authenticated_before_${vp.name}.png`;
    await page.screenshot({ path: filename });
    console.log(`Saved screenshot ${filename}`);
    await ctx.close();
  }

  await browser.close();
}

main().catch(console.error);
