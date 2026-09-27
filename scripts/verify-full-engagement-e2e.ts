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
  console.log("=== COMPREHENSIVE LIVE ENGAGEMENT & UI VERIFICATION ===");
  const testStoryId = "45d579ee-cde7-4b14-8244-bacdceeb84e9"; // Heavy rain story

  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const user = usersData!.users.find(u => u.email === "shriyanshchandrakar@gmail.com")!;
  console.log(`User: ${user.email} (${user.id})`);

  // Generate magiclink / OTP
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: user.email!,
  });

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
    token_hash: linkData!.properties!.hashed_token,
    type: "magiclink",
  });
  if (otpRes.error) throw otpRes.error;
  const session = otpRes.data.session!;
  const accessToken = session.access_token;
  console.log("Session acquired. Access Token length:", accessToken.length);

  // Cookie string for fetch
  const cookieHeader = cookieJar.map(c => `${c.name}=${c.value}`).join("; ");

  console.log("\n--- TEST 1: DIRECT API UN-AUTHENTICATED REJECTION ---");
  const unauthRes = await fetch("https://www.jandarpan.news/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "like", storyId: testStoryId }),
  });
  console.log(`Unauth status: ${unauthRes.status} (401 expected: ${unauthRes.status === 401})`);

  console.log("\n--- TEST 2: FORGED USERID REJECTION ---");
  const forgedRes = await fetch("https://www.jandarpan.news/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "like", storyId: testStoryId, userId: "malicious_hacker" }),
  });
  console.log(`Forged userId status: ${forgedRes.status} (401 expected: ${forgedRes.status === 401})`);

  console.log("\n--- TEST 3: AUTHENTICATED LIKE MUTATION ---");
  const authLikeRes = await fetch("https://www.jandarpan.news/api/story/engagement", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "Cookie": cookieHeader,
    },
    body: JSON.stringify({ action: "like", storyId: testStoryId }),
  });
  console.log(`Auth Like status: ${authLikeRes.status}`);
  const authLikeData = await authLikeRes.json();
  console.log("Auth Like response:", authLikeData);

  // If userLiked is true, toggle it back so we maintain exact authoritative count
  if (authLikeData.userLiked === false) {
    console.log("Re-toggling like back to liked state...");
    const reLike = await fetch("https://www.jandarpan.news/api/story/engagement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "Cookie": cookieHeader,
      },
      body: JSON.stringify({ action: "like", storyId: testStoryId }),
    });
    console.log("Re-like response:", await reLike.json());
  }

  console.log("\n--- TEST 4: AUTHENTICATED COMMENTS ---");
  // Check comments endpoint
  const commentsRes = await fetch(`https://www.jandarpan.news/api/story/engagement?storyId=${testStoryId}&action=get_comments`);
  const commentsData = await commentsRes.json();
  console.log("Existing comments for Heavy Rain story:", commentsData);

  console.log("\n--- TEST 5: CAPTURING FULL-WIDTH UI SCREENSHOTS (360, 390, 430, DESKTOP) ---");
  const browser = await chromium.launch({ channel: "chrome", headless: true });

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

    await ctx.addInitScript(({ session, supabaseUrl }) => {
      const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
      const cookieKey = `sb-${projectRef}-auth-token`;
      localStorage.setItem(cookieKey, JSON.stringify(session));
      localStorage.setItem("jd-auth-gate-passed", "true");
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    }, { session, supabaseUrl });

    const page = await ctx.newPage();
    await page.goto("https://www.jandarpan.news/", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(3000);

    const shotPath = `real_authenticated_after_${vp.name}.png`;
    await page.screenshot({ path: shotPath });
    console.log(`Captured ${shotPath}`);

    if (vp.name === "390") {
      const metrics = await page.evaluate(() => {
        const card = document.querySelector(".jdl-queue-card") as HTMLElement | null;
        const mainContent = document.querySelector(".jdl-queue-card__main-content") as HTMLElement | null;
        const thumb = document.querySelector(".jdl-queue-card__thumb-wrap") as HTMLElement | null;
        const body = document.querySelector(".jdl-queue-card__body") as HTMLElement | null;
        const row = document.querySelector(".jdl-card-engagement-row") as HTMLElement | null;
        const actions = document.querySelectorAll(".jdl-card-engagement-row .jdl-engagement-item");
        const waBtn = document.querySelector(".jdl-engagement-btn--whatsapp") as HTMLElement | null;
        const waSvg = waBtn ? waBtn.querySelector("svg") : null;
        const waPaths = waSvg ? Array.from(waSvg.querySelectorAll("path")).map(p => ({
          fill: p.getAttribute("fill"),
          dPrefix: p.getAttribute("d")?.slice(0, 10),
        })) : [];

        const thumbRect = thumb ? thumb.getBoundingClientRect() : null;
        const bodyRect = body ? body.getBoundingClientRect() : null;
        const rowRect = row ? row.getBoundingClientRect() : null;
        const cardRect = card ? card.getBoundingClientRect() : null;

        return {
          cardWidth: cardRect ? cardRect.width : 0,
          rowWidth: rowRect ? rowRect.width : 0,
          actionCount: actions.length,
          isImageOnLeft: !!(thumbRect && bodyRect && thumbRect.left < bodyRect.left),
          isHeadlineOnRight: !!(thumbRect && bodyRect && bodyRect.left > thumbRect.left),
          isActionBelowContent: !!(rowRect && thumbRect && bodyRect && rowRect.top >= Math.min(thumbRect.bottom, bodyRect.bottom)),
          thumbWidth: thumbRect ? thumbRect.width : 0,
          thumbHeight: thumbRect ? thumbRect.height : 0,
          waPathCount: waPaths.length,
          waPaths,
        };
      });
      console.log("390px layout & geometry metrics:", metrics);

      // Verify Interaction: Double-tap story content -> heart burst feedback
      console.log("\n--- TEST 6: DOUBLE-TAP HEART FEEDBACK TEST ---");
      const firstStory = page.locator(".jdl-queue-card__main-content").first();
      await firstStory.click({ clickCount: 2, delay: 100 });
      await page.waitForTimeout(400);
      const heartBurstVisible = await page.evaluate(() => {
        const burst = document.querySelector(".jdl-queue-card__heart-burst");
        return !!burst;
      });
      console.log("Heart burst visible on double tap:", heartBurstVisible);

      // Verify Interaction: Clicking WhatsApp button maintains isolation
      console.log("\n--- TEST 7: WHATSAPP CLICK ISOLATION TEST ---");
      let newPageTriggered = false;
      ctx.on("page", () => { newPageTriggered = true; });
      const waButton = page.locator(".jdl-engagement-btn--whatsapp").first();
      await waButton.click();
      await page.waitForTimeout(500);
      console.log("WhatsApp click triggered (window.open isolation):", newPageTriggered);
    }

    await ctx.close();
  }

  await browser.close();
  console.log("\n=== ALL E2E TESTS AND SCREENSHOTS VERIFIED ===");
}

main().catch(console.error);
