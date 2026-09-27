import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://giiuqshoconjbpiueasp.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpaXVxc2hvY29uamJwaXVlYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODQ0MzcsImV4cCI6MjA5NDk2MDQzN30.0BvXpL4aLX-ynrWTr8leru3yl3TpCpBsvv6uRYbyIO4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOAuthUrl() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://www.jandarpan.news/auth/callback",
    },
  });

  if (error) {
    console.error("Supabase OAuth error:", error);
    return;
  }

  console.log("Supabase OAuth Authorize URL:\n", data.url);

  // Now follow the Supabase URL to see the Google URL it redirects to
  const res = await fetch(data.url, { redirect: "manual" });
  console.log("\nSupabase HTTP Status:", res.status);
  const location = res.headers.get("location");
  console.log("Redirects to Google Location:\n", location);

  if (location) {
    const googleUrl = new URL(location);
    console.log("\nGoogle OAuth Parameters:");
    console.log("Client ID:", googleUrl.searchParams.get("client_id"));
    console.log("Redirect URI sent to Google:", googleUrl.searchParams.get("redirect_uri"));
    console.log("Redirect To (app callback):", googleUrl.searchParams.get("redirect_to"));
    console.log("Scope:", googleUrl.searchParams.get("scope"));

    // Now test what Google returns for this URL!
    console.log("\nTesting Google OAuth response...");
    const gRes = await fetch(location);
    const gText = await gRes.text();
    const cleanGText = gText.replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    console.log("Google HTTP Status:", gRes.status);
    console.log("Google visible text snippet:\n", cleanGText.slice(0, 500));
  }
}

testOAuthUrl();
