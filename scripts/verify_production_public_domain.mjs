import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PROD_URL = "https://www.jandarpan.news";

async function runProductionAudit() {
  console.log(`=== STARTING PRODUCTION AUDIT TARGETING: ${PROD_URL} ===`);
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const results = {
    unauthenticatedGates: {},
    loginPageChecks: {},
    engagementRowChecks: {},
    ga4Telemetry: {},
  };

  try {
    // 1. Unauthenticated Visitor Protection Checks
    const testRoutes = [
      "/",
      "/live",
      "/story/durg-road-safety-drive",
      "/category/crime",
      "/district/durg",
    ];

    console.log("\n--- Checking Unauthenticated Redirects ---");
    const unauthContext = await browser.newContext();
    const unauthPage = await unauthContext.newPage();

    for (const route of testRoutes) {
      const target = `${PROD_URL}${route}`;
      console.log(`Visiting unauthenticated: ${target}`);
      const res = await unauthPage.goto(target, { waitUntil: "commit", timeout: 20000 });
      await unauthPage.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
      const finalUrl = unauthPage.url();
      const redirected = finalUrl.includes("/login");
      console.log(` -> Final URL: ${finalUrl} (Redirected to login: ${redirected})`);
      results.unauthenticatedGates[route] = {
        initialStatus: res?.status(),
        finalUrl,
        redirectedToLogin: redirected,
      };
    }
    await unauthContext.close();

    // 2. Login Page UI & Form Audit
    console.log("\n--- Auditing Login Page on Public Production ---");
    const loginContext = await browser.newContext();
    const loginPage = await loginContext.newPage();
    await loginPage.goto(`${PROD_URL}/login`, { waitUntil: "networkidle", timeout: 25000 });

    const bodyText = await loginPage.evaluate(() => document.body.innerText);
    const html = await loginPage.content();

    // Guest button check
    const guestLinks = await loginPage.locator("a:has-text('guest'), a:has-text('मेहमान'), button:has-text('guest'), button:has-text('मेहमान')").count();
    // Password input check
    const passwordInputs = await loginPage.locator("input[type='password']").count();
    // Phone OTP check
    const otpInputs = await loginPage.locator("input[placeholder*='10'], button:has-text('OTP'), button:has-text('ओटीपी')").count();
    // Magic link email
    const magicLinks = await loginPage.locator("button:has-text('Magic Link'), button:has-text('ईमेल लिंक')").count();
    // Google Sign-In button
    const googleBtn = await loginPage.locator("button:has-text('Google')");
    const hasGoogleBtn = (await googleBtn.count()) > 0;

    results.loginPageChecks = {
      guestBypassPresent: guestLinks > 0,
      passwordLoginPresent: passwordInputs > 0,
      phoneOtpPresent: otpInputs > 0,
      magicLinkPresent: magicLinks > 0,
      googleButtonPresent: hasGoogleBtn,
    };
    console.log("Login page audit results:", results.loginPageChecks);

    // Test Google OAuth initiation
    if (hasGoogleBtn) {
      console.log("Testing Google OAuth initiation click...");
      let oauthUrl = "";
      loginPage.on("request", (req) => {
        if (req.url().includes("supabase.co/auth/v1/authorize") || req.url().includes("accounts.google.com")) {
          oauthUrl = req.url();
        }
      });

      await Promise.race([
        googleBtn.first().click(),
        loginPage.waitForURL(/accounts\.google\.com|supabase\.co/, { timeout: 10000 }).catch(() => {}),
      ]);
      await loginPage.waitForTimeout(2000);
      const postClickUrl = loginPage.url();
      console.log(`Post-click OAuth URL: ${postClickUrl || oauthUrl}`);
      results.loginPageChecks.oauthInitiatedUrl = postClickUrl || oauthUrl;
    }
    await loginContext.close();

    // 3. Authenticated Session Testing on Public Production
    // In our app, authenticated sessions are represented by Supabase auth cookies or e2e cookie if enabled in preview/testing.
    // Let's inspect the engagement row by injecting an authenticated session or visiting with credentials.
    console.log("\n--- Auditing Authenticated Public Production Views & Engagement Row ---");
    const authContext = await browser.newContext();
    // We set session cookies for testing or evaluate direct live page
    // Let's check how cookies are handled.
    await authContext.close();

    console.log("\nAudit execution complete.");
    return results;
  } catch (err) {
    console.error("Audit error:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

runProductionAudit().then((r) => {
  console.log("\nFINAL RESULTS SUMMARY:\n", JSON.stringify(r, null, 2));
});
