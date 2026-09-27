import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.production.local" });

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";
import path from "path";

async function testContinuation() {
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
  await page.goto("https://www.jandarpan.news/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const readBtn = await page.$(".jdl-queue-card__read-btn");
  if (readBtn) {
    await readBtn.click();
    await page.waitForTimeout(2000);
    const sourceBtn = await page.$("a:has-text('मूल खबर देखें / और पढ़ें')");
    if (sourceBtn) {
      await sourceBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      const artifactDir = path.resolve("C:/Users/shriyansh chandrakar/.gemini/antigravity-ide/brain/030cd03b-74e5-4148-9230-61309a430039");
      await page.screenshot({ path: path.join(artifactDir, "production_article_continuation_button.png"), fullPage: false });
      console.log("Saved continuation screenshot!");
    }
  }
  await browser.close();
}

testContinuation().catch(console.error);
