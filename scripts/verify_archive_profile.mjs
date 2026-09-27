import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.production.local" });

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";
import path from "path";

async function testProfile() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim();
  const adminClient = createClient(url, serviceKey);
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  const user = users[0];
  const { data: linkData } = await adminClient.auth.admin.generateLink({ type: "magiclink", email: user.email });

  const cookieJar = [];
  const ssrClient = createServerClient(url, anonKey, {
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
  await ssrClient.auth.verifyOtp({ token_hash: linkData.properties.hashed_token, type: "magiclink" });

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cookiesToAdd = cookieJar.map((c) => ({
    name: c.name,
    value: c.value,
    domain: "www.jandarpan.news",
    path: "/",
    httpOnly: false,
    secure: true,
    sameSite: "Lax",
  }));
  await context.addCookies(cookiesToAdd);

  const page = await context.newPage();
  console.log("Navigating to https://www.jandarpan.news/profile ...");
  await page.goto("https://www.jandarpan.news/profile", { waitUntil: "networkidle", timeout: 35000 });
  await page.waitForTimeout(2500);

  const pencilBtn = await page.$("button[aria-label*='संपादित करें'], button[aria-label*='Edit profile']");
  const logoutBtn = await page.$("button[aria-label*='साइन आउट करें'], button[aria-label*='Log out']");
  const emailSpan = await page.$(`text=${user.email}`);

  console.log("Profile Results on /profile:", {
    url: page.url(),
    pencilBtnFound: !!pencilBtn,
    logoutBtnFound: !!logoutBtn,
    userEmailFound: !!emailSpan,
  });

  const artifactDir = path.resolve("C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/030cd03b-74e5-4148-9230-61309a430039");
  await page.screenshot({ path: path.join(artifactDir, "production_profile_authenticated.png"), fullPage: false });
  console.log("Saved screenshot to production_profile_authenticated.png");

  if (pencilBtn) {
    console.log("Clicking pencil button to test edit modal...");
    await pencilBtn.click();
    await page.waitForTimeout(1000);
    const modal = await page.$("div[role='dialog'][aria-label*='संपादित करें'], div[role='dialog'][aria-label*='Edit Profile']");
    console.log("Edit modal opened:", !!modal);
    await page.screenshot({ path: path.join(artifactDir, "production_profile_edit_modal.png"), fullPage: false });
    console.log("Saved screenshot to production_profile_edit_modal.png");
  }

  await browser.close();
}

testProfile().catch(console.error);
