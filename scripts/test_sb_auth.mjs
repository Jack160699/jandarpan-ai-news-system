import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.production.local" });
import { createClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^['"]+|['"]+$/g, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^['"]+|['"]+$/g, "");
const supabase = createClient(url, key);

async function testAuth() {
  const { data, error } = await supabase.auth.admin.listUsers();
  console.log("List users count:", data?.users?.length, "error:", error?.message);
  if (data?.users?.length) {
    const u = data.users[0];
    console.log("Sample user:", u.id, u.email);
    const linkRes = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: u.email,
    });
    const actionLink = linkRes.data?.properties?.action_link;
    console.log("Action link:", actionLink);

    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    console.log("Navigating to actionLink...");
    await page.goto(actionLink, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(5000);

    console.log("Landed URL:", page.url());
    const cookies = await ctx.cookies();
    console.log("Cookies set:", cookies.map((c) => `${c.name} on ${c.domain}`));

    const tvEl = await page.$(".jdl-tv");
    console.log("TV element found:", !!tvEl);
    const authGate = await page.$(".jd-auth-gate-container");
    console.log("Auth gate container found (should be null):", !!authGate);

    await browser.close();
  }
}

testAuth().catch(console.error);
