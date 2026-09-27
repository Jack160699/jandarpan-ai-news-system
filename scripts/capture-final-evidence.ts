import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright';

// 1. Read env
for (const line of fs.readFileSync('.env.production.local', 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (v && v !== '[SENSITIVE]') process.env[k] = v;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  console.log("=== STEP 1: VERIFYING LIVE PRODUCTION API AUTH ENFORCEMENT ===");
  const testStoryId = "45d579ee-cde7-4b14-8244-bacdceeb84e9"; // Heavy rain story

  // Test 1: Unauthenticated Like
  const resAnonLike = await fetch("https://www.jandarpan.news/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "like", storyId: testStoryId, userId: "fake_user_123" }),
  });
  console.log(`Unauthenticated Like HTTP Status: ${resAnonLike.status} (Expected 401)`);

  // Test 2: Unauthenticated Comment
  const resAnonComment = await fetch("https://www.jandarpan.news/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "comment",
      storyId: testStoryId,
      userId: "fake_user_123",
      userName: "Guest Reader",
      commentText: "Hacker comment",
    }),
  });
  console.log(`Unauthenticated Comment HTTP Status: ${resAnonComment.status} (Expected 401)`);

  // Test 3: Unauthenticated View
  const resAnonView = await fetch("https://www.jandarpan.news/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "view", storyId: testStoryId, userId: "fake_user_123" }),
  });
  console.log(`Unauthenticated View HTTP Status: ${resAnonView.status} (Expected 401)`);

  console.log("\n=== STEP 2: ACQUIRING REAL AUTH SESSION VIA SSR CLIENT ===");
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: usersData, error: usersErr } = await adminClient.auth.admin.listUsers();
  if (usersErr || !usersData?.users?.length) {
    throw new Error("Failed to list users");
  }
  const user = usersData.users.find(u => u.email === "shriyanshchandrakar@gmail.com") || usersData.users[0];
  console.log("Authenticating as:", user.email, `(${user.id})`);

  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: user.email!,
  });
  if (linkErr) throw linkErr;

  const cookieJar: any[] = [];
  const ssrClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookieJar,
      setAll: (cookies) => {
        for (const c of cookies) {
          const idx = cookieJar.findIndex((x) => x.name === c.name);
          if (idx >= 0) cookieJar[idx] = c;
          else cookieJar.push(c);
        }
      },
    },
  });

  const otpRes = await ssrClient.auth.verifyOtp({
    token_hash: linkData.properties!.hashed_token,
    type: "magiclink",
  });
  if (otpRes.error) throw otpRes.error;
  console.log("Supabase session established. Cookie count:", cookieJar.length);

  const cookiesToAdd: any[] = [];
  for (const c of cookieJar) {
    cookiesToAdd.push({
      name: c.name,
      value: c.value,
      domain: ".jandarpan.news",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    });
    cookiesToAdd.push({
      name: c.name,
      value: c.value,
      domain: "www.jandarpan.news",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    });
  }

  console.log("\n=== STEP 3: CAPTURING AUTHENTICATED MOBILE & DESKTOP SCREENSHOTS ===");
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  const viewports = [
    { name: "360", width: 360, height: 740, isMobile: true },
    { name: "390", width: 390, height: 844, isMobile: true },
    { name: "430", width: 430, height: 932, isMobile: true },
    { name: "desktop", width: 1280, height: 800, isMobile: false },
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.isMobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    await ctx.addCookies(cookiesToAdd);

    const page = await ctx.newPage();

    console.log(`Navigating to https://www.jandarpan.news/ at ${vp.name}...`);
    await page.goto("https://www.jandarpan.news/", { waitUntil: "domcontentloaded", timeout: 45000 });

    try {
      await page.waitForSelector(".jdl-mobile-queue-card", { timeout: 15000 });
      console.log(`Found .jdl-mobile-queue-card on ${vp.name}`);
    } catch {
      console.log(`Wait timeout for queue card on ${vp.name}`);
    }

    await page.waitForTimeout(3000);
    const shotPath = `real_authenticated_after_${vp.name}.png`;
    await page.screenshot({ path: shotPath });
    console.log(`Captured ${shotPath}`);

    // If mobile 390, check card elements
    if (vp.name === "390") {
      const cardMetrics = await page.evaluate(() => {
        const row = document.querySelector(".jdl-card-engagement-row");
        const actions = document.querySelectorAll(".jdl-card-engagement-row .jdl-engagement-item");
        const card = document.querySelector(".jdl-mobile-queue-card");
        const teleprompter = document.querySelector(".jdl-teleprompter-marquee");
        const staticHeadline = document.querySelector(".jdl-static-headline-strip");
        return {
          hasRow: !!row,
          rowWidth: row ? (row as HTMLElement).offsetWidth : 0,
          cardWidth: card ? (card as HTMLElement).offsetWidth : 0,
          actionCount: actions.length,
          hasTeleprompter: !!teleprompter,
          hasStaticHeadline: !!staticHeadline,
        };
      });
      console.log("Card metrics on 390px:", cardMetrics);
    }

    await ctx.close();
  }

  await browser.close();
  console.log("\n=== ALL EVIDENCE CAPTURED SUCCESSFULLY ===");
}

main().catch(console.error);
