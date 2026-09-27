import dotenv from "dotenv";
dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env.local" });

import { createSign } from "crypto";

const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
console.log("GSC_SERVICE_ACCOUNT_JSON exists?", !!raw);
if (!raw) {
  process.exit(1);
}

let sa: any = null;
try {
  sa = JSON.parse(raw);
} catch {
  try {
    sa = new Function("return " + raw)();
  } catch (e: any) {
    console.error("Function parse error:", e.message);
  }
}

if (!sa) {
  console.error("Failed to parse service account JSON");
  process.exit(1);
}

console.log("Service Account parsed:");
console.log("  Project ID:", sa.project_id);
console.log("  Client Email:", sa.client_email);

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

async function getToken(scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );

  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(sa.private_key, "base64url");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Token fetch failed: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

async function main() {
  console.log("\nAttempting Google API Token Exchange...");
  const scopes = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/analytics.edit",
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/webmasters.readonly",
  ];

  const token = await getToken(scopes);
  console.log("✓ Successfully obtained Google OAuth access token!");

  // 1. Check Google Analytics Admin API (Properties & Account Summaries)
  console.log("\n--- [GA4] Checking Google Analytics Properties ---");
  const gaRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const gaData = await gaRes.json();
  console.log("GA4 Account Summaries Response:", JSON.stringify(gaData, null, 2));

  // Also check if analyticsadmin v1alpha has properties
  const gaAlphaRes = await fetch("https://analyticsadmin.googleapis.com/v1alpha/properties", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const gaAlphaData = await gaAlphaRes.json();
  console.log("GA4 Alpha Properties Response:", JSON.stringify(gaAlphaData, null, 2));

  // 2. Check GCP Project Info
  console.log("\n--- [GCP] Checking Google Cloud Project Info ---");
  const projRes = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${sa.project_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const projData = await projRes.json();
  console.log("GCP Project Response:", JSON.stringify(projData, null, 2));
}

main().catch(console.error);
